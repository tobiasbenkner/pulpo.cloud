package invoice

import (
	"testing"

	"github.com/shopspring/decimal"
)

// Cross-validation test cases — identical to packages/invoice/src/cross-validation.test.ts.
// Both implementations MUST produce the same results.

type crossTestCase struct {
	name     string
	items    []LineInput
	discount *DiscountInput
	expected struct {
		gross              string
		net                string
		tax                string
		subtotal           string
		discountTotal      string
		count              int
		taxBreakdownLength int
		items              []struct {
			rowTotalGross   string
			taxRateSnapshot string
		}
	}
}

func d(s string) decimal.Decimal { return decimal.RequireFromString(s) }

func getCrossValidationCases() []crossTestCase {
	cases := []crossTestCase{
		{
			name: "Tapas order Canary Islands (IGIC 7%)",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Papas arrugadas", PriceGross: d("6.50"), TaxRate: d("7"), Quantity: 2},
				{ProductID: "p2", ProductName: "Cerveza", PriceGross: d("3.50"), TaxRate: d("7"), Quantity: 4},
				{ProductID: "p3", ProductName: "Queso asado", PriceGross: d("8.00"), TaxRate: d("7"), Quantity: 1},
			},
		},
		{
			name: "Mixed tax rates mainland (IVA 10% + 21%)",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Menú del día", PriceGross: d("12.50"), TaxRate: d("10"), Quantity: 2},
				{ProductID: "p2", ProductName: "Vino", PriceGross: d("18.00"), TaxRate: d("21"), Quantity: 1},
				{ProductID: "p3", ProductName: "Agua", PriceGross: d("2.00"), TaxRate: d("10"), Quantity: 2},
			},
		},
		{
			name: "10% global discount on mixed rates",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Pulpo a la gallega", PriceGross: d("14.00"), TaxRate: d("7"), Quantity: 1},
				{ProductID: "p2", ProductName: "Gin Tonic", PriceGross: d("9.50"), TaxRate: d("7"), Quantity: 2},
			},
			discount: &DiscountInput{Type: "percent", Value: d("10")},
		},
		{
			name: "Fixed 5€ discount with three tax groups",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Pan", PriceGross: d("1.50"), TaxRate: d("0"), Quantity: 2},
				{ProductID: "p2", ProductName: "Ensalada", PriceGross: d("8.50"), TaxRate: d("10"), Quantity: 1},
				{ProductID: "p3", ProductName: "Whisky", PriceGross: d("12.00"), TaxRate: d("21"), Quantity: 1},
			},
			discount: &DiscountInput{Type: "fixed", Value: d("5")},
		},
		{
			name: "Item discount + global discount combined",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Langosta", PriceGross: d("45.00"), TaxRate: d("7"), Quantity: 1,
					Discount: &DiscountInput{Type: "percent", Value: d("15")}},
				{ProductID: "p2", ProductName: "Champagne", PriceGross: d("35.00"), TaxRate: d("7"), Quantity: 1},
			},
			discount: &DiscountInput{Type: "fixed", Value: d("3")},
		},
		{
			name: "Single cent item (precision edge case)",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Chicle", PriceGross: d("0.01"), TaxRate: d("21"), Quantity: 3},
			},
		},
		{
			name: "Large quantity with rounding",
			items: []LineInput{
				{ProductID: "p1", ProductName: "Café", PriceGross: d("1.30"), TaxRate: d("7"), Quantity: 137},
			},
		},
	}

	// Expected values — taken from TypeScript implementation output
	cases[0].expected.gross = "35.00"
	cases[0].expected.net = "32.71"
	cases[0].expected.tax = "2.29"
	cases[0].expected.subtotal = "35.00"
	cases[0].expected.discountTotal = "0.00"
	cases[0].expected.count = 7
	cases[0].expected.taxBreakdownLength = 1
	cases[0].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"13.00", "7.00"}, {"14.00", "7.00"}, {"8.00", "7.00"},
	}

	cases[1].expected.gross = "47.00"
	cases[1].expected.net = "41.24"
	cases[1].expected.tax = "5.76"
	cases[1].expected.subtotal = "47.00"
	cases[1].expected.discountTotal = "0.00"
	cases[1].expected.count = 5
	cases[1].expected.taxBreakdownLength = 2
	cases[1].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"25.00", "10.00"}, {"18.00", "21.00"}, {"4.00", "10.00"},
	}

	cases[2].expected.gross = "29.70"
	cases[2].expected.net = "27.76"
	cases[2].expected.tax = "1.94"
	cases[2].expected.subtotal = "33.00"
	cases[2].expected.discountTotal = "3.30"
	cases[2].expected.count = 3
	cases[2].expected.taxBreakdownLength = 1
	cases[2].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"12.60", "7.00"}, {"17.10", "7.00"},
	}

	cases[3].expected.gross = "18.50"
	cases[3].expected.net = "16.25"
	cases[3].expected.tax = "2.25"
	cases[3].expected.subtotal = "23.50"
	cases[3].expected.discountTotal = "5.00"
	cases[3].expected.count = 4
	cases[3].expected.taxBreakdownLength = 3
	cases[3].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"2.36", "0.00"}, {"6.69", "10.00"}, {"9.45", "21.00"},
	}

	cases[4].expected.gross = "70.25"
	cases[4].expected.net = "65.65"
	cases[4].expected.tax = "4.60"
	cases[4].expected.subtotal = "73.25"
	cases[4].expected.discountTotal = "3.00"
	cases[4].expected.count = 2
	cases[4].expected.taxBreakdownLength = 1
	cases[4].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"36.68", "7.00"}, {"33.57", "7.00"},
	}

	cases[5].expected.gross = "0.03"
	cases[5].expected.net = "0.02"
	cases[5].expected.tax = "0.01"
	cases[5].expected.subtotal = "0.03"
	cases[5].expected.discountTotal = "0.00"
	cases[5].expected.count = 3
	cases[5].expected.taxBreakdownLength = 1
	cases[5].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"0.03", "21.00"},
	}

	cases[6].expected.gross = "178.10"
	cases[6].expected.net = "166.45"
	cases[6].expected.tax = "11.65"
	cases[6].expected.subtotal = "178.10"
	cases[6].expected.discountTotal = "0.00"
	cases[6].expected.count = 137
	cases[6].expected.taxBreakdownLength = 1
	cases[6].expected.items = []struct{ rowTotalGross, taxRateSnapshot string }{
		{"178.10", "7.00"},
	}

	return cases
}

