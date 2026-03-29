package excel

import (
	"fmt"
	"strconv"
	"time"

	"github.com/xuri/excelize/v2"
)

// GenerateClosureExcel creates a closure report workbook with Resumen + Productos sheets.
func GenerateClosureExcel(data ClosureReportData, taxName, tenantName string) (*excelize.File, error) {
	f := excelize.NewFile()
	defer func() { f.SetActiveSheet(0) }()

	// Rename default sheet to "Resumen"
	f.SetSheetName("Sheet1", "Resumen")

	writeResumenSheet(f, "Resumen", data, taxName, tenantName)

	// Sheet 2: Productos
	WriteProductosSheet(f, data.ProductBreakdown)

	return f, nil
}

func writeResumenSheet(f *excelize.File, sheet string, data ClosureReportData, taxName, tenantName string) {
	f.SetColWidth(sheet, "A", "A", 20)
	f.SetColWidth(sheet, "B", "C", 14)

	row := 1
	set := func(col int, v any) {
		f.SetCellValue(sheet, cellName(col, row), v)
	}

	set(0, "Cierre de caja")
	set(1, tenantName)
	row++
	set(0, "Inicio")
	set(1, formatDateTime(data.PeriodStart))
	row++
	set(0, "Fin")
	set(1, formatDateTime(data.PeriodEnd))
	row += 2

	set(0, "Resumen")
	row++
	set(0, "Total bruto")
	set(1, parseNum(data.TotalGross))
	row++
	set(0, "Total neto")
	set(1, parseNum(data.TotalNet))
	row++
	set(0, "Total impuestos")
	set(1, parseNum(data.TotalTax))
	row++
	set(0, "Efectivo")
	set(1, parseNum(data.TotalCash))
	row++
	set(0, "Tarjeta")
	set(1, parseNum(data.TotalCard))
	row++
	set(0, "Cambio")
	set(1, parseNum(data.TotalChange))
	row++
	set(0, "Transacciones")
	set(1, data.TransactionCount)
	row += 2

	set(0, "Facturas")
	row++
	set(0, "Tickets")
	set(1, data.InvoiceCounts.Tickets)
	row++
	set(0, "Facturas")
	set(1, data.InvoiceCounts.Facturas)
	row++
	set(0, "Rectificativas")
	set(1, data.InvoiceCounts.Rectificativas)

	// Cash reconciliation
	if data.ExpectedCash != "" {
		row += 2
		set(0, "Arqueo")
		row++
		set(0, "Efectivo inicial")
		set(1, parseNum(data.StartingCash))
		row++
		set(0, "Efectivo esperado")
		set(1, parseNum(data.ExpectedCash))
		row++
		set(0, "Efectivo contado")
		set(1, parseNum(data.CountedCash))
		row++
		set(0, "Diferencia")
		set(1, parseNum(data.Difference))
	}

	// Tax breakdown
	if len(data.TaxBreakdown) > 0 {
		row += 2
		set(0, "Desglose impuestos")
		row++
		set(0, taxName)
		set(1, "Base")
		set(2, "Cuota")
		row++
		for _, entry := range data.TaxBreakdown {
			rate, _ := strconv.ParseFloat(entry.Rate, 64)
			set(0, fmt.Sprintf("%s %.0f%%", taxName, rate))
			set(1, parseNum(entry.Net))
			set(2, parseNum(entry.Tax))
			row++
		}
	}
}

// GenerateReportExcel creates a period report workbook with Resumen + Productos + Turnos sheets.
func GenerateReportExcel(data AggregatedReportData, taxName string) (*excelize.File, error) {
	f := excelize.NewFile()
	defer func() { f.SetActiveSheet(0) }()

	f.SetSheetName("Sheet1", "Resumen")

	writeReportResumenSheet(f, "Resumen", data, taxName)

	// Sheet 2: Productos
	WriteProductosSheet(f, data.ProductBreakdown)

	// Sheet 3: Turnos (if present)
	if len(data.Shifts) > 0 {
		writeTurnosSheet(f, data.Shifts)
	}

	return f, nil
}

