import {
  readItem,
  readItems,
  updateItem,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { Invoice, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

/** Create invoice via invoice-processor extension endpoint */
export async function createInvoice(
  client: Client,
  data: {
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
  },
): Promise<Invoice> {
  const res: { success: boolean; invoice: Invoice } = await (
    client as any
  ).request(() => ({
    method: "POST",
    path: "/pulpo-extension/invoices",
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
    payment_method: "cash" | "card";
    items: {
      product_id: string | null;
      product_name: string;
      quantity: number;
    }[];
  },
): Promise<{ rectificativa: Invoice; original: Invoice }> {
  return (client as any).request(() => ({
    method: "POST",
    path: "/pulpo-extension/invoices/rectify",
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

