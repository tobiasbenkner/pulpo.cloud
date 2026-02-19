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

      // === TRANSACTION: lock tenant, check for open closure, create new one ===
      const txResult = await (database as any).transaction(async (trx: any) => {
        // Lock tenant row — prevents concurrent open requests
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

        if (openClosures.length > 0) {
          return {
            error:
              "Es existiert bereits ein offener Kassenabschluss für diesen Tenant. Bitte zuerst schließen.",
            status: 409,
          };
        }

        const newClosureId = await closureService.createOne({
          tenant,
          status: "open",
          period_start: new Date().toISOString(),
          starting_cash: starting_cash ?? "0.00",
        });

        return { success: true, closureId: newClosureId };
      });
      // === END TRANSACTION ===

      if ("error" in txResult) {
        return res.status(txResult.status).json({ error: txResult.error });
      }

      // Read full closure for response (outside transaction)
      const closureService = new ItemsService("cash_register_closures", {
        schema,
        knex: database,
      });
      const newClosure = await closureService.readOne(txResult.closureId);

      return res.json({ success: true, closure: newClosure });
    } catch (error: unknown) {
      console.error("Error opening cash register:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
