import type { AggregatedReport } from "./report-aggregator";

/**
 * Send a daily report email with PDF attachment via Directus MailService.
 * Fire-and-forget: errors are logged but not thrown.
 */
export async function sendDailyReportEmail(
  services: Record<string, any>,
  database: unknown,
  schema: unknown,
  tenant: Record<string, any>,
  report: AggregatedReport,
  pdfBuffer: Buffer,
): Promise<void> {
  const emails: string[] = tenant.report_emails;
  if (!emails || emails.length === 0) return;

  const MailService = services.MailService;
  const mailService = new MailService({ schema, knex: database });

  const date = report.period.label;
  const subject = `Informe diario \u2014 ${date} \u2014 ${tenant.name ?? ""}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 500px;">
      <h2 style="margin: 0 0 8px 0;">${tenant.name ?? ""}</h2>
      <p style="color: #666; margin: 0 0 16px 0;">Informe diario: ${date}</p>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee;">Total Bruto</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${report.summary.total_gross} \u20AC</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee;">Efectivo</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: right;">${report.summary.total_cash} \u20AC</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee;">Tarjeta</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #eee; text-align: right;">${report.summary.total_card} \u20AC</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;">Transacciones</td>
          <td style="padding: 6px 0; text-align: right;">${report.summary.transaction_count}</td>
        </tr>
      </table>
      <p style="color: #999; margin: 16px 0 0 0; font-size: 12px;">Informe completo adjunto como PDF.</p>
    </div>
  `;

  try {
    await mailService.send({
      to: emails,
      subject,
      html,
      attachments: [
        {
          filename: `informe-diario-${report.period.from.slice(0, 10)}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  } catch (error) {
    console.error("Failed to send daily report email:", error);
  }
}
