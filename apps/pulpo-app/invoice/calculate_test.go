package invoice

import (
	"regexp"
	"testing"

	"github.com/shopspring/decimal"
)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func makeItem(priceGross string, taxRate string, opts ...func(*LineInput)) LineInput {
	item := LineInput{
		ProductID:   "p1",
		ProductName: "Product",
		PriceGross:  decimal.RequireFromString(priceGross),
		TaxRate:     decimal.RequireFromString(taxRate),
		Quantity:    1,
	}
	for _, opt := range opts {
		opt(&item)
	}
	return item
}

func withQuantity(q int) func(*LineInput) {
	return func(item *LineInput) { item.Quantity = q }
}

func withDiscount(typ string, value string) func(*LineInput) {
	return func(item *LineInput) {
		item.Discount = &DiscountInput{
			Type:  typ,
			Value: decimal.RequireFromString(value),
		}
	}
}

func withCostCenter(cc string) func(*LineInput) {
	return func(item *LineInput) { item.CostCenter = cc }
}

func globalDiscount(typ string, value string) *DiscountInput {
	return &DiscountInput{
		Type:  typ,
		Value: decimal.RequireFromString(value),
	}
}

// Assert net + tax === gross
func expectNetTaxGrossInvariant(t *testing.T, r CalculationResult) {
	t.Helper()
	net := decimal.RequireFromString(r.Net)
	tax := decimal.RequireFromString(r.Tax)
	gross := decimal.RequireFromString(r.Gross)
	if !net.Add(tax).Equal(gross) {
		t.Errorf("invariant violated: net(%s) + tax(%s) = %s, want gross(%s)",
			r.Net, r.Tax, net.Add(tax).StringFixed(2), r.Gross)
	}
}

// Assert sum of breakdown equals totals
func expectBreakdownSumsMatch(t *testing.T, r CalculationResult) {
	t.Helper()
	bNet := decimal.Zero
	bTax := decimal.Zero
	for _, e := range r.TaxBreakdown {
		n := decimal.RequireFromString(e.Net)
		tx := decimal.RequireFromString(e.Tax)
		bNet = bNet.Add(n)
		bTax = bTax.Add(tx)
	}
	if bNet.StringFixed(2) != r.Net {
		t.Errorf("breakdown net sum %s != total net %s", bNet.StringFixed(2), r.Net)
	}
	if bTax.StringFixed(2) != r.Tax {
		t.Errorf("breakdown tax sum %s != total tax %s", bTax.StringFixed(2), r.Tax)
	}
}

func expectInvariants(t *testing.T, r CalculationResult) {
	t.Helper()
	expectNetTaxGrossInvariant(t, r)
	expectBreakdownSumsMatch(t, r)
}

func assertEqual(t *testing.T, label string, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("%s: got %q, want %q", label, got, want)
	}
}

// ---------------------------------------------------------------------------
// Tests — Basis
// ---------------------------------------------------------------------------

func TestSingleItem_NoDiscounts(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21", withQuantity(2)),
	}, nil)

	assertEqual(t, "gross", r.Gross, "20.00")
	assertEqual(t, "subtotal", r.Subtotal, "20.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "0.00")
	if r.Count != 2 {
		t.Errorf("count: got %d, want 2", r.Count)
	}
	if len(r.TaxBreakdown) != 1 {
		t.Fatalf("taxBreakdown length: got %d, want 1", len(r.TaxBreakdown))
	}
	assertEqual(t, "taxBreakdown[0].rate", r.TaxBreakdown[0].Rate, "21.00")
	expectInvariants(t, r)
}

func TestMultipleItems_SameTaxRate(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21"),
		makeItem("5.00", "21", withQuantity(3)),
	}, nil)

	assertEqual(t, "gross", r.Gross, "25.00")
	if len(r.TaxBreakdown) != 1 {
		t.Errorf("taxBreakdown length: got %d, want 1", len(r.TaxBreakdown))
	}
	expectInvariants(t, r)
}

func TestMultipleItems_DifferentTaxRates(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "7"),
		makeItem("20.00", "21"),
	}, nil)

	assertEqual(t, "gross", r.Gross, "30.00")
	if len(r.TaxBreakdown) != 2 {
		t.Fatalf("taxBreakdown length: got %d, want 2", len(r.TaxBreakdown))
	}
	assertEqual(t, "taxBreakdown[0].rate", r.TaxBreakdown[0].Rate, "7.00")
	assertEqual(t, "taxBreakdown[1].rate", r.TaxBreakdown[1].Rate, "21.00")
	expectInvariants(t, r)
}

// ---------------------------------------------------------------------------
// Tests — Item Discounts
// ---------------------------------------------------------------------------

