package routes

import (
	"net/url"
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

func TestGetDateRange_Daily(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	from, to, label, err := getDateRange("daily", url.Values{"date": {"2026-03-15"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	if label != "15/03/2026" {
		t.Errorf("label = %q, want %q", label, "15/03/2026")
	}

	// Parse and verify the date range
	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)

	// From should be start of day in Madrid timezone
	fromLocal := fromTime.In(loc)
	if fromLocal.Hour() != 0 || fromLocal.Minute() != 0 {
		t.Errorf("from should be start of day, got %s", fromLocal)
	}

	// To should be end of day in Madrid timezone
	toLocal := toTime.In(loc)
	if toLocal.Hour() != 23 || toLocal.Minute() != 59 {
		t.Errorf("to should be end of day, got %s", toLocal)
	}

	// Both should be same day
	if fromLocal.Day() != 15 || toLocal.Day() != 15 {
		t.Errorf("both should be day 15, got from=%d, to=%d", fromLocal.Day(), toLocal.Day())
	}
}

func TestGetDateRange_Weekly(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	// 2026-03-18 is a Wednesday
	from, to, label, err := getDateRange("weekly", url.Values{"date": {"2026-03-18"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	if label == "" {
		t.Error("label should not be empty")
	}

	// Parse dates
	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
	fromLocal := fromTime.In(loc)
	toLocal := toTime.In(loc)

	// From should be Monday
	if fromLocal.Weekday() != time.Monday {
		t.Errorf("from should be Monday, got %s", fromLocal.Weekday())
	}

	// To should be Sunday
	if toLocal.Weekday() != time.Sunday {
		t.Errorf("to should be Sunday, got %s", toLocal.Weekday())
	}

	// Difference should be 6 days
	diff := toLocal.Sub(fromLocal)
	if diff.Hours() < 6*24 || diff.Hours() > 7*24 {
		t.Errorf("week should span ~7 days, got %.0f hours", diff.Hours())
	}
}

func TestGetDateRange_Weekly_Sunday(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	// 2026-03-22 is a Sunday — should still return Mon-Sun of same week
	from, to, _, err := getDateRange("weekly", url.Values{"date": {"2026-03-22"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
	fromLocal := fromTime.In(loc)
	toLocal := toTime.In(loc)

	if fromLocal.Weekday() != time.Monday {
		t.Errorf("from should be Monday, got %s (%s)", fromLocal.Weekday(), fromLocal)
	}
	if toLocal.Weekday() != time.Sunday {
		t.Errorf("to should be Sunday, got %s (%s)", toLocal.Weekday(), toLocal)
	}
}

func TestGetDateRange_Monthly(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	from, to, label, err := getDateRange("monthly", url.Values{"year": {"2026"}, "month": {"2"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	if label != "Febrero 2026" {
		t.Errorf("label = %q, want %q", label, "Febrero 2026")
	}

	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
	fromLocal := fromTime.In(loc)
	toLocal := toTime.In(loc)

	if fromLocal.Day() != 1 {
		t.Errorf("from should be 1st, got %d", fromLocal.Day())
	}
	if toLocal.Day() != 28 { // 2026 is not a leap year
		t.Errorf("to should be 28th (Feb 2026), got %d", toLocal.Day())
	}
}

func TestGetDateRange_Monthly_LeapYear(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	_, to, _, err := getDateRange("monthly", url.Values{"year": {"2028"}, "month": {"2"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
	toLocal := toTime.In(loc)

	if toLocal.Day() != 29 { // 2028 is a leap year
		t.Errorf("to should be 29th (Feb 2028 leap year), got %d", toLocal.Day())
	}
}

func TestGetDateRange_Quarterly(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	tests := []struct {
		quarter    string
		wantLabel  string
		wantFromM  time.Month
		wantToM    time.Month
	}{
		{"1", "Q1 2026", time.January, time.March},
		{"2", "Q2 2026", time.April, time.June},
		{"3", "Q3 2026", time.July, time.September},
		{"4", "Q4 2026", time.October, time.December},
	}

	for _, tt := range tests {
		t.Run("Q"+tt.quarter, func(t *testing.T) {
			from, to, label, err := getDateRange("quarterly", url.Values{
				"year": {"2026"}, "quarter": {tt.quarter},
			}, loc)
			if err != nil {
				t.Fatal(err)
			}

			if label != tt.wantLabel {
				t.Errorf("label = %q, want %q", label, tt.wantLabel)
			}

			fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
			toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
			fromLocal := fromTime.In(loc)
			toLocal := toTime.In(loc)

			if fromLocal.Month() != tt.wantFromM || fromLocal.Day() != 1 {
				t.Errorf("from = %s, want %s 1st", fromLocal, tt.wantFromM)
			}
			if toLocal.Month() != tt.wantToM {
				t.Errorf("to month = %s, want %s", toLocal.Month(), tt.wantToM)
			}
		})
	}
}

func TestGetDateRange_Yearly(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	from, to, label, err := getDateRange("yearly", url.Values{"year": {"2026"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	if label != "2026" {
		t.Errorf("label = %q, want %q", label, "2026")
	}

	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	toTime, _ := time.Parse("2006-01-02 15:04:05.000Z", to)
	fromLocal := fromTime.In(loc)
	toLocal := toTime.In(loc)

	if fromLocal.Month() != time.January || fromLocal.Day() != 1 {
		t.Errorf("from should be Jan 1, got %s", fromLocal)
	}
	if toLocal.Month() != time.December || toLocal.Day() != 31 {
		t.Errorf("to should be Dec 31, got %s", toLocal)
	}
}

func TestGetDateRange_Errors(t *testing.T) {
	loc, _ := time.LoadLocation("Europe/Madrid")

	tests := []struct {
		name   string
		period string
		params url.Values
	}{
		{"daily missing date", "daily", url.Values{}},
		{"daily invalid date", "daily", url.Values{"date": {"not-a-date"}}},
		{"weekly missing date", "weekly", url.Values{}},
		{"monthly missing year", "monthly", url.Values{"month": {"1"}}},
		{"monthly missing month", "monthly", url.Values{"year": {"2026"}}},
		{"quarterly missing", "quarterly", url.Values{}},
		{"quarterly invalid quarter", "quarterly", url.Values{"year": {"2026"}, "quarter": {"5"}}},
		{"yearly missing", "yearly", url.Values{}},
		{"unknown period", "biweekly", url.Values{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, _, err := getDateRange(tt.period, tt.params, loc)
			if err == nil {
				t.Error("expected error, got nil")
			}
		})
	}
}

func TestGetDateRange_CanaryTimezone(t *testing.T) {
	// Canary Islands are UTC+0/+1, one hour behind mainland
	loc, _ := time.LoadLocation("Atlantic/Canary")

	from, _, _, err := getDateRange("daily", url.Values{"date": {"2026-06-15"}}, loc)
	if err != nil {
		t.Fatal(err)
	}

	fromTime, _ := time.Parse("2006-01-02 15:04:05.000Z", from)
	fromLocal := fromTime.In(loc)

	if fromLocal.Hour() != 0 {
		t.Errorf("from hour in Canary should be 0, got %d", fromLocal.Hour())
	}
	if fromLocal.Day() != 15 {
		t.Errorf("from day should be 15, got %d", fromLocal.Day())
	}
}

func TestSpanishMonth(t *testing.T) {
	tests := []struct {
		month time.Month
		want  string
	}{
		{time.January, "Enero"},
		{time.February, "Febrero"},
		{time.March, "Marzo"},
		{time.April, "Abril"},
		{time.May, "Mayo"},
		{time.June, "Junio"},
		{time.July, "Julio"},
		{time.August, "Agosto"},
		{time.September, "Septiembre"},
		{time.October, "Octubre"},
		{time.November, "Noviembre"},
		{time.December, "Diciembre"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			got := spanishMonth(tt.month)
			if got != tt.want {
				t.Errorf("spanishMonth(%d) = %q, want %q", tt.month, got, tt.want)
			}
		})
	}
}

func TestSortDecimalStrings(t *testing.T) {
	input := []string{"21.00", "7.00", "0.00", "10.00", "3.00"}
	sortDecimalStrings(input)

	want := []string{"0.00", "3.00", "7.00", "10.00", "21.00"}
	for i, v := range input {
		if v != want[i] {
			t.Errorf("index %d: got %q, want %q", i, v, want[i])
		}
	}
}

func TestBuildProductBreakdown(t *testing.T) {
	zero := decimal.Zero

	productMap := map[string]*productAcc{
		"Cerveza": {
			productID:    "p1",
			costCenter:   "Bar",
			unit:         "unit",
			quantity:     10,
			cashQuantity: 6,
			cardQuantity: 4,
			totalGross:   decimal.RequireFromString("35.00"),
			cashGross:    decimal.RequireFromString("21.00"),
			cardGross:    decimal.RequireFromString("14.00"),
		},
		"Patatas Bravas": {
			productID:    "p2",
			costCenter:   "Cocina",
			unit:         "unit",
			quantity:     3,
			cashQuantity: 1,
			cardQuantity: 2,
			totalGross:   decimal.RequireFromString("18.00"),
			cashGross:    decimal.RequireFromString("6.00"),
			cardGross:    decimal.RequireFromString("12.00"),
		},
		"Agua": {
			productID:  "p3",
			unit:       "unit",
			quantity:   0,
			totalGross: zero,
			cashGross:  zero,
			cardGross:  zero,
		},
	}

	result := buildProductBreakdown(productMap)

	if len(result) != 3 {
		t.Fatalf("expected 3 products, got %d", len(result))
	}

	// Should be sorted by absolute quantity descending
	if result[0].ProductName != "Cerveza" {
		t.Errorf("first should be Cerveza (qty 10), got %s", result[0].ProductName)
	}
	if result[1].ProductName != "Patatas Bravas" {
		t.Errorf("second should be Patatas Bravas (qty 3), got %s", result[1].ProductName)
	}

	// Check values
	beer := result[0]
	if beer.TotalGross != "35.00" {
		t.Errorf("Cerveza total_gross = %s, want 35.00", beer.TotalGross)
	}
	if beer.CashGross != "21.00" {
		t.Errorf("Cerveza cash_gross = %s, want 21.00", beer.CashGross)
	}
	if beer.CardGross != "14.00" {
		t.Errorf("Cerveza card_gross = %s, want 14.00", beer.CardGross)
	}
	if beer.CashQuantity != 6 {
		t.Errorf("Cerveza cash_quantity = %d, want 6", beer.CashQuantity)
	}
	if beer.CardQuantity != 4 {
		t.Errorf("Cerveza card_quantity = %d, want 4", beer.CardQuantity)
	}
	if beer.CostCenter != "Bar" {
		t.Errorf("Cerveza cost_center = %s, want Bar", beer.CostCenter)
	}
}

func TestBuildProductBreakdown_NegativeQuantities(t *testing.T) {
	// Rectificativas create negative quantities
	productMap := map[string]*productAcc{
		"Cerveza": {
			productID:  "p1",
			unit:       "unit",
			quantity:   -2,
			totalGross: decimal.RequireFromString("-7.00"),
			cashGross:  decimal.RequireFromString("-7.00"),
			cardGross:  decimal.Zero,
		},
		"Vino": {
			productID:    "p2",
			unit:         "unit",
			quantity:     5,
			totalGross:   decimal.RequireFromString("25.00"),
			cashGross:    decimal.Zero,
			cardGross:    decimal.RequireFromString("25.00"),
		},
	}

	result := buildProductBreakdown(productMap)

	// Vino (abs 5) should come before Cerveza (abs 2)
	if result[0].ProductName != "Vino" {
		t.Errorf("first should be Vino (abs qty 5), got %s", result[0].ProductName)
	}

	// Negative values should be preserved
	cerveza := result[1]
	if cerveza.TotalGross != "-7.00" {
		t.Errorf("Cerveza total_gross = %s, want -7.00", cerveza.TotalGross)
	}
	if cerveza.Quantity != -2 {
		t.Errorf("Cerveza quantity = %d, want -2", cerveza.Quantity)
	}
}

func TestSortedTaxBreakdown(t *testing.T) {
	taxMap := map[string]struct{ net, tax decimal.Decimal }{
		"21.00": {decimal.RequireFromString("82.64"), decimal.RequireFromString("17.36")},
		"7.00":  {decimal.RequireFromString("93.46"), decimal.RequireFromString("6.54")},
		"0.00":  {decimal.RequireFromString("50.00"), decimal.RequireFromString("0.00")},
	}

	result := sortedTaxBreakdown(taxMap)

	if len(result) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(result))
	}

	// Should be sorted ascending by rate
	if result[0].Rate != "0.00" {
		t.Errorf("first rate = %s, want 0.00", result[0].Rate)
	}
	if result[1].Rate != "7.00" {
		t.Errorf("second rate = %s, want 7.00", result[1].Rate)
	}
	if result[2].Rate != "21.00" {
		t.Errorf("third rate = %s, want 21.00", result[2].Rate)
	}

	// Check values
	if result[1].Net != "93.46" {
		t.Errorf("7%% net = %s, want 93.46", result[1].Net)
	}
	if result[2].Tax != "17.36" {
		t.Errorf("21%% tax = %s, want 17.36", result[2].Tax)
	}
}
