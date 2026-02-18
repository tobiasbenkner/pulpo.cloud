import type { Router } from "express";
import type { EndpointContext, ServiceConstructor } from "../types";
import {
  getTenantFromUser,
  generateInvoiceNumber,
  type InvoiceSeries,
} from "../helpers";
import { calculateInvoice } from "@pulpo/invoice";
import type { InvoiceLineInput, InvoiceDiscountInput } from "@pulpo/invoice";

interface RequestItem {
  product_id: string;
  quantity: number;
  discount?: { type: "percent" | "fixed"; value: number } | null;
}

interface RequestBody {
  status: "paid";
  items: RequestItem[];
  discount?: { type: "percent" | "fixed"; value: number } | null;
  customer_id?: string | null;
  payments: {
    method: "cash" | "card";
    amount: string;
    tendered: string | null;
    change: string | null;
    tip: string | null;
  }[];
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
        items: requestItems,
        discount: globalDiscount,
        customer_id,
        payments,
      } = req.body as RequestBody;

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
      const db = database as any;

      // 2. Read tenant record
      const tenantService = new ItemsService("tenants", {
        schema,
        knex: database,
      });
      const tenantRecord = (await tenantService.readOne(tenant)) as {
        invoice_prefix?: string;
        timezone?: string;
        last_ticket_number?: number;
        last_factura_number?: number;
        postcode?: string;
      };

      // 3. Load products from DB
      const productIds = requestItems.map((item) => item.product_id);
      const products = (await db("products")
        .select("id", "name", "price_gross", "tax_class", "cost_center")
        .whereIn("id", productIds)) as {
        id: string;
        name: string;
        price_gross: string;
        tax_class: string | null;
        cost_center: string | null;
      }[];

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Validate all products exist
      for (const item of requestItems) {
        if (!productMap.has(item.product_id)) {
          return res
            .status(400)
            .json({ error: `Produkt nicht gefunden: ${item.product_id}` });
        }
      }

      // 4. Load cost center names
      const costCenterIds = [
        ...new Set(
          products
            .map((p) => p.cost_center)
            .filter((id): id is string => id != null),
        ),
      ];
      const costCenterMap = new Map<string, string>();
      if (costCenterIds.length > 0) {
        const costCenters = (await db("cost_centers")
          .select("id", "name")
          .whereIn("id", costCenterIds)) as { id: string; name: string }[];
        for (const cc of costCenters) {
          costCenterMap.set(cc.id, cc.name);
        }
      }

      // 5. Load tax rates for tenant postcode
      const postcode = tenantRecord.postcode ?? "";
      const taxRatesByClass = new Map<string, string>();

      if (postcode) {
        const zones = (await db("tax_zones")
          .select("id", "regex", "priority")
          .orderBy("priority", "asc")) as {
          id: string;
          regex: string | null;
          priority: number | null;
        }[];

        const matchedZone = zones.find((zone) => {
          if (!zone.regex) return false;
          return new RegExp(zone.regex).test(postcode);
        });

        if (matchedZone) {
          const rules = (await db("tax_rules")
            .select("tax_rules.rate", "tax_classes.code")
            .join("tax_classes", "tax_rules.tax_class_id", "tax_classes.id")
            .where("tax_rules.tax_zone_id", matchedZone.id)) as {
            rate: string | null;
            code: string;
          }[];

          for (const rule of rules) {
            taxRatesByClass.set(rule.code, rule.rate ?? "0");
          }
        }
      }

      // 6. Build InvoiceLineInput[] and calculate
      const lines: InvoiceLineInput[] = requestItems.map((item) => {
        const product = productMap.get(item.product_id)!;
        const taxClassCode = product.tax_class ?? "NULL";
        const taxRate = taxRatesByClass.get(taxClassCode) ?? "0";
        const costCenterName = product.cost_center
          ? (costCenterMap.get(product.cost_center) ?? null)
          : null;
        return {
          productId: product.id,
          productName: product.name,
          priceGross: product.price_gross,
          taxRate,
          quantity: item.quantity,
          discount: item.discount ?? null,
          costCenter: costCenterName,
        };
      });

      const discountInput: InvoiceDiscountInput | null = globalDiscount ?? null;
      const result = calculateInvoice(lines, discountInput);

      // 7. Resolve customer snapshot
      let customerSnapshot: Record<string, string | null> = {
        customer_id: null,
        customer_name: null,
        customer_nif: null,
        customer_street: null,
        customer_zip: null,
        customer_city: null,
        customer_email: null,
        customer_phone: null,
      };
      if (customer_id) {
        const customerService = new ItemsService("customers", {
          schema,
          knex: database,
        });
        try {
          const customer = (await customerService.readOne(customer_id)) as {
            name?: string;
            nif?: string;
            street?: string;
            zip?: string;
            city?: string;
            email?: string;
            phone?: string;
          };
          customerSnapshot = {
            customer_id,
            customer_name: customer.name ?? null,
            customer_nif: customer.nif ?? null,
            customer_street: customer.street ?? null,
            customer_zip: customer.zip ?? null,
            customer_city: customer.city ?? null,
            customer_email: customer.email ?? null,
            customer_phone: customer.phone ?? null,
          };
        } catch {
          // Customer not found — proceed without snapshot
          customerSnapshot.customer_id = customer_id;
        }
      }

      // 8. Determine series and generate invoice number
      const series: InvoiceSeries = customer_id ? "factura" : "ticket";
      const { invoice_number, new_count } = generateInvoiceNumber(
        tenantRecord,
        series,
      );

      // 9. Find open closure for this tenant
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

      // 10. Create invoice with calculated values
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
        total_net: result.net,
        total_tax: result.tax,
        total_gross: result.gross,
        discount_type: result.discountType,
        discount_value: result.discountValue,
        ...customerSnapshot,
        items: {
          create: result.items.map((item) => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            tax_rate_snapshot: item.taxRateSnapshot,
            price_gross_unit: item.priceGrossUnit,
            price_net_unit_precise: item.priceNetUnitPrecise,
            row_total_net_precise: item.rowTotalNetPrecise,
            row_total_gross: item.rowTotalGross,
            discount_type: item.discountType,
            discount_value: item.discountValue,
            cost_center: item.costCenter,
            tenant,
          })),
        },
        payments: {
          create: payments.map((payment) => ({ ...payment, tenant })),
        },
      });

      // 11. Update tenant's counter for the series
      await tenantService.updateOne(tenant, {
        [series === "factura" ? "last_factura_number" : "last_ticket_number"]:
          new_count,
      });

      // 12. Decrement product stock (minimum 0)
      for (const item of requestItems) {
        if (!item.product_id || !item.quantity) continue;
        await db("products")
          .where("id", item.product_id)
          .whereNotNull("stock")
          .update({
            stock: db.raw("GREATEST(stock - ?, 0)", [
              Math.round(item.quantity),
            ]),
          });
      }

      // 13. Return full invoice
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
