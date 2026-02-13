import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import { getTenantFromUser, generateInvoiceNumber } from "../helpers";

interface RectifyItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  tax_rate_snapshot: string;
  price_gross_unit: string;
  price_net_unit_precise: string;
  row_total_net_precise: string;
  row_total_gross: string;
  discount_type: "percent" | "fixed" | null;
  discount_value: string | null;
}

interface RectifyBody {
  original_invoice_id: string;
  reason: string;
  reason_detail?: string;
  items: RectifyItem[];
}

export function registerInvoiceRectify(
  router: Router,
  context: EndpointContext,
) {
  const { services, database, getSchema } = context;
  const ItemsService = services.ItemsService as ServiceConstructor;

  router.post("/invoices/rectify", async (req, res) => {
    try {
      const { original_invoice_id, reason, reason_detail, items } =
        req.body as RectifyBody;

      if (!original_invoice_id || !reason || !items?.length) {
        return res
          .status(400)
          .json({ error: "original_invoice_id, reason, and items required." });
      }

      // 1. Auth & tenant
      const userId = (req as any).accountability?.user;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert." });
      }
      const tenant = await getTenantFromUser(userId, context);
      if (!tenant) {
        return res.status(401).json({ error: "Kein Tenant zugewiesen." });
      }

      const schema = await getSchema();

      // 2. Load & validate original invoice
      const invoiceService = new ItemsService("invoices", {
        schema,
        knex: database,
      });
      const original = (await invoiceService.readOne(original_invoice_id, {
        fields: ["*", "items.*", "payments.*"],
      })) as Record<string, any>;

      if (original.tenant !== tenant) {
        return res
          .status(403)
          .json({ error: "Invoice belongs to a different tenant." });
      }
      if (original.status !== "paid") {
        return res
          .status(400)
          .json({ error: "Only paid invoices can be rectified." });
      }
      if (original.invoice_type === "rectificativa") {
        return res
          .status(400)
          .json({ error: "Cannot rectify a rectificativa." });
      }

      // 3. Generate invoice number with R prefix
      const tenantService = new ItemsService("tenants", {
        schema,
        knex: database,
      });
      const tenantRecord = (await tenantService.readOne(tenant)) as {
        invoice_prefix?: string;
        timezone?: string;
        last_invoice_number?: number;
      };
      const { invoice_number, new_count } = generateInvoiceNumber(
        tenantRecord,
        { rectificativa: true },
      );

      // 4. Find open closure
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

      // 5. Negate amounts for rectificativa items
      const negatedItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: -Math.abs(item.quantity),
        tax_rate_snapshot: item.tax_rate_snapshot,
        price_gross_unit: item.price_gross_unit, // unit prices stay positive
        price_net_unit_precise: item.price_net_unit_precise,
        row_total_net_precise: `-${item.row_total_net_precise.replace(/^-/, "")}`,
        row_total_gross: `-${item.row_total_gross.replace(/^-/, "")}`,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        tenant,
      }));

      // 6. Calculate totals (all negative)
      let totalNet = 0;
      let totalGross = 0;
      for (const item of negatedItems) {
        totalNet += parseFloat(item.row_total_net_precise);
        totalGross += parseFloat(item.row_total_gross);
      }
      const totalTax = totalGross - totalNet;

      // 7. Determine payment method from original
      const originalPayment = (original.payments as any[])?.[0];
      const paymentMethod = originalPayment?.method ?? "cash";

      // 8. Build reason string
      const rectificationReason = reason_detail
        ? `${reason}: ${reason_detail}`
        : reason;

      // 9. Create rectificativa
      const rectificativaId = await invoiceService.createOne({
        tenant,
        invoice_number,
        closure_id: closureId,
        status: "paid",
        invoice_type: "rectificativa",
        original_invoice_id,
        rectification_reason: rectificationReason,
        total_net: totalNet.toFixed(2),
        total_tax: totalTax.toFixed(2),
        total_gross: totalGross.toFixed(2),
        discount_type: null,
        discount_value: null,
        items: { create: negatedItems },
        payments: {
          create: [
            {
              method: paymentMethod,
              amount: totalGross.toFixed(2),
              tendered: totalGross.toFixed(2),
              change: "0.00",
              tenant,
            },
          ],
        },
      });

      // 10. Check if full rectification → mark original as rectificada
      const originalItems = (original.items as any[]) ?? [];
      const isFullRectification =
        items.length === originalItems.length &&
        items.every((rectItem) => {
          const origItem = originalItems.find(
            (oi: any) =>
              oi.product_id === rectItem.product_id &&
              oi.product_name === rectItem.product_name,
          );
          return (
            origItem &&
            Math.abs(rectItem.quantity) ===
              Math.abs(parseInt(String(origItem.quantity)))
          );
        });

      if (isFullRectification) {
        await invoiceService.updateOne(original_invoice_id, {
          status: "rectificada",
        });
      }

      // 11. Update tenant counter
      await tenantService.updateOne(tenant, {
        last_invoice_number: new_count,
      });

      // 12. Increment stock for returned items
      for (const item of items) {
        if (!item.product_id || !item.quantity) continue;
        const db = database as any;
        await db("products")
          .where("id", item.product_id)
          .whereNotNull("stock")
          .update({
            stock: db.raw("stock + ?", [Math.abs(Math.round(item.quantity))]),
          });
      }

      // 13. Read full rectificativa and updated original
      const rectificativa = await invoiceService.readOne(rectificativaId, {
        fields: ["*", "items.*", "payments.*"],
      });
      const updatedOriginal = await invoiceService.readOne(
        original_invoice_id,
        {
          fields: ["*", "items.*", "payments.*"],
        },
      );

      return res.json({
        success: true,
        rectificativa,
        original: updatedOriginal,
      });
    } catch (error: unknown) {
      console.error("Error creating rectificativa:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ error: message });
    }
  });
}
