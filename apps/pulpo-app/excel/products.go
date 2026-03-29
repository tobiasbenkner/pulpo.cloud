package excel

import (
	"math"
	"sort"
	"strconv"

	"github.com/xuri/excelize/v2"
)

// WriteProductosSheet adds a "Productos" sheet grouped by cost center.
// Reusable for both closure and report Excel generation.
func WriteProductosSheet(f *excelize.File, products []ProductRow) {
	if len(products) == 0 {
		return
	}

	sheet := "Productos"
	f.NewSheet(sheet)

	// Styles
	headerStyle, _ := f.NewStyle(&excelize.Style{
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"333333"}},
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Alignment: &excelize.Alignment{Horizontal: "center"},
	})
	totalsStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"E2E2E2"}},
		Font: &excelize.Font{Bold: true},
	})
	groupStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"F0F0F0"}},
		Font: &excelize.Font{Bold: true},
	})

	// Column widths
	f.SetColWidth(sheet, "A", "A", 30)
	f.SetColWidth(sheet, "B", "B", 16)
	f.SetColWidth(sheet, "C", "H", 8)
	f.SetColWidth(sheet, "I", "K", 12)

	// Group products by cost center
	sorted := make([]ProductRow, len(products))
	copy(sorted, products)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].CostCenter != sorted[j].CostCenter {
			return sorted[i].CostCenter < sorted[j].CostCenter
		}
		return sorted[i].ProductName < sorted[j].ProductName
	})

	type group struct {
		name     string
		products []ProductRow
	}
	var groups []group
	groupMap := make(map[string]int)
	for _, p := range sorted {
		key := p.CostCenter
		if idx, ok := groupMap[key]; ok {
			groups[idx].products = append(groups[idx].products, p)
		} else {
			groupMap[key] = len(groups)
			groups = append(groups, group{name: key, products: []ProductRow{p}})
		}
	}

	// Grand totals
	var grandUds, grandKg, grandCashUds, grandCardUds, grandCashKg, grandCardKg int
	var grandTotal, grandCash, grandCard float64
	for _, p := range products {
		if p.Unit == "weight" {
			grandKg += p.Quantity
			grandCashKg += p.CashQuantity
			grandCardKg += p.CardQuantity
		} else {
			grandUds += p.Quantity
			grandCashUds += p.CashQuantity
			grandCardUds += p.CardQuantity
		}
		grandTotal += parseNum(p.TotalGross)
		grandCash += parseNum(p.CashGross)
		grandCard += parseNum(p.CardGross)
	}

	// Header row
	headers := []string{"Producto", "Centro coste", "Uds.", "Uds. Ef.", "Uds. Tj.", "Kg", "Kg Ef.", "Kg Tj.", "Total", "Efectivo", "Tarjeta"}
	for i, h := range headers {
		cell := cellName(i, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// Totals row
	row := 2
	writeProductGroupRow(f, sheet, row, "Total",
		grandUds, grandCashUds, grandCardUds,
		grandKg, grandCashKg, grandCardKg,
		grandTotal, grandCash, grandCard, totalsStyle)
	row++

	// Groups
	for _, g := range groups {
		if len(groups) > 1 || g.name != "" {
			row++ // blank row

			// Group subtotals
			var gUds, gKg, gCashUds, gCardUds, gCashKg, gCardKg int
			var gTotal, gCash, gCard float64
			for _, p := range g.products {
				if p.Unit == "weight" {
					gKg += p.Quantity
					gCashKg += p.CashQuantity
					gCardKg += p.CardQuantity
				} else {
					gUds += p.Quantity
					gCashUds += p.CashQuantity
					gCardUds += p.CardQuantity
				}
				gTotal += parseNum(p.TotalGross)
				gCash += parseNum(p.CashGross)
				gCard += parseNum(p.CardGross)
			}

			label := g.name
			if label == "" {
				label = "Sin centro coste"
			}
			writeProductGroupRow(f, sheet, row, label,
				gUds, gCashUds, gCardUds,
				gKg, gCashKg, gCardKg,
				gTotal, gCash, gCard, groupStyle)
			row++
		}

		for _, p := range g.products {
			f.SetCellValue(sheet, cellName(0, row), p.ProductName)
			f.SetCellValue(sheet, cellName(1, row), p.CostCenter)
			if p.Unit == "weight" {
				setIfNonZero(f, sheet, cellName(5, row), p.Quantity)
				setIfNonZero(f, sheet, cellName(6, row), p.CashQuantity)
				setIfNonZero(f, sheet, cellName(7, row), p.CardQuantity)
			} else {
				setIfNonZero(f, sheet, cellName(2, row), p.Quantity)
				setIfNonZero(f, sheet, cellName(3, row), p.CashQuantity)
				setIfNonZero(f, sheet, cellName(4, row), p.CardQuantity)
			}
			f.SetCellValue(sheet, cellName(8, row), parseNum(p.TotalGross))
			f.SetCellValue(sheet, cellName(9, row), parseNum(p.CashGross))
			f.SetCellValue(sheet, cellName(10, row), parseNum(p.CardGross))
			row++
		}
	}
}

func writeProductGroupRow(f *excelize.File, sheet string, row int, label string,
	uds, cashUds, cardUds, kg, cashKg, cardKg int,
	total, cash, card float64, style int) {
	f.SetCellValue(sheet, cellName(0, row), label)
	setIfNonZero(f, sheet, cellName(2, row), uds)
	setIfNonZero(f, sheet, cellName(3, row), cashUds)
	setIfNonZero(f, sheet, cellName(4, row), cardUds)
	setIfNonZero(f, sheet, cellName(5, row), kg)
	setIfNonZero(f, sheet, cellName(6, row), cashKg)
	setIfNonZero(f, sheet, cellName(7, row), cardKg)
	f.SetCellValue(sheet, cellName(8, row), round2(total))
	f.SetCellValue(sheet, cellName(9, row), round2(cash))
	f.SetCellValue(sheet, cellName(10, row), round2(card))

	for i := 0; i < 11; i++ {
		f.SetCellStyle(sheet, cellName(i, row), cellName(i, row), style)
	}
}

func setIfNonZero(f *excelize.File, sheet, cell string, v int) {
	if v != 0 {
		f.SetCellValue(sheet, cell, v)
	}
}

func cellName(col, row int) string {
	colLetter := string(rune('A' + col))
	return colLetter + strconv.Itoa(row)
}

func parseNum(s string) float64 {
	v, _ := strconv.ParseFloat(s, 64)
	return v
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}
