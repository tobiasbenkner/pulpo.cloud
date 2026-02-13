import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser } from "../helpers";

function generateInvoiceNumber(tenantRecord: {
  invoice_prefix?: string;
  timezone?: string;
  last_invoice_number?: number;
}): { invoice_number: string; new_count: number } {
  const rawPrefix = tenantRecord.invoice_prefix;
  const timeZone = tenantRecord.timezone || "Europe/Madrid";

  // Date based on tenant timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;
  const fullDateString = `${year}${month}${day}`;

  // Counter
  const currentCount = tenantRecord.last_invoice_number || 0;
  const newCount = currentCount + 1;
  const paddedCount = newCount.toString().padStart(4, "0");

  // Replace placeholders in prefix
  let formatString = String(rawPrefix || "INV-%year%-");
  formatString = formatString.replace(/%date%/gi, fullDateString);
  formatString = formatString.replace(/%year%/gi, year);
  formatString = formatString.replace(/%month%/gi, month);
  formatString = formatString.replace(/%day%/gi, day);

  // Build final number
  let invoice_number: string;
  if (/%count%/i.test(formatString)) {
    invoice_number = formatString.replace(/%count%/i, paddedCount);
  } else {
    invoice_number = `${formatString}${paddedCount}`;
  }

  return { invoice_number, new_count: newCount };
}

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
