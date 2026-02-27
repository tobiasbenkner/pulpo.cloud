import type { Router } from "express";
import Big from "big.js";
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
      const {
        original_invoice_id,
        reason,
        reason_detail,
        payment_method,
        items,
      } = req.body as RectifyBody;

      if (!original_invoice_id || !reason || !items?.length) {
        return res
          .status(400)
          .json({ error: "original_invoice_id, reason, and items required." });
      }

      // 1. Auth & tenant (outside transaction)
      const userId = (req as any).accountability?.user;
      if (!userId) {
        return res.status(401).json({ error: "Nicht authentifiziert." });
      }
      const tenant = await getTenantFromUser(userId, context);
      if (!tenant) {
        return res.status(401).json({ error: "Kein Tenant zugewiesen." });
      }

      const schema = await getSchema();

      // === TRANSACTION: all validation + mutations inside to prevent race conditions ===
      const txResult = await (database as any).transaction(async (trx: any) => {
        // Lock tenant row — serializes concurrent requests per tenant
        const lockedTenant = await trx("tenants").where("id", tenant).forUpdate().first();
        if (!lockedTenant) {
          return { error: "Tenant nicht gefunden.", status: 404 };
        }

        // 2. Load & validate original invoice (within lock)
        const invoiceService = new ItemsService("invoices", {
          schema,
          knex: trx,
        });
        const original = (await invoiceService.readOne(original_invoice_id, {
          fields: ["*", "items.*", "payments.*"],
        })) as Record<string, any>;

        if (original.tenant !== tenant) {
          return { error: "Invoice belongs to a different tenant.", status: 403 };
        }
        if (original.status !== "paid") {
          return { error: "Only paid invoices can be rectified.", status: 400 };
        }
        if (original.invoice_type === "rectificativa") {
          return { error: "Cannot rectify a rectificativa.", status: 400 };
        }

        // 2b. Check already-rectified quantities (within lock)
        const existingRectificativas = await invoiceService.readByQuery({
          filter: {
            original_invoice_id: { _eq: original_invoice_id },
            invoice_type: { _eq: "rectificativa" },
          },
          fields: [
            "id",
            "items.product_id",
            "items.product_name",
            "items.quantity",
          ],
        });

        const alreadyRectified = new Map<string, number>();
        for (const rect of existingRectificativas) {
          for (const ri of (rect as any).items ?? []) {
            const key = `${ri.product_id ?? ""}|${ri.product_name}`;
            const prev = alreadyRectified.get(key) ?? 0;
            alreadyRectified.set(
              key,
              prev + Math.abs(parseInt(String(ri.quantity))),
            );
          }
        }

        const originalItems = (original.items as any[]) ?? [];
        for (const reqItem of items) {
          const key = `${reqItem.product_id ?? ""}|${reqItem.product_name}`;
          const origItem = originalItems.find(
            (oi: any) => `${oi.product_id ?? ""}|${oi.product_name}` === key,
          );
          const origQty = origItem
            ? Math.abs(parseInt(String(origItem.quantity)))
            : 0;
          const rectifiedQty = alreadyRectified.get(key) ?? 0;
          const remaining = origQty - rectifiedQty;

          if (Math.abs(reqItem.quantity) > remaining) {
            return {
              error: `"${reqItem.product_name}": solo quedan ${remaining} unidades por rectificar (solicitadas: ${Math.abs(reqItem.quantity)}).`,
              status: 400,
            };
          }
        }

        // 3. Read tenant record (already locked) and generate invoice number
        const tenantService = new ItemsService("tenants", {
          schema,
          knex: trx,
        });
        const tenantRecord = (await tenantService.readOne(tenant)) as {
          invoice_prefix?: string;
          timezone?: string;
          last_ticket_number?: number;
          last_rectificativa_number?: number;
        };
        const { invoice_number, new_count } = generateInvoiceNumber(
          tenantRecord,
          "rectificativa",
        );

        // 4. Find open closure
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
          price_gross_unit: item.price_gross_unit,
          price_net_unit_precise: item.price_net_unit_precise,
          row_total_net_precise: `-${item.row_total_net_precise.replace(/^-/, "")}`,
          row_total_gross: `-${item.row_total_gross.replace(/^-/, "")}`,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          tenant,
        }));

        // 6. Calculate totals and tax breakdown using big.js for precision
        let totalNet = new Big(0);
        let totalGross = new Big(0);
        const taxMap = new Map<string, { net: Big; gross: Big }>();
        for (const item of negatedItems) {
          totalNet = totalNet.plus(item.row_total_net_precise);
          totalGross = totalGross.plus(item.row_total_gross);
          const rate = item.tax_rate_snapshot;
          const prev = taxMap.get(rate) ?? { net: new Big(0), gross: new Big(0) };
          taxMap.set(rate, {
            net: prev.net.plus(item.row_total_net_precise),
            gross: prev.gross.plus(item.row_total_gross),
          });
        }
        const totalTax = totalGross.minus(totalNet);
        const taxBreakdown = Array.from(taxMap.entries())
          .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
          .map(([rate, v]) => {
            const net = v.net.toFixed(2);
            const tax = v.gross.minus(new Big(net)).toFixed(2);
            return { rate, net, tax };
          });

        // 7. Determine payment method
        const originalPayment = (original.payments as any[])?.[0];
        const paymentMethod =
          payment_method ?? originalPayment?.method ?? "cash";

        // 8. Build reason string
        const rectificationReason = reason_detail
          ? `${reason}: ${reason_detail}`
          : reason;

        // 9. Create rectificativa (copy issuer + customer snapshot from original)
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
          tax_breakdown: taxBreakdown,
          discount_type: null,
          discount_value: null,
          issuer_name: original.issuer_name ?? null,
          issuer_nif: original.issuer_nif ?? null,
          issuer_street: original.issuer_street ?? null,
          issuer_zip: original.issuer_zip ?? null,
          issuer_city: original.issuer_city ?? null,
          customer_id: original.customer_id ?? null,
          customer_name: original.customer_name ?? null,
          customer_nif: original.customer_nif ?? null,
          customer_street: original.customer_street ?? null,
          customer_zip: original.customer_zip ?? null,
          customer_city: original.customer_city ?? null,
          customer_email: original.customer_email ?? null,
          customer_phone: original.customer_phone ?? null,
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

        // 11. Update tenant counter
        await tenantService.updateOne(tenant, {
          last_rectificativa_number: new_count,
        });

        // 12. Increment stock for returned items
        for (const item of items) {
          if (!item.product_id || !item.quantity) continue;
          await trx("products")
            .where("id", item.product_id)
            .whereNotNull("stock")
            .update({
              stock: trx.raw("stock + ?", [Math.abs(Math.round(item.quantity))]),
            });
        }

        return { success: true, rectificativaId, originalInvoiceId: original_invoice_id };
      });
      // === END TRANSACTION ===

      // Handle validation errors from within the transaction
      if ("error" in txResult) {
        return res
          .status(txResult.status)
          .json({ error: txResult.error });
      }

      // Read full results (outside transaction)
      const invoiceService = new ItemsService("invoices", {
        schema,
        knex: database,
      });
      const rectificativa = await invoiceService.readOne(
        txResult.rectificativaId,
        { fields: ["*", "items.*", "payments.*"] },
      );
      const updatedOriginal = await invoiceService.readOne(
        txResult.originalInvoiceId,
        { fields: ["*", "items.*", "payments.*"] },
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
