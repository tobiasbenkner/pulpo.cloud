import type { RecordModel } from "pocketbase";

// --- PocketBase Records ---

export interface Company extends RecordModel {
  name: string;
  nif: string | null;
  street: string;
  zip: string;
  city: string;
  email: string | null;
  timezone: string | null;
  invoice_prefix: string | null;
  invoice_image: string | null;
  simplified_invoice_limit: number | null;
}

export interface ProductCategory extends RecordModel {
  name: string;
  image: string;
  sort: number;
}

export interface PbProduct extends RecordModel {
  name: string;
  note: string | null;
  price_gross: string;
  image: string;
  stock: number | null;
  sort: number;
  category: string;
  tax_class: string;
  cost_center: string;
  unit: "unit" | "weight";
  expand?: {
    tax_class?: TaxClass;
    cost_center?: CostCenter;
  };
}

export interface TaxClass extends RecordModel {
  code: string;
  name: string;
}

export interface TaxZone extends RecordModel {
  name: string;
  zone: string | null;
  regex: string | null;
  priority: number;
}

export interface TaxRule extends RecordModel {
  tax_zone: string;
  tax_class: string;
  rate: string | null;
  surcharge: string | null;
  expand?: {
    tax_class?: TaxClass;
  };
}

export interface Customer extends RecordModel {
  name: string;
  nif: string;
  street: string | null;
  zip: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export interface CostCenter extends RecordModel {
  name: string;
}

export interface Closure extends RecordModel {
  status: "open" | "closed";
  period_start: string;
  period_end: string | null;
  starting_cash: string;
  counted_cash: string | null;
}

// --- Invoice types (from custom API responses) ---

export interface Invoice {
  id: string;
  created: string;
  invoice_number: string;
  status: "draft" | "paid" | "cancelled" | "rectificada";
  invoice_type: "ticket" | "factura" | "rectificativa";
  original_invoice_id: string | null;
  rectification_reason: string | null;
  total_net: string;
  total_tax: string;
  total_gross: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: string | null;
  closure: string | null;
  issuer_name: string | null;
  issuer_nif: string | null;
  issuer_street: string | null;
  issuer_zip: string | null;
  issuer_city: string | null;
  customer: string | null;
  customer_name: string | null;
  customer_nif: string | null;
  customer_street: string | null;
  customer_zip: string | null;
  customer_city: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  previous_record_hash: string | null;
  chain_hash: string | null;
  qr_url: string | null;
  generation_date: string | null;
  tax_breakdown: TaxBreakdownEntry[] | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface InvoiceItem {
  id: string;
  invoice: string;
  product: string | null;
  product_name: string;
  quantity: number;
  tax_rate_snapshot: string;
  price_gross_unit: string;
  row_total_gross: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: string | null;
  cost_center: string | null;
  unit: "unit" | "weight";
}

export interface InvoicePayment {
  id: string;
  created: string | null;
  invoice: string;
  method: "cash" | "card";
  amount: string;
  tendered: string | null;
  change: string | null;
  tip: string | null;
}

// --- Report types (from custom API responses) ---

export interface TaxBreakdownEntry {
  rate: string;
  net: string;
  tax: string;
}

export interface ClosureProductBreakdown {
  product_name: string;
  product_id: string | null;
  cost_center: string | null;
  unit: "unit" | "weight";
  quantity: number;
  cash_quantity: number;
  card_quantity: number;
  total_gross: string;
  cash_gross: string;
  card_gross: string;
}

export interface InvoiceTypeCounts {
  tickets: number;
  facturas: number;
  rectificativas: number;
}

export interface AggregatedReport {
  period: {
    type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    label: string;
    from: string;
    to: string;
  };
  summary: {
    total_gross: string;
    total_net: string;
    total_tax: string;
    total_cash: string;
    total_card: string;
    transaction_count: number;
  };
  invoice_counts: InvoiceTypeCounts;
  tax_breakdown: TaxBreakdownEntry[];
  product_breakdown: ClosureProductBreakdown[];
  shifts: {
    id: string;
    period_start: string;
    period_end: string | null;
    total_gross: string;
    total_cash: string;
    total_card: string;
    transaction_count: number;
    difference: string | null;
    invoice_counts: InvoiceTypeCounts;
    product_breakdown: ClosureProductBreakdown[];
  }[];
}

// --- Legacy type aliases for compatibility ---

export type CashRegisterClosure = Closure;
