import type { DirectusClient, RestClient } from "@directus/sdk";
import type { AggregatedReport, Schema } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

type ReportPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

type ReportParams =
  | { date: string }
  | { year: string; month: string }
  | { year: string; quarter: string }
  | { year: string };

function buildQueryString(params: ReportParams): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
}

/** Fetch an aggregated report from the server */
export async function getReport(
  client: Client,
  period: ReportPeriod,
  params: ReportParams,
): Promise<AggregatedReport> {
  const qs = buildQueryString(params);
  return (client as any).request(() => ({
    method: "GET",
    path: `/pulpo-extension/reports/${period}?${qs}`,
  }));
}

/** Trigger backfill of product_breakdown on existing closures */
export async function backfillClosures(
  client: Client,
): Promise<{ success: boolean; updated: number }> {
  return (client as any).request(() => ({
    method: "POST",
    path: "/pulpo-extension/reports/backfill",
    body: JSON.stringify({}),
    headers: { "Content-Type": "application/json" },
  }));
}
