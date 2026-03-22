import * as XLSX from "xlsx-js-style";

interface ProductRow {
  product_name: string;
  cost_center: string | null;
  unit: "unit" | "weight";
  quantity: number;
  cash_quantity?: number;
  card_quantity?: number;
  total_gross: string;
  cash_gross: string;
  card_gross: string;
}

function num(v: string | number): number {
  return typeof v === "string" ? parseFloat(v) : v;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/**
 * Build a styled "Productos" sheet grouped by cost center and append it to the workbook.
 * Splits quantity into separate "Uds." and "Kg" columns.
 */
export function buildProductosSheet(
  wb: XLSX.WorkBook,
  productBreakdown: ProductRow[],
): void {
  if (productBreakdown.length === 0) return;

  // Group products by cost center, sorted alphabetically
  const sorted = [...productBreakdown].sort((a, b) => {
    const ccA = (a.cost_center ?? "").toLowerCase();
    const ccB = (b.cost_center ?? "").toLowerCase();
    if (ccA !== ccB) return ccA.localeCompare(ccB);
    return a.product_name
      .toLowerCase()
      .localeCompare(b.product_name.toLowerCase());
  });
  const groups = new Map<string, ProductRow[]>();
  for (const row of sorted) {
    const key = row.cost_center ?? "";
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  // Pre-compute grand totals
  let grandUds = 0;
  let grandKg = 0;
  let grandCashUds = 0;
  let grandCardUds = 0;
  let grandCashKg = 0;
  let grandCardKg = 0;
  let grandTotal = 0;
  let grandCash = 0;
  let grandCard = 0;
  for (const p of productBreakdown) {
    if (p.unit === "weight") {
      grandKg += p.quantity;
      grandCashKg += p.cash_quantity ?? 0;
      grandCardKg += p.card_quantity ?? 0;
    } else {
      grandUds += p.quantity;
      grandCashUds += p.cash_quantity ?? 0;
      grandCardUds += p.card_quantity ?? 0;
    }
    grandTotal += num(p.total_gross);
    grandCash += num(p.cash_gross);
    grandCard += num(p.card_gross);
  }

  // Header + totals row at the top
  const prodRows: (string | number)[][] = [
    ["Producto", "Centro coste", "Uds.", "Uds. Ef.", "Uds. Tj.", "Kg", "Kg Ef.", "Kg Tj.", "Total", "Efectivo", "Tarjeta"],
    [
      "Total",
      "",
      grandUds || "",
      grandCashUds || "",
      grandCardUds || "",
      grandKg ? round3(grandKg) : "",
      grandCashKg ? round3(grandCashKg) : "",
      grandCardKg ? round3(grandCardKg) : "",
      round2(grandTotal),
      round2(grandCash),
      round2(grandCard),
    ],
  ];
  const totalsRowIndex = 1;
  const groupRowIndices: number[] = [];

  // Cost center groups with products
  for (const [costCenter, products] of groups) {
    if (groups.size > 1 || costCenter !== "") {
      let groupUds = 0;
      let groupKg = 0;
      let groupCashUds = 0;
      let groupCardUds = 0;
      let groupCashKg = 0;
      let groupCardKg = 0;
      let groupTotal = 0;
      let groupCash = 0;
      let groupCard = 0;
      for (const p of products) {
        if (p.unit === "weight") {
          groupKg += p.quantity;
          groupCashKg += p.cash_quantity ?? 0;
          groupCardKg += p.card_quantity ?? 0;
        } else {
          groupUds += p.quantity;
          groupCashUds += p.cash_quantity ?? 0;
          groupCardUds += p.card_quantity ?? 0;
        }
        groupTotal += num(p.total_gross);
        groupCash += num(p.cash_gross);
        groupCard += num(p.card_gross);
      }

      prodRows.push([]);
      groupRowIndices.push(prodRows.length);
      prodRows.push([
        costCenter || "Sin centro coste",
        "",
        groupUds || "",
        groupCashUds || "",
        groupCardUds || "",
        groupKg ? round3(groupKg) : "",
        groupCashKg ? round3(groupCashKg) : "",
        groupCardKg ? round3(groupCardKg) : "",
        round2(groupTotal),
        round2(groupCash),
        round2(groupCard),
      ]);
    }

    for (const row of products) {
      const isWeight = row.unit === "weight";
      const cashQty = row.cash_quantity ?? 0;
      const cardQty = row.card_quantity ?? 0;
      prodRows.push([
        row.product_name,
        row.cost_center ?? "",
        isWeight ? "" : row.quantity,
        isWeight ? "" : cashQty,
        isWeight ? "" : cardQty,
        isWeight ? round3(row.quantity) : "",
        isWeight ? round3(cashQty) : "",
        isWeight ? round3(cardQty) : "",
        num(row.total_gross),
        num(row.cash_gross),
        num(row.card_gross),
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(prodRows);
  ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];

  // Styles
  const headerStyle: XLSX.CellStyle = {
    fill: { fgColor: { rgb: "333333" } },
    font: { bold: true, color: { rgb: "FFFFFF" } },
  };
  const totalsStyle: XLSX.CellStyle = {
    fill: { fgColor: { rgb: "E2E2E2" } },
    font: { bold: true },
  };
  const groupStyle: XLSX.CellStyle = {
    fill: { fgColor: { rgb: "F0F0F0" } },
    font: { bold: true },
  };

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
  for (const col of cols) {
    const headerCell = ws[`${col}1`];
    if (headerCell) headerCell.s = headerStyle;

    for (const ri of groupRowIndices) {
      const cell = ws[`${col}${ri + 1}`];
      if (cell) cell.s = groupStyle;
    }

    const totalsCell = ws[`${col}${totalsRowIndex + 1}`];
    if (totalsCell) totalsCell.s = totalsStyle;
  }

  XLSX.utils.book_append_sheet(wb, ws, "Productos");
}
