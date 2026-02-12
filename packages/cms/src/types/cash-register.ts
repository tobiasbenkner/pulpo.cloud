export interface CashRegisterClosure {
  id: string;
  date_created: string;
  tenant: string;
  status: "open" | "closed";
  period_start: string;
  period_end: string | null;
  total_gross: string | null;
  total_net: string | null;
  total_tax: string | null;
  total_cash: string | null;
  total_card: string | null;
  total_change: string | null;
  transaction_count: number | null;
  starting_cash: string;
  expected_cash: string | null;
  counted_cash: string | null;
  difference: string | null;
  tax_breakdown: { rate: string; net: string; tax: string }[] | null;
  denomination_count:
    | { cents: number; label: string; qty: number }[]
    | null;
}
