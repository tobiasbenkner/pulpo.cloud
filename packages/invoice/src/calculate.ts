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
  // 1. Zwischensumme (nach Artikelrabatten)
  const lineGrossValues: Big[] = [];

  items.forEach((item) => {
    // product * quantity
    let lineGross = new Big(item.priceGross).times(item.quantity);

    // minus discount
    if (item.discount) {
      if (item.discount.type === "fixed") {
        lineGross = lineGross.minus(item.discount.value);
      } else {
        lineGross = lineGross.minus(
          lineGross.times(item.discount.value).div(HUNDRED),
        );
      }
    }

    // check value is minimum 0
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

  const taxByRate = new Map<string, { gross: Big }>();
  const computedItems: InvoiceLineResult[] = [];

  items.forEach((item, i) => {
    const lineGross = lineGrossValues[i]!;
    const lineGrossAfterGlobal = lineGross.times(discountRatio);
    const ratePct = new Big(item.taxRate).toFixed(2);
    const rate = new Big(item.taxRate).div(100);
    const rowNetRounded = new Big(
      lineGrossAfterGlobal.div(new Big(1).plus(rate)).toFixed(8),
    );

    const prev = taxByRate.get(ratePct) ?? { gross: ZERO };
    taxByRate.set(ratePct, {
      gross: prev.gross.plus(lineGrossAfterGlobal),
    });

    const priceGrossUnit = new Big(item.priceGross);
    computedItems.push({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      priceGrossUnit: priceGrossUnit.toFixed(4),
      taxRateSnapshot: ratePct,
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

  // 4. Gruppen-Brutto runden + Cent-Korrektur
  const grossRounded = new Big(finalTotalGross.toFixed(2));
  const sorted = Array.from(taxByRate.entries()).sort(([a], [b]) =>
    new Big(a).cmp(new Big(b)),
  );

  const groupGrossRounded = sorted.map(([, v]) =>
    new Big(v.gross.toFixed(2)),
  );
  const groupGrossSum = groupGrossRounded.reduce((s, g) => s.plus(g), ZERO);
  const centDiff = grossRounded.minus(groupGrossSum);

  if (!centDiff.eq(ZERO)) {
    // Cent-Differenz auf die größte Gruppe anwenden
    let largestIdx = 0;
    for (let j = 1; j < groupGrossRounded.length; j++) {
      if (groupGrossRounded[j]!.gt(groupGrossRounded[largestIdx]!)) {
        largestIdx = j;
      }
    }
    groupGrossRounded[largestIdx] = groupGrossRounded[largestIdx]!.plus(centDiff);
  }

  // 5. Steuer pro Gruppe: net + tax = gruppenBrutto (exakt)
  const taxBreakdown = sorted.map(([rate], i) => {
    const gGross = groupGrossRounded[i]!;
    const rateDecimal = new Big(rate).div(HUNDRED);
    const net = new Big(gGross.div(new Big(1).plus(rateDecimal)).toFixed(2));
    const tax = gGross.minus(net);
    return { rate, net: net.toFixed(2), tax: tax.toFixed(2) };
  });

  // 6. Totale aus Breakdown ableiten
  const totalNet = taxBreakdown.reduce(
    (sum, entry) => sum.plus(entry.net),
    ZERO,
  );
  const totalTax = taxBreakdown.reduce(
    (sum, entry) => sum.plus(entry.tax),
    ZERO,
  );

  return {
    subtotal: subtotalGross.toFixed(2),
    discountTotal: discountAmount.toFixed(2),
    gross: grossRounded.toFixed(2),
    net: totalNet.toFixed(2),
    tax: totalTax.toFixed(2),
    taxBreakdown,
    items: computedItems,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    discountType: globalDiscount?.type ?? null,
    discountValue: globalDiscount
      ? new Big(globalDiscount.value).toFixed(4)
      : null,
  };
}
