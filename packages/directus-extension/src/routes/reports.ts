import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";
import {
  aggregateClosures,
  computeProductBreakdown,
  computeInvoiceTypeCounts,
  type AggregatedReport,
} from "../helpers/report-aggregator";

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

/** Get the last day of a month (1-indexed). */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** ISO 8601 week number (the week containing the year's first Thursday). */
function isoWeekNumber(year: number, month: number, day: number): number {
  const date = new Date(year, month - 1, day);
  // Find Thursday of the current week
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -3 : 4 - dayOfWeek;
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + diff);
  const jan1 = new Date(thursday.getFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
}

/**
 * Convert a local date/time in a given IANA timezone to a UTC ISO string.
 * Needed because period_start is `timestamp with time zone` (stored as UTC).
 */
function localToUTC(
  year: number, month: number, day: number,
  hour: number, min: number, sec: number,
  timezone: string,
): string {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
    hour12: false,
  });
  const p = { year: 0, month: 0, day: 0, hour: 0, minute: 0, second: 0 };
  for (const { type, value } of formatter.formatToParts(utcGuess)) {
    if (type in p) p[type as keyof typeof p] = parseInt(value, 10);
  }
  const h = p.hour === 24 ? 0 : p.hour;
  const actualLocal = Date.UTC(
    p.year, p.month - 1, p.day, h, p.minute, p.second,
  );
  const desiredLocal = Date.UTC(year, month - 1, day, hour, min, sec);
  return new Date(utcGuess.getTime() + (desiredLocal - actualLocal)).toISOString();
}

function parseDate(date: string): [number, number, number] {
  const parts = date.split("-").map(Number) as [number, number, number];
  return parts;
}

function getDateRange(
  type: PeriodType,
  params: Record<string, string>,
  timezone: string,
): { from: string; to: string; label: string } {
  const tz = timezone || "Europe/Madrid";

  if (type === "daily") {
    const date = params.date;
    if (!date) throw new Error("Missing 'date' parameter (YYYY-MM-DD)");
    const [y, m, d] = parseDate(date);
    const label = new Date(y, m - 1, d).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    });
    return {
      from: localToUTC(y, m, d, 0, 0, 0, tz),
      to: localToUTC(y, m, d, 23, 59, 59, tz),
      label,
    };
  }

  if (type === "weekly") {
    const date = params.date;
    if (!date) throw new Error("Missing 'date' parameter (YYYY-MM-DD)");
    const [y, m, d] = parseDate(date);
    const dateObj = new Date(y, m - 1, d);
    // Find Monday of the week
    const dow = dateObj.getDay();
    const diffToMonday = dow === 0 ? 6 : dow - 1;
    const mondayDate = new Date(y, m - 1, d - diffToMonday);
    const sundayDate = new Date(
      mondayDate.getFullYear(),
      mondayDate.getMonth(),
      mondayDate.getDate() + 6,
    );

    const my = mondayDate.getFullYear();
    const mm = mondayDate.getMonth() + 1;
    const md = mondayDate.getDate();
    const sy = sundayDate.getFullYear();
    const sm = sundayDate.getMonth() + 1;
    const sd = sundayDate.getDate();

    const weekNum = isoWeekNumber(my, mm, md);

    return {
      from: localToUTC(my, mm, md, 0, 0, 0, tz),
      to: localToUTC(sy, sm, sd, 23, 59, 59, tz),
      label: `Semana ${weekNum}, ${my}`,
    };
  }

  if (type === "monthly") {
    const year = parseInt(params.year ?? "");
    const month = parseInt(params.month ?? "");
    if (!year || !month)
      throw new Error("Missing 'year' and 'month' parameters");
    const lastDay = lastDayOfMonth(year, month);
    const monthName = new Date(year, month - 1, 15).toLocaleDateString(
      "es-ES",
      { month: "long", timeZone: tz },
    );
    return {
      from: localToUTC(year, month, 1, 0, 0, 0, tz),
      to: localToUTC(year, month, lastDay, 23, 59, 59, tz),
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
    };
  }

  if (type === "quarterly") {
    const year = parseInt(params.year ?? "");
    const quarter = parseInt(params.quarter ?? "");
    if (!year || !quarter)
      throw new Error("Missing 'year' and 'quarter' parameters");
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const lastDay = lastDayOfMonth(year, endMonth);
    return {
      from: localToUTC(year, startMonth, 1, 0, 0, 0, tz),
      to: localToUTC(year, endMonth, lastDay, 23, 59, 59, tz),
      label: `Q${quarter} ${year}`,
    };
  }

  if (type === "yearly") {
    const year = parseInt(params.year ?? "");
    if (!year) throw new Error("Missing 'year' parameter");
    return {
      from: localToUTC(year, 1, 1, 0, 0, 0, tz),
      to: localToUTC(year, 12, 31, 23, 59, 59, tz),
      label: `${year}`,
    };
  }

  throw new Error(`Unknown period type: ${type}`);
}

