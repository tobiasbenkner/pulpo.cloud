import {
  readItem,
  readItems,
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
    status?: Invoice["status"];
    dateFrom?: string;
    dateTo?: string;
    closureId?: string;
  },
) {
  const filter: any = {};
  if (query?.tenant) filter.tenant = { _eq: query.tenant };
  if (query?.status) filter.status = { _eq: query.status };
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

