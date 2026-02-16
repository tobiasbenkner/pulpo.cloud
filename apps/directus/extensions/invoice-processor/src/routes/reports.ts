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

function getDateRange(
  type: PeriodType,
  params: Record<string, string>,
  timezone: string,
): { from: string; to: string; label: string } {
  const tz = timezone || "Europe/Madrid";

  if (type === "daily") {
    const date = params.date;
    if (!date) throw new Error("Missing 'date' parameter (YYYY-MM-DD)");
    const d = new Date(date + "T12:00:00");
    const label = d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: tz,
    });
    return { from: `${date}T00:00:00`, to: `${date}T23:59:59`, label };
  }

  if (type === "weekly") {
    const date = params.date;
    if (!date) throw new Error("Missing 'date' parameter (YYYY-MM-DD)");
    const d = new Date(date + "T12:00:00");
    // Find Monday of the week
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().slice(0, 10);
    const sundayStr = sunday.toISOString().slice(0, 10);

    // ISO week number
    const jan1 = new Date(monday.getFullYear(), 0, 1);
    const weekNum = Math.ceil(
      ((monday.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7,
    );

    return {
      from: `${mondayStr}T00:00:00`,
      to: `${sundayStr}T23:59:59`,
      label: `Semana ${weekNum}, ${monday.getFullYear()}`,
    };
  }

  if (type === "monthly") {
    const year = parseInt(params.year);
    const month = parseInt(params.month);
    if (!year || !month)
      throw new Error("Missing 'year' and 'month' parameters");
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const monthName = firstDay.toLocaleDateString("es-ES", {
      month: "long",
      timeZone: tz,
    });
    return {
      from: `${firstDay.toISOString().slice(0, 10)}T00:00:00`,
      to: `${lastDay.toISOString().slice(0, 10)}T23:59:59`,
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
    };
  }

  if (type === "quarterly") {
    const year = parseInt(params.year);
    const quarter = parseInt(params.quarter);
    if (!year || !quarter)
      throw new Error("Missing 'year' and 'quarter' parameters");
    const startMonth = (quarter - 1) * 3;
    const firstDay = new Date(year, startMonth, 1);
    const lastDay = new Date(year, startMonth + 3, 0);
    return {
      from: `${firstDay.toISOString().slice(0, 10)}T00:00:00`,
      to: `${lastDay.toISOString().slice(0, 10)}T23:59:59`,
      label: `Q${quarter} ${year}`,
    };
  }

  if (type === "yearly") {
    const year = parseInt(params.year);
    if (!year) throw new Error("Missing 'year' parameter");
    return {
      from: `${year}-01-01T00:00:00`,
      to: `${year}-12-31T23:59:59`,
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
        return res
          .status(401)
          .json({ error: "Kein Tenant zugewiesen." });
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
        tenant: { _eq: tenant },
        status: { _eq: "closed" },
        period_start: { _gte: from, _lte: to },
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