export function registerReports(router: Router, context: EndpointContext) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  // GET /reports/:period (JSON)
  const periods: PeriodType[] = [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
  ];

  for (const periodType of periods) {
    router.get(`/reports/${periodType}`, async (req, res) => {
      try {
        const report = await buildReport(periodType, req.query as any, req);
        return res.json(report);
      } catch (error: unknown) {
        console.error(`Error generating ${periodType} report:`, error);
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return res.status(500).json({ error: message });
      }
    });
  }

  // POST /reports/backfill
  router.post("/reports/backfill", async (req, res) => {
    try {
      const userId = (req as any).accountability?.user;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert." });
      }
      const tenant = await getTenantFromUser(userId, context);
      if (!tenant) {
        return res.status(401).json({ error: "Kein Tenant zugewiesen." });
      }

      const schema = await getSchema();
      const closureService = new ItemsService("cash_register_closures", {
        schema,
        knex: database,
      });
      const invoiceService = new ItemsService("invoices", {
        schema,
        knex: database,
      });

      // Find closures without product_breakdown
      const closures = await closureService.readByQuery({
        filter: {
          tenant: { _eq: tenant },
          status: { _eq: "closed" },
          product_breakdown: { _null: true },
        },
        limit: -1,
      });

      let updated = 0;
      for (const closure of closures) {
        const c = closure as Record<string, any>;
        const invoices = await invoiceService.readByQuery({
          filter: {
            closure_id: { _eq: c.id },
            status: { _in: ["paid", "rectificada"] },
          },
          fields: [
            "id",
            "invoice_type",
            "items.product_name",
            "items.product_id",
            "items.cost_center",
            "items.quantity",
            "items.row_total_gross",
            "payments.method",
          ],
          limit: -1,
        });

        const productBreakdown = computeProductBreakdown(invoices);
        const invoiceTypeCounts = computeInvoiceTypeCounts(invoices);

        await closureService.updateOne(c.id, {
          product_breakdown: productBreakdown,
          invoice_type_counts: invoiceTypeCounts,
        });
        updated++;
      }

      return res.json({ success: true, updated });
    } catch (error: unknown) {
      console.error("Error backfilling closures:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });

  // Helper: build report
  async function buildReport(
    periodType: PeriodType,
    params: Record<string, string>,
    req: any,
  ): Promise<AggregatedReport> {
    const userId = req.accountability?.user;
    if (!userId) throw new Error("Nicht authentifiziert.");
    const tenant = await getTenantFromUser(userId, context);
    if (!tenant) throw new Error("Kein Tenant zugewiesen.");

    const schema = await getSchema();
    const tenantService = new ItemsService("tenants", {
      schema,
      knex: database,
    });
    const tenantRecord = (await tenantService.readOne(tenant)) as Record<
      string,
      any
    >;
    const timezone = tenantRecord.timezone || "Europe/Madrid";

    const { from, to, label } = getDateRange(periodType, params, timezone);

    const closureService = new ItemsService("cash_register_closures", {
      schema,
      knex: database,
    });

    const closures = await closureService.readByQuery({
      filter: {
        _and: [
          { tenant: { _eq: tenant } },
          { status: { _eq: "closed" } },
          { period_start: { _gte: from } },
          { period_start: { _lte: to } },
        ],
      },
      sort: ["-period_start"],
      limit: -1,
    });

    return aggregateClosures(
      closures,
      { type: periodType, label, from, to },
      periodType === "daily",
    );
  }
}
