package routes

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/shopspring/decimal"
)

type productAcc struct {
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

// RegisterReportRoutes registers report endpoints.
func RegisterReportRoutes(app core.App, se *core.ServeEvent) {
	g := se.Router.Group("/api/custom")
	g.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("Authentication required", nil)
		}
		return e.Next()
	})

	g.GET("/reports/{period}", func(e *core.RequestEvent) error {
		return handleReport(e)
	})
}

func handleReport(e *core.RequestEvent) error {
	period := e.Request.PathValue("period")

	validPeriods := map[string]bool{
		"daily": true, "weekly": true, "monthly": true,
		"quarterly": true, "yearly": true,
	}
	if !validPeriods[period] {
		return e.BadRequestError("Invalid period. Use: daily, weekly, monthly, quarterly, yearly", nil)
	}

	// Load company timezone
	company, err := e.App.FindFirstRecordByFilter("company", "id != ''")
	if err != nil {
		return e.InternalServerError("Company settings not found", err)
	}
	timezone := company.GetString("timezone")
	if timezone == "" {
		timezone = "Europe/Madrid"
	}

	loc, err := time.LoadLocation(timezone)
	if err != nil {
		loc, _ = time.LoadLocation("Europe/Madrid")
	}

	// Parse query params
	query := e.Request.URL.Query()
	from, to, label, err := getDateRange(period, query, loc)
	if err != nil {
		return e.BadRequestError(err.Error(), nil)
	}

	// Find closures in date range
	closures, err := e.App.FindRecordsByFilter(
		"closures",
		"status = 'closed' && period_start >= {:from} && period_start <= {:to}",
		"-period_start", 0, 0,
		map[string]any{"from": from, "to": to},
	)
	if err != nil {
		return e.InternalServerError("Failed to load closures", err)
	}

	// Aggregate
	includeShifts := period == "daily"
	report, err := aggregateClosures(e.App, closures, period, label, from, to, includeShifts)
	if err != nil {
		return e.InternalServerError("Failed to aggregate report", err)
	}

	return e.JSON(http.StatusOK, report)
}

