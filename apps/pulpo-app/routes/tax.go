package routes

import (
	"regexp"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	"github.com/shopspring/decimal"
)

// ResolveTaxRates returns a map of tax_class_code → rate for the given postcode.
func ResolveTaxRates(app core.App, postcode string) (map[string]decimal.Decimal, error) {
	// 1. Load all tax zones, sorted by priority
	zones := []struct {
		ID       string `db:"id"`
		Regex    string `db:"regex"`
		Priority int    `db:"priority"`
	}{}
	err := app.DB().
		Select("id", "regex", "priority").
		From("tax_zones").
		OrderBy("priority ASC").
		All(&zones)
	if err != nil {
		return nil, err
	}

	// 2. Find first matching zone
	var matchedZoneID string
	for _, z := range zones {
		re, err := regexp.Compile(z.Regex)
		if err != nil {
			continue
		}
		if re.MatchString(postcode) {
			matchedZoneID = z.ID
			break
		}
	}

	if matchedZoneID == "" {
		return map[string]decimal.Decimal{}, nil
	}

	// 3. Load tax rules for this zone with expanded tax_class
	type ruleRow struct {
		Rate        string `db:"rate"`
		TaxClassID  string `db:"tax_class"`
	}
	rules := []ruleRow{}
	err = app.DB().
		Select("tax_rules.rate", "tax_rules.tax_class").
		From("tax_rules").
		Where(dbx.HashExp{"tax_rules.tax_zone": matchedZoneID}).
		All(&rules)
	if err != nil {
		return nil, err
	}

	// 4. Load tax class codes
	classIDs := make([]any, len(rules))
	for i, r := range rules {
		classIDs[i] = r.TaxClassID
	}

	type classRow struct {
		ID   string `db:"id"`
		Code string `db:"code"`
	}
	classes := []classRow{}
	if len(classIDs) > 0 {
		err = app.DB().
			Select("id", "code").
			From("tax_classes").
			Where(dbx.In("id", classIDs...)).
			All(&classes)
		if err != nil {
			return nil, err
		}
	}

	classCodeByID := make(map[string]string, len(classes))
	for _, c := range classes {
		classCodeByID[c.ID] = c.Code
	}

	// 5. Build result map: code → rate
	result := make(map[string]decimal.Decimal, len(rules))
	for _, r := range rules {
		code := classCodeByID[r.TaxClassID]
		if code == "" {
			continue
		}
		rate, err := decimal.NewFromString(r.Rate)
		if err != nil {
			continue
		}
		result[code] = rate
	}

	return result, nil
}

// TaxZoneName returns the tax system name based on postcode prefix.
func TaxZoneName(postcode string) string {
	if len(postcode) < 2 {
		return "IVA"
	}

	type zoneMatch struct {
		prefix string
		name   string
	}
	zones := []zoneMatch{
		{"35", "IGIC"}, {"38", "IGIC"},
		{"51", "IPSI"}, {"52", "IPSI"},
	}
	for _, z := range zones {
		if len(postcode) >= len(z.prefix) && postcode[:len(z.prefix)] == z.prefix {
			return z.name
		}
	}
	return "IVA"
}
