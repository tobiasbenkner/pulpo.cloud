import { atom } from "nanostores";
import { getAuthClient, getStoredToken } from "@pulpo/auth";
import { getProfile, getTenant, imageUrl } from "@pulpo/cms";
import type { Tenant } from "@pulpo/cms";
import type { CartTotals } from "../types/shop";
import data from "../data.json";

// --- TYPES ---

type Align = "LT" | "CT" | "RT";
type Font = "A" | "B" | "C";
type FontSize = "big" | "small";
type Style = "B" | "I" | "NORMAL";

interface Col {
  text: string;
  align: "LEFT" | "CENTER" | "RIGHT";
  width: number;
  style: Style;
}

interface PrintLine {
  type: "text" | "qr" | "line" | "newLine" | "table" | "image";
  fontSize: FontSize;
  font: Font;
  align: Align;
  text: string | Col[];
  style: Style;
}

interface PrintJob {
  printer: {
    connection: "USB" | "IP";
    ip?: string;
    port?: number;
    vendor_id?: number;
    product_id?: number;
    width: number;
    encoding: string;
    replace_accents: boolean;
    feed: number;
  };
  document: PrintLine[];
  open?: boolean;
}

// --- STATE ---

export const tenant = atom<Tenant | null>(null);

// --- HELPERS ---

const DEFAULTS: Pick<PrintLine, "fontSize" | "font" | "align" | "style"> = {
  fontSize: "small",
  font: "A",
  align: "LT",
  style: "NORMAL",
};

function textLine(text: string, overrides?: Partial<PrintLine>): PrintLine {
  return { ...DEFAULTS, type: "text", text, ...overrides };
}

function separatorLine(): PrintLine {
  return { ...DEFAULTS, type: "line", text: "" };
}

function emptyLine(): PrintLine {
  return { ...DEFAULTS, type: "newLine", text: "" };
}

function tableLine(cols: Col[]): PrintLine {
  return { ...DEFAULTS, type: "table", text: cols };
}

function twoColTable(
  left: string,
  right: string,
  leftStyle: Style = "NORMAL",
  rightStyle: Style = "NORMAL",
): PrintLine {
  return tableLine([
    { text: left, align: "LEFT", width: 0.75, style: leftStyle },
    { text: right, align: "RIGHT", width: 0.25, style: rightStyle },
  ]);
}

// --- LOAD TENANT ---

export async function loadTenant(): Promise<void> {
  try {
    const client = getAuthClient();
    const user = await getProfile(client as any);
    const t = await getTenant(client as any, user.tenant);
    tenant.set(t);
  } catch (e) {
    console.error("Failed to load tenant:", e);
  }
}

// --- BUILD RECEIPT ---

function buildReceipt(receiptData: {
  totals: CartTotals;
  invoiceNumber: string;
  method: "cash" | "card";
  total: string;
  tendered: string;
  change: string;
}): PrintLine[] {
  const { totals, invoiceNumber, method, total, tendered, change } =
    receiptData;
  const t = tenant.get();
  const lines: PrintLine[] = [];

  // Header: Logo + Business name
  if (t) {
    if (t.invoice_image) {
      const token = getStoredToken()?.access_token ?? "";
      const url = imageUrl(t.invoice_image).replace(
        "access_token=",
        `access_token=${token}`,
      );
      lines.push({ ...DEFAULTS, type: "image", text: url, align: "CT" });
      lines.push(emptyLine());
    }
    lines.push(textLine(t.name, { align: "CT", fontSize: "big", style: "B" }));
    lines.push(textLine(t.street, { align: "CT" }));
    lines.push(textLine(`${t.postcode} ${t.city}`, { align: "CT" }));
  }

  lines.push(separatorLine());

  // Ticket info
  const now = new Date();
  const fecha =
    now.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

  lines.push(textLine(`Ticket: #${invoiceNumber}`));
  lines.push(textLine(`Fecha:  ${fecha}`));

  lines.push(separatorLine());

  // Items
  for (const item of totals.items) {
    const prefix = `${String(item.quantity).padStart(2)}x `;
    lines.push(twoColTable(`${prefix}${item.productName}`, item.rowTotalGross));
    if (item.quantity > 1) {
      lines.push(
        twoColTable(`    @ ${parseFloat(item.priceGrossUnit).toFixed(2)}`, ""),
      );
    }
  }

  lines.push(separatorLine());

  // Total
  lines.push(twoColTable("TOTAL", `${totals.gross} EUR`, "B", "B"));

  if (parseFloat(totals.discountTotal) > 0) {
    lines.push(twoColTable("Descuento", `-${totals.discountTotal}`));
  }

  lines.push(separatorLine());

  // Tax breakdown: group net by rate from items
  const netByRate = new Map<string, number>();
  for (const item of totals.items) {
    const rate = item.taxRateSnapshot; // percentage string e.g. "7.00"
    const prev = netByRate.get(rate) ?? 0;
    netByRate.set(rate, prev + parseFloat(item.rowTotalNetPrecise));
  }

  for (const entry of totals.taxBreakdown) {
    const pct = (parseFloat(entry.rate) * 100).toFixed(0);
    const rateSnapshot = (parseFloat(entry.rate) * 100).toFixed(2);
    const base = netByRate.get(rateSnapshot) ?? parseFloat(totals.net);
    lines.push(twoColTable(`Base ${pct}%`, base.toFixed(2)));
    lines.push(twoColTable(`IGIC ${pct}%`, entry.amount));
  }

  if (totals.taxBreakdown.length === 0) {
    lines.push(twoColTable("Base", totals.net));
  }

  lines.push(separatorLine());

  // Payment
  if (method === "cash") {
    lines.push(twoColTable("Efectivo", tendered));
    if (parseFloat(change) > 0) {
      lines.push(twoColTable("Cambio", change));
    }
  } else {
    lines.push(twoColTable("Tarjeta", total));
  }

  lines.push(separatorLine());

  // Footer
  lines.push(emptyLine());
  lines.push(textLine("Gracias!", { align: "CT", style: "B" }));
  lines.push(emptyLine());

  return lines;
}

// --- PRINT ---

let lastPrintJob: PrintJob | null = null;

async function sendPrintJob(job: PrintJob): Promise<void> {
  const { serviceUrl } = data.printer;
  try {
    const res = await fetch(`${serviceUrl}/thermal-printer-service/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });

    if (!res.ok) {
      console.error("Printer service error:", res.status, await res.text());
    }
  } catch (e) {
    console.error("Failed to send print job:", e);
  }
}

export async function printReceipt(receiptData: {
  totals: CartTotals;
  invoiceNumber: string;
  method: "cash" | "card";
  total: string;
  tendered: string;
  change: string;
}): Promise<void> {
  const document = buildReceipt(receiptData);

  const { serviceUrl, ...printerSettings } = data.printer;

  const job: PrintJob = {
    printer: printerSettings as PrintJob["printer"],
    document,
    open: receiptData.method === "cash",
  };

  lastPrintJob = job;
  await sendPrintJob(job);
}

export async function reprintLastReceipt(): Promise<void> {
  if (!lastPrintJob) {
    console.warn("No previous print job to reprint");
    return;
  }
  await sendPrintJob(lastPrintJob);
}