func aggregateClosures(
	app core.App,
	closures []*core.Record,
	periodType, label, from, to string,
	includeShifts bool,
) (*AggregatedReport, error) {
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

	var shifts []ShiftData

	for _, closure := range closures {
		summary, err := ComputeClosureSummary(app, closure.Id)
		if err != nil {
			continue
		}

		totalGross = totalGross.Add(safeDec(summary.TotalGross))
		totalNet = totalNet.Add(safeDec(summary.TotalNet))
		totalTax = totalTax.Add(safeDec(summary.TotalTax))
		totalCash = totalCash.Add(safeDec(summary.TotalCash))
		totalCard = totalCard.Add(safeDec(summary.TotalCard))
		transactionCount += summary.TransactionCount

		counts.Tickets += summary.InvoiceCounts.Tickets
		counts.Facturas += summary.InvoiceCounts.Facturas
		counts.Rectificativas += summary.InvoiceCounts.Rectificativas

		// Merge tax breakdown
		for _, tb := range summary.TaxBreakdown {
			existing, ok := taxMap[tb.Rate]
			if !ok {
				existing = struct{ net, tax decimal.Decimal }{zero, zero}
			}
			taxMap[tb.Rate] = struct{ net, tax decimal.Decimal }{
				existing.net.Add(safeDec(tb.Net)),
				existing.tax.Add(safeDec(tb.Tax)),
			}
		}

		// Merge product breakdown
		for _, pb := range summary.ProductBreakdown {
			existing, ok := productMap[pb.ProductName]
			if !ok {
				existing = &productAcc{
					productID:  pb.ProductID,
					costCenter: pb.CostCenter,
					unit:       pb.Unit,
					totalGross: zero,
					cashGross:  zero,
					cardGross:  zero,
				}
				productMap[pb.ProductName] = existing
			}
			existing.quantity += pb.Quantity
			existing.cashQuantity += pb.CashQuantity
			existing.cardQuantity += pb.CardQuantity
			existing.totalGross = existing.totalGross.Add(safeDec(pb.TotalGross))
			existing.cashGross = existing.cashGross.Add(safeDec(pb.CashGross))
			existing.cardGross = existing.cardGross.Add(safeDec(pb.CardGross))
		}

		if includeShifts {
			startingCash := safeDec(closure.GetString("starting_cash"))
			expectedCash := startingCash.Add(safeDec(summary.TotalCash))
			countedCash := closure.GetString("counted_cash")

			shift := ShiftData{
				ID:               closure.Id,
				PeriodStart:      closure.GetString("period_start"),
				PeriodEnd:        closure.GetString("period_end"),
				StartingCash:     closure.GetString("starting_cash"),
				ExpectedCash:     expectedCash.StringFixed(2),
				TotalGross:       summary.TotalGross,
				TotalCash:        summary.TotalCash,
				TotalCard:        summary.TotalCard,
				TransactionCount: summary.TransactionCount,
				InvoiceCounts:    summary.InvoiceCounts,
				ProductBreakdown: summary.ProductBreakdown,
			}

			if countedCash != "" {
				shift.CountedCash = countedCash
				difference := safeDec(countedCash).Sub(expectedCash)
				shift.Difference = difference.StringFixed(2)
			}

			shifts = append(shifts, shift)
		}
	}

	// Build sorted tax breakdown
	taxBreakdown := sortedTaxBreakdown(taxMap)

	// Build sorted product breakdown
	productBreakdown := buildProductBreakdown(productMap)

	if shifts == nil {
		shifts = []ShiftData{}
	}

	return &AggregatedReport{
		Period: map[string]string{
			"type":  periodType,
			"label": label,
			"from":  from,
			"to":    to,
		},
		Summary: map[string]any{
			"total_gross":       totalGross.StringFixed(2),
			"total_net":         totalNet.StringFixed(2),
			"total_tax":         totalTax.StringFixed(2),
			"total_cash":        totalCash.StringFixed(2),
			"total_card":        totalCard.StringFixed(2),
			"transaction_count": transactionCount,
		},
		InvoiceCounts:    counts,
		TaxBreakdown:     taxBreakdown,
		ProductBreakdown: productBreakdown,
		Shifts:           shifts,
	}, nil
}

