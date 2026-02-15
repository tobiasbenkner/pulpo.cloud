import ExcelJS from "exceljs";
import type { AggregatedReport, ClosureProductBreakdown } from "./report-aggregator";

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

const headerStyle: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 10 },
  fill: {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF4F4F5" },
  },
  border: {
    bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
  },
};

const numberFormat = "#,##0.00";

export async function generateReportExcel(
  report: AggregatedReport,
  tenant: Record<string, any>,
  taxName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Resumen
  const resumen = workbook.addWorksheet("Resumen");
  resumen.columns = [
    { width: 25 },
    { width: 20 },
    { width: 20 },
  ];

  resumen.addRow([tenant.name ?? "Informe"]).font = { bold: true, size: 14 };
  if (tenant.nif) resumen.addRow([`NIF: ${tenant.nif}`]);
  resumen.addRow([]);

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
  resumen.addRow([`${periodLabel}: ${report.period.label}`]).font = {
    bold: true,
    size: 12,
  };
  resumen.addRow([]);

  // Summary data
  const summaryData: [string, string][] = [
    ["Total Bruto", report.summary.total_gross],
    ["Total Neto", report.summary.total_net],
    ["Impuestos", report.summary.total_tax],
    ["Efectivo", report.summary.total_cash],
    ["Tarjeta", report.summary.total_card],
    ["Transacciones", String(report.summary.transaction_count)],
    ["Tickets", String(report.invoice_counts.tickets)],
    ["Facturas", String(report.invoice_counts.facturas)],
    ["Rectificativas", String(report.invoice_counts.rectificativas)],
  ];

  for (const [label, value] of summaryData) {
    const row = resumen.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    if (!isNaN(parseFloat(value)) && label !== "Transacciones" && label !== "Tickets" && label !== "Facturas" && label !== "Rectificativas") {
      row.getCell(2).numFmt = numberFormat;
      row.getCell(2).value = parseFloat(value);
    }
  }

  resumen.addRow([]);

  // Tax breakdown
  if (report.tax_breakdown.length > 0) {
    resumen.addRow([`Desglose ${taxName}`]).font = { bold: true, size: 11 };
    const taxHeader = resumen.addRow(["Tipo", "Base", "Cuota"]);
    taxHeader.eachCell((cell) => {
      cell.style = headerStyle;
    });

    for (const entry of report.tax_breakdown) {
      const row = resumen.addRow([
        `${taxName} ${parseFloat(entry.rate).toFixed(0)}%`,
        parseFloat(entry.net),
        parseFloat(entry.tax),
      ]);
      row.getCell(2).numFmt = numberFormat;
      row.getCell(3).numFmt = numberFormat;
    }
  }

  // Sheet 2: Productos
  if (report.product_breakdown.length > 0) {
    const productos = workbook.addWorksheet("Productos");
    productos.columns = [
      { header: "Centro de coste", width: 18 },
      { header: "Producto", width: 30 },
      { header: "Uds.", width: 10 },
      { header: "Total", width: 14 },
      { header: "Efectivo", width: 14 },
      { header: "Tarjeta", width: 14 },
    ];

    // Style header
    const headerRow = productos.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    const groups = groupProductsByCostCenter(report.product_breakdown);
    for (const group of groups) {
      for (const p of group.rows) {
        const row = productos.addRow([
          group.name || "Sin asignar",
          p.product_name,
          p.quantity,
          parseFloat(p.total_gross),
          parseFloat(p.cash_gross),
          parseFloat(p.card_gross),
        ]);
        row.getCell(4).numFmt = numberFormat;
        row.getCell(5).numFmt = numberFormat;
        row.getCell(6).numFmt = numberFormat;
      }
    }

    // Summary row
    const lastDataRow = productos.rowCount;
    const sumRow = productos.addRow([
      "",
      "TOTAL",
      { formula: `SUM(C2:C${lastDataRow})` },
      { formula: `SUM(D2:D${lastDataRow})` },
      { formula: `SUM(E2:E${lastDataRow})` },
      { formula: `SUM(F2:F${lastDataRow})` },
    ]);
    sumRow.font = { bold: true };
    sumRow.getCell(4).numFmt = numberFormat;
    sumRow.getCell(5).numFmt = numberFormat;
    sumRow.getCell(6).numFmt = numberFormat;
  }

  // Sheet 3: Turnos (daily only)
  if (report.shifts.length > 0) {
    const turnos = workbook.addWorksheet("Turnos");
    turnos.columns = [
      { header: "Turno", width: 10 },
      { header: "Horario", width: 20 },
      { header: "Trans.", width: 10 },
      { header: "Bruto", width: 14 },
      { header: "Efectivo", width: 14 },
      { header: "Tarjeta", width: 14 },
      { header: "Diferencia", width: 14 },
    ];

    const headerRow = turnos.getRow(1);
    headerRow.eachCell((cell) => {
      cell.style = headerStyle;
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

      const row = turnos.addRow([
        `T${report.shifts.length - i}`,
        `${startTime}\u2013${endTime}`,
        shift.transaction_count,
        parseFloat(shift.total_gross),
        parseFloat(shift.total_cash),
        parseFloat(shift.total_card),
        shift.difference !== null ? parseFloat(shift.difference) : "",
      ]);
      row.getCell(4).numFmt = numberFormat;
      row.getCell(5).numFmt = numberFormat;
      row.getCell(6).numFmt = numberFormat;
      if (shift.difference !== null) {
        row.getCell(7).numFmt = numberFormat;
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
