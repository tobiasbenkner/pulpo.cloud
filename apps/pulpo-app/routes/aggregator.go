package routes

import (
	"math"
	"sort"

	"github.com/pocketbase/pocketbase/core"
	"github.com/shopspring/decimal"
)

// --- Types ---

type ProductBreakdown struct {
	ProductName  string `json:"product_name"`
	ProductID    string `json:"product_id"`
	CostCenter   string `json:"cost_center"`
	Unit         string `json:"unit"`
	Quantity     int    `json:"quantity"`
	CashQuantity int    `json:"cash_quantity"`
	CardQuantity int    `json:"card_quantity"`
	TotalGross   string `json:"total_gross"`
	CashGross    string `json:"cash_gross"`
	CardGross    string `json:"card_gross"`
}

type TaxBreakdown struct {
	Rate string `json:"rate"`
	Net  string `json:"net"`
	Tax  string `json:"tax"`
}

type InvoiceTypeCounts struct {
	Tickets        int `json:"tickets"`
	Facturas       int `json:"facturas"`
	Rectificativas int `json:"rectificativas"`
}

type ClosureSummary struct {
	TotalGross       string            `json:"total_gross"`
	TotalNet         string            `json:"total_net"`
	TotalTax         string            `json:"total_tax"`
	TotalCash        string            `json:"total_cash"`
	TotalCard        string            `json:"total_card"`
	TotalChange      string            `json:"total_change"`
	TransactionCount int               `json:"transaction_count"`
	InvoiceCounts    InvoiceTypeCounts `json:"invoice_counts"`
	TaxBreakdown     []TaxBreakdown    `json:"tax_breakdown"`
	ProductBreakdown []ProductBreakdown `json:"product_breakdown"`
}

type ShiftData struct {
	ID               string            `json:"id"`
	PeriodStart      string            `json:"period_start"`
	PeriodEnd        string            `json:"period_end"`
	StartingCash     string            `json:"starting_cash"`
	CountedCash      string            `json:"counted_cash"`
	ExpectedCash     string            `json:"expected_cash"`
	Difference       string            `json:"difference"`
	TotalGross       string            `json:"total_gross"`
	TotalCash        string            `json:"total_cash"`
	TotalCard        string            `json:"total_card"`
	TransactionCount int               `json:"transaction_count"`
	InvoiceCounts    InvoiceTypeCounts `json:"invoice_counts"`
	ProductBreakdown []ProductBreakdown `json:"product_breakdown"`
}

type AggregatedReport struct {
	Period           map[string]string  `json:"period"`
	Summary          map[string]any     `json:"summary"`
	InvoiceCounts    InvoiceTypeCounts  `json:"invoice_counts"`
	TaxBreakdown     []TaxBreakdown     `json:"tax_breakdown"`
	ProductBreakdown []ProductBreakdown `json:"product_breakdown"`
	Shifts           []ShiftData        `json:"shifts"`
}

// --- Computation from invoices ---

// ComputeClosureSummary loads invoices for a closure and computes all aggregated data.
func ComputeClosureSummary(app core.App, closureID string) (*ClosureSummary, error) {
	// Load invoices for this closure
	invoices, err := app.FindRecordsByFilter(
		"invoices",
		"closure = {:id} && (status = 'paid' || status = 'rectificada')",
		"", 0, 0,
		map[string]any{"id": closureID},
	)
	if err != nil {
		return nil, err
	}

	// Load all items and payments for these invoices
	invoiceIDs := make([]string, len(invoices))
	for i, inv := range invoices {
		invoiceIDs[i] = inv.Id
	}

	return computeSummaryFromInvoices(app, invoices, invoiceIDs)
}

func computeSummaryFromInvoices(app core.App, invoices []*core.Record, invoiceIDs []string) (*ClosureSummary, error) {
	zero := decimal.Zero
	totalGross := zero
	totalNet := zero
	totalTax := zero
	totalCash := zero
	totalCard := zero
	totalChange := zero

	counts := InvoiceTypeCounts{}

	// Invoice type counts + totals
	for _, inv := range invoices {
		totalGross = totalGross.Add(safeDec(inv.GetString("total_gross")))
		totalNet = totalNet.Add(safeDec(inv.GetString("total_net")))
		totalTax = totalTax.Add(safeDec(inv.GetString("total_tax")))

		switch inv.GetString("invoice_type") {
		case "ticket":
			counts.Tickets++
		case "factura":
			counts.Facturas++
		case "rectificativa":
			counts.Rectificativas++
		}
	}

	// Payments
	if len(invoiceIDs) > 0 {
		for _, invID := range invoiceIDs {
			payments, err := app.FindRecordsByFilter(
				"invoice_payments",
				"invoice = {:id}", "", 0, 0,
				map[string]any{"id": invID},
			)
			if err != nil {
				continue
			}
			for _, p := range payments {
				amount := safeDec(p.GetString("amount"))
				change := safeDec(p.GetString("change"))
				if p.GetString("method") == "cash" {
					totalCash = totalCash.Add(amount)
					totalChange = totalChange.Add(change)
				} else {
					totalCard = totalCard.Add(amount)
				}
			}
		}
	}

	// Tax breakdown from invoice items
	taxBreakdown := computeTaxBreakdownFromItems(app, invoiceIDs)

	// Product breakdown
	productBreakdown := computeProductBreakdownFromItems(app, invoices, invoiceIDs)

	return &ClosureSummary{
		TotalGross:       totalGross.StringFixed(2),
		TotalNet:         totalNet.StringFixed(2),
		TotalTax:         totalTax.StringFixed(2),
		TotalCash:        totalCash.StringFixed(2),
		TotalCard:        totalCard.StringFixed(2),
		TotalChange:      totalChange.StringFixed(2),
		TransactionCount: len(invoices),
		InvoiceCounts:    counts,
		TaxBreakdown:     taxBreakdown,
		ProductBreakdown: productBreakdown,
	}, nil
}