func sortedTaxBreakdown(taxMap map[string]struct{ net, tax decimal.Decimal }) []TaxBreakdown {
	rates := make([]string, 0, len(taxMap))
	for r := range taxMap {
		rates = append(rates, r)
	}
	sortDecimalStrings(rates)

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

func buildProductBreakdown(productMap map[string]*productAcc) []ProductBreakdown {
	names := make([]string, 0, len(productMap))
	for name := range productMap {
		names = append(names, name)
	}
	// Sort by absolute quantity descending
	for i := 0; i < len(names); i++ {
		for j := i + 1; j < len(names); j++ {
			if absInt(productMap[names[i]].quantity) < absInt(productMap[names[j]].quantity) {
				names[i], names[j] = names[j], names[i]
			}
		}
	}

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

// --- Date range calculation ---

func getDateRange(period string, query map[string][]string, loc *time.Location) (from, to, label string, err error) {
	getParam := func(key string) string {
		vals := query[key]
		if len(vals) > 0 {
			return vals[0]
		}
		return ""
	}

	switch period {
	case "daily":
		dateStr := getParam("date")
		if dateStr == "" {
			return "", "", "", fmt.Errorf("missing 'date' parameter (YYYY-MM-DD)")
		}
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			return "", "", "", fmt.Errorf("invalid date format: %s", dateStr)
		}
		y, m, d := t.Date()
		start := time.Date(y, m, d, 0, 0, 0, 0, loc)
		end := time.Date(y, m, d, 23, 59, 59, 0, loc)
		label = fmt.Sprintf("%02d/%02d/%d", d, m, y)
		return start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339), label, nil

	case "weekly":
		dateStr := getParam("date")
		if dateStr == "" {
			return "", "", "", fmt.Errorf("missing 'date' parameter (YYYY-MM-DD)")
		}
		t, err := time.Parse("2006-01-02", dateStr)
		if err != nil {
			return "", "", "", fmt.Errorf("invalid date format: %s", dateStr)
		}
		// Find Monday of the week
		weekday := t.Weekday()
		if weekday == 0 {
			weekday = 7
		}
		monday := t.AddDate(0, 0, -int(weekday-1))
		sunday := monday.AddDate(0, 0, 6)

		my, mm, md := monday.Date()
		sy, sm, sd := sunday.Date()
		start := time.Date(my, mm, md, 0, 0, 0, 0, loc)
		end := time.Date(sy, sm, sd, 23, 59, 59, 0, loc)

		_, week := monday.ISOWeek()
		label = fmt.Sprintf("Semana %d, %d", week, my)
		return start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339), label, nil

	case "monthly":
		yearStr := getParam("year")
		monthStr := getParam("month")
		if yearStr == "" || monthStr == "" {
			return "", "", "", fmt.Errorf("missing 'year' and 'month' parameters")
		}
		year, _ := strconv.Atoi(yearStr)
		month, _ := strconv.Atoi(monthStr)
		if year == 0 || month == 0 {
			return "", "", "", fmt.Errorf("invalid year or month")
		}

		start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, loc)
		lastDay := start.AddDate(0, 1, -1)
		end := time.Date(year, time.Month(month), lastDay.Day(), 23, 59, 59, 0, loc)

		monthName := spanishMonth(time.Month(month))
		label = fmt.Sprintf("%s %d", monthName, year)
		return start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339), label, nil

	case "quarterly":
		yearStr := getParam("year")
		quarterStr := getParam("quarter")
		if yearStr == "" || quarterStr == "" {
			return "", "", "", fmt.Errorf("missing 'year' and 'quarter' parameters")
		}
		year, _ := strconv.Atoi(yearStr)
		quarter, _ := strconv.Atoi(quarterStr)
		if year == 0 || quarter < 1 || quarter > 4 {
			return "", "", "", fmt.Errorf("invalid year or quarter")
		}

		startMonth := time.Month((quarter-1)*3 + 1)
		endMonth := startMonth + 2
		start := time.Date(year, startMonth, 1, 0, 0, 0, 0, loc)
		lastDay := time.Date(year, endMonth+1, 0, 0, 0, 0, 0, loc)
		end := time.Date(year, endMonth, lastDay.Day(), 23, 59, 59, 0, loc)

		label = fmt.Sprintf("Q%d %d", quarter, year)
		return start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339), label, nil

	case "yearly":
		yearStr := getParam("year")
		if yearStr == "" {
			return "", "", "", fmt.Errorf("missing 'year' parameter")
		}
		year, _ := strconv.Atoi(yearStr)
		if year == 0 {
			return "", "", "", fmt.Errorf("invalid year")
		}

		start := time.Date(year, 1, 1, 0, 0, 0, 0, loc)
		end := time.Date(year, 12, 31, 23, 59, 59, 0, loc)
		label = fmt.Sprintf("%d", year)
		return start.UTC().Format(time.RFC3339), end.UTC().Format(time.RFC3339), label, nil
	}

	return "", "", "", fmt.Errorf("unknown period: %s", period)
}

func spanishMonth(m time.Month) string {
	months := []string{
		"", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
		"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
	}
	if int(m) >= 1 && int(m) <= 12 {
		return months[m]
	}
	return ""
}

func sortDecimalStrings(s []string) {
	for i := 0; i < len(s); i++ {
		for j := i + 1; j < len(s); j++ {
			ri, _ := decimal.NewFromString(s[i])
			rj, _ := decimal.NewFromString(s[j])
			if ri.GreaterThan(rj) {
				s[i], s[j] = s[j], s[i]
			}
		}
	}
}
