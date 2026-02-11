import {
  createItem,
  readItem,
  readItems,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { Invoice, InvoiceItem, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

export async function createInvoice(
  client: Client,
  data: Omit<Invoice, "id" | "date_created" | "items"> & {
    items: Omit<InvoiceItem, "id" | "invoice_id">[];
  },
) {
  const { items, ...invoiceData } = data;

  const invoice = await client.request(
    createItem("invoices", {
      ...invoiceData,
      items: {
        create: items,
      },
    } as any),
  );

  return invoice;
}

export async function getInvoices(
  client: Client,
  query?: { tenant?: string; status?: Invoice["status"] },
) {
  const filter: any = {};
  if (query?.tenant) filter.tenant = { _eq: query.tenant };
  if (query?.status) filter.status = { _eq: query.status };

  return client.request(
    readItems("invoices", {
      filter,
      sort: ["-date_created"],
      fields: ["*", { items: ["*"] }],
    }),
  );
}

export async function getInvoice(client: Client, id: string) {
  return client.request(
    readItem("invoices", id, {
      fields: ["*", { items: ["*"] }],
    }),
  );
}
