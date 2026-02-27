import "dotenv/config";
import PocketBase, { type RecordModel } from "pocketbase";
import {
  createDirectus,
  staticToken,
  rest,
  createItem,
  readItems,
  readItem,
  updateItem,
} from "@directus/sdk";

// ==========================================
// 1. PocketBase Typen
// ==========================================

interface ShiftDetail {
  card: number;
  card_refund: number;
  cash: number;
  cash_refund: number;
  count_bill: number;
  count_corrections: number;
  count_invoice: number;
  count_total: number;
  tax_amount: number;
  tax_base: number;
  tax_rate: number;
}

interface PBShift extends RecordModel {
  opening: number;
  cash: number;
  card: number;
  open: string;
  close: string;
  tenant: string;
  detail: ShiftDetail;
  profit: number;
}

interface InvoiceLine {
  item_id: string;
  name: string;
  quantity: number;
  weight: number;
  unit_price: number;
  total_price: number;
  discount: number;
  discount_percent: number;
  billing: string;
}

interface TaxSummaryEntry {
  tax_rate_percentage: number;
  tax_amount: number;
  tax_base: number;
  tax_total: number;
}

interface PBInvoice {
  id: string;
  created: string;
  invoice_number: number;
  is_invoice: boolean;
  is_paid: boolean;
  lines: InvoiceLine[];
  tax_summary: TaxSummaryEntry[];
  total: number;
  discount: number;
  cash: number;
  card: number;
  hand_over_money: number;
  change: number;
  client: {
    id: string;
    name: string;
    tax_id: string;
    street: string;
    zip: string;
    city: string;
    email: string;
    phone: string;
  };
}

interface OrderItem {
  id: string;
  created: string;
  is_paid: boolean;
  is_corrected: boolean;
  price: number;
  product_id: string;
  product: {
    value: string;
    translations: Record<string, string> | null;
  };
  status: string;
  discount: number;
  zone: string;
  customs: unknown;
  note: string;
}

interface PBOrder extends RecordModel {
  tenant: string;
  table: string;
  discount_percent: number;
  card: number;
  cash: number;
  tips: number;
  shift: string;
  items: OrderItem[];
  version: number;
  invoice: PBInvoice | null;
  closed: string;
  invoices: unknown;
  client: string;
  corrections: string[];
  guests: number;
  is_printed: boolean;
  deleted_products_after_printed: unknown;
}