func TestCrossValidation(t *testing.T) {
	for _, tc := range getCrossValidationCases() {
		t.Run(tc.name, func(t *testing.T) {
			result := CalculateInvoice(tc.items, tc.discount)

			if result.Gross != tc.expected.gross {
				t.Errorf("gross: got %s, want %s", result.Gross, tc.expected.gross)
			}
			if result.Net != tc.expected.net {
				t.Errorf("net: got %s, want %s", result.Net, tc.expected.net)
			}
			if result.Tax != tc.expected.tax {
				t.Errorf("tax: got %s, want %s", result.Tax, tc.expected.tax)
			}
			if result.Subtotal != tc.expected.subtotal {
				t.Errorf("subtotal: got %s, want %s", result.Subtotal, tc.expected.subtotal)
			}
			if result.DiscountTotal != tc.expected.discountTotal {
				t.Errorf("discountTotal: got %s, want %s", result.DiscountTotal, tc.expected.discountTotal)
			}
			if result.Count != tc.expected.count {
				t.Errorf("count: got %d, want %d", result.Count, tc.expected.count)
			}
			if len(result.TaxBreakdown) != tc.expected.taxBreakdownLength {
				t.Errorf("taxBreakdown length: got %d, want %d", len(result.TaxBreakdown), tc.expected.taxBreakdownLength)
			}

			for i, exp := range tc.expected.items {
				if i >= len(result.Items) {
					t.Errorf("item %d: missing", i)
					continue
				}
				if result.Items[i].RowTotalGross != exp.rowTotalGross {
					t.Errorf("item %d rowTotalGross: got %s, want %s", i, result.Items[i].RowTotalGross, exp.rowTotalGross)
				}
				if result.Items[i].TaxRateSnapshot != exp.taxRateSnapshot {
					t.Errorf("item %d taxRateSnapshot: got %s, want %s", i, result.Items[i].TaxRateSnapshot, exp.taxRateSnapshot)
				}
			}

			// Invariant: net + tax == gross
			net := decimal.RequireFromString(result.Net)
			tax := decimal.RequireFromString(result.Tax)
			gross := decimal.RequireFromString(result.Gross)
			if !net.Add(tax).Equal(gross) {
				t.Errorf("invariant violated: %s + %s != %s", result.Net, result.Tax, result.Gross)
			}
		})
	}
}
