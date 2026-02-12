import {
  readItems,
  updateItem,
  type DirectusClient,
  type RestClient,
} from "@directus/sdk";
import type { CashRegisterClosure, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

/** Open register via invoice-processor extension endpoint */
export async function openClosure(
  client: Client,
  data: { starting_cash: string },
): Promise<CashRegisterClosure> {
  const res: { success: boolean; closure: CashRegisterClosure } =
    await (client as any).request(() => ({
      method: "POST",
      path: "/invoice-processor/cash-register/open",
      body: JSON.stringify({
        starting_cash: parseFloat(data.starting_cash),
      }),
      headers: { "Content-Type": "application/json" },
    }));
  return res.closure;
}

/** Write report totals to the closure before closing */
export async function updateClosureTotals(
  client: Client,
  id: string,
  data: {
    total_gross: string;
    total_net: string;
    total_tax: string;
    total_cash: string;
    total_card: string;
    total_change: string;
    transaction_count: number;
    tax_breakdown: { rate: string; net: string; tax: string }[];
  },
) {
  return client.request(
    updateItem("cash_register_closures", id, data as any),
  );
}

/** Close register via invoice-processor extension endpoint */
export async function closeClosure(
  client: Client,
  data: {
    counted_cash: string;
    denomination_count?: { cents: number; label: string; qty: number }[];
  },
): Promise<CashRegisterClosure> {
  const res: { success: boolean; closure: CashRegisterClosure } =
    await (client as any).request(() => ({
      method: "POST",
      path: "/invoice-processor/cash-register/close",
      body: JSON.stringify({
        counted_cash: parseFloat(data.counted_cash),
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
