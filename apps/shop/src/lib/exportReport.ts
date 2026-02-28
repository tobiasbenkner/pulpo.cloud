import * as XLSX from "xlsx";
import type { AggregatedReport } from "@pulpo/cms";

export function exportReportToExcel(
  report: AggregatedReport,
  taxName: string,
) {
  const wb = XLSX.utils.book_new();
  const { summary, invoice_counts, tax_breakdown, product_breakdown, shifts } =
    report;
  const periodLabel = report.period.label;

  // --- Sheet 1: Resumen ---
  const resumenRows: (string | number)[][] = [
    ["Informe", periodLabel],
    [],
    ["Resumen"],
    ["Total bruto", num(summary.total_gross)],
    ["Total neto", num(summary.total_net)],
    ["Total impuestos", num(summary.total_tax)],
    ["Efectivo", num(summary.total_cash)],
    ["Tarjeta", num(summary.total_card)],
    ["Transacciones", summary.transaction_count],
    [],
    ["Facturas"],
    ["Tickets", invoice_counts.tickets],
    ["Facturas", invoice_counts.facturas],
    ["Rectificativas", invoice_counts.rectificativas],
  ];

  if (tax_breakdown.length > 0) {
    resumenRows.push([], ["Desglose impuestos"]);
    resumenRows.push([taxName, "Base", "Cuota"]);
    for (const entry of tax_breakdown) {
      resumenRows.push([
        `${taxName} ${parseFloat(entry.rate)}%`,
        num(entry.net),
        num(entry.tax),
      ]);
    }
  }

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  // --- Sheet 2: Productos ---
  if (product_breakdown.length > 0) {
    const prodRows: (string | number)[][] = [
      ["Producto", "Centro coste", "Uds.", "Total", "Efectivo", "Tarjeta"],
    ];
    for (const row of product_breakdown) {
      prodRows.push([
        row.product_name,
        row.cost_center ?? "",
        row.quantity,
        num(row.total_gross),
        num(row.cash_gross),
        num(row.card_gross),
      ]);
    }
    const wsProductos = XLSX.utils.aoa_to_sheet(prodRows);
    wsProductos["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProductos, "Productos");
  }

  // --- Sheet 3: Turnos (daily only) ---
  if (shifts.length > 0) {
    const shiftRows: (string | number)[][] = [
      [
        "Turno",
        "Inicio",
        "Fin",
        "Trans.",
        "Tickets",
        "Facturas",
        "Rect.",
        "Bruto",
        "Efectivo",
        "Tarjeta",
        "Diferencia",
      ],
    ];
    for (let i = 0; i < shifts.length; i++) {
      const s = shifts[i];
      shiftRows.push([
        `T${shifts.length - i}`,
        formatTime(s.period_start),
        s.period_end ? formatTime(s.period_end) : "",
        s.transaction_count,
        s.invoice_counts.tickets,
        s.invoice_counts.facturas,
        s.invoice_counts.rectificativas,
        num(s.total_gross),
        num(s.total_cash),
        num(s.total_card),
        s.difference !== null ? num(s.difference) : "",
      ]);
    }

    // Add per-shift product breakdown
    for (let i = 0; i < shifts.length; i++) {
      const s = shifts[i];
      if (s.product_breakdown.length > 0) {
        shiftRows.push(
          [],
          [`T${shifts.length - i} - Productos`],
          ["Producto", "Centro coste", "Uds.", "Total", "Efectivo", "Tarjeta"],
        );
        for (const row of s.product_breakdown) {
          shiftRows.push([
            row.product_name,
            row.cost_center ?? "",
            row.quantity,
            num(row.total_gross),
            num(row.cash_gross),
            num(row.card_gross),
          ]);
        }
      }
    }

    const wsTurnos = XLSX.utils.aoa_to_sheet(shiftRows);
    wsTurnos["!cols"] = [
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTurnos, "Turnos");
  }

  // Generate filename and download
  const safeName = periodLabel.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, "").replace(/\s+/g, "_");
  XLSX.writeFile(wb, `Informe_${safeName}.xlsx`);
}

function num(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) : v;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
