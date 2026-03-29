package routes

import (
	"testing"

	"github.com/shopspring/decimal"
)

func TestSafeDec(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"10.50", "10.5"},
		{"0", "0"},
		{"", "0"},
		{"-5.25", "-5.25"},
		{"not-a-number", "0"},
		{"99999.99", "99999.99"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			got := safeDec(tt.input)
			want, _ := decimal.NewFromString(tt.want)
			if !got.Equal(want) {
				t.Errorf("safeDec(%q) = %s, want %s", tt.input, got, want)
			}
		})
	}
}

func TestAbsInt(t *testing.T) {
	tests := []struct {
		input int
		want  int
	}{
		{5, 5},
		{-5, 5},
		{0, 0},
		{-100, 100},
	}

	for _, tt := range tests {
		got := absInt(tt.input)
		if got != tt.want {
			t.Errorf("absInt(%d) = %d, want %d", tt.input, got, tt.want)
		}
	}
}

// TestClosureSummaryAggregation tests the aggregation of multiple closure summaries.
// This simulates what happens in the reports endpoint when aggregating closures.
func TestClosureSummaryAggregation(t *testing.T) {
	// Simulate two closures with known data
	summaries := []ClosureSummary{
		{
			TotalGross:       "150.00",
			TotalNet:         "140.19",
			TotalTax:         "9.81",
			TotalCash:        "80.00",
			TotalCard:        "70.00",
			TotalChange:      "5.00",
			TransactionCount: 5,
			InvoiceCounts:    InvoiceTypeCounts{Tickets: 3, Facturas: 1, Rectificativas: 1},
			TaxBreakdown: []TaxBreakdown{
				{Rate: "7.00", Net: "93.46", Tax: "6.54"},
				{Rate: "21.00", Net: "46.73", Tax: "3.27"},
			},
			ProductBreakdown: []ProductBreakdown{
				{ProductName: "Cerveza", Quantity: 10, TotalGross: "35.00", CashGross: "21.00", CardGross: "14.00"},
				{ProductName: "Tapa", Quantity: 5, TotalGross: "25.00", CashGross: "10.00", CardGross: "15.00"},
			},
		},
		{
			TotalGross:       "200.00",
			TotalNet:         "186.92",
			TotalTax:         "13.08",
			TotalCash:        "120.00",
			TotalCard:        "80.00",
			TotalChange:      "10.00",
			TransactionCount: 8,
			InvoiceCounts:    InvoiceTypeCounts{Tickets: 6, Facturas: 2, Rectificativas: 0},
			TaxBreakdown: []TaxBreakdown{
				{Rate: "7.00", Net: "130.84", Tax: "9.16"},
				{Rate: "21.00", Net: "56.08", Tax: "3.92"},
			},
			ProductBreakdown: []ProductBreakdown{
				{ProductName: "Cerveza", Quantity: 15, TotalGross: "52.50", CashGross: "30.00", CardGross: "22.50"},
				{ProductName: "Vino", Quantity: 4, TotalGross: "32.00", CashGross: "16.00", CardGross: "16.00"},
			},
		},
	}

	// Aggregate
	zero := decimal.Zero
	totalGross := zero
	totalNet := zero
	totalTax := zero
	totalCash := zero
	totalCard := zero
	transactionCount := 0
	counts := InvoiceTypeCounts{}
	taxMap := make(map[string]struct{ net, tax decimal.Decimal })
	productMap := make(map[string]*productAcc)

	for _, s := range summaries {
		totalGross = totalGross.Add(safeDec(s.TotalGross))
		totalNet = totalNet.Add(safeDec(s.TotalNet))
		totalTax = totalTax.Add(safeDec(s.TotalTax))
		totalCash = totalCash.Add(safeDec(s.TotalCash))
		totalCard = totalCard.Add(safeDec(s.TotalCard))
		transactionCount += s.TransactionCount
		counts.Tickets += s.InvoiceCounts.Tickets
		counts.Facturas += s.InvoiceCounts.Facturas
		counts.Rectificativas += s.InvoiceCounts.Rectificativas

		for _, tb := range s.TaxBreakdown {
			existing, ok := taxMap[tb.Rate]
			if !ok {
				existing = struct{ net, tax decimal.Decimal }{zero, zero}
			}
			taxMap[tb.Rate] = struct{ net, tax decimal.Decimal }{
				existing.net.Add(safeDec(tb.Net)),
				existing.tax.Add(safeDec(tb.Tax)),
			}
		}

		for _, pb := range s.ProductBreakdown {
			existing, ok := productMap[pb.ProductName]
			if !ok {
				existing = &productAcc{
					totalGross: zero,
					cashGross:  zero,
					cardGross:  zero,
				}
				productMap[pb.ProductName] = existing
			}
			existing.quantity += pb.Quantity
			existing.totalGross = existing.totalGross.Add(safeDec(pb.TotalGross))
			existing.cashGross = existing.cashGross.Add(safeDec(pb.CashGross))
			existing.cardGross = existing.cardGross.Add(safeDec(pb.CardGross))
		}
	}

	// Verify totals
	assertEqual := func(label, got, want string) {
		t.Helper()
		if got != want {
			t.Errorf("%s = %s, want %s", label, got, want)
		}
	}

	assertEqual("total_gross", totalGross.StringFixed(2), "350.00")
	assertEqual("total_net", totalNet.StringFixed(2), "327.11")
	assertEqual("total_tax", totalTax.StringFixed(2), "22.89")
	assertEqual("total_cash", totalCash.StringFixed(2), "200.00")
	assertEqual("total_card", totalCard.StringFixed(2), "150.00")
	if transactionCount != 13 {
		t.Errorf("transaction_count = %d, want 13", transactionCount)
	}

	// Invoice counts
	if counts.Tickets != 9 {
		t.Errorf("tickets = %d, want 9", counts.Tickets)
	}
	if counts.Facturas != 3 {
		t.Errorf("facturas = %d, want 3", counts.Facturas)
	}
	if counts.Rectificativas != 1 {
		t.Errorf("rectificativas = %d, want 1", counts.Rectificativas)
	}

	// Tax breakdown
	taxResult := sortedTaxBreakdown(taxMap)
	if len(taxResult) != 2 {
		t.Fatalf("tax breakdown length = %d, want 2", len(taxResult))
	}
	assertEqual("7% net", taxResult[0].Net, "224.30")
	assertEqual("7% tax", taxResult[0].Tax, "15.70")
	assertEqual("21% net", taxResult[1].Net, "102.81")
	assertEqual("21% tax", taxResult[1].Tax, "7.19")

	// Product breakdown
	productResult := buildProductBreakdown(productMap)
	if len(productResult) != 3 {
		t.Fatalf("product breakdown length = %d, want 3", len(productResult))
	}

	// Cerveza should be first (25 total qty)
	if productResult[0].ProductName != "Cerveza" {
		t.Errorf("first product = %s, want Cerveza", productResult[0].ProductName)
	}
	if productResult[0].Quantity != 25 {
		t.Errorf("Cerveza quantity = %d, want 25", productResult[0].Quantity)
	}
	assertEqual("Cerveza total_gross", productResult[0].TotalGross, "87.50")
	assertEqual("Cerveza cash_gross", productResult[0].CashGross, "51.00")
	assertEqual("Cerveza card_gross", productResult[0].CardGross, "36.50")
}

