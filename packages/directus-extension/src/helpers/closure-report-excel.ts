import * as XLSX from "xlsx-js-style";
import { buildProductosSheet } from "./excel-shared";
import type { AggregatedReport } from "./report-aggregator";

export interface ClosureReportData {
  period_start: string;
  period_end: string;
  starting_cash: string;
  total_gross: string;
  total_net: string;
  total_tax: string;
  total_cash: string;
  total_card: string;
  total_change: string;
  expected_cash: string | null;
  counted_cash: string | null;
  difference: string | null;
  transaction_count: number;
  invoice_type_counts: {
    tickets: number;
    facturas: number;
    rectificativas: number;
  };
  tax_breakdown: { rate: string; net: string; tax: string }[];
  product_breakdown: {
    product_name: string;
    cost_center: string | null;
    unit: "unit" | "weight";
    quantity: number;
    total_gross: string;
    cash_gross: string;
    card_gross: string;
  }[];
  denomination_count?: Record<string, number> | null;
  products?: {
    name: string;
    category: string | null;
    price_gross: string;
    tax_rate: string;
    stock: number | null;
    cost_center: string | null;
  }[];
}

export function generateClosureExcel(
  data: ClosureReportData,
  taxName: string,
  tenantName: string,
): Buffer {
  const wb = XLSX.utils.book_new();

  const start = formatDateTime(data.period_start);
  const end = formatDateTime(data.period_end);

  // --- Sheet 1: Resumen ---
  const resumenRows: (string | number)[][] = [
    ["Cierre de caja", tenantName],
    ["Inicio", start],
    ["Fin", end],
    [],
    ["Resumen"],
    ["Total bruto", num(data.total_gross)],
    ["Total neto", num(data.total_net)],
    ["Total impuestos", num(data.total_tax)],
    ["Efectivo", num(data.total_cash)],
    ["Tarjeta", num(data.total_card)],
    ["Cambio", num(data.total_change)],
    ["Transacciones", data.transaction_count],
    [],
    ["Facturas"],
    ["Tickets", data.invoice_type_counts.tickets],
    ["Facturas", data.invoice_type_counts.facturas],
    ["Rectificativas", data.invoice_type_counts.rectificativas],
  ];

  if (data.expected_cash != null) {
    resumenRows.push(
      [],
      ["Arqueo"],
      ["Efectivo inicial", num(data.starting_cash)],
      ["Efectivo esperado", num(data.expected_cash)],
      ["Efectivo contado", num(data.counted_cash ?? "0")],
      ["Diferencia", num(data.difference ?? "0")],
    );
  }

  if (data.tax_breakdown.length > 0) {
    resumenRows.push([], ["Desglose impuestos"]);
    resumenRows.push([taxName, "Base", "Cuota"]);
    for (const entry of data.tax_breakdown) {
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
  buildProductosSheet(wb, data.product_breakdown);

  // --- Sheet 3: Stock ---
  if (data.products && data.products.length > 0) {
    const sorted = [...data.products].sort((a, b) => {
      const catA = (a.category ?? "").toLowerCase();
      const catB = (b.category ?? "").toLowerCase();
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    const stockRows: (string | number)[][] = [
      ["Categoria", "Producto", "Centro coste", "Precio bruto", taxName, "Stock"],
    ];
    for (const p of sorted) {
      stockRows.push([
        p.category ?? "",
        p.name,
        p.cost_center ?? "",
        num(p.price_gross),
        `${parseFloat(p.tax_rate)}%`,
        p.stock ?? "",
      ]);
    }
    const wsStock = XLSX.utils.aoa_to_sheet(stockRows);
    wsStock["!cols"] = [
      { wch: 20 },
      { wch: 30 },
      { wch: 16 },
      { wch: 14 },
      { wch: 10 },
      { wch: 8 },
    ];
    XLSX.utils.book_append_sheet(wb, wsStock, "Stock");
  }

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export function generateReportExcel(
  data: AggregatedReport,
  taxName: string,
  tenantName: string,
): Buffer {
  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Resumen ---
  const resumenRows: (string | number)[][] = [
    ["Informe", `${tenantName} — ${data.period.label}`],
    [],
    ["Resumen"],
    ["Total bruto", num(data.summary.total_gross)],
    ["Total neto", num(data.summary.total_net)],
    ["Total impuestos", num(data.summary.total_tax)],
    ["Efectivo", num(data.summary.total_cash)],
    ["Tarjeta", num(data.summary.total_card)],
    ["Transacciones", data.summary.transaction_count],
    [],
    ["Facturas"],
    ["Tickets", data.invoice_counts.tickets],
    ["Facturas", data.invoice_counts.facturas],
    ["Rectificativas", data.invoice_counts.rectificativas],
  ];

  if (data.tax_breakdown.length > 0) {
    resumenRows.push([], ["Desglose impuestos"]);
    resumenRows.push([taxName, "Base", "Cuota"]);
    for (const entry of data.tax_breakdown) {
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
  buildProductosSheet(wb, data.product_breakdown);

  // --- Sheet 3: Turnos (daily only) ---
  if (data.shifts.length > 0) {
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
    for (let i = 0; i < data.shifts.length; i++) {
      const s = data.shifts[i];
      shiftRows.push([
        `T${data.shifts.length - i}`,
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

    // Per-shift product breakdown
    for (let i = 0; i < data.shifts.length; i++) {
      const s = data.shifts[i];
      if (s.product_breakdown.length > 0) {
        shiftRows.push(
          [],
          [`T${data.shifts.length - i} - Productos`],
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

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function num(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) : v;
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
