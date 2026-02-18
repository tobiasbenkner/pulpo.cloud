import Big from "big.js";

import type {
  InvoiceLineInput,
  InvoiceDiscountInput,
  InvoiceLineResult,
  InvoiceCalculationResult,
} from "./types";

export function calculateInvoice(
  items: InvoiceLineInput[],
  globalDiscount?: InvoiceDiscountInput | null,
): InvoiceCalculationResult {
  const ZERO = new Big(0);
  const HUNDRED = new Big(100);
  let subtotalGross = ZERO;
  let totalNet = ZERO;

  // 1. Zwischensumme (nach Artikelrabatten)
  const lineGrossValues: Big[] = [];

  items.forEach((item) => {
    let lineGross = new Big(item.priceGross).times(item.quantity);
    if (item.discount) {
      if (item.discount.type === "fixed") {
        lineGross = lineGross.minus(item.discount.value);
      } else {
        lineGross = lineGross.minus(
          lineGross.times(item.discount.value).div(HUNDRED),
        );
      }
    }
    if (lineGross.lt(ZERO)) lineGross = ZERO;
    lineGrossValues.push(lineGross);
    subtotalGross = subtotalGross.plus(lineGross);
  });

  // 2. Global Discount
  let finalTotalGross = subtotalGross;
  let discountAmount = ZERO;

  if (globalDiscount) {
    if (globalDiscount.type === "fixed") {
      discountAmount = new Big(globalDiscount.value);
      finalTotalGross = finalTotalGross.minus(discountAmount);
    } else {
      discountAmount = finalTotalGross.times(globalDiscount.value).div(HUNDRED);
      finalTotalGross = finalTotalGross.minus(discountAmount);
    }
  }

  if (finalTotalGross.lt(ZERO)) finalTotalGross = ZERO;
  if (discountAmount.gt(subtotalGross)) discountAmount = subtotalGross;

  // 3. Steuer rückrechnen (gruppiert nach Rate)
  const discountRatio = subtotalGross.gt(ZERO)
    ? finalTotalGross.div(subtotalGross)
    : new Big(1);

  const taxByRate = new Map<string, Big>();
  const computedItems: InvoiceLineResult[] = [];

  items.forEach((item, i) => {
    const lineGross = lineGrossValues[i];
    const lineGrossAfterGlobal = lineGross.times(discountRatio);
    const rateStr = item.taxRate;
    const rate = new Big(rateStr);
    const lineNet = lineGrossAfterGlobal.div(new Big(1).plus(rate));

    const rowNetRounded = new Big(lineNet.toFixed(8));
    totalNet = totalNet.plus(rowNetRounded);

    if (rate.gt(0)) {
      const prev = taxByRate.get(rateStr) ?? ZERO;
      const rowTax = lineGrossAfterGlobal.minus(rowNetRounded);
      taxByRate.set(rateStr, prev.plus(rowTax));
    }

    const priceGrossUnit = new Big(item.priceGross);
    computedItems.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      priceGrossUnit: priceGrossUnit.toFixed(4),
      taxRateSnapshot: rate.times(100).toFixed(2),
      priceNetUnitPrecise: priceGrossUnit.div(new Big(1).plus(rate)).toFixed(8),
      rowTotalGross: lineGrossAfterGlobal.toFixed(2),
      rowTotalNetPrecise: rowNetRounded.toFixed(8),
      discountType: item.discount?.type ?? null,
      discountValue: item.discount
        ? new Big(item.discount.value).toFixed(4)
        : null,
      costCenter: item.costCenter ?? null,
    });
  });

  const taxBreakdown = Array.from(taxByRate.entries())
    .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
    .map(([rate, amount]) => ({ rate, amount: amount.toFixed(2) }));

  return {
    subtotal: subtotalGross.toFixed(2),
    discountTotal: discountAmount.toFixed(2),
    gross: finalTotalGross.toFixed(2),
    net: totalNet.toFixed(2),
    tax: finalTotalGross.minus(totalNet).toFixed(2),
    taxBreakdown,
    items: computedItems,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    discountType: globalDiscount?.type ?? null,
    discountValue: globalDiscount
      ? new Big(globalDiscount.value).toFixed(4)
      : null,
  };
}
