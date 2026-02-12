import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";

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
        counted_cash?: number;
        denomination_count?: Record<string, number>;
        total_gross?: number;
        total_net?: number;
        total_tax?: number;
        total_cash?: number;
        total_card?: number;
        total_change?: number;
        transaction_count?: number;
        tax_breakdown?: { rate: string; net: string; tax: string }[];
      };

      const tenant = await getTenantFromUser(req, context);
      if (!tenant) {
        return res
          .status(401)
          .json({ error: "Nicht authentifiziert oder kein Tenant zugewiesen." });
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
        const cashTotal =
          total_cash ?? Number(openClosure.total_cash) ?? 0;
        const expectedCash =
          (Number(openClosure.starting_cash) || 0) + Number(cashTotal);

        updateData.expected_cash = expectedCash;
        updateData.difference = counted_cash - expectedCash;
      }

      if (denomination_count !== undefined) {
        updateData.denomination_count = denomination_count;
      }

      await closureService.updateOne(openClosure.id as string, updateData);

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
