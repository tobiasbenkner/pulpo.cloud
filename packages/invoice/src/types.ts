/** Input pro Position */
export interface InvoiceLineInput {
  productId: string;
  productName: string;
  priceGross: string;
  taxRate: string;
  quantity: number;
  discount?: { type: "percent" | "fixed"; value: number } | null;
  costCenter?: string | null;
}

/** Optionaler Gesamtrabatt */
export interface InvoiceDiscountInput {
  type: "percent" | "fixed";
  value: number;
}

/** Berechnete Position (Output) */
export interface InvoiceLineResult {
  productId: string;
  productName: string;
  quantity: number;
  priceGrossUnit: string;
  taxRateSnapshot: string;
  priceNetUnitPrecise: string;
  rowTotalGross: string;
  rowTotalNetPrecise: string;
  discountType: "percent" | "fixed" | null;
  discountValue: string | null;
  costCenter: string | null;
}

export interface TaxBreakdownEntry {
  rate: string;
  amount: string;
}

/** Gesamtergebnis der Berechnung */
export interface InvoiceCalculationResult {
  subtotal: string;
  discountTotal: string;
  gross: string;
  net: string;
  tax: string;
  taxBreakdown: TaxBreakdownEntry[];
  items: InvoiceLineResult[];
  count: number;
  discountType: "percent" | "fixed" | null;
  discountValue: string | null;
}
