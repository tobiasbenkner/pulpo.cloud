/**
 * Cross-validation test data.
 *
 * These test cases are shared between TypeScript and Go implementations.
 * Both must produce IDENTICAL results for every case.
 *
 * Run: pnpm --filter @pulpo/invoice test
 * Then compare with: go test ./invoice/ -run TestCrossValidation -v
 */
import { describe, it, expect } from "vitest";
import { calculateInvoice } from "./calculate";
import type { InvoiceLineInput, InvoiceDiscountInput } from "./types";

interface CrossTestCase {
  name: string;
  items: InvoiceLineInput[];
  discount: InvoiceDiscountInput | null;
  expected: {
    gross: string;
    net: string;
    tax: string;
    subtotal: string;
    discountTotal: string;
    count: number;
    taxBreakdownLength: number;
    items: { rowTotalGross: string; taxRateSnapshot: string }[];
  };
}

// Realistic Spanish restaurant scenarios
const cases: CrossTestCase[] = [
  {
    name: "Tapas order Canary Islands (IGIC 7%)",
    items: [
      { productId: "p1", productName: "Papas arrugadas", priceGross: "6.50", taxRate: "7", quantity: 2 },
      { productId: "p2", productName: "Cerveza", priceGross: "3.50", taxRate: "7", quantity: 4 },
      { productId: "p3", productName: "Queso asado", priceGross: "8.00", taxRate: "7", quantity: 1 },
    ],
    discount: null,
    expected: {
      gross: "35.00",
      net: "32.71",
      tax: "2.29",
      subtotal: "35.00",
      discountTotal: "0.00",
      count: 7,
      taxBreakdownLength: 1,
      items: [
        { rowTotalGross: "13.00", taxRateSnapshot: "7.00" },
        { rowTotalGross: "14.00", taxRateSnapshot: "7.00" },
        { rowTotalGross: "8.00", taxRateSnapshot: "7.00" },
      ],
    },
  },
  {
    name: "Mixed tax rates mainland (IVA 10% + 21%)",
    items: [
      { productId: "p1", productName: "Menú del día", priceGross: "12.50", taxRate: "10", quantity: 2 },
      { productId: "p2", productName: "Vino", priceGross: "18.00", taxRate: "21", quantity: 1 },
      { productId: "p3", productName: "Agua", priceGross: "2.00", taxRate: "10", quantity: 2 },
    ],
    discount: null,
    expected: {
      gross: "47.00",
      net: "41.24",
      tax: "5.76",
      subtotal: "47.00",
      discountTotal: "0.00",
      count: 5,
      taxBreakdownLength: 2,
      items: [
        { rowTotalGross: "25.00", taxRateSnapshot: "10.00" },
        { rowTotalGross: "18.00", taxRateSnapshot: "21.00" },
        { rowTotalGross: "4.00", taxRateSnapshot: "10.00" },
      ],
    },
  },
  {
    name: "10% global discount on mixed rates",
    items: [
      { productId: "p1", productName: "Pulpo a la gallega", priceGross: "14.00", taxRate: "7", quantity: 1 },
      { productId: "p2", productName: "Gin Tonic", priceGross: "9.50", taxRate: "7", quantity: 2 },
    ],
    discount: { type: "percent", value: 10 },
    expected: {
      gross: "29.70",
      net: "27.76",
      tax: "1.94",
      subtotal: "33.00",
      discountTotal: "3.30",
      count: 3,
      taxBreakdownLength: 1,
      items: [
        { rowTotalGross: "12.60", taxRateSnapshot: "7.00" },
        { rowTotalGross: "17.10", taxRateSnapshot: "7.00" },
      ],
    },
  },
  {
    name: "Fixed 5€ discount with three tax groups",
    items: [
      { productId: "p1", productName: "Pan", priceGross: "1.50", taxRate: "0", quantity: 2 },
      { productId: "p2", productName: "Ensalada", priceGross: "8.50", taxRate: "10", quantity: 1 },
      { productId: "p3", productName: "Whisky", priceGross: "12.00", taxRate: "21", quantity: 1 },
    ],
    discount: { type: "fixed", value: 5 },
    expected: {
      gross: "18.50",
      net: "16.25",
      tax: "2.25",
      subtotal: "23.50",
      discountTotal: "5.00",
      count: 4,
      taxBreakdownLength: 3,
      items: [
        { rowTotalGross: "2.36", taxRateSnapshot: "0.00" },
        { rowTotalGross: "6.69", taxRateSnapshot: "10.00" },
        { rowTotalGross: "9.45", taxRateSnapshot: "21.00" },
      ],
    },
  },
  {
    name: "Item discount + global discount combined",
    items: [
      {
        productId: "p1", productName: "Langosta", priceGross: "45.00", taxRate: "7", quantity: 1,
        discount: { type: "percent", value: 15 },
      },
      { productId: "p2", productName: "Champagne", priceGross: "35.00", taxRate: "7", quantity: 1 },
    ],
    discount: { type: "fixed", value: 3 },
    expected: {
      gross: "70.25",
      net: "65.65",
      tax: "4.60",
      subtotal: "73.25",
      discountTotal: "3.00",
      count: 2,
      taxBreakdownLength: 1,
      items: [
        { rowTotalGross: "36.68", taxRateSnapshot: "7.00" },
        { rowTotalGross: "33.57", taxRateSnapshot: "7.00" },
      ],
    },
  },
  {
    name: "Single cent item (precision edge case)",
    items: [
      { productId: "p1", productName: "Chicle", priceGross: "0.01", taxRate: "21", quantity: 3 },
    ],
    discount: null,
    expected: {
      gross: "0.03",
      net: "0.02",
      tax: "0.01",
      subtotal: "0.03",
      discountTotal: "0.00",
      count: 3,
      taxBreakdownLength: 1,
      items: [
        { rowTotalGross: "0.03", taxRateSnapshot: "21.00" },
      ],
    },
  },
  {
    name: "Large quantity with rounding",
    items: [
      { productId: "p1", productName: "Café", priceGross: "1.30", taxRate: "7", quantity: 137 },
    ],
    discount: null,
    expected: {
      gross: "178.10",
      net: "166.45",
      tax: "11.65",
      subtotal: "178.10",
      discountTotal: "0.00",
      count: 137,
      taxBreakdownLength: 1,
      items: [
        { rowTotalGross: "178.10", taxRateSnapshot: "7.00" },
      ],
    },
  },
];

describe("Cross-validation with Go", () => {
  for (const tc of cases) {
    it(tc.name, () => {
      const result = calculateInvoice(tc.items, tc.discount);

      expect(result.gross).toBe(tc.expected.gross);
      expect(result.net).toBe(tc.expected.net);
      expect(result.tax).toBe(tc.expected.tax);
      expect(result.subtotal).toBe(tc.expected.subtotal);
      expect(result.discountTotal).toBe(tc.expected.discountTotal);
      expect(result.count).toBe(tc.expected.count);
      expect(result.taxBreakdown).toHaveLength(tc.expected.taxBreakdownLength);

      for (let i = 0; i < tc.expected.items.length; i++) {
        expect(result.items[i]!.rowTotalGross).toBe(tc.expected.items[i]!.rowTotalGross);
        expect(result.items[i]!.taxRateSnapshot).toBe(tc.expected.items[i]!.taxRateSnapshot);
      }

      // Invariant: net + tax === gross
      const net = parseFloat(result.net);
      const tax = parseFloat(result.tax);
      const gross = parseFloat(result.gross);
      expect(net + tax).toBeCloseTo(gross, 2);
    });
  }
});
