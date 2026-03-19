import * as XLSX from "xlsx-js-style";

interface ProductRow {
  product_name: string;
  cost_center: string | null;
  unit: "unit" | "weight";
  quantity: number;
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
  let grandTotal = 0;
  for (const p of productBreakdown) {
    if (p.unit === "weight") {
      grandKg += p.quantity;
    } else {
      grandUds += p.quantity;
    }
    grandTotal += num(p.total_gross);
  }

  // Header + totals row at the top
  const prodRows: (string | number)[][] = [
    ["Producto", "Centro coste", "Uds.", "Kg", "Total"],
    [
      "Total",
      "",
      grandUds || "",
      grandKg ? round3(grandKg) : "",
      round2(grandTotal),
    ],
  ];
  const totalsRowIndex = 1;
  const groupRowIndices: number[] = [];

  // Cost center groups with products
  for (const [costCenter, products] of groups) {
    if (groups.size > 1 || costCenter !== "") {
      let groupUds = 0;
      let groupKg = 0;
      let groupTotal = 0;
      for (const p of products) {
        if (p.unit === "weight") {
          groupKg += p.quantity;
        } else {
          groupUds += p.quantity;
        }
        groupTotal += num(p.total_gross);
      }

      prodRows.push([]);
      groupRowIndices.push(prodRows.length);
      prodRows.push([
        costCenter || "Sin centro coste",
        "",
        groupUds || "",
        groupKg ? round3(groupKg) : "",
        round2(groupTotal),
      ]);
    }

    for (const row of products) {
      const isWeight = row.unit === "weight";
      prodRows.push([
        row.product_name,
        row.cost_center ?? "",
        isWeight ? "" : row.quantity,
        isWeight ? round3(row.quantity) : "",
        num(row.total_gross),
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(prodRows);
  ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 8 }, { wch: 8 }, { wch: 12 }];

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

  const cols = ["A", "B", "C", "D", "E"];
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
