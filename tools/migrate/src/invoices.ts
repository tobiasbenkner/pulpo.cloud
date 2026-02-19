import "dotenv/config";
import PocketBase, { type RecordModel } from "pocketbase";
import {
  createDirectus,
  staticToken,
  rest,
  createItem,
} from "@directus/sdk";

// ==========================================
// 1. PocketBase Typen (siehe pocketbase-schema.json)
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

// Cent -> Euro string (for decimal precision)
const toEuro = (cents: number) => (cents / 100).toFixed(2);

// Map: PB Shift ID -> Directus cash_register_closures UUID
const shiftIdMap = new Map<string, string>();

// ==========================================
// 4. MIGRATION
// ==========================================

async function run() {
  console.log("Starte Migration Shifts & Orders...\n");

  // Login PocketBase
  await pb.collection("users").authWithPassword(CONFIG.pb.user, CONFIG.pb.pass);
  console.log("PocketBase Login erfolgreich\n");

  // -------------------------------------------------------
  // SCHRITT 1: Alle Shifts laden und nach Directus pushen
  // -------------------------------------------------------
  console.log("=== SHIFTS -> cash_register_closures ===");

  const pbShifts = await pb.collection("shifts").getFullList<PBShift>();
  console.log(`${pbShifts.length} Shifts geladen\n`);

  for (const shift of pbShifts) {
    console.log(`  > Shift ${shift.id} (${shift.open} - ${shift.close})`);

    try {
      const detail = shift.detail ?? {} as ShiftDetail;

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
          total_net: toEuro(detail.tax_base ?? 0),
          total_tax: toEuro(detail.tax_amount ?? 0),
          total_gross: toEuro(shift.profit ?? 0),
          transaction_count: detail.count_total ?? 0,
          tax_breakdown: detail.tax_rate
            ? [{ rate: String(detail.tax_rate), net: toEuro(detail.tax_base ?? 0), tax: toEuro(detail.tax_amount ?? 0) }]
            : null,
        })
      );

      shiftIdMap.set(shift.id, (closure as any).id);
    } catch (err: any) {
      console.error(`    Fehler: ${err.message}`);
    }
  }

  console.log(`\n${shiftIdMap.size} Shifts migriert\n`);

  // -------------------------------------------------------
  // SCHRITT 2: Alle Orders laden und nach Directus pushen
  // -------------------------------------------------------
  console.log("=== ORDERS -> invoices + invoice_items + invoice_payments ===");

  const pbOrders = await pb.collection("orders").getFullList<PBOrder>();
  console.log(`${pbOrders.length} Orders geladen\n`);

  let invoiceCount = 0;

  for (const order of pbOrders) {
    console.log(`  > Order ${order.id} (closed: ${order.closed})`);

    try {
      const closureId = order.shift ? shiftIdMap.get(order.shift) : null;
      const inv = order.invoice;

      // Use invoice.lines for proper quantities and prices
      const lines = inv?.lines ?? [];
      const taxSummary = inv?.tax_summary ?? [];

      // Build a map: line total_price -> tax rate (best effort matching)
      // Since we can't directly map lines to tax rates, we compute
      // invoice-level totals from tax_summary
      const totalTax = taxSummary.reduce((sum, t) => sum + (t.tax_amount ?? 0), 0);
      const totalNet = taxSummary.reduce((sum, t) => sum + (t.tax_base ?? 0), 0);
      const totalGross = inv?.total ?? ((order.cash ?? 0) + (order.card ?? 0));

      // Items from invoice.lines (aggregated with quantity)
      const items = lines.map((line) => {
        const lineDiscount = line.discount > 0 ? line.discount : null;
        const lineDiscountPercent = line.discount_percent > 0 ? line.discount_percent : null;

        return {
          tenant: CONFIG.directus.tenant,
          product_name: line.name ?? "Unbekannt",
          quantity: line.quantity ?? 1,
          price_gross_unit: toEuro(line.unit_price ?? 0),
          row_total_gross: toEuro(line.total_price ?? 0),
          tax_rate_snapshot: 0,
          price_net_unit_precise: toEuro(line.unit_price ?? 0),
          row_total_net_precise: toEuro(line.total_price ?? 0),
          discount_type: lineDiscountPercent ? "percent" : lineDiscount ? "fixed" : null,
          discount_value: lineDiscountPercent ?? (lineDiscount ? toEuro(lineDiscount) : null),
        };
      });

      // Fallback: if no invoice.lines, use order.items
      if (items.length === 0 && order.items?.length > 0) {
        for (const item of order.items) {
          items.push({
            tenant: CONFIG.directus.tenant,
            product_name: item.product?.value ?? "Unbekannt",
            quantity: 1,
            price_gross_unit: toEuro(item.price ?? 0),
            row_total_gross: toEuro(item.price ?? 0),
            tax_rate_snapshot: 0,
            price_net_unit_precise: toEuro(item.price ?? 0),
            row_total_net_precise: toEuro(item.price ?? 0),
            discount_type: null,
            discount_value: null,
          });
        }
      }

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
          tip: 0,
        });
      }
      if (cardAmount > 0) {
        payments.push({
          tenant: CONFIG.directus.tenant,
          method: "card",
          amount: toEuro(cardAmount),
          tendered: toEuro(cardAmount),
          change: 0,
          tip: 0,
        });
      }
      if (order.tips > 0 && payments.length > 0) {
        payments[payments.length - 1].tip = toEuro(order.tips);
      }

      // Customer data from invoice
      const client = inv?.client;
      const hasCustomer = client && client.name;

      // Invoice erstellen mit nested items und payments
      await directus.request(
        createItem("invoices", {
          tenant: CONFIG.directus.tenant,
          invoice_type: hasCustomer ? "factura" : "ticket",
          invoice_number: `PB-${order.id}`,
          status: "paid",
          date_created: order.closed || order.created,
          closure_id: closureId || null,
          total_gross: toEuro(totalGross),
          total_net: toEuro(totalNet),
          total_tax: toEuro(totalTax),
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
        })
      );

      invoiceCount++;
    } catch (err: any) {
      console.error(`    Fehler: ${err.message}`);
    }
  }

  console.log(`\n${invoiceCount} Invoices migriert`);
  console.log("\nMigration abgeschlossen!");
}

run().catch(console.error);
