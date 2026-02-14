import {
  readItems,
  createItem,
  updateItem,
  deleteItem,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { Customer, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

export async function getCustomers(client: Client) {
  return client.request(
    readItems("customers", {
      fields: ["*"],
      sort: ["name"],
      limit: -1,
    }),
  );
}

export async function searchCustomers(client: Client, query: string) {
  return client.request(
    readItems("customers", {
      fields: ["*"],
      filter: {
        _or: [
          { name: { _icontains: query } },
          { nif: { _icontains: query } },
        ],
      },
      sort: ["name"],
      limit: -1,
    }),
  );
}

export async function createCustomer(
  client: Client,
  data: Omit<Customer, "id" | "tenant" | "date_created">,
) {
  return client.request(createItem("customers", data));
}

export async function updateCustomer(
  client: Client,
  id: string,
  data: Partial<Omit<Customer, "id" | "tenant" | "date_created">>,
) {
  return client.request(updateItem("customers", id, data));
}

export async function deleteCustomer(client: Client, id: string) {
  return client.request(deleteItem("customers", id));
}
