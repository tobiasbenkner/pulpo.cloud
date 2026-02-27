import { describe, it, expect } from "vitest";
import Big from "big.js";
import { calculateInvoice } from "./calculate";
import type { InvoiceLineInput, InvoiceCalculationResult } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeItem(
  overrides: Partial<InvoiceLineInput> & {
    priceGross: string;
    taxRate: string;
  },
): InvoiceLineInput {
  return {
    productId: "p1",
    productName: "Product",
    quantity: 1,
    ...overrides,
  };
}

/** Assert the fundamental invariant: net + tax === gross */
function expectNetTaxGrossInvariant(result: InvoiceCalculationResult) {
  const net = new Big(result.net);
  const tax = new Big(result.tax);
  const gross = new Big(result.gross);
  expect(net.plus(tax).toFixed(2)).toBe(gross.toFixed(2));
}

/** Assert that the sum of the tax breakdown equals the totals */
function expectBreakdownSumsMatch(result: InvoiceCalculationResult) {
  const breakdownNet = result.taxBreakdown.reduce(
    (s, e) => s.plus(e.net),
    new Big(0),
  );
  const breakdownTax = result.taxBreakdown.reduce(
    (s, e) => s.plus(e.tax),
    new Big(0),
  );
  expect(breakdownNet.toFixed(2)).toBe(result.net);
  expect(breakdownTax.toFixed(2)).toBe(result.tax);
}

