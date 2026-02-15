export interface ClosureProductBreakdown {
  product_name: string;
  product_id: string | null;
  cost_center: string | null;
  quantity: number;
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
  tax_breakdown: { rate: string; net: string; tax: string }[];
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