// ==========================================
// 2. CONFIG
// ==========================================

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ENV variable: ${key}`);
  return value;
}

const CONFIG = {
  pb: {
    url: getEnv("PB_URL"),
    user: getEnv("PB_EMAIL"),
    pass: getEnv("PB_PASSWORD"),
  },
  directus: {
    url: getEnv("DIRECTUS_URL"),
    token: getEnv("DIRECTUS_TOKEN"),
    tenant: getEnv("DIRECTUS_TENANT"),
  },
};

// ==========================================
// 3. INITIALISIERUNG
// ==========================================

const pb = new PocketBase(CONFIG.pb.url);

const directus = createDirectus(CONFIG.directus.url)
  .with(staticToken(CONFIG.directus.token))
  .with(rest());

// Cent -> Euro (2 decimal places as string)
const toEuro = (cents: number) => (cents / 100).toFixed(2);

// Cent -> Euro (4 decimal places for unit prices)
const toEuro4 = (cents: number) => (cents / 100).toFixed(4);

// Cent -> Euro (8 decimal places for precise net values)
const toEuroPrecise = (cents: number) => (cents / 100).toFixed(8);

// Default tax rate for products not found in Directus (IGIC STD)
const DEFAULT_TAX_RATE = 7;

// Map: PB Shift ID -> Directus closure UUID
const shiftIdMap = new Map<string, string>();

// Map: product name -> { id, taxRate (percentage, e.g. 7), costCenter }
const productTaxMap = new Map<string, { id: string; taxRate: number; costCenter: string | null }>();

// Aggregated data per closure for post-migration update
interface ClosureAgg {
  totalNet: number;
  totalTax: number;
  taxMap: Map<number, { net: number; tax: number }>;
  productMap: Map<string, { product_id: string | null; cost_center: string | null; quantity: number; total_gross: number; cash_gross: number; card_gross: number }>;
  tickets: number;
  facturas: number;
  rectificativas: number;
}
const closureTaxAgg = new Map<string, ClosureAgg>();

// ==========================================
// 4. TAX RATE LOADING
// ==========================================

async function loadProductTaxRates() {
  console.log("=== Lade Directus Produkte & Steuersätze ===");

  // Load tenant postcode
  const tenant = (await directus.request(
    readItem("tenants" as any, CONFIG.directus.tenant, { fields: ["postcode"] } as any),
  )) as any;
  const postcode = tenant.postcode ?? "";
  console.log(`  Tenant PLZ: ${postcode}`);

  // Load tax zones, find matching zone
  const zones = (await directus.request(
    readItems("tax_zones" as any, { sort: ["priority"], limit: -1 } as any),
  )) as any[];
  let zoneId: string | null = null;
  for (const zone of zones) {
    if (zone.regex && new RegExp(zone.regex).test(postcode)) {
      zoneId = zone.id;
      console.log(`  Tax Zone: ${zone.name} (${zone.regex})`);
      break;
    }
  }
  if (!zoneId) {
    console.warn("  WARNUNG: Keine Tax Zone gefunden, nutze Default 7%");
  }

  // Load tax rules for this zone -> map tax_class_id -> rate
  const taxClassRates = new Map<string, number>();
  if (zoneId) {
    const rules = (await directus.request(
      readItems("tax_rules" as any, {
        filter: { tax_zone_id: { _eq: zoneId } },
        limit: -1,
      } as any),
    )) as any[];
    for (const rule of rules) {
      taxClassRates.set(rule.tax_class_id, Number(rule.rate));
    }
    console.log(`  ${taxClassRates.size} Steuerregeln geladen`);
  }

  // Load all products for this tenant (with cost center name)
  const products = (await directus.request(
    readItems("products" as any, {
      filter: { tenant: { _eq: CONFIG.directus.tenant } },
      fields: ["id", "name", "tax_class", "cost_center.name"],
      limit: -1,
    } as any),
  )) as any[];

  for (const p of products) {
    const rate = p.tax_class ? (taxClassRates.get(p.tax_class) ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
    const costCenter = p.cost_center?.name ?? null;
    productTaxMap.set(p.name, { id: p.id, taxRate: rate, costCenter });
  }

  console.log(`  ${productTaxMap.size} Produkte mit Steuersätzen geladen\n`);
}

// ==========================================
// 5. HELPERS
// ==========================================

function getProductInfo(name: string) {
  const info = productTaxMap.get(name);
  return {
    id: info?.id ?? null,
    taxRate: info?.taxRate ?? DEFAULT_TAX_RATE,
    costCenter: info?.costCenter ?? null,
  };
}

/** Calculate net from gross given a tax rate percentage (e.g. 7 for 7%). */
function netFromGross(grossCents: number, taxRatePercent: number): number {
  if (taxRatePercent === 0) return grossCents;
  return grossCents / (1 + taxRatePercent / 100);
}

function initClosureAgg(closureId: string) {
  if (!closureTaxAgg.has(closureId)) {
    closureTaxAgg.set(closureId, {
      totalNet: 0, totalTax: 0,
      taxMap: new Map(),
      productMap: new Map(),
      tickets: 0, facturas: 0, rectificativas: 0,
    });
  }
}

function addToClosureAgg(closureId: string, taxRate: number, netCents: number, taxCents: number) {
  const agg = closureTaxAgg.get(closureId)!;
  agg.totalNet += netCents;
  agg.totalTax += taxCents;
  const existing = agg.taxMap.get(taxRate) ?? { net: 0, tax: 0 };
  existing.net += netCents;
  existing.tax += taxCents;
  agg.taxMap.set(taxRate, existing);
}

function addProductToClosureAgg(
  closureId: string, productName: string, productId: string | null,
  costCenter: string | null, quantity: number, grossCents: number, method: "cash" | "card",
) {
  const agg = closureTaxAgg.get(closureId)!;
  const existing = agg.productMap.get(productName) ?? {
    product_id: productId, cost_center: costCenter,
    quantity: 0, total_gross: 0, cash_gross: 0, card_gross: 0,
  };
  existing.quantity += quantity;
  existing.total_gross += grossCents;
  if (method === "cash") existing.cash_gross += grossCents;
  else existing.card_gross += grossCents;
  agg.productMap.set(productName, existing);
}

function addInvoiceTypeToClosureAgg(closureId: string, invoiceType: string) {
  const agg = closureTaxAgg.get(closureId)!;
  if (invoiceType === "ticket") agg.tickets++;
  else if (invoiceType === "factura") agg.facturas++;
  else if (invoiceType === "rectificativa") agg.rectificativas++;
}

// ==========================================
// 6. MIGRATION
// ==========================================

async function run() {
  console.log("Starte Migration Shifts & Orders...\n");

  // Login PocketBase
  await pb.collection("users").authWithPassword(CONFIG.pb.user, CONFIG.pb.pass);
  console.log("PocketBase Login erfolgreich\n");

  // Load product tax rates from Directus
  await loadProductTaxRates();

  // -------------------------------------------------------
  // SCHRITT 1: Shifts -> cash_register_closures
  // -------------------------------------------------------
  console.log("=== SHIFTS -> cash_register_closures ===");

  const pbShifts = await pb.collection("shifts").getFullList<PBShift>();
  console.log(`${pbShifts.length} Shifts geladen\n`);

  for (const shift of pbShifts) {
    console.log(`  > Shift ${shift.id} (${shift.open} - ${shift.close})`);

    try {
      const detail = shift.detail ?? ({} as ShiftDetail);

      // Create closure with placeholder tax data (will be updated in step 3)
      const closure = await directus.request(
        createItem("cash_register_closures", {
          tenant: CONFIG.directus.tenant,
          status: shift.close ? "closed" : "open",
          period_start: shift.open || null,
          period_end: shift.close || null,
          starting_cash: toEuro(shift.opening ?? 0),
          total_cash: toEuro(detail.cash ?? 0),
          total_card: toEuro(detail.card ?? 0),
          total_change: toEuro((detail.cash_refund ?? 0) + (detail.card_refund ?? 0)),
          total_gross: toEuro(shift.profit ?? 0),
          // Placeholder — will be recalculated from invoices
          total_net: "0.00",
          total_tax: "0.00",
          tax_breakdown: null,
          transaction_count: detail.count_total ?? 0,
        }),
      );

      const closureId = (closure as any).id;
      shiftIdMap.set(shift.id, closureId);
      initClosureAgg(closureId);
    } catch (err: any) {
      console.error(`    Fehler: ${err.message}`);
    }
  }

  console.log(`\n${shiftIdMap.size} Shifts migriert\n`);

  // -------------------------------------------------------
  // SCHRITT 2: Orders -> invoices (mit korrekten Steuersätzen)
  // -------------------------------------------------------
  console.log("=== ORDERS -> invoices + invoice_items + invoice_payments ===");

  const pbOrders = await pb.collection("orders").getFullList<PBOrder>();
  console.log(`${pbOrders.length} Orders geladen\n`);

  let invoiceCount = 0;
  let unmatchedProducts = new Set<string>();

  for (const order of pbOrders) {
    console.log(`  > Order ${order.id} (closed: ${order.closed})`);

    try {
      const closureId = order.shift ? shiftIdMap.get(order.shift) : null;
      const inv = order.invoice;
      const lines = inv?.lines ?? [];

      // Build items from invoice.lines with correct tax rates
      let invoiceTotalNet = 0;
      let invoiceTotalTax = 0;
      let invoiceTotalGross = 0;

      const items: any[] = [];

      for (const line of lines) {
        const name = line.name ?? "Unbekannt";
        const product = getProductInfo(name);

        if (!product.id && name !== "Unbekannt") {
          unmatchedProducts.add(name);
        }

        const grossTotalCents = line.total_price ?? 0;
        const grossUnitCents = line.unit_price ?? 0;
        const qty = line.quantity ?? 1;

        const netTotalCents = netFromGross(grossTotalCents, product.taxRate);
        const netUnitCents = netFromGross(grossUnitCents, product.taxRate);
        const taxCents = grossTotalCents - netTotalCents;

        invoiceTotalGross += grossTotalCents;
        invoiceTotalNet += netTotalCents;
        invoiceTotalTax += taxCents;

        // Track for closure aggregation
        if (closureId) {
          addToClosureAgg(closureId, product.taxRate, netTotalCents, taxCents);
        }

        const lineDiscount = line.discount > 0 ? line.discount : null;
        const lineDiscountPercent = line.discount_percent > 0 ? line.discount_percent : null;

        items.push({
          tenant: CONFIG.directus.tenant,
          product_name: name,
          product_id: product.id,
          cost_center: product.costCenter,
          quantity: qty,
          price_gross_unit: toEuro4(grossUnitCents),
          row_total_gross: toEuro(grossTotalCents),
          tax_rate_snapshot: product.taxRate.toFixed(2),
          price_net_unit_precise: toEuroPrecise(netUnitCents),
          row_total_net_precise: toEuroPrecise(netTotalCents),
          discount_type: lineDiscountPercent ? "percent" : lineDiscount ? "fixed" : null,
          discount_value: lineDiscountPercent ? lineDiscountPercent.toFixed(4) : lineDiscount ? toEuro4(lineDiscount) : null,
        });
      }

      // Fallback: if no invoice.lines, use order.items
      if (items.length === 0 && order.items?.length > 0) {
        for (const item of order.items) {
          const name = item.product?.value ?? "Unbekannt";
          const product = getProductInfo(name);
          const grossCents = item.price ?? 0;
          const netCents = netFromGross(grossCents, product.taxRate);
          const taxCents = grossCents - netCents;

          invoiceTotalGross += grossCents;
          invoiceTotalNet += netCents;
          invoiceTotalTax += taxCents;

          if (closureId) {
            addToClosureAgg(closureId, product.taxRate, netCents, taxCents);
          }

          items.push({
            tenant: CONFIG.directus.tenant,
            product_name: name,
            product_id: product.id,
            cost_center: product.costCenter,
            quantity: 1,
            price_gross_unit: toEuro4(grossCents),
            row_total_gross: toEuro(grossCents),
            tax_rate_snapshot: product.taxRate.toFixed(2),
            price_net_unit_precise: toEuroPrecise(netCents),
            row_total_net_precise: toEuroPrecise(netCents),
            discount_type: null,
            discount_value: null,
          });
        }
      }

      // Use invoice total as gross (authoritative), recalculated net/tax
      const totalGross = inv?.total ?? invoiceTotalGross;

      // Payments
      const payments: any[] = [];
      const cashAmount = inv?.cash ?? order.cash ?? 0;
      const cardAmount = inv?.card ?? order.card ?? 0;

      if (cashAmount > 0) {
        payments.push({
          tenant: CONFIG.directus.tenant,
          method: "cash",
          amount: toEuro(cashAmount),
          tendered: toEuro(inv?.hand_over_money ?? cashAmount),
          change: toEuro(inv?.change ?? 0),
          tip: "0.00",
        });
      }
      if (cardAmount > 0) {
        payments.push({
          tenant: CONFIG.directus.tenant,
          method: "card",
          amount: toEuro(cardAmount),
          tendered: toEuro(cardAmount),
          change: "0.00",
          tip: "0.00",
        });
      }
      if (order.tips > 0 && payments.length > 0) {
        payments[payments.length - 1].tip = toEuro(order.tips);
      }

      // Determine payment method and invoice type
      const primaryMethod: "cash" | "card" = cashAmount >= cardAmount ? "cash" : "card";
      const client = inv?.client;
      const hasCustomer = client && client.name;
      const invoiceType = hasCustomer ? "factura" : "ticket";

      // Track product breakdown and invoice type per closure
      if (closureId) {
        for (const item of items) {
          addProductToClosureAgg(
            closureId, item.product_name, item.product_id,
            item.cost_center, item.quantity,
            Math.round(parseFloat(item.row_total_gross) * 100), primaryMethod,
          );
        }
        addInvoiceTypeToClosureAgg(closureId, invoiceType);
      }

      await directus.request(
        createItem("invoices", {
          tenant: CONFIG.directus.tenant,
          invoice_type: invoiceType,
          invoice_number: `PB-${order.id}`,
          status: "paid",
          date_created: order.closed || order.created,
          closure_id: closureId || null,
          total_gross: toEuro(totalGross),
          total_net: toEuro(invoiceTotalNet),
          total_tax: toEuro(invoiceTotalTax),
          discount_type: order.discount_percent > 0 ? "percent" : null,
          discount_value: order.discount_percent > 0 ? order.discount_percent : null,
          customer_name: hasCustomer ? client.name : null,
          customer_nif: hasCustomer ? client.tax_id || null : null,
          customer_street: hasCustomer ? client.street || null : null,
          customer_zip: hasCustomer ? client.zip || null : null,
          customer_city: hasCustomer ? client.city || null : null,
          customer_email: hasCustomer ? client.email || null : null,
          customer_phone: hasCustomer ? client.phone || null : null,
          items: items,
          payments: payments,
        }),
      );

      invoiceCount++;
    } catch (err: any) {
      console.error(`    Fehler: ${err.message}`);
    }
  }

  console.log(`\n${invoiceCount} Invoices migriert`);

  if (unmatchedProducts.size > 0) {
    console.log(`\nWARNUNG: ${unmatchedProducts.size} Produkte nicht in Directus gefunden (Default ${DEFAULT_TAX_RATE}%):`);
    unmatchedProducts.forEach((name) => {
      console.log(`  - ${name}`);
    });
  }

  // -------------------------------------------------------
  // SCHRITT 3: Closures mit korrekten Steuerdaten updaten
  // -------------------------------------------------------
  console.log("\n=== Closure Steuerdaten aktualisieren ===");

  let closureUpdateCount = 0;
  for (const entry of Array.from(closureTaxAgg.entries())) {
    const [closureId, agg] = entry;
    const taxBreakdown = Array.from(agg.taxMap.entries())
      .filter(([, v]) => v.tax !== 0)
      .sort(([a], [b]) => a - b)
      .map(([rate, v]) => ({
        rate: rate.toFixed(2),
        net: toEuro(v.net),
        tax: toEuro(v.tax),
      }));

    const productBreakdown = Array.from(agg.productMap.entries())
      .map(([product_name, v]) => ({
        product_name,
        product_id: v.product_id,
        cost_center: v.cost_center,
        quantity: v.quantity,
        total_gross: toEuro(v.total_gross),
        cash_gross: toEuro(v.cash_gross),
        card_gross: toEuro(v.card_gross),
      }))
      .sort((a, b) => Math.abs(b.quantity) - Math.abs(a.quantity));

    const invoiceTypeCounts = {
      tickets: agg.tickets,
      facturas: agg.facturas,
      rectificativas: agg.rectificativas,
    };

    try {
      await directus.request(
        updateItem("cash_register_closures" as any, closureId, {
          total_net: toEuro(agg.totalNet),
          total_tax: toEuro(agg.totalTax),
          tax_breakdown: taxBreakdown.length > 0 ? taxBreakdown : null,
          product_breakdown: productBreakdown.length > 0 ? productBreakdown : null,
          invoice_type_counts: invoiceTypeCounts,
        } as any),
      );
      closureUpdateCount++;
    } catch (err: any) {
      console.error(`  Fehler bei Closure ${closureId}: ${err.message}`);
    }
  }

  console.log(`${closureUpdateCount} Closures aktualisiert`);
  console.log("\nMigration abgeschlossen!");
}

run().catch(console.error);
