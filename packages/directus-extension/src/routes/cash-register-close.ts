import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";
import Big from "big.js";
import {
  computeProductBreakdown,
  computeInvoiceTypeCounts,
} from "../helpers/report-aggregator";

export function registerCashRegisterClose(
  router: Router,
  context: EndpointContext,
) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  router.post("/cash-register/close", async (req, res) => {
    try {
      const {
        counted_cash,
        denomination_count,
        total_gross,
        total_net,
        total_tax,
        total_cash,
        total_card,
        total_change,
        transaction_count,
        tax_breakdown,
      } = req.body as {
        counted_cash?: string;
        denomination_count?: Record<string, number>;
        total_gross?: string;
        total_net?: string;
        total_tax?: string;
        total_cash?: string;
        total_card?: string;
        total_change?: string;
        transaction_count?: number;
        tax_breakdown?: { rate: string; net: string; tax: string }[];
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
      const closureService = new ItemsService("cash_register_closures", {
        schema,
        knex: database,
      });

      const openClosures = await closureService.readByQuery({
        filter: {
          tenant: { _eq: tenant },
          status: { _eq: "open" },
        },
        limit: 1,
      });

      if (openClosures.length === 0) {
        return res.status(404).json({
          error:
            "Kein offener Kassenabschluss gefunden. Bitte zuerst einen öffnen.",
        });
      }

      const openClosure = openClosures[0] as Record<string, unknown>;

      const updateData: Record<string, unknown> = {
        status: "closed",
        period_end: new Date().toISOString(),
      };

      // Write report totals
      if (total_gross !== undefined) updateData.total_gross = total_gross;
      if (total_net !== undefined) updateData.total_net = total_net;
      if (total_tax !== undefined) updateData.total_tax = total_tax;
      if (total_cash !== undefined) updateData.total_cash = total_cash;
      if (total_card !== undefined) updateData.total_card = total_card;
      if (total_change !== undefined) updateData.total_change = total_change;
      if (transaction_count !== undefined)
        updateData.transaction_count = transaction_count;
      if (tax_breakdown !== undefined)
        updateData.tax_breakdown = tax_breakdown;

      if (counted_cash !== undefined) {
        updateData.counted_cash = counted_cash;

        // total_cash from body (or already on record) for expected_cash calc
        const cashTotal = new Big(
          total_cash ?? (openClosure.total_cash as string) ?? "0",
        );
        const startingCash = new Big(
          (openClosure.starting_cash as string) ?? "0",
        );
        const expectedCash = startingCash.plus(cashTotal);
        const difference = new Big(counted_cash).minus(expectedCash);

        updateData.expected_cash = expectedCash.toFixed(2);
        updateData.difference = difference.toFixed(2);
      }

      if (denomination_count !== undefined) {
        updateData.denomination_count = denomination_count;
      }

      await closureService.updateOne(openClosure.id as string, updateData);

      // Compute product breakdown and invoice type counts
      const invoiceService = new ItemsService("invoices", {
        schema,
        knex: database,
      });
      const closureInvoices = await invoiceService.readByQuery({
        filter: {
          closure_id: { _eq: openClosure.id },
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

      const productBreakdown = computeProductBreakdown(closureInvoices);
      const invoiceTypeCounts = computeInvoiceTypeCounts(closureInvoices);

      await closureService.updateOne(openClosure.id as string, {
        product_breakdown: productBreakdown,
        invoice_type_counts: invoiceTypeCounts,
      });

      const updatedClosure = await closureService.readOne(
        openClosure.id as string,
      );

      return res.json({ success: true, closure: updatedClosure });
    } catch (error: unknown) {
      console.error("Error closing cash register:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
