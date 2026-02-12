import {
  createItem,
  readItems,
  updateItem,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { CashRegisterClosure, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

/** Create a new open closure when the register opens */
export async function openClosure(
  client: Client,
  data: { period_start: string; starting_cash: string },
) {
  return client.request(
    createItem("cash_register_closures", {
      ...data,
      status: "open",
    } as any),
  );
}

/** Finalize the closure with totals and counting data */
export async function closeClosure(
  client: Client,
  id: string,
  data: Omit<
    CashRegisterClosure,
    "id" | "date_created" | "tenant" | "status" | "period_start" | "starting_cash"
  >,
) {
  return client.request(
    updateItem("cash_register_closures", id, {
      ...data,
      status: "closed",
    } as any),
  );
}

/** Get the currently open closure (if any) */
export async function getOpenClosure(client: Client) {
  const results = await client.request(
    readItems("cash_register_closures", {
      filter: { status: { _eq: "open" } },
      sort: ["-date_created"],
      limit: 1,
    }),
  );
  return results[0] ?? null;
}

/** Get the last closed closure */
export async function getLastClosure(client: Client) {
  const results = await client.request(
    readItems("cash_register_closures", {
      filter: { status: { _eq: "closed" } },
      sort: ["-date_created"],
      limit: 1,
    }),
  );
  return results[0] ?? null;
}
