export interface Invoice {
  id: string;
  date_created: string;
  invoice_number: string;
  tenant: string;
  status: "draft" | "paid" | "cancelled";
  total_net: number;
  total_tax: number;
  total_gross: number;
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
  tax_rate_snapshot: number;
  price_gross_unit: number;
  price_net_unit_precise: number;
  row_total_net_precise: number;
  row_total_gross: number;
}

export interface InvoicePayment {
  id: number;
  date_created: string | null;
  invoice_id: string;
  method: "cash" | "card";
  amount: number;
  tendered: number | null;
  change: number | null;
  tip: number | null;
}