func computeTaxBreakdownFromItems(app core.App, invoiceIDs []string) []TaxBreakdown {
	hundred := decimal.NewFromInt(100)
	taxMap := make(map[string]struct{ net, tax decimal.Decimal })

	for _, invID := range invoiceIDs {
		items, err := app.FindRecordsByFilter(
			"invoice_items",
			"invoice = {:id}", "", 0, 0,
			map[string]any{"id": invID},
		)
		if err != nil {
			continue
		}

		// Group by tax rate within this invoice
		invTaxMap := make(map[string]decimal.Decimal)
		for _, item := range items {
			rate := item.GetString("tax_rate_snapshot")
			if rate == "" {
				continue
			}
			gross := safeDec(item.GetString("row_total_gross"))
			prev := invTaxMap[rate]
			invTaxMap[rate] = prev.Add(gross)
		}

		// Compute net/tax per group
		for rate, groupGross := range invTaxMap {
			gGross := groupGross.Round(2)
			rateDecimal, _ := decimal.NewFromString(rate)
			rateDiv := rateDecimal.Div(hundred)
			net := gGross.Div(decimal.NewFromInt(1).Add(rateDiv)).Round(2)
			tax := gGross.Sub(net)

			existing, ok := taxMap[rate]
			if !ok {
				existing = struct{ net, tax decimal.Decimal }{decimal.Zero, decimal.Zero}
			}
			taxMap[rate] = struct{ net, tax decimal.Decimal }{
				existing.net.Add(net),
				existing.tax.Add(tax),
			}
		}
	}

	// Sort by rate ascending
	rates := make([]string, 0, len(taxMap))
	for r := range taxMap {
		rates = append(rates, r)
	}
	sort.Slice(rates, func(i, j int) bool {
		ri, _ := decimal.NewFromString(rates[i])
		rj, _ := decimal.NewFromString(rates[j])
		return ri.LessThan(rj)
	})

	result := make([]TaxBreakdown, len(rates))
	for i, rate := range rates {
		v := taxMap[rate]
		result[i] = TaxBreakdown{
			Rate: rate,
			Net:  v.net.StringFixed(2),
			Tax:  v.tax.StringFixed(2),
		}
	}
	return result
}

func computeProductBreakdownFromItems(app core.App, invoices []*core.Record, invoiceIDs []string) []ProductBreakdown {
	type productEntry struct {
		productID    string
		costCenter   string
		unit         string
		quantity     int
		cashQuantity int
		cardQuantity int
		totalGross   decimal.Decimal
		cashGross    decimal.Decimal
		cardGross    decimal.Decimal
	}

	productMap := make(map[string]*productEntry)

	// Build a map of invoice ID → primary payment method
	invoiceMethod := make(map[string]string)
	for _, invID := range invoiceIDs {
		payments, err := app.FindRecordsByFilter(
			"invoice_payments",
			"invoice = {:id}", "", 1, 0,
			map[string]any{"id": invID},
		)
		if err != nil || len(payments) == 0 {
			invoiceMethod[invID] = "cash"
		} else {
			invoiceMethod[invID] = payments[0].GetString("method")
		}
	}

	for _, invID := range invoiceIDs {
		items, err := app.FindRecordsByFilter(
			"invoice_items",
			"invoice = {:id}", "", 0, 0,
			map[string]any{"id": invID},
		)
		if err != nil {
			continue
		}

		method := invoiceMethod[invID]

		for _, item := range items {
			name := item.GetString("product_name")
			existing, ok := productMap[name]
			if !ok {
				existing = &productEntry{
					productID:  item.GetString("product"),
					costCenter: item.GetString("cost_center"),
					unit:       item.GetString("unit"),
					totalGross: decimal.Zero,
					cashGross:  decimal.Zero,
					cardGross:  decimal.Zero,
				}
				productMap[name] = existing
			}

			qty := item.GetInt("quantity")
			gross := safeDec(item.GetString("row_total_gross"))

			existing.quantity += qty
			existing.totalGross = existing.totalGross.Add(gross)
			if method == "cash" {
				existing.cashQuantity += qty
				existing.cashGross = existing.cashGross.Add(gross)
			} else {
				existing.cardQuantity += qty
				existing.cardGross = existing.cardGross.Add(gross)
			}
		}
	}

	// Sort by absolute quantity descending
	names := make([]string, 0, len(productMap))
	for name := range productMap {
		names = append(names, name)
	}
	sort.Slice(names, func(i, j int) bool {
		return absInt(productMap[names[i]].quantity) > absInt(productMap[names[j]].quantity)
	})

	result := make([]ProductBreakdown, len(names))
	for i, name := range names {
		v := productMap[name]
		unit := v.unit
		if unit == "" {
			unit = "unit"
		}
		result[i] = ProductBreakdown{
			ProductName:  name,
			ProductID:    v.productID,
			CostCenter:   v.costCenter,
			Unit:         unit,
			Quantity:     v.quantity,
			CashQuantity: v.cashQuantity,
			CardQuantity: v.cardQuantity,
			TotalGross:   v.totalGross.StringFixed(2),
			CashGross:    v.cashGross.StringFixed(2),
			CardGross:    v.cardGross.StringFixed(2),
		}
	}
	return result
}

// --- Helpers ---

func safeDec(s string) decimal.Decimal {
	if s == "" {
		return decimal.Zero
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return decimal.Zero
	}
	return d
}

func absInt(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func absFloat(n float64) float64 {
	return math.Abs(n)
}
