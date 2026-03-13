import type { ClosureReportData } from "./closure-report-excel";
import { generateClosureExcel } from "./closure-report-excel";

interface SendClosureEmailOptions {
  closureData: ClosureReportData;
  taxName: string;
  tenantName: string;
  recipientEmail: string;
  MailService: any;
  schema: unknown;
  knex: unknown;
}

export async function sendClosureEmail(
  options: SendClosureEmailOptions,
): Promise<void> {
  const {
    closureData,
    taxName,
    tenantName,
    recipientEmail,
    MailService,
    schema,
    knex,
  } = options;

  const excelBuffer = generateClosureExcel(closureData, taxName, tenantName);

  const dateStr = formatDate(closureData.period_end);
  const filename = `Cierre_${dateStr}`;

  const mailService = new MailService({ schema, knex });

  const emails = recipientEmail
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  // Directus MailService passes options through to nodemailer's sendMail().
  // Use `html` directly (not `template`) and base64-encode the attachment.
  await mailService.send({
    to: emails,
    subject: `Cierre de caja — ${tenantName} — ${dateStr}`,
    html: buildEmailHtml(closureData, taxName, tenantName),
    attachments: [
      {
        filename: `${filename}.xlsx`,
        content: excelBuffer.toString("base64"),
        encoding: "base64",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}

function buildEmailHtml(
  data: ClosureReportData,
  taxName: string,
  tenantName: string,
): string {
  const start = formatDateTime(data.period_start);
  const end = formatDateTime(data.period_end);

  return `
    <h2>Cierre de caja — ${tenantName}</h2>
    <p><strong>Periodo:</strong> ${start} — ${end}</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0">Total bruto</td><td style="text-align:right;padding:4px 0"><strong>${data.total_gross} &euro;</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0">Total neto</td><td style="text-align:right;padding:4px 0">${data.total_net} &euro;</td></tr>
      <tr><td style="padding:4px 12px 4px 0">Impuestos</td><td style="text-align:right;padding:4px 0">${data.total_tax} &euro;</td></tr>
      <tr><td style="padding:4px 12px 4px 0">Efectivo</td><td style="text-align:right;padding:4px 0">${data.total_cash} &euro;</td></tr>
      <tr><td style="padding:4px 12px 4px 0">Tarjeta</td><td style="text-align:right;padding:4px 0">${data.total_card} &euro;</td></tr>
      <tr><td style="padding:4px 12px 4px 0">Transacciones</td><td style="text-align:right;padding:4px 0">${data.transaction_count}</td></tr>
    </table>
    ${data.difference != null ? `<p><strong>Diferencia:</strong> ${data.difference} &euro;</p>` : ""}
    <p style="color:#888;font-size:12px">El informe completo se encuentra en el documento adjunto (Excel).</p>
  `;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const dd = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${dd}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    timeZone: "Europe/Madrid",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
