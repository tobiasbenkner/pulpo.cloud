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
      const { counted_cash, denomination_count } = req.body as {
        counted_cash?: number;
        denomination_count?: Record<string, number>;
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

      if (counted_cash !== undefined) {
        updateData.counted_cash = counted_cash;

        // total_cash = sum(pmt.amount) = net cash gain (already excludes change)
        const expectedCash =
          (Number(openClosure.starting_cash) || 0) +
          (Number(openClosure.total_cash) || 0);

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
