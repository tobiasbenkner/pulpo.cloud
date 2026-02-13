import type { EndpointContext } from "./types";

export function generateInvoiceNumber(
  tenantRecord: {
    invoice_prefix?: string;
    timezone?: string;
    last_invoice_number?: number;
  },
  options?: { rectificativa?: boolean },
): { invoice_number: string; new_count: number } {
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

  // Prepend "R" for rectificativa
  if (options?.rectificativa) {
    invoice_number = `R${invoice_number}`;
  }

  return { invoice_number, new_count: newCount };
}

export async function getTenantFromUser(
  userId: string,
  context: EndpointContext,
): Promise<string | null> {
  const row = await (context.database as any)("directus_users")
    .select("tenant")
    .where("id", userId)
    .first();

  return row?.tenant ?? null;
}
