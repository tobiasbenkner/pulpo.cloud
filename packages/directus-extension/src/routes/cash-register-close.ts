import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";
import Big from "big.js";
import {
  computeProductBreakdown,
  computeInvoiceTypeCounts,
  computeTaxBreakdown,
} from "../helpers/report-aggregator";

export function registerCashRegisterClose(
  router: Router,
  context: EndpointContext,
) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  router.post("/cash-register/close", async (req, res) => {
    try {
      const { counted_cash, denomination_count } = req.body as {
        counted_cash?: string;
        denomination_count?: Record<string, number>;
      };

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

      // === TRANSACTION: lock tenant, close register, compute all totals ===
      const txResult = await (database as any).transaction(async (trx: any) => {
        // Lock tenant row — prevents concurrent close requests
        const lockedTenant = await trx("tenants").where("id", tenant).forUpdate().first();
        if (!lockedTenant) {
          return { error: "Tenant nicht gefunden.", status: 404 };
        }

        const closureService = new ItemsService("cash_register_closures", {
          schema,
          knex: trx,
        });

        const openClosures = await closureService.readByQuery({
          filter: {
            tenant: { _eq: tenant },
            status: { _eq: "open" },
          },
          limit: 1,
        });

        if (openClosures.length === 0) {
          return {
            error:
              "Kein offener Kassenabschluss gefunden. Bitte zuerst einen öffnen.",
            status: 404,
          };
        }

        const openClosure = openClosures[0] as Record<string, unknown>;
        const closureId = openClosure.id as string;

        // Fetch all invoices for this closure
        const invoiceService = new ItemsService("invoices", {
          schema,
          knex: trx,
        });
        const closureInvoices = await invoiceService.readByQuery({
          filter: {
            closure_id: { _eq: closureId },
            status: { _in: ["paid", "rectificada"] },
          },
          fields: [
            "id",
            "invoice_type",
            "total_gross",
            "total_net",
            "total_tax",
            "tax_breakdown",
            "items.product_name",
            "items.product_id",
            "items.cost_center",
            "items.quantity",
            "items.row_total_gross",
            "items.tax_rate_snapshot",
            "payments.method",
            "payments.amount",
            "payments.change",
          ],
          limit: -1,
        });

        // Compute all totals from actual invoice data
        const ZERO = new Big(0);
        let totalGross = ZERO;
        let totalNet = ZERO;
        let totalTax = ZERO;
        let totalCash = ZERO;
        let totalCard = ZERO;
        let totalChange = ZERO;

        for (const inv of closureInvoices as Record<string, any>[]) {
          totalGross = totalGross.plus(new Big(inv.total_gross ?? "0"));
          totalNet = totalNet.plus(new Big(inv.total_net ?? "0"));
          totalTax = totalTax.plus(new Big(inv.total_tax ?? "0"));

          for (const pmt of inv.payments ?? []) {
            if (pmt.method === "cash") {
              totalCash = totalCash.plus(new Big(pmt.amount ?? "0"));
              if (pmt.change) {
                totalChange = totalChange.plus(new Big(pmt.change));
              }
            } else {
              totalCard = totalCard.plus(new Big(pmt.amount ?? "0"));
            }
          }
        }

        // Build update data
        const updateData: Record<string, unknown> = {
          status: "closed",
          period_end: new Date().toISOString(),
          total_gross: totalGross.toFixed(2),
          total_net: totalNet.toFixed(2),
          total_tax: totalTax.toFixed(2),
          total_cash: totalCash.toFixed(2),
          total_card: totalCard.toFixed(2),
          total_change: totalChange.toFixed(2),
          transaction_count: closureInvoices.length,
          tax_breakdown: computeTaxBreakdown(closureInvoices as Record<string, any>[]),
          product_breakdown: computeProductBreakdown(closureInvoices as Record<string, any>[]),
          invoice_type_counts: computeInvoiceTypeCounts(closureInvoices as Record<string, any>[]),
        };

        if (counted_cash !== undefined) {
          updateData.counted_cash = counted_cash;

          const startingCash = new Big(
            (openClosure.starting_cash as string) ?? "0",
          );
          const expectedCash = startingCash.plus(totalCash);
          const difference = new Big(counted_cash).minus(expectedCash);

          updateData.expected_cash = expectedCash.toFixed(2);
          updateData.difference = difference.toFixed(2);
        }

        if (denomination_count !== undefined) {
          updateData.denomination_count = denomination_count;
        }

        // Single atomic update with all data
        await closureService.updateOne(closureId, updateData);

        return { success: true, closureId };
      });
      // === END TRANSACTION ===

      if ("error" in txResult) {
        return res.status(txResult.status).json({ error: txResult.error });
      }

      // Read final closure for response (outside transaction)
      const closureService = new ItemsService("cash_register_closures", {
        schema,
        knex: database,
      });
      const updatedClosure = await closureService.readOne(txResult.closureId);

      return res.json({ success: true, closure: updatedClosure });
    } catch (error: unknown) {
      console.error("Error closing cash register:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
