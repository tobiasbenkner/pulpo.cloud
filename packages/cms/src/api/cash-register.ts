import { readItems, type DirectusClient, type RestClient } from "@directus/sdk";
import type { CashRegisterClosure, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

/** Open register via invoice-processor extension endpoint */
export async function openClosure(
  client: Client,
  data: { starting_cash: string },
): Promise<CashRegisterClosure> {
  const res: { success: boolean; closure: CashRegisterClosure } = await (
    client as any
  ).request(() => ({
    method: "POST",
    path: "/pulpo-extension/cash-register/open",
    body: JSON.stringify({
      starting_cash: data.starting_cash,
    }),
    headers: { "Content-Type": "application/json" },
  }));
  return res.closure;
}

/** Close register via extension endpoint. Server computes all totals from invoice data. */
export async function closeClosure(
  client: Client,
  data: {
    counted_cash: string;
    denomination_count?: { cents: number; label: string; qty: number }[];
  },
): Promise<CashRegisterClosure> {
  const res: { success: boolean; closure: CashRegisterClosure } = await (
    client as any
  ).request(() => ({
    method: "POST",
    path: "/pulpo-extension/cash-register/close",
    body: JSON.stringify({
      counted_cash: data.counted_cash,
      denomination_count: data.denomination_count,
    }),
    headers: { "Content-Type": "application/json" },
  }));
  return res.closure;
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

/** Get all closed closures for a specific date */
export async function getClosuresForDate(client: Client, date: string) {
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  return await client.request(
    readItems("cash_register_closures", {
      filter: {
        _and: [
          { status: { _eq: "closed" } },
          { period_start: { _gte: dayStart } },
          { period_start: { _lte: dayEnd } },
        ],
      } as any,
      sort: ["-period_start"],
    }),
  );
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