func TestPercentageItemDiscount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "21", withDiscount("percent", "10")),
	}, nil)

	assertEqual(t, "gross", r.Gross, "90.00")
	assertEqual(t, "subtotal", r.Subtotal, "90.00")
	expectInvariants(t, r)
}

func TestFixedItemDiscount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("50.00", "21", withQuantity(2), withDiscount("fixed", "20")),
	}, nil)

	assertEqual(t, "gross", r.Gross, "80.00")
	expectInvariants(t, r)
}

func TestItemDiscountClampedToZero(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("5.00", "21", withDiscount("fixed", "10")),
	}, nil)

	assertEqual(t, "gross", r.Gross, "0.00")
	assertEqual(t, "net", r.Net, "0.00")
	assertEqual(t, "tax", r.Tax, "0.00")
	expectInvariants(t, r)
}

func TestItemDiscountGreaterThanRowTotal(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21", withDiscount("fixed", "999")),
	}, nil)

	assertEqual(t, "gross", r.Gross, "0.00")
	expectInvariants(t, r)
}

// ---------------------------------------------------------------------------
// Tests — Global Discount
// ---------------------------------------------------------------------------

func TestPercentageGlobalDiscount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "21"),
	}, globalDiscount("percent", "25"))

	assertEqual(t, "subtotal", r.Subtotal, "100.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "25.00")
	assertEqual(t, "gross", r.Gross, "75.00")
	expectInvariants(t, r)
}

func TestFixedGlobalDiscount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "21"),
	}, globalDiscount("fixed", "30"))

	assertEqual(t, "subtotal", r.Subtotal, "100.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "30.00")
	assertEqual(t, "gross", r.Gross, "70.00")
	expectInvariants(t, r)
}

func TestGlobalAndItemDiscountCombined(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "21", withDiscount("percent", "10")),
	}, globalDiscount("percent", "20"))

	assertEqual(t, "subtotal", r.Subtotal, "90.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "18.00")
	assertEqual(t, "gross", r.Gross, "72.00")
	expectInvariants(t, r)
}

func TestFullGlobalDiscount_100Percent(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("50.00", "21", withQuantity(2)),
		makeItem("30.00", "7"),
	}, globalDiscount("percent", "100"))

	assertEqual(t, "gross", r.Gross, "0.00")
	assertEqual(t, "net", r.Net, "0.00")
	assertEqual(t, "tax", r.Tax, "0.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "130.00")
	expectInvariants(t, r)
}

// ---------------------------------------------------------------------------
// Tests — Cent Correction
// ---------------------------------------------------------------------------

func TestCentCorrection_ThreeGroups(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("33.33", "7"),
		makeItem("33.33", "19"),
		makeItem("33.34", "21"),
	}, nil)

	// Sum of breakdown net + tax must equal gross
	bGrossSum := decimal.Zero
	for _, e := range r.TaxBreakdown {
		n := decimal.RequireFromString(e.Net)
		tx := decimal.RequireFromString(e.Tax)
		bGrossSum = bGrossSum.Add(n).Add(tx)
	}
	assertEqual(t, "breakdown gross sum", bGrossSum.StringFixed(2), r.Gross)
	expectInvariants(t, r)
}

func TestCentCorrection_WithGlobalDiscount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "7"),
		makeItem("10.00", "19"),
		makeItem("10.00", "21"),
	}, globalDiscount("fixed", "1"))

	bGrossSum := decimal.Zero
	for _, e := range r.TaxBreakdown {
		n := decimal.RequireFromString(e.Net)
		tx := decimal.RequireFromString(e.Tax)
		bGrossSum = bGrossSum.Add(n).Add(tx)
	}
	assertEqual(t, "breakdown gross sum", bGrossSum.StringFixed(2), r.Gross)
	expectInvariants(t, r)
}

// ---------------------------------------------------------------------------
// Tests — Edge Cases
// ---------------------------------------------------------------------------

func TestEmptyItems(t *testing.T) {
	r := CalculateInvoice([]LineInput{}, nil)

	assertEqual(t, "gross", r.Gross, "0.00")
	assertEqual(t, "net", r.Net, "0.00")
	assertEqual(t, "tax", r.Tax, "0.00")
	assertEqual(t, "subtotal", r.Subtotal, "0.00")
	assertEqual(t, "discountTotal", r.DiscountTotal, "0.00")
	if r.Count != 0 {
		t.Errorf("count: got %d, want 0", r.Count)
	}
	if len(r.TaxBreakdown) != 0 {
		t.Errorf("taxBreakdown length: got %d, want 0", len(r.TaxBreakdown))
	}
	if len(r.Items) != 0 {
		t.Errorf("items length: got %d, want 0", len(r.Items))
	}
}

func TestQuantityZero(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21", withQuantity(0)),
	}, nil)

	assertEqual(t, "gross", r.Gross, "0.00")
	if r.Count != 0 {
		t.Errorf("count: got %d, want 0", r.Count)
	}
	expectInvariants(t, r)
}

