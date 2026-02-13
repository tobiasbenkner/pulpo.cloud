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
  payment_method?: "cash" | "card";
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
      const { original_invoice_id, reason, reason_detail, payment_method, items } =
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

      // 2b. Check already-rectified quantities
      const existingRectificativas = await invoiceService.readByQuery({
        filter: {
          original_invoice_id: { _eq: original_invoice_id },
          invoice_type: { _eq: "rectificativa" },
        },
        fields: ["id", "items.product_id", "items.product_name", "items.quantity"],
      });

      // Build map: "productId|productName" → already rectified qty (positive)
      const alreadyRectified = new Map<string, number>();
      for (const rect of existingRectificativas) {
        for (const ri of (rect as any).items ?? []) {
          const key = `${ri.product_id ?? ""}|${ri.product_name}`;
          const prev = alreadyRectified.get(key) ?? 0;
          alreadyRectified.set(key, prev + Math.abs(parseInt(String(ri.quantity))));
        }
      }

      // Validate requested quantities don't exceed remaining
      const originalItems = (original.items as any[]) ?? [];
      for (const reqItem of items) {
        const key = `${reqItem.product_id ?? ""}|${reqItem.product_name}`;
        const origItem = originalItems.find(
          (oi: any) =>
            `${oi.product_id ?? ""}|${oi.product_name}` === key,
        );
        const origQty = origItem
          ? Math.abs(parseInt(String(origItem.quantity)))
          : 0;
        const rectifiedQty = alreadyRectified.get(key) ?? 0;
        const remaining = origQty - rectifiedQty;

        if (Math.abs(reqItem.quantity) > remaining) {
          return res.status(400).json({
            error: `"${reqItem.product_name}": solo quedan ${remaining} unidades por rectificar (solicitadas: ${Math.abs(reqItem.quantity)}).`,
          });
        }
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
        last_rectificativa_number?: number;
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

      // 7. Determine payment method (from request or fallback to original)
      const originalPayment = (original.payments as any[])?.[0];
      const paymentMethod = payment_method ?? originalPayment?.method ?? "cash";

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

      // 10. Check if full rectification (cumulative) → mark original as rectificada
      // Add current request quantities to already-rectified map
      for (const reqItem of items) {
        const key = `${reqItem.product_id ?? ""}|${reqItem.product_name}`;
        const prev = alreadyRectified.get(key) ?? 0;
        alreadyRectified.set(key, prev + Math.abs(reqItem.quantity));
      }

      const isFullRectification = originalItems.every((origItem: any) => {
        const key = `${origItem.product_id ?? ""}|${origItem.product_name}`;
        const origQty = Math.abs(parseInt(String(origItem.quantity)));
        const totalRectified = alreadyRectified.get(key) ?? 0;
        return totalRectified >= origQty;
      });

      if (isFullRectification) {
        await invoiceService.updateOne(original_invoice_id, {
          status: "rectificada",
        });
      }

      // 11. Update tenant rectificativa counter
      await tenantService.updateOne(tenant, {
        last_rectificativa_number: new_count,
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
