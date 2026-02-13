import {
  readItem,
  readItems,
  updateItem,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { Invoice, InvoiceItem, InvoicePayment, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

/** Create invoice via invoice-processor extension endpoint */
export async function createInvoice(
  client: Client,
  data: Omit<
    Invoice,
    | "id"
    | "date_created"
    | "invoice_number"
    | "tenant"
    | "closure_id"
    | "previous_record_hash"
    | "chain_hash"
    | "qr_url"
    | "generation_date"
    | "invoice_type"
    | "original_invoice_id"
    | "rectification_reason"
    | "items"
    | "payments"
  > & {
    items: Omit<InvoiceItem, "id" | "invoice_id">[];
    payments: Omit<InvoicePayment, "id" | "date_created" | "invoice_id">[];
  },
): Promise<Invoice> {
  const res: { success: boolean; invoice: Invoice } = await (
    client as any
  ).request(() => ({
    method: "POST",
    path: "/invoice-processor/invoices",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  }));
  return res.invoice;
}

export async function getInvoices(
  client: Client,
  query?: {
    tenant?: string;
    status?: Invoice["status"] | Invoice["status"][];
    dateFrom?: string;
    dateTo?: string;
    closureId?: string;
  },
) {
  const filter: any = {};
  if (query?.tenant) filter.tenant = { _eq: query.tenant };
  if (query?.status) {
    filter.status = Array.isArray(query.status)
      ? { _in: query.status }
      : { _eq: query.status };
  }
  if (query?.closureId) filter.closure_id = { _eq: query.closureId };
  if (query?.dateFrom || query?.dateTo) {
    filter.date_created = {};
    if (query?.dateFrom) filter.date_created._gte = query.dateFrom;
    if (query?.dateTo) filter.date_created._lte = query.dateTo;
  }

  return client.request(
    readItems("invoices", {
      filter,
      sort: ["-date_created"],
      fields: ["*", { items: ["*"] }, { payments: ["*"] }],
      limit: -1,
    }),
  );
}

export async function getInvoice(client: Client, id: string) {
  return client.request(
    readItem("invoices", id, {
      fields: ["*", { items: ["*"] }, { payments: ["*"] }],
    }),
  );
}

/** Rectify (fully or partially cancel) an invoice via invoice-processor extension endpoint */
export async function rectifyInvoice(
  client: Client,
  data: {
    original_invoice_id: string;
    reason: string;
    reason_detail?: string;
    items: {
      product_id: string | null;
      product_name: string;
      quantity: number;
      tax_rate_snapshot: string;
      price_gross_unit: string;
      price_net_unit_precise: string;
      row_total_net_precise: string;
      row_total_gross: string;
      discount_type: "percent" | "fixed" | null;
      discount_value: string | null;
    }[];
  },
): Promise<{ rectificativa: Invoice; original: Invoice }> {
  return (client as any).request(() => ({
    method: "POST",
    path: "/invoice-processor/invoices/rectify",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  }));
}

export async function updateInvoicePaymentMethod(
  client: Client,
  paymentId: number,
  newMethod: "cash" | "card",
  amount: string,
) {
  return client.request(
    updateItem("invoice_payments", paymentId, {
      method: newMethod,
      tendered: amount,
      change: "0.00",
    }),
  );
}

