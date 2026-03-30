import { pb } from "./pb";
import type {
  Company,
  ProductCategory,
  PbProduct,
  TaxZone,
  TaxRule,
  TaxClass,
  Customer,
  Closure,
  Invoice,
  InvoiceItem,
  InvoicePayment,
  AggregatedReport,
} from "./types";

// --- Helpers ---

function normalizeInvoice(record: any): Invoice {
  const inv = { ...record };
  const rawItems =
    record.expand?.invoice_items_via_invoice ?? record.items ?? [];
  // Add product_id alias for backward compatibility (PB field is "product")
  inv.items = rawItems.map((item: any) => ({
    ...item,
    product_id: item.product_id ?? item.product ?? null,
    invoice_id: item.invoice_id ?? item.invoice ?? null,
  }));
  const rawPayments =
    record.expand?.invoice_payments_via_invoice ?? record.payments ?? [];
  inv.payments = rawPayments.map((pmt: any) => ({
    ...pmt,
    invoice_id: pmt.invoice_id ?? pmt.invoice ?? null,
    date_created: pmt.date_created ?? pmt.created ?? null,
  }));
  // Alias for date_created
  inv.date_created = inv.date_created ?? inv.created ?? null;
  inv.closure_id = inv.closure_id ?? inv.closure ?? null;
  inv.original_invoice_id =
    inv.original_invoice_id ?? inv.original_invoice ?? null;
  return inv as Invoice;
}

// --- Company ---

export async function getCompany(): Promise<Company> {
  const records = await pb
    .collection("company")
    .getFullList<Company>({ requestKey: null });
  if (records.length === 0) throw new Error("No company record found");
  return records[0];
}

// --- Products ---

export async function getCategoriesWithProducts() {
  const [categories, products] = await Promise.all([
    pb
      .collection("products_categories")
      .getFullList<ProductCategory>({ sort: "sort", requestKey: null }),
    pb.collection("products").getFullList<PbProduct>({
      sort: "sort",
      expand: "tax_class,cost_center",
      requestKey: null,
    }),
  ]);

  return categories.map((cat) => ({
    ...cat,
    products: products.filter((p) => p.category === cat.id),
  }));
}

export async function updateProductStock(
  productId: string,
  stock: number | null,
) {
  await pb.collection("products").update(productId, { stock });
}

// --- Tax ---

export interface TaxRuleResult {
  classCode: string;
  rate: string;
  surcharge: string;
}

export async function getTaxRulesForPostcode(
  postcode: string,
): Promise<TaxRuleResult[]> {
  const zones = await pb
    .collection("tax_zones")
    .getFullList<TaxZone>({ sort: "priority", requestKey: null });

  const matched = zones.find(
    (z) => z.regex && new RegExp(z.regex).test(postcode),
  );
  if (!matched) return [];

  const rules = await pb.collection("tax_rules").getFullList<TaxRule>({
    filter: `tax_zone = "${matched.id}"`,
    expand: "tax_class",
    requestKey: null,
  });

  return rules.map((r) => ({
    classCode: (r.expand?.tax_class as TaxClass)?.code ?? "",
    rate: r.rate ?? "0",
    surcharge: r.surcharge ?? "0",
  }));
}

// --- Customers ---

export async function getCustomers(): Promise<Customer[]> {
  return pb
    .collection("customers")
    .getFullList<Customer>({ sort: "name", requestKey: null });
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  return pb.collection("customers").getFullList<Customer>({
    filter: `name ~ "${query}" || nif ~ "${query}"`,
    sort: "name",
    requestKey: null,
  });
}

export async function createCustomer(
  data: Partial<Customer>,
): Promise<Customer> {
  return pb.collection("customers").create<Customer>(data);
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>,
): Promise<Customer> {
  return pb.collection("customers").update<Customer>(id, data);
}

export async function deleteCustomer(id: string): Promise<void> {
  await pb.collection("customers").delete(id);
}

// --- Invoices ---

export async function createInvoice(data: {
  status: "paid";
  items: {
    product_id: string;
    quantity: number;
    discount?: { type: "percent" | "fixed"; value: number } | null;
  }[];
  discount?: { type: "percent" | "fixed"; value: number } | null;
  customer_id?: string | null;
  payments: {
    method: "cash" | "card";
    amount: string;
    tendered: string | null;
    change: string | null;
    tip: string | null;
  }[];
}): Promise<Invoice> {
  const res = await pb.send("/api/custom/invoices", {
    method: "POST",
    body: data,
  });
  return normalizeInvoice(res.invoice ?? res);
}

