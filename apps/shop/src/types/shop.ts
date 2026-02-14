// apps/shop/src/types/shop.ts

export type TaxClassCode =
  | "STD"
  | "RED"
  | "INC"
  | "NULL"
  | "SUPER_RED"
  | "ZERO";

export interface Product {
  id: string;
  name: string;
  priceGross: string;
  taxClass: TaxClassCode;
  image: string;
  category: string;
  stock?: number;
}

export interface CartItem extends Product {
  quantity: number;
  discount?: {
    type: "percent" | "fixed";
    value: number;
  };
}

export interface TaxBreakdownEntry {
  rate: string;
  amount: string;
}

export interface CartTotalsItem {
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
}

export interface CartTotals {
  subtotal: string;
  discountTotal: string;
  gross: string;
  net: string;
  tax: string;
  taxBreakdown: TaxBreakdownEntry[];
  items: CartTotalsItem[];
  count: number;
  discountType: "percent" | "fixed" | null;
  discountValue: string | null;
}

export interface Customer {
  id: string;
  name: string;
  nif: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  date_created?: string;
}

export interface TransactionResult {
  total: string;
  tendered: string;
  change: string;
  timestamp: number;
  method: "cash" | "card";
  customer?: Customer;
  type: "ticket" | "invoice";
  invoiceNumber: string;
  invoiceId: string;
  paymentId: number;
}

export type RectificationReason =
  | "error_factura"
  | "devolucion_producto"
  | "factura_duplicada"
  | "otros";

export const RECTIFICATION_REASONS: {
  value: RectificationReason;
  label: string;
}[] = [
  { value: "error_factura", label: "Error en factura" },
  { value: "devolucion_producto", label: "Devolución de producto" },
  { value: "factura_duplicada", label: "Factura duplicada" },
  { value: "otros", label: "Otros" },
];

export function resolveRectificationReason(reason: string | null): string | null {
  if (!reason) return null;
  // Match by value: "devolucion_producto" → "Devolución de producto"
  const byValue = RECTIFICATION_REASONS.find((r) => r.value === reason);
  if (byValue) return byValue.label;
  // Match by label (already resolved): "Devolución de producto" → keep as-is
  const byLabel = RECTIFICATION_REASONS.find((r) => r.label === reason);
  if (byLabel) return byLabel.label;
  // "value: detail" or "label: detail"
  const match = reason.match(/^(.+?):\s*(.+)$/);
  if (match) {
    const base =
      RECTIFICATION_REASONS.find((r) => r.value === match[1]) ??
      RECTIFICATION_REASONS.find((r) => r.label === match[1]);
    if (base) return `${base.label}: ${match[2]}`;
  }
  return reason;
}

export interface ClosureReport {
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  ticketCount: number;
  facturaCount: number;
  rectificativaCount: number;
  totalGross: string;
  totalNet: string;
  totalTax: string;
  totalCash: string;
  totalCard: string;
  totalChange: string;
  expectedCash: string;
  startingCash: string;
  taxBreakdown: { rate: string; net: string; tax: string }[];
}