func writeReportResumenSheet(f *excelize.File, sheet string, data AggregatedReportData, taxName string) {
	f.SetColWidth(sheet, "A", "A", 20)
	f.SetColWidth(sheet, "B", "C", 14)

	row := 1
	set := func(col int, v any) {
		f.SetCellValue(sheet, cellName(col, row), v)
	}

	set(0, "Informe")
	set(1, fmt.Sprintf("%s — %s", data.TenantName, data.Label))
	row += 2

	set(0, "Resumen")
	row++
	set(0, "Total bruto")
	set(1, parseNum(data.TotalGross))
	row++
	set(0, "Total neto")
	set(1, parseNum(data.TotalNet))
	row++
	set(0, "Total impuestos")
	set(1, parseNum(data.TotalTax))
	row++
	set(0, "Efectivo")
	set(1, parseNum(data.TotalCash))
	row++
	set(0, "Tarjeta")
	set(1, parseNum(data.TotalCard))
	row++
	set(0, "Transacciones")
	set(1, data.TransactionCount)
	row += 2

	set(0, "Facturas")
	row++
	set(0, "Tickets")
	set(1, data.InvoiceCounts.Tickets)
	row++
	set(0, "Facturas")
	set(1, data.InvoiceCounts.Facturas)
	row++
	set(0, "Rectificativas")
	set(1, data.InvoiceCounts.Rectificativas)

	if len(data.TaxBreakdown) > 0 {
		row += 2
		set(0, "Desglose impuestos")
		row++
		set(0, taxName)
		set(1, "Base")
		set(2, "Cuota")
		row++
		for _, entry := range data.TaxBreakdown {
			rate, _ := strconv.ParseFloat(entry.Rate, 64)
			set(0, fmt.Sprintf("%s %.0f%%", taxName, rate))
			set(1, parseNum(entry.Net))
			set(2, parseNum(entry.Tax))
			row++
		}
	}
}

func writeTurnosSheet(f *excelize.File, shifts []ShiftRow) {
	sheet := "Turnos"
	f.NewSheet(sheet)

	f.SetColWidth(sheet, "A", "A", 8)
	f.SetColWidth(sheet, "B", "C", 10)
	f.SetColWidth(sheet, "D", "D", 8)
	f.SetColWidth(sheet, "E", "E", 8)
	f.SetColWidth(sheet, "F", "F", 10)
	f.SetColWidth(sheet, "G", "G", 8)
	f.SetColWidth(sheet, "H", "K", 12)

	// Header
	headers := []string{"Turno", "Inicio", "Fin", "Trans.", "Tickets", "Facturas", "Rect.", "Bruto", "Efectivo", "Tarjeta", "Diferencia"}
	for i, h := range headers {
		f.SetCellValue(sheet, cellName(i, 1), h)
	}

	row := 2
	for i, s := range shifts {
		label := fmt.Sprintf("T%d", len(shifts)-i)
		f.SetCellValue(sheet, cellName(0, row), label)
		f.SetCellValue(sheet, cellName(1, row), formatTime(s.PeriodStart))
		if s.PeriodEnd != "" {
			f.SetCellValue(sheet, cellName(2, row), formatTime(s.PeriodEnd))
		}
		f.SetCellValue(sheet, cellName(3, row), s.TransactionCount)
		f.SetCellValue(sheet, cellName(4, row), s.InvoiceCounts.Tickets)
		f.SetCellValue(sheet, cellName(5, row), s.InvoiceCounts.Facturas)
		f.SetCellValue(sheet, cellName(6, row), s.InvoiceCounts.Rectificativas)
		f.SetCellValue(sheet, cellName(7, row), parseNum(s.TotalGross))
		f.SetCellValue(sheet, cellName(8, row), parseNum(s.TotalCash))
		f.SetCellValue(sheet, cellName(9, row), parseNum(s.TotalCard))
		if s.Difference != "" {
			f.SetCellValue(sheet, cellName(10, row), parseNum(s.Difference))
		}
		row++
	}

	// Per-shift product breakdown
	for i, s := range shifts {
		if len(s.ProductBreakdown) == 0 {
			continue
		}
		row++
		label := fmt.Sprintf("T%d - Productos", len(shifts)-i)
		f.SetCellValue(sheet, cellName(0, row), label)
		row++
		prodHeaders := []string{"Producto", "Centro coste", "Uds.", "Uds. Ef.", "Uds. Tj.", "Total", "Efectivo", "Tarjeta"}
		for j, h := range prodHeaders {
			f.SetCellValue(sheet, cellName(j, row), h)
		}
		row++

		for _, p := range s.ProductBreakdown {
			f.SetCellValue(sheet, cellName(0, row), p.ProductName)
			f.SetCellValue(sheet, cellName(1, row), p.CostCenter)
			f.SetCellValue(sheet, cellName(2, row), p.Quantity)
			f.SetCellValue(sheet, cellName(3, row), p.CashQuantity)
			f.SetCellValue(sheet, cellName(4, row), p.CardQuantity)
			f.SetCellValue(sheet, cellName(5, row), parseNum(p.TotalGross))
			f.SetCellValue(sheet, cellName(6, row), parseNum(p.CashGross))
			f.SetCellValue(sheet, cellName(7, row), parseNum(p.CardGross))
			row++
		}
	}
}

func formatDateTime(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		t, err = time.Parse("2006-01-02 15:04:05.000Z", iso)
		if err != nil {
			return iso
		}
	}
	loc, _ := time.LoadLocation("Europe/Madrid")
	return t.In(loc).Format("02/01/2006 15:04")
}

func formatTime(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		t, err = time.Parse("2006-01-02 15:04:05.000Z", iso)
		if err != nil {
			return iso
		}
	}
	loc, _ := time.LoadLocation("Europe/Madrid")
	return t.In(loc).Format("15:04")
}
