package invoice

import (
	"sort"

	"github.com/shopspring/decimal"
)

var (
	zero    = decimal.Zero
	hundred = decimal.NewFromInt(100)
)

// CalculateInvoice computes totals, tax breakdown and per-item results.
// This is a 1:1 port of packages/invoice/src/calculate.ts.
func CalculateInvoice(items []LineInput, globalDiscount *DiscountInput) CalculationResult {
	subtotalGross := zero
	lineGrossValues := make([]decimal.Decimal, len(items))

	// 1. Per-item gross (after item discounts)
	for i, item := range items {
		lineGross := item.PriceGross.Mul(decimal.NewFromInt(int64(item.Quantity)))

		if item.Discount != nil {
			if item.Discount.Type == "fixed" {
				lineGross = lineGross.Sub(item.Discount.Value)
			} else {
				lineGross = lineGross.Sub(lineGross.Mul(item.Discount.Value).Div(hundred))
			}
		}

		if lineGross.LessThan(zero) {
			lineGross = zero
		}

		lineGrossValues[i] = lineGross
		subtotalGross = subtotalGross.Add(lineGross)
	}

	// 2. Global discount
	finalTotalGross := subtotalGross
	discountAmount := zero

	if globalDiscount != nil {
		if globalDiscount.Type == "fixed" {
			discountAmount = globalDiscount.Value
			finalTotalGross = finalTotalGross.Sub(discountAmount)
		} else {
			discountAmount = finalTotalGross.Mul(globalDiscount.Value).Div(hundred)
			finalTotalGross = finalTotalGross.Sub(discountAmount)
		}
	}

	if finalTotalGross.LessThan(zero) {
		finalTotalGross = zero
	}
	if discountAmount.GreaterThan(subtotalGross) {
		discountAmount = subtotalGross
	}

	// 3. Tax back-calculation grouped by rate
	discountRatio := decimal.NewFromInt(1)
	if subtotalGross.GreaterThan(zero) {
		discountRatio = finalTotalGross.Div(subtotalGross)
	}

	type taxGroup struct {
		gross decimal.Decimal
	}
	taxByRate := make(map[string]*taxGroup)
	computedItems := make([]LineResult, len(items))

	for i, item := range items {
		lineGross := lineGrossValues[i]
		lineGrossAfterGlobal := lineGross.Mul(discountRatio)
		ratePct := item.TaxRate.StringFixed(2)

		if _, ok := taxByRate[ratePct]; !ok {
			taxByRate[ratePct] = &taxGroup{gross: zero}
		}
		taxByRate[ratePct].gross = taxByRate[ratePct].gross.Add(lineGrossAfterGlobal)

		lr := LineResult{
			ProductID:       item.ProductID,
			ProductName:     item.ProductName,
			Quantity:        item.Quantity,
			PriceGrossUnit:  item.PriceGross.StringFixed(4),
			TaxRateSnapshot: ratePct,
			RowTotalGross:   lineGrossAfterGlobal.StringFixed(2),
		}

		if item.Discount != nil {
			dt := item.Discount.Type
			dv := item.Discount.Value.StringFixed(4)
			lr.DiscountType = &dt
			lr.DiscountValue = &dv
		}

		if item.CostCenter != "" {
			cc := item.CostCenter
			lr.CostCenter = &cc
		}

		computedItems[i] = lr
	}

	// 4. Round group gross + cent correction
	grossRounded := finalTotalGross.Round(2)

	// Sort rates ascending
	rates := make([]string, 0, len(taxByRate))
	for rate := range taxByRate {
		rates = append(rates, rate)
	}
	sort.Slice(rates, func(i, j int) bool {
		ri, _ := decimal.NewFromString(rates[i])
		rj, _ := decimal.NewFromString(rates[j])
		return ri.LessThan(rj)
	})

	groupGrossRounded := make([]decimal.Decimal, len(rates))
	groupGrossSum := zero
	for i, rate := range rates {
		groupGrossRounded[i] = taxByRate[rate].gross.Round(2)
		groupGrossSum = groupGrossSum.Add(groupGrossRounded[i])
	}

	centDiff := grossRounded.Sub(groupGrossSum)
	if !centDiff.IsZero() {
		largestIdx := 0
		for j := 1; j < len(groupGrossRounded); j++ {
			if groupGrossRounded[j].GreaterThan(groupGrossRounded[largestIdx]) {
				largestIdx = j
			}
		}
		groupGrossRounded[largestIdx] = groupGrossRounded[largestIdx].Add(centDiff)
	}

	// 5. Tax per group: net + tax = groupGross
	taxBreakdown := make([]TaxBreakdownEntry, len(rates))
	for i, rate := range rates {
		gGross := groupGrossRounded[i]
		rateDecimal, _ := decimal.NewFromString(rate)
		rateDiv := rateDecimal.Div(hundred)
		net := gGross.Div(decimal.NewFromInt(1).Add(rateDiv)).Round(2)
		tax := gGross.Sub(net)

		taxBreakdown[i] = TaxBreakdownEntry{
			Rate: rate,
			Net:  net.StringFixed(2),
			Tax:  tax.StringFixed(2),
		}
	}

	// 6. Totals from breakdown
	totalNet := zero
	totalTax := zero
	for _, entry := range taxBreakdown {
		n, _ := decimal.NewFromString(entry.Net)
		t, _ := decimal.NewFromString(entry.Tax)
		totalNet = totalNet.Add(n)
		totalTax = totalTax.Add(t)
	}

	// Count
	count := 0
	for _, item := range items {
		count += item.Quantity
	}

	result := CalculationResult{
		Subtotal:      subtotalGross.StringFixed(2),
		DiscountTotal: discountAmount.StringFixed(2),
		Gross:         grossRounded.StringFixed(2),
		Net:           totalNet.StringFixed(2),
		Tax:           totalTax.StringFixed(2),
		TaxBreakdown:  taxBreakdown,
		Items:         computedItems,
		Count:         count,
	}

	if globalDiscount != nil {
		dt := globalDiscount.Type
		dv := globalDiscount.Value.StringFixed(4)
		result.DiscountType = &dt
		result.DiscountValue = &dv
	}

	return result
}
