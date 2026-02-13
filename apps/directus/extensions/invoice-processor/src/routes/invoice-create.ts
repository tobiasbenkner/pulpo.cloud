import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser, generateInvoiceNumber } from "../helpers";

export function registerInvoiceCreate(
  router: Router,
  context: EndpointContext,
) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  router.post("/invoices", async (req, res) => {
    try {
      const {
        status,
        total_net,
        total_tax,
        total_gross,
        discount_type,
        discount_value,
        items,
        payments,
      } = req.body as {
        status: "draft" | "paid" | "cancelled";
        total_net: string;
        total_tax: string;
        total_gross: string;
        discount_type?: "percent" | "fixed" | null;
        discount_value?: string | null;
        items: Record<string, unknown>[];
        payments: Record<string, unknown>[];
      };

      // 1. Authenticate & resolve tenant
      const userId = (req as any).accountability?.user;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert." });
      }
      const tenant = await getTenantFromUser(userId, context);
      if (!tenant) {
        return res.status(401).json({ error: "Kein Tenant zugewiesen." });
      }

      const schema = await getSchema();

      // 2. Read tenant to get invoice_prefix, timezone, last_invoice_number
      const tenantService = new ItemsService("tenants", {
        schema,
        knex: database,
      });
      const tenantRecord = (await tenantService.readOne(tenant)) as {
        invoice_prefix?: string;
        timezone?: string;
        last_invoice_number?: number;
      };

      // 3. Generate invoice number
      const { invoice_number, new_count } = generateInvoiceNumber(tenantRecord);

      // 4. Find open closure for this tenant
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
      const closureId =
        openClosures.length > 0
          ? (openClosures[0] as Record<string, unknown>).id
          : null;

      // 5. Create invoice with server-set fields
      const invoiceService = new ItemsService("invoices", {
        schema,
        knex: database,
      });
      const invoiceId = await invoiceService.createOne({
        tenant,
        invoice_number,
        closure_id: closureId,
        status,
        total_net,
        total_tax,
        total_gross,
        discount_type: discount_type ?? null,
        discount_value: discount_value ?? null,
        items: {
          create: items.map((item) => ({ ...item, tenant })),
        },
        payments: {
          create: payments.map((payment) => ({ ...payment, tenant })),
        },
      });

      // 6. Update tenant's last_invoice_number
      await tenantService.updateOne(tenant, {
        last_invoice_number: new_count,
      });

      // 7. Decrement product stock (minimum 0)
      for (const item of items) {
        const productId = item.product_id as string | undefined;
        const quantity = item.quantity as number | undefined;
        if (!productId || !quantity) continue;
        const db = database as any;
        await db("products")
          .where("id", productId)
          .whereNotNull("stock")
          .update({
            stock: db.raw("GREATEST(stock - ?, 0)", [Math.round(quantity)]),
          });
      }

      // 8. Return full invoice
      const invoice = await invoiceService.readOne(invoiceId, {
        fields: ["*", "items.*", "payments.*"],
      });

      return res.json({ success: true, invoice });
    } catch (error: unknown) {
      console.error("Error creating invoice:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
