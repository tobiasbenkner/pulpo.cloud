import * as XLSX from "xlsx";

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

  // --- Sheet 2: Productos (grouped by cost center) ---
  if (data.product_breakdown.length > 0) {
    const prodRows: (string | number)[][] = [
      ["Producto", "Centro coste", "Uds.", "Total", "Efectivo", "Tarjeta"],
    ];

    // Group products by cost center, sorted alphabetically
    const sorted = [...data.product_breakdown].sort((a, b) => {
      const ccA = (a.cost_center ?? "").toLowerCase();
      const ccB = (b.cost_center ?? "").toLowerCase();
      if (ccA !== ccB) return ccA.localeCompare(ccB);
      return a.product_name.toLowerCase().localeCompare(b.product_name.toLowerCase());
    });
    const groups = new Map<string, typeof data.product_breakdown>();
    for (const row of sorted) {
      const key = row.cost_center ?? "";
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }

    for (const [costCenter, products] of groups) {
      // Group header
      let groupQty = 0;
      let groupTotal = 0;
      let groupCash = 0;
      let groupCard = 0;
      for (const p of products) {
        groupQty += p.quantity;
        groupTotal += num(p.total_gross);
        groupCash += num(p.cash_gross);
        groupCard += num(p.card_gross);
      }

      if (groups.size > 1 || costCenter !== "") {
        prodRows.push([]);
        prodRows.push([
          costCenter || "Sin centro coste",
          "",
          groupQty,
          round2(groupTotal),
          round2(groupCash),
          round2(groupCard),
        ]);
      }

      // Individual products
      for (const row of products) {
        prodRows.push([
          row.product_name,
          row.cost_center ?? "",
          row.quantity,
          num(row.total_gross),
          num(row.cash_gross),
          num(row.card_gross),
        ]);
      }
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

function num(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) : v;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
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
