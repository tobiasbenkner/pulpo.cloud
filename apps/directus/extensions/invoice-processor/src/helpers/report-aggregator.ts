import Big from "big.js";

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

/**
 * Compute product breakdown from a list of invoices (with items + payments).
 * Rectificativas are included — their negative quantities/amounts reduce totals.
 */
export function computeProductBreakdown(
  invoices: Record<string, any>[],
): ClosureProductBreakdown[] {
  const ZERO = new Big(0);
  const map = new Map<
    string,
    {
      product_id: string | null;
      cost_center: string | null;
      quantity: number;
      total_gross: Big;
      cash_gross: Big;
      card_gross: Big;
    }
  >();

  for (const inv of invoices) {
    const method = inv.payments?.[0]?.method ?? "cash";
    const items: any[] = inv.items ?? [];

    for (const item of items) {
      const key = item.product_name;
      const existing = map.get(key) ?? {
        product_id: item.product_id ?? null,
        cost_center: item.cost_center ?? null,
        quantity: 0,
        total_gross: ZERO,
        cash_gross: ZERO,
        card_gross: ZERO,
      };

      const qty = Number(item.quantity);
      const gross = new Big(item.row_total_gross);

      existing.quantity += qty;
      existing.total_gross = existing.total_gross.plus(gross);
      if (method === "cash") {
        existing.cash_gross = existing.cash_gross.plus(gross);
      } else {
        existing.card_gross = existing.card_gross.plus(gross);
      }
      map.set(key, existing);
    }
  }

  return Array.from(map.entries())
    .map(([product_name, v]) => ({
      product_name,
      product_id: v.product_id,
      cost_center: v.cost_center,
      quantity: v.quantity,
      total_gross: v.total_gross.toFixed(2),
      cash_gross: v.cash_gross.toFixed(2),
      card_gross: v.card_gross.toFixed(2),
    }))
    .sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));
}

/**
 * Count invoices by type.
 */
export function computeInvoiceTypeCounts(
  invoices: Record<string, any>[],
): InvoiceTypeCounts {
  let tickets = 0;
  let facturas = 0;
  let rectificativas = 0;
  for (const inv of invoices) {
    if (inv.invoice_type === "ticket") tickets++;
    else if (inv.invoice_type === "factura") facturas++;
    else if (inv.invoice_type === "rectificativa") rectificativas++;
  }
  return { tickets, facturas, rectificativas };
}

/**
 * Aggregate multiple closure records into a single report.
 * Each closure must have total fields, tax_breakdown, product_breakdown, invoice_type_counts.
 */
export function aggregateClosures(
  closures: Record<string, any>[],
  period: AggregatedReport["period"],
  includeShifts: boolean = false,
): AggregatedReport {
  const ZERO = new Big(0);
  let totalGross = ZERO;
  let totalNet = ZERO;
  let totalTax = ZERO;
  let totalCash = ZERO;
  let totalCard = ZERO;
  let transactionCount = 0;

  let tickets = 0;
  let facturas = 0;
  let rectificativas = 0;

  const taxMap = new Map<string, { net: Big; tax: Big }>();
  const productMap = new Map<
    string,
    {
      product_id: string | null;
      cost_center: string | null;
      quantity: number;
      total_gross: Big;
      cash_gross: Big;
      card_gross: Big;
    }
  >();

  const shifts: AggregatedReport["shifts"] = [];

  for (const c of closures) {
    totalGross = totalGross.plus(new Big(c.total_gross ?? "0"));
    totalNet = totalNet.plus(new Big(c.total_net ?? "0"));
    totalTax = totalTax.plus(new Big(c.total_tax ?? "0"));
    totalCash = totalCash.plus(new Big(c.total_cash ?? "0"));
    totalCard = totalCard.plus(new Big(c.total_card ?? "0"));
    transactionCount += c.transaction_count ?? 0;

    // Invoice type counts
    const counts: InvoiceTypeCounts = c.invoice_type_counts ?? {
      tickets: 0,
      facturas: 0,
      rectificativas: 0,
    };
    tickets += counts.tickets;
    facturas += counts.facturas;
    rectificativas += counts.rectificativas;

    // Tax breakdown
    for (const entry of c.tax_breakdown ?? []) {
      const existing = taxMap.get(entry.rate) ?? { net: ZERO, tax: ZERO };
      taxMap.set(entry.rate, {
        net: existing.net.plus(new Big(entry.net)),
        tax: existing.tax.plus(new Big(entry.tax)),
      });
    }

    // Product breakdown
    for (const p of c.product_breakdown ?? []) {
      const key = p.product_name;
      const existing = productMap.get(key) ?? {
        product_id: p.product_id ?? null,
        cost_center: p.cost_center ?? null,
        quantity: 0,
        total_gross: ZERO,
        cash_gross: ZERO,
        card_gross: ZERO,
      };
      existing.quantity += p.quantity;
      existing.total_gross = existing.total_gross.plus(
        new Big(p.total_gross ?? "0"),
      );
      existing.cash_gross = existing.cash_gross.plus(
        new Big(p.cash_gross ?? "0"),
      );
      existing.card_gross = existing.card_gross.plus(
        new Big(p.card_gross ?? "0"),
      );
      productMap.set(key, existing);
    }

    if (includeShifts) {
      shifts.push({
        id: c.id,
        period_start: c.period_start,
        period_end: c.period_end ?? null,
        total_gross: c.total_gross ?? "0.00",
        total_cash: c.total_cash ?? "0.00",
        total_card: c.total_card ?? "0.00",
        transaction_count: c.transaction_count ?? 0,
        difference: c.difference ?? null,
        invoice_counts: counts,
        product_breakdown: c.product_breakdown ?? [],
      });
    }
  }

  const taxBreakdown = Array.from(taxMap.entries())
    .filter(([, v]) => !v.tax.eq(0))
    .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
    .map(([rate, v]) => ({
      rate,
      net: v.net.toFixed(2),
      tax: v.tax.toFixed(2),
    }));

  const productBreakdown = Array.from(productMap.entries())
    .map(([product_name, v]) => ({
      product_name,
      product_id: v.product_id,
      cost_center: v.cost_center,
      quantity: v.quantity,
      total_gross: v.total_gross.toFixed(2),
      cash_gross: v.cash_gross.toFixed(2),
      card_gross: v.card_gross.toFixed(2),
    }))
    .sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));

  return {
    period,
    summary: {
      total_gross: totalGross.toFixed(2),
      total_net: totalNet.toFixed(2),
      total_tax: totalTax.toFixed(2),
      total_cash: totalCash.toFixed(2),
      total_card: totalCard.toFixed(2),
      transaction_count: transactionCount,
    },
    invoice_counts: { tickets, facturas, rectificativas },
    tax_breakdown: taxBreakdown,
    product_breakdown: productBreakdown,
    shifts,
  };
}
