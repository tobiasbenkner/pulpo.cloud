export interface Invoice {
  id: string;
  date_created: string;
  invoice_number: string;
  tenant: string;
  status: "draft" | "paid" | "cancelled";
  total_net: string;
  total_tax: string;
  total_gross: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: string | null;
  closure_id: string | null;
  // VeriFactu
  previous_record_hash: string | null;
  chain_hash: string | null;
  qr_url: string | null;
  generation_date: string | null;
  // Relations
  items: InvoiceItem[];
  payments: InvoicePayment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_name: string;
  quantity: number;
  tax_rate_snapshot: string;
  price_gross_unit: string;
  price_net_unit_precise: string;
  row_total_net_precise: string;
  row_total_gross: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: string | null;
}

export interface InvoicePayment {
  id: number;
  date_created: string | null;
  invoice_id: string;
  method: "cash" | "card";
  amount: string;
  tendered: string | null;
  change: string | null;
  tip: string | null;
}