export async function rectifyInvoice(data: {
  original_invoice_id: string;
  reason: string;
  reason_detail?: string;
  payment_method: "cash" | "card";
  items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
  }[];
}): Promise<{ rectificativa: Invoice; original: Invoice }> {
  const res = await pb.send("/api/custom/invoices/rectify", {
    method: "POST",
    body: data,
  });
  return {
    rectificativa: normalizeInvoice(res.rectificativa),
    original: normalizeInvoice(res.original),
  };
}

export async function getInvoices(query?: {
  status?: Invoice["status"] | Invoice["status"][];
  dateFrom?: string;
  dateTo?: string;
  closureId?: string;
  invoiceNumber?: string;
  originalInvoiceId?: string;
}): Promise<Invoice[]> {
  const filters: string[] = [];

  if (query?.status) {
    if (Array.isArray(query.status)) {
      const clauses = query.status.map((s) => `status = "${s}"`);
      filters.push(`(${clauses.join(" || ")})`);
    } else {
      filters.push(`status = "${query.status}"`);
    }
  }
  if (query?.closureId) filters.push(`closure = "${query.closureId}"`);
  if (query?.invoiceNumber)
    filters.push(`invoice_number = "${query.invoiceNumber}"`);
  if (query?.originalInvoiceId)
    filters.push(`original_invoice = "${query.originalInvoiceId}"`);
  if (query?.dateFrom)
    filters.push(`created >= "${query.dateFrom.replace("T", " ")}"`);
  if (query?.dateTo)
    filters.push(`created <= "${query.dateTo.replace("T", " ")}"`);

  const records = await pb.collection("invoices").getFullList({
    filter: filters.join(" && "),
    sort: "-created",
    expand: "invoice_items_via_invoice,invoice_payments_via_invoice",
    requestKey: null,
  });
  return records.map(normalizeInvoice);
}

export async function getInvoice(id: string): Promise<Invoice> {
  const record = await pb.collection("invoices").getOne(id, {
    expand: "invoice_items_via_invoice,invoice_payments_via_invoice",
  });
  return normalizeInvoice(record);
}

export async function updateInvoicePaymentMethod(
  paymentId: string,
  newMethod: "cash" | "card",
  _amount?: string,
) {
  return pb.send("/api/custom/invoices/swap-payment", {
    method: "POST",
    body: { payment_id: paymentId, method: newMethod },
  });
}

// --- Cash Register ---

export async function openClosure(data: {
  starting_cash: string;
}): Promise<Closure> {
  const res = await pb.send("/api/custom/cash-register/open", {
    method: "POST",
    body: data,
  });
  return res.closure;
}

export async function closeClosure(data: {
  counted_cash: string;
  denomination_count?: { cents: number; label: string; qty: number }[];
}): Promise<Closure> {
  const res = await pb.send("/api/custom/cash-register/close", {
    method: "POST",
    body: data,
  });
  return res.closure;
}

export async function getOpenClosure(): Promise<Closure | null> {
  const results = await pb.collection("closures").getFullList<Closure>({
    filter: 'status = "open"',
    sort: "-created",
    requestKey: null,
  });
  return results[0] ?? null;
}

export async function getLastClosure(): Promise<Closure | null> {
  const results = await pb.collection("closures").getFullList<Closure>({
    filter: 'status = "closed"',
    sort: "-created",
    requestKey: null,
  });
  return results[0] ?? null;
}

export async function getClosuresForDate(date: string): Promise<Closure[]> {
  const dayStart = `${date} 00:00:00`;
  const dayEnd = `${date} 23:59:59`;

  return pb.collection("closures").getFullList<Closure>({
    filter: `status = "closed" && period_start >= "${dayStart}" && period_start <= "${dayEnd}"`,
    sort: "-period_start",
    requestKey: null,
  });
}

// --- Reports ---

type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
type ReportParams = Record<string, string>;

function buildQueryString(params: ReportParams): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

export async function getReport(
  period: ReportPeriod,
  params: ReportParams,
): Promise<AggregatedReport> {
  const qs = buildQueryString(params);
  return pb.send(`/api/custom/reports/${period}?${qs}`, { method: "GET" });
}

export function getReportExcelUrl(
  period: ReportPeriod,
  params: ReportParams,
): string {
  const qs = buildQueryString(params);
  return `/api/custom/reports/${period}/excel?${qs}`;
}

// --- Images ---

export function getFileUrl(
  record: { id: string; collectionId: string; collectionName: string },
  filename: string,
): string {
  if (!filename) return "";
  return pb.files.getURL(record, filename);
}