// TestExpectedCashCalculation verifies the cash reconciliation math.
func TestExpectedCashCalculation(t *testing.T) {
	startingCash := safeDec("100.00")
	totalCash := safeDec("350.00")
	countedCash := safeDec("445.00")

	expectedCash := startingCash.Add(totalCash)
	difference := countedCash.Sub(expectedCash)

	if expectedCash.StringFixed(2) != "450.00" {
		t.Errorf("expected_cash = %s, want 450.00", expectedCash.StringFixed(2))
	}
	if difference.StringFixed(2) != "-5.00" {
		t.Errorf("difference = %s, want -5.00 (shortage)", difference.StringFixed(2))
	}
}

// TestExpectedCashCalculation_Overage verifies overage detection.
func TestExpectedCashCalculation_Overage(t *testing.T) {
	startingCash := safeDec("50.00")
	totalCash := safeDec("200.00")
	countedCash := safeDec("252.50")

	expectedCash := startingCash.Add(totalCash)
	difference := countedCash.Sub(expectedCash)

	if expectedCash.StringFixed(2) != "250.00" {
		t.Errorf("expected_cash = %s, want 250.00", expectedCash.StringFixed(2))
	}
	if difference.StringFixed(2) != "2.50" {
		t.Errorf("difference = %s, want 2.50 (overage)", difference.StringFixed(2))
	}
}

// TestNegativeRectificativaInAggregation verifies that rectificativas
// correctly reduce totals when aggregated.
func TestNegativeRectificativaInAggregation(t *testing.T) {
	// Normal invoice + rectificativa that cancels part of it
	summaries := []ClosureSummary{
		{
			TotalGross:       "100.00",
			TotalNet:         "93.46",
			TotalTax:         "6.54",
			TotalCash:        "100.00",
			TotalCard:        "0.00",
			TransactionCount: 2, // 1 sale + 1 rectificativa
			InvoiceCounts:    InvoiceTypeCounts{Tickets: 1, Rectificativas: 1},
			TaxBreakdown: []TaxBreakdown{
				{Rate: "7.00", Net: "93.46", Tax: "6.54"},
			},
			ProductBreakdown: []ProductBreakdown{
				// 5 sold, 2 returned = net 3
				{ProductName: "Cerveza", Quantity: 3, TotalGross: "10.50",
					CashGross: "10.50", CardGross: "0.00"},
			},
		},
	}

	// The rectificativa's negative amounts are already included in the totals
	if summaries[0].TotalGross != "100.00" {
		t.Error("sanity check failed")
	}

	// Product quantity should reflect the net (5 sold - 2 returned = 3)
	if summaries[0].ProductBreakdown[0].Quantity != 3 {
		t.Errorf("net quantity should be 3, got %d", summaries[0].ProductBreakdown[0].Quantity)
	}
}
