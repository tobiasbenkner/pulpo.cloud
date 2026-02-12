import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";

export function registerCashRegisterOpen(
  router: Router,
  context: EndpointContext,
) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  router.post("/cash-register/open", async (req, res) => {
    try {
      const { starting_cash } = req.body as {
        starting_cash?: string;
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

      if (openClosures.length > 0) {
        return res.status(409).json({
          error:
            "Es existiert bereits ein offener Kassenabschluss für diesen Tenant. Bitte zuerst schließen.",
        });
      }

      const newClosureId = await closureService.createOne({
        tenant,
        status: "open",
        period_start: new Date().toISOString(),
        starting_cash: starting_cash ?? "0.00",
      });

      const newClosure = await closureService.readOne(newClosureId);

      return res.json({ success: true, closure: newClosure });
    } catch (error: unknown) {
      console.error("Error opening cash register:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