func TestVerySmallAmount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("0.01", "21"),
	}, nil)

	assertEqual(t, "gross", r.Gross, "0.01")
	expectInvariants(t, r)
}

func TestVeryLargeAmount(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("99999.99", "21"),
	}, nil)

	assertEqual(t, "gross", r.Gross, "99999.99")
	expectInvariants(t, r)
}

func TestBulkOrder(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("1.50", "21", withQuantity(1000)),
	}, nil)

	assertEqual(t, "gross", r.Gross, "1500.00")
	if r.Count != 1000 {
		t.Errorf("count: got %d, want 1000", r.Count)
	}
	expectInvariants(t, r)
}

func TestTaxRateZero(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "0"),
	}, nil)

	assertEqual(t, "gross", r.Gross, "100.00")
	assertEqual(t, "net", r.Net, "100.00")
	assertEqual(t, "tax", r.Tax, "0.00")
	assertEqual(t, "taxBreakdown[0].rate", r.TaxBreakdown[0].Rate, "0.00")
	expectInvariants(t, r)
}

func TestDivisionByZeroGuard(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21", withDiscount("fixed", "10")),
	}, globalDiscount("percent", "50"))

	assertEqual(t, "subtotal", r.Subtotal, "0.00")
	assertEqual(t, "gross", r.Gross, "0.00")
	expectInvariants(t, r)
}

// ---------------------------------------------------------------------------
// Tests — Output Format
// ---------------------------------------------------------------------------

func TestOutputTypesAreStrings(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21"),
	}, nil)

	// These are all strings by type definition, but verify they parse as decimals
	for _, s := range []string{r.Gross, r.Net, r.Tax, r.Subtotal, r.DiscountTotal} {
		if _, err := decimal.NewFromString(s); err != nil {
			t.Errorf("not a valid decimal string: %q", s)
		}
	}
	for _, e := range r.TaxBreakdown {
		for _, s := range []string{e.Rate, e.Net, e.Tax} {
			if _, err := decimal.NewFromString(s); err != nil {
				t.Errorf("not a valid decimal string: %q", s)
			}
		}
	}
}

func TestPriceGrossUnit_4DecimalPlaces(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21"),
	}, nil)

	re := regexp.MustCompile(`^\d+\.\d{4}$`)
	if !re.MatchString(r.Items[0].PriceGrossUnit) {
		t.Errorf("priceGrossUnit %q does not match 4dp format", r.Items[0].PriceGrossUnit)
	}
	assertEqual(t, "priceGrossUnit", r.Items[0].PriceGrossUnit, "10.0000")
}

func TestRowTotalGross_2DecimalPlaces(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21", withQuantity(3)),
	}, nil)

	re := regexp.MustCompile(`^\d+\.\d{2}$`)
	if !re.MatchString(r.Items[0].RowTotalGross) {
		t.Errorf("rowTotalGross %q does not match 2dp format", r.Items[0].RowTotalGross)
	}
	assertEqual(t, "rowTotalGross", r.Items[0].RowTotalGross, "30.00")
}

func TestTaxRateSnapshot_2DecimalPlaces(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "7"),
	}, nil)

	assertEqual(t, "taxRateSnapshot", r.Items[0].TaxRateSnapshot, "7.00")
}

func TestNoNetPreciseFields(t *testing.T) {
	// In Go, the struct simply doesn't have these fields.
	// This test exists for parity with the TS test suite.
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21"),
	}, nil)

	if len(r.Items) != 1 {
		t.Fatal("expected 1 item")
	}
	// LineResult has no PriceNetUnitPrecise or RowTotalNetPrecise — enforced by struct definition.
	_ = r.Items[0]
}

func TestDiscountValue_4DecimalPlaces(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("100.00", "21", withDiscount("percent", "10")),
	}, globalDiscount("fixed", "5"))

	assertEqual(t, "item discountValue", *r.Items[0].DiscountValue, "10.0000")
	assertEqual(t, "global discountValue", *r.DiscountValue, "5.0000")
}

func TestNoDiscount_NilValues(t *testing.T) {
	r := CalculateInvoice([]LineInput{
		makeItem("10.00", "21"),
	}, nil)

	if r.Items[0].DiscountType != nil {
		t.Errorf("item discountType should be nil, got %v", r.Items[0].DiscountType)
	}
	if r.Items[0].DiscountValue != nil {
		t.Errorf("item discountValue should be nil, got %v", r.Items[0].DiscountValue)
	}
	if r.DiscountType != nil {
		t.Errorf("global discountType should be nil, got %v", r.DiscountType)
	}
	if r.DiscountValue != nil {
		t.Errorf("global discountValue should be nil, got %v", r.DiscountValue)
	}
}
