import PdfPrinter from "pdfmake";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import type { AggregatedReport, ClosureProductBreakdown } from "./report-aggregator";

const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

function groupProductsByCostCenter(products: ClosureProductBreakdown[]): {
  name: string;
  rows: ClosureProductBreakdown[];
}[] {
  const groups = new Map<string, ClosureProductBreakdown[]>();
  for (const p of products) {
    const key = p.cost_center ?? "";
    const existing = groups.get(key) ?? [];
    existing.push(p);
    groups.set(key, existing);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "" && b !== "") return 1;
      if (a !== "" && b === "") return -1;
      return a.localeCompare(b);
    })
    .map(([name, rows]) => ({ name, rows }));
}

export async function generateReportPdf(
  report: AggregatedReport,
  tenant: Record<string, any>,
  taxName: string,
): Promise<Buffer> {
  const printer = new PdfPrinter(fonts);
  const content: Content[] = [];

  // Header
  content.push({
    text: tenant.name ?? "Informe",
    style: "header",
    margin: [0, 0, 0, 2],
  });
  if (tenant.nif) {
    content.push({
      text: `NIF: ${tenant.nif}`,
      style: "subtext",
      margin: [0, 0, 0, 1],
    });
  }
  if (tenant.street || tenant.postcode || tenant.city) {
    const addr = [tenant.street, `${tenant.postcode ?? ""} ${tenant.city ?? ""}`.trim()]
      .filter(Boolean)
      .join(", ");
    content.push({ text: addr, style: "subtext", margin: [0, 0, 0, 4] });
  }

  // Period
  const periodLabel =
    report.period.type === "daily"
      ? "Informe diario"
      : report.period.type === "weekly"
        ? "Informe semanal"
        : report.period.type === "monthly"
          ? "Informe mensual"
          : report.period.type === "quarterly"
            ? "Informe trimestral"
            : "Informe anual";
  content.push({
    text: `${periodLabel}: ${report.period.label}`,
    style: "periodLabel",
    margin: [0, 0, 0, 12],
  });

  // Summary table
  const invoiceBreakdown = [
    `${report.invoice_counts.tickets} tickets`,
    `${report.invoice_counts.facturas} facturas`,
  ];
  if (report.invoice_counts.rectificativas > 0) {
    invoiceBreakdown.push(`${report.invoice_counts.rectificativas} rect.`);
  }

  content.push({
    table: {
      widths: ["*", "auto"],
      body: [
        [
          { text: "Total Bruto", style: "tableLabel" },
          { text: `${report.summary.total_gross} \u20AC`, style: "tableValueBold" },
        ],
        [
          { text: "Total Neto", style: "tableLabel" },
          { text: `${report.summary.total_net} \u20AC`, style: "tableValue" },
        ],
        [
          { text: "Impuestos", style: "tableLabel" },
          { text: `${report.summary.total_tax} \u20AC`, style: "tableValue" },
        ],
        [
          { text: "Efectivo", style: "tableLabel" },
          { text: `${report.summary.total_cash} \u20AC`, style: "tableValue" },
        ],
        [
          { text: "Tarjeta", style: "tableLabel" },
          { text: `${report.summary.total_card} \u20AC`, style: "tableValue" },
        ],
        [
          { text: "Transacciones", style: "tableLabel" },
          {
            text: `${report.summary.transaction_count} (${invoiceBreakdown.join(", ")})`,
            style: "tableValue",
          },
        ],
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 12] as [number, number, number, number],
  });

  // Tax breakdown
  if (report.tax_breakdown.length > 0) {
    content.push({
      text: `Desglose ${taxName}`,
      style: "sectionTitle",
      margin: [0, 0, 0, 4],
    });
    content.push({
      table: {
        headerRows: 1,
        widths: ["auto", "*", "*"],
        body: [
          [
            { text: "Tipo", style: "tableHeader" },
            { text: "Base", style: "tableHeader", alignment: "right" as const },
            { text: "Cuota", style: "tableHeader", alignment: "right" as const },
          ],
          ...report.tax_breakdown.map((entry) => [
            { text: `${taxName} ${parseFloat(entry.rate).toFixed(0)}%`, fontSize: 9 },
            {
              text: `${entry.net} \u20AC`,
              fontSize: 9,
              alignment: "right" as const,
            },
            {
              text: `${entry.tax} \u20AC`,
              fontSize: 9,
              alignment: "right" as const,
            },
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });
  }

  // Products
  if (report.product_breakdown.length > 0) {
    content.push({
      text: "Productos",
      style: "sectionTitle",
      margin: [0, 0, 0, 4],
    });

    const groups = groupProductsByCostCenter(report.product_breakdown);
    const hasMultipleGroups =
      groups.length > 1 || (groups.length === 1 && groups[0].name !== "");

    const productTableBody: any[][] = [
      [
        { text: "Producto", style: "tableHeader" },
        { text: "Uds.", style: "tableHeader", alignment: "right" as const },
        { text: "Total", style: "tableHeader", alignment: "right" as const },
        { text: "Ef.", style: "tableHeader", alignment: "right" as const },
        { text: "Tj.", style: "tableHeader", alignment: "right" as const },
      ],
    ];

    for (const group of groups) {
      if (hasMultipleGroups) {
        productTableBody.push([
          {
            text: (group.name || "Sin asignar").toUpperCase(),
            colSpan: 5,
            bold: true,
            fontSize: 8,
            fillColor: "#f4f4f5",
            margin: [0, 2, 0, 2],
          },
          {},
          {},
          {},
          {},
        ]);
      }
      for (const p of group.rows) {
        productTableBody.push([
          { text: p.product_name, fontSize: 9 },
          { text: String(p.quantity), fontSize: 9, alignment: "right" as const },
          {
            text: `${p.total_gross}`,
            fontSize: 9,
            alignment: "right" as const,
          },
          {
            text: `${p.cash_gross}`,
            fontSize: 9,
            alignment: "right" as const,
          },
          {
            text: `${p.card_gross}`,
            fontSize: 9,
            alignment: "right" as const,
          },
        ]);
      }
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto"],
        body: productTableBody,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12] as [number, number, number, number],
    });
  }

  // Shifts (daily only)
  if (report.shifts.length > 0) {
    content.push({
      text: "Turnos",
      style: "sectionTitle",
      margin: [0, 0, 0, 4],
    });

    for (let i = 0; i < report.shifts.length; i++) {
      const shift = report.shifts[i];
      const startTime = new Date(shift.period_start).toLocaleTimeString(
        "es-ES",
        { hour: "2-digit", minute: "2-digit" },
      );
      const endTime = shift.period_end
        ? new Date(shift.period_end).toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "...";

      content.push({
        text: `Turno ${report.shifts.length - i}: ${startTime}\u2013${endTime}  |  Bruto: ${shift.total_gross} \u20AC  |  Ef: ${shift.total_cash} \u20AC  |  Tj: ${shift.total_card} \u20AC  |  Trans: ${shift.transaction_count}${shift.difference !== null ? `  |  Dif: ${shift.difference} \u20AC` : ""}`,
        fontSize: 9,
        margin: [0, 0, 0, 4] as [number, number, number, number],
      });

      if (shift.product_breakdown.length > 0) {
        const shiftGroups = groupProductsByCostCenter(shift.product_breakdown);
        const shiftBody: any[][] = [
          [
            { text: "Producto", style: "tableHeader" },
            { text: "Uds.", style: "tableHeader", alignment: "right" as const },
            { text: "Total", style: "tableHeader", alignment: "right" as const },
            { text: "Ef.", style: "tableHeader", alignment: "right" as const },
            { text: "Tj.", style: "tableHeader", alignment: "right" as const },
          ],
        ];
        for (const group of shiftGroups) {
          for (const p of group.rows) {
            shiftBody.push([
              { text: p.product_name, fontSize: 8 },
              { text: String(p.quantity), fontSize: 8, alignment: "right" as const },
              { text: p.total_gross, fontSize: 8, alignment: "right" as const },
              { text: p.cash_gross, fontSize: 8, alignment: "right" as const },
              { text: p.card_gross, fontSize: 8, alignment: "right" as const },
            ]);
          }
        }
        content.push({
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: shiftBody,
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 8] as [number, number, number, number],
        });
      }
    }
  }

  // Footer
  content.push({
    text: `Generado: ${new Date().toLocaleString("es-ES")}`,
    style: "footer",
    margin: [0, 16, 0, 0],
  });

  const docDefinition: TDocumentDefinitions = {
    defaultStyle: {
      font: "Helvetica",
    },
    content,
    styles: {
      header: { fontSize: 16, bold: true },
      subtext: { fontSize: 9, color: "#666666" },
      periodLabel: { fontSize: 12, bold: true, color: "#333333" },
      sectionTitle: { fontSize: 11, bold: true },
      tableHeader: { fontSize: 8, bold: true, color: "#888888" },
      tableLabel: { fontSize: 10 },
      tableValue: { fontSize: 10, alignment: "right" },
      tableValueBold: { fontSize: 12, bold: true, alignment: "right" },
      footer: { fontSize: 8, color: "#999999" },
    },
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
  };

  return new Promise<Buffer>((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
