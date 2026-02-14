import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import {
  getTenantFromUser,
  generateInvoiceNumber,
  type InvoiceSeries,
} from "../helpers";

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
        customer_id,
        customer_name,
        customer_nif,
        customer_street,
        customer_zip,
        customer_city,
        customer_email,
        customer_phone,
        items,
        payments,
      } = req.body as {
        status: "draft" | "paid" | "cancelled";
        total_net: string;
        total_tax: string;
        total_gross: string;
        discount_type?: "percent" | "fixed" | null;
        discount_value?: string | null;
        customer_id?: string | null;
        customer_name?: string | null;
        customer_nif?: string | null;
        customer_street?: string | null;
        customer_zip?: string | null;
        customer_city?: string | null;
        customer_email?: string | null;
        customer_phone?: string | null;
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

      // 2. Read tenant to get invoice_prefix, timezone, last_ticket_number
      const tenantService = new ItemsService("tenants", {
        schema,
        knex: database,
      });
      const tenantRecord = (await tenantService.readOne(tenant)) as {
        invoice_prefix?: string;
        timezone?: string;
        last_ticket_number?: number;
        last_factura_number?: number;
      };

      // 3. Determine series and generate invoice number
      const series: InvoiceSeries = customer_id ? "factura" : "ticket";
      const { invoice_number, new_count } = generateInvoiceNumber(
        tenantRecord,
        series,
      );

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
        invoice_type: series,
        closure_id: closureId,
        status,
        total_net,
        total_tax,
        total_gross,
        discount_type: discount_type ?? null,
        discount_value: discount_value ?? null,
        customer_id: customer_id ?? null,
        customer_name: customer_name ?? null,
        customer_nif: customer_nif ?? null,
        customer_street: customer_street ?? null,
        customer_zip: customer_zip ?? null,
        customer_city: customer_city ?? null,
        customer_email: customer_email ?? null,
        customer_phone: customer_phone ?? null,
        items: {
          create: items.map((item) => ({ ...item, tenant })),
        },
        payments: {
          create: payments.map((payment) => ({ ...payment, tenant })),
        },
      });

      // 6. Update tenant's counter for the series
      await tenantService.updateOne(tenant, {
        [series === "factura" ? "last_factura_number" : "last_ticket_number"]:
          new_count,
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
