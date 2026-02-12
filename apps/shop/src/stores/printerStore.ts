import { atom } from "nanostores";
import { getAuthClient, getStoredToken } from "@pulpo/auth";
import { getProfile, getTenant, imageUrl } from "@pulpo/cms";
import type { Tenant } from "@pulpo/cms";
import type { CartTotals, ClosureReport } from "../types/shop";
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

  lines.push(emptyLine());

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
  lines.push(emptyLine());

  // Items
  lines.push(separatorLine());
  for (const item of totals.items) {
    const prefix = `${String(item.quantity).padStart(2)}x `;
    lines.push(twoColTable(`${prefix}${item.productName}`, item.rowTotalGross));
    if (item.quantity > 1) {
      lines.push(
        twoColTable(`    @ ${parseFloat(item.priceGrossUnit).toFixed(2)}`, ""),
      );
    }
    if (item.discountType && item.discountValue) {
      const label =
        item.discountType === "percent"
          ? `    Dto. -${parseFloat(item.discountValue)}%`
          : `    Dto. -${parseFloat(item.discountValue).toFixed(2)}`;
      lines.push(twoColTable(label, ""));
    }
  }

  lines.push(separatorLine());

  // Total
  lines.push(twoColTable("TOTAL", `${totals.gross} EUR`, "B", "B"));
  lines.push(emptyLine());

  if (parseFloat(totals.discountTotal) > 0) {
    const discLabel =
      totals.discountType === "percent" && totals.discountValue
        ? `Descuento ${parseFloat(totals.discountValue)}%`
        : "Descuento";
    lines.push(twoColTable(discLabel, `-${totals.discountTotal}`));
  }

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
    lines.push(
      tableLine([
        {
          text: `IGIC ${pct.padStart(4)}%`,
          align: "LEFT",
          width: 0.3,
          style: "NORMAL",
        },
        {
          text: `Base ${base.toFixed(2).padStart(7)}`,
          align: "RIGHT",
          width: 0.35,
          style: "NORMAL",
        },
        {
          text: `Imp. ${entry.amount.padStart(7)}`,
          align: "RIGHT",
          width: 0.35,
          style: "NORMAL",
        },
      ]),
    );
  }

  if (totals.taxBreakdown.length === 0) {
    lines.push(twoColTable("Base", totals.net));
  }

  // Payment
  lines.push(separatorLine());
  if (method === "cash") {
    lines.push(twoColTable("Efectivo", tendered));
    if (parseFloat(change) > 0) {
      lines.push(twoColTable("Cambio", change));
    }
  } else {
    lines.push(twoColTable("Tarjeta", total));
  }

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

// --- CLOSURE REPORT ---

function formatClosureDate(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

function buildClosureReport(
  report: ClosureReport,
  countedCash: string,
  difference: string,
): PrintLine[] {
  const t = tenant.get();
  const lines: PrintLine[] = [];

  // Header
  if (t) {
    lines.push(textLine(t.name, { align: "CT", fontSize: "big", style: "B" }));
  }

  lines.push(emptyLine());
  lines.push(
    textLine("KASSENSCHLIESSUNG", {
      align: "CT",
      fontSize: "big",
      style: "B",
    }),
  );
  lines.push(emptyLine());

  // Period
  lines.push(twoColTable("Von:", formatClosureDate(report.periodStart)));
  lines.push(twoColTable("Bis:", formatClosureDate(report.periodEnd)));
  lines.push(separatorLine());

  // Totals
  lines.push(twoColTable("Transaktionen", String(report.transactionCount)));
  lines.push(twoColTable("Brutto", `${report.totalGross} EUR`, "NORMAL", "B"));
  lines.push(twoColTable("Netto", `${report.totalNet} EUR`));
  lines.push(twoColTable("Steuer", `${report.totalTax} EUR`));
  lines.push(emptyLine());
  lines.push(twoColTable("Bar", `${report.totalCash} EUR`));
  lines.push(twoColTable("Karte", `${report.totalCard} EUR`));

  // Tax breakdown
  if (report.taxBreakdown.length > 0) {
    lines.push(emptyLine());
    for (const entry of report.taxBreakdown) {
      const pct = parseFloat(entry.rate).toFixed(0);
      lines.push(
        tableLine([
          {
            text: `IGIC ${pct.padStart(4)}%`,
            align: "LEFT",
            width: 0.3,
            style: "NORMAL",
          },
          {
            text: `Base ${entry.net.padStart(7)}`,
            align: "RIGHT",
            width: 0.35,
            style: "NORMAL",
          },
          {
            text: `Imp. ${entry.tax.padStart(7)}`,
            align: "RIGHT",
            width: 0.35,
            style: "NORMAL",
          },
        ]),
      );
    }
  }

  // Cash count
  lines.push(separatorLine());
  lines.push(twoColTable("Anfangsbestand", `${report.startingCash}`));
  lines.push(twoColTable("Soll", `${report.expectedCash}`, "NORMAL", "B"));
  lines.push(twoColTable("Gezahlt", countedCash));

  const diffNum = parseFloat(difference);
  const sign = diffNum >= 0 ? "+" : "";
  lines.push(twoColTable("Differenz", `${sign}${difference}`, "NORMAL", "B"));

  lines.push(emptyLine());
  lines.push(emptyLine());

  return lines;
}

export async function printClosureReport(
  report: ClosureReport,
  countedCash: string,
  difference: string,
): Promise<void> {
  const document = buildClosureReport(report, countedCash, difference);

  const { serviceUrl, ...printerSettings } = data.printer;

  const job: PrintJob = {
    printer: printerSettings as PrintJob["printer"],
    document,
    open: true,
  };

  await sendPrintJob(job);
}