/** Run both invariant checks */
function expectInvariants(result: InvoiceCalculationResult) {
  expectNetTaxGrossInvariant(result);
  expectBreakdownSumsMatch(result);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("calculateInvoice", () => {
  // -----------------------------------------------------------------------
  // Basis
  // -----------------------------------------------------------------------
  describe("Basis", () => {
    it("single item, no discounts", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 2 }),
      ]);

      expect(result.gross).toBe("20.00");
      expect(result.subtotal).toBe("20.00");
      expect(result.discountTotal).toBe("0.00");
      expect(result.count).toBe(2);
      expect(result.taxBreakdown).toHaveLength(1);
      expect(result.taxBreakdown[0]!.rate).toBe("21.00");
      expectInvariants(result);
    });

    it("multiple items, same tax rate", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
        makeItem({ priceGross: "5.00", taxRate: "21", quantity: 3 }),
      ]);

      expect(result.gross).toBe("25.00");
      expect(result.taxBreakdown).toHaveLength(1);
      expectInvariants(result);
    });

    it("multiple items, different tax rates (7% + 21%)", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "7", quantity: 1 }),
        makeItem({ priceGross: "20.00", taxRate: "21", quantity: 1 }),
      ]);

      expect(result.gross).toBe("30.00");
      expect(result.taxBreakdown).toHaveLength(2);
      // sorted ascending: 7% first, then 21%
      expect(result.taxBreakdown[0]!.rate).toBe("7.00");
      expect(result.taxBreakdown[1]!.rate).toBe("21.00");
      expectInvariants(result);
    });
  });

  // -----------------------------------------------------------------------
  // Item Discounts
  // -----------------------------------------------------------------------
  describe("Item discounts", () => {
    it("percentage item discount", () => {
      const result = calculateInvoice([
        makeItem({
          priceGross: "100.00",
          taxRate: "21",
          quantity: 1,
          discount: { type: "percent", value: 10 },
        }),
      ]);

      expect(result.gross).toBe("90.00");
      expect(result.subtotal).toBe("90.00");
      expectInvariants(result);
    });

    it("fixed item discount", () => {
      const result = calculateInvoice([
        makeItem({
          priceGross: "50.00",
          taxRate: "21",
          quantity: 2,
          discount: { type: "fixed", value: 20 },
        }),
      ]);

      // 50*2 = 100, minus 20 = 80
      expect(result.gross).toBe("80.00");
      expectInvariants(result);
    });

    it("discount that would bring price below 0 is clamped to 0", () => {
      const result = calculateInvoice([
        makeItem({
          priceGross: "5.00",
          taxRate: "21",
          quantity: 1,
          discount: { type: "fixed", value: 10 },
        }),
      ]);

      expect(result.gross).toBe("0.00");
      expect(result.net).toBe("0.00");
      expect(result.tax).toBe("0.00");
      expectInvariants(result);
    });

    it("discount greater than row total is clamped to 0", () => {
      const result = calculateInvoice([
        makeItem({
          priceGross: "10.00",
          taxRate: "21",
          quantity: 1,
          discount: { type: "fixed", value: 999 },
        }),
      ]);

      expect(result.gross).toBe("0.00");
      expectInvariants(result);
    });
  });

  // -----------------------------------------------------------------------
  // Global Discount
  // -----------------------------------------------------------------------
  describe("Global discount", () => {
    it("percentage global discount", () => {
      const result = calculateInvoice(
        [makeItem({ priceGross: "100.00", taxRate: "21", quantity: 1 })],
        { type: "percent", value: 25 },
      );

      expect(result.subtotal).toBe("100.00");
      expect(result.discountTotal).toBe("25.00");
      expect(result.gross).toBe("75.00");
      expectInvariants(result);
    });

    it("fixed global discount", () => {
      const result = calculateInvoice(
        [makeItem({ priceGross: "100.00", taxRate: "21", quantity: 1 })],
        { type: "fixed", value: 30 },
      );

      expect(result.subtotal).toBe("100.00");
      expect(result.discountTotal).toBe("30.00");
      expect(result.gross).toBe("70.00");
      expectInvariants(result);
    });

    it("global + item discount combined", () => {
      const result = calculateInvoice(
        [
          makeItem({
            priceGross: "100.00",
            taxRate: "21",
            quantity: 1,
            discount: { type: "percent", value: 10 },
          }),
        ],
        { type: "percent", value: 20 },
      );

      // item: 100 - 10% = 90 (subtotal)
      // global: 90 - 20% = 72 (gross)
      expect(result.subtotal).toBe("90.00");
      expect(result.discountTotal).toBe("18.00");
      expect(result.gross).toBe("72.00");
      expectInvariants(result);
    });

    it("100% global discount → everything 0", () => {
      const result = calculateInvoice(
        [
          makeItem({ priceGross: "50.00", taxRate: "21", quantity: 2 }),
          makeItem({ priceGross: "30.00", taxRate: "7", quantity: 1 }),
        ],
        { type: "percent", value: 100 },
      );

      expect(result.gross).toBe("0.00");
      expect(result.net).toBe("0.00");
      expect(result.tax).toBe("0.00");
      expect(result.discountTotal).toBe("130.00");
      expectInvariants(result);
    });
  });

  // -----------------------------------------------------------------------
  // Cent correction
  // -----------------------------------------------------------------------
  describe("Cent correction", () => {
    it("corrects rounding so sum(taxBreakdown gross) === gross", () => {
      // 3 groups with amounts that cause rounding differences
      const result = calculateInvoice([
        makeItem({ priceGross: "33.33", taxRate: "7", quantity: 1 }),
        makeItem({ priceGross: "33.33", taxRate: "19", quantity: 1 }),
        makeItem({ priceGross: "33.34", taxRate: "21", quantity: 1 }),
      ]);

      // The key invariant: sum of breakdown net + tax === gross
      const breakdownGrossSum = result.taxBreakdown.reduce(
        (s, e) => s.plus(new Big(e.net)).plus(new Big(e.tax)),
        new Big(0),
      );
      expect(breakdownGrossSum.toFixed(2)).toBe(result.gross);
      expectInvariants(result);
    });

    it("cent correction with global discount causing uneven split", () => {
      const result = calculateInvoice(
        [
          makeItem({ priceGross: "10.00", taxRate: "7", quantity: 1 }),
          makeItem({ priceGross: "10.00", taxRate: "19", quantity: 1 }),
          makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
        ],
        { type: "fixed", value: 1 },
      );

      const breakdownGrossSum = result.taxBreakdown.reduce(
        (s, e) => s.plus(new Big(e.net)).plus(new Big(e.tax)),
        new Big(0),
      );
      expect(breakdownGrossSum.toFixed(2)).toBe(result.gross);
      expectInvariants(result);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("Edge cases", () => {
    it("empty items array → all zeros", () => {
      const result = calculateInvoice([]);

      expect(result.gross).toBe("0.00");
      expect(result.net).toBe("0.00");
      expect(result.tax).toBe("0.00");
      expect(result.subtotal).toBe("0.00");
      expect(result.discountTotal).toBe("0.00");
      expect(result.count).toBe(0);
      expect(result.taxBreakdown).toHaveLength(0);
      expect(result.items).toHaveLength(0);
    });

    it("quantity = 0", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 0 }),
      ]);

      expect(result.gross).toBe("0.00");
      expect(result.count).toBe(0);
      expectInvariants(result);
    });

    it("very small amount (0.01)", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "0.01", taxRate: "21", quantity: 1 }),
      ]);

      expect(result.gross).toBe("0.01");
      expectInvariants(result);
    });

    it("very large amount (99999.99)", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "99999.99", taxRate: "21", quantity: 1 }),
      ]);

      expect(result.gross).toBe("99999.99");
      expectInvariants(result);
    });

    it("many identical items (bulk order)", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "1.50", taxRate: "21", quantity: 1000 }),
      ]);

      expect(result.gross).toBe("1500.00");
      expect(result.count).toBe(1000);
      expectInvariants(result);
    });

    it("tax rate 0%", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "100.00", taxRate: "0", quantity: 1 }),
      ]);

      expect(result.gross).toBe("100.00");
      expect(result.net).toBe("100.00");
      expect(result.tax).toBe("0.00");
      expect(result.taxBreakdown[0]!.rate).toBe("0.00");
      expectInvariants(result);
    });

    it("discountRatio with subtotal = 0 (division by zero guard)", () => {
      // All items discount to 0, then apply global discount
      const result = calculateInvoice(
        [
          makeItem({
            priceGross: "10.00",
            taxRate: "21",
            quantity: 1,
            discount: { type: "fixed", value: 10 },
          }),
        ],
        { type: "percent", value: 50 },
      );

      expect(result.subtotal).toBe("0.00");
      expect(result.gross).toBe("0.00");
      expectInvariants(result);
    });
  });

  // -----------------------------------------------------------------------
  // Output format
  // -----------------------------------------------------------------------
  describe("Output format", () => {
    it("all monetary values are strings", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
      ]);

      expect(typeof result.gross).toBe("string");
      expect(typeof result.net).toBe("string");
      expect(typeof result.tax).toBe("string");
      expect(typeof result.subtotal).toBe("string");
      expect(typeof result.discountTotal).toBe("string");

      for (const entry of result.taxBreakdown) {
        expect(typeof entry.rate).toBe("string");
        expect(typeof entry.net).toBe("string");
        expect(typeof entry.tax).toBe("string");
      }
    });

    it("priceGrossUnit has 4 decimal places", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
      ]);

      expect(result.items[0]!.priceGrossUnit).toMatch(/^\d+\.\d{4}$/);
      expect(result.items[0]!.priceGrossUnit).toBe("10.0000");
    });

    it("rowTotalGross has 2 decimal places", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 3 }),
      ]);

      expect(result.items[0]!.rowTotalGross).toMatch(/^\d+\.\d{2}$/);
      expect(result.items[0]!.rowTotalGross).toBe("30.00");
    });

    it("taxRateSnapshot has 2 decimal places", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "7", quantity: 1 }),
      ]);

      expect(result.items[0]!.taxRateSnapshot).toBe("7.00");
    });

    it("items do not have priceNetUnitPrecise or rowTotalNetPrecise fields", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
      ]);

      const item = result.items[0] as Record<string, unknown>;
      expect(item).not.toHaveProperty("priceNetUnitPrecise");
      expect(item).not.toHaveProperty("rowTotalNetPrecise");
    });

    it("discountValue has 4 decimal places when present", () => {
      const result = calculateInvoice(
        [
          makeItem({
            priceGross: "100.00",
            taxRate: "21",
            quantity: 1,
            discount: { type: "percent", value: 10 },
          }),
        ],
        { type: "fixed", value: 5 },
      );

      expect(result.items[0]!.discountValue).toBe("10.0000");
      expect(result.discountValue).toBe("5.0000");
    });

    it("discountType and discountValue are null when no discount", () => {
      const result = calculateInvoice([
        makeItem({ priceGross: "10.00", taxRate: "21", quantity: 1 }),
      ]);

      expect(result.items[0]!.discountType).toBeNull();
      expect(result.items[0]!.discountValue).toBeNull();
      expect(result.discountType).toBeNull();
      expect(result.discountValue).toBeNull();
    });
  });
});
