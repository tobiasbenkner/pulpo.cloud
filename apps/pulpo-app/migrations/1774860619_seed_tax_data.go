package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// --- Tax Classes ---
		taxClassesCol, err := app.FindCollectionByNameOrId("tax_classes")
		if err != nil {
			return err
		}

		type taxClass struct {
			Code string
			Name string
		}
		classes := []taxClass{
			{"STD", "Estándar"},
			{"RED", "Reducido"},
			{"INC", "Incrementado"},
			{"SUPER_RED", "Super-Red"},
			{"EXEMPT", "Exento"},
		}

		// Map code → record ID for later use in tax_rules
		classIDByCode := make(map[string]string)

		for _, c := range classes {
			// Skip if already exists
			existing, _ := app.FindFirstRecordByFilter(taxClassesCol.Id, "code = {:code}", map[string]any{"code": c.Code})
			if existing != nil {
				classIDByCode[c.Code] = existing.Id
				continue
			}
			record := core.NewRecord(taxClassesCol)
			record.Set("code", c.Code)
			record.Set("name", c.Name)
			if err := app.Save(record); err != nil {
				return err
			}
			classIDByCode[c.Code] = record.Id
		}

		// --- Tax Zones ---
		taxZonesCol, err := app.FindCollectionByNameOrId("tax_zones")
		if err != nil {
			return err
		}

		type taxZone struct {
			Name     string
			Zone     string
			Regex    string
			Priority int
		}
		zones := []taxZone{
			{"Islas Canarias", "IGIC", `^(35|38)[0-9]{3}$`, 1},
			{"Ceuta", "IPSI", `^51[0-9]{3}$`, 2},
			{"Melilla", "IPSI", `^52[0-9]{3}$`, 2},
			{"España (Península)", "IVA", `^[0-9]{5}$`, 3},
		}

		// Map name → record ID for later use in tax_rules
		zoneIDByName := make(map[string]string)

		for _, z := range zones {
			existing, _ := app.FindFirstRecordByFilter(taxZonesCol.Id, "name = {:name}", map[string]any{"name": z.Name})
			if existing != nil {
				zoneIDByName[z.Name] = existing.Id
				continue
			}
			record := core.NewRecord(taxZonesCol)
			record.Set("name", z.Name)
			record.Set("zone", z.Zone)
			record.Set("regex", z.Regex)
			record.Set("priority", z.Priority)
			if err := app.Save(record); err != nil {
				return err
			}
			zoneIDByName[z.Name] = record.Id
		}

		// --- Tax Rules ---
		taxRulesCol, err := app.FindCollectionByNameOrId("tax_rules")
		if err != nil {
			return err
		}

		type taxRule struct {
			Name      string
			Rate      string
			ClassCode string
			ZoneName  string
		}
		rules := []taxRule{
			// IGIC (Islas Canarias)
			{"IGIC General", "7.00", "STD", "Islas Canarias"},
			{"IGIC Reducido", "3.00", "RED", "Islas Canarias"},
			{"IGIC Incrementado", "9.50", "INC", "Islas Canarias"},
			{"IGIC Tipo 0", "0.00", "EXEMPT", "Islas Canarias"},
			// IVA (España Península)
			{"IVA General", "21.00", "STD", "España (Península)"},
			{"IVA Reducido", "10.00", "RED", "España (Península)"},
			{"IVA General (equivalente Std)", "21.00", "INC", "España (Península)"},
			{"IVA Exento/0%", "0.00", "EXEMPT", "España (Península)"},
			{"IVA Superreducido", "4.00", "SUPER_RED", "España (Península)"},
			// IPSI (Ceuta)
			{"Tipo general", "10.00", "STD", "Ceuta"},
			{"Restaurantes 1 tenedor, bares", "2.00", "RED", "Ceuta"},
			{"General", "10.00", "INC", "Ceuta"},
			{"Mínimo", "0.50", "SUPER_RED", "Ceuta"},
			{"Exento", "0.00", "EXEMPT", "Ceuta"},
			// IPSI (Melilla)
			{"Tipo general bienes inmuebles / comercio", "4.00", "STD", "Melilla"},
			{"Cafeterías, bares, restaurantes 1 tenedor", "1.00", "RED", "Melilla"},
			{"General", "4.00", "INC", "Melilla"},
			{"Mínimo", "0.50", "SUPER_RED", "Melilla"},
			{"Exento", "0.00", "EXEMPT", "Melilla"},
		}

		for _, r := range rules {
			classID := classIDByCode[r.ClassCode]
			zoneID := zoneIDByName[r.ZoneName]

			// Skip if already exists (same zone + class combo)
			existing, _ := app.FindFirstRecordByFilter(taxRulesCol.Id,
				"tax_zone = {:zone} && tax_class = {:class}",
				map[string]any{"zone": zoneID, "class": classID},
			)
			if existing != nil {
				continue
			}

			record := core.NewRecord(taxRulesCol)
			record.Set("name", r.Name)
			record.Set("rate", r.Rate)
			record.Set("tax_class", classID)
			record.Set("tax_zone", zoneID)
			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, func(app core.App) error {
		// Down: delete all tax rules, zones, classes (in reverse order)
		taxRulesCol, _ := app.FindCollectionByNameOrId("tax_rules")
		if taxRulesCol != nil {
			records, _ := app.FindAllRecords(taxRulesCol)
			for _, r := range records {
				_ = app.Delete(r)
			}
		}
		taxZonesCol, _ := app.FindCollectionByNameOrId("tax_zones")
		if taxZonesCol != nil {
			records, _ := app.FindAllRecords(taxZonesCol)
			for _, r := range records {
				_ = app.Delete(r)
			}
		}
		taxClassesCol, _ := app.FindCollectionByNameOrId("tax_classes")
		if taxClassesCol != nil {
			records, _ := app.FindAllRecords(taxClassesCol)
			for _, r := range records {
				_ = app.Delete(r)
			}
		}
		return nil
	})
}
