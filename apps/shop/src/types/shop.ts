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
  address: string;
  zip: string;
  city: string;
  email?: string;
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

export interface ClosureReport {
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
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
