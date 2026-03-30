package migrations

import (
	"os"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		col, err := app.FindCollectionByNameOrId("company")
		if err != nil {
			return err
		}

		// Skip if a company record already exists
		existing, _ := app.FindFirstRecordByFilter(col.Id, "id != ''")
		if existing != nil {
			return nil
		}

		// Only seed if at least PB_COMPANY_NAME is set
		name := os.Getenv("PB_COMPANY_NAME")
		if name == "" {
			return nil
		}

		record := core.NewRecord(col)
		record.Set("name", name)
		record.Set("nif", os.Getenv("PB_COMPANY_NIF"))
		record.Set("street", os.Getenv("PB_COMPANY_STREET"))
		record.Set("zip", os.Getenv("PB_COMPANY_ZIP"))
		record.Set("city", os.Getenv("PB_COMPANY_CITY"))
		record.Set("email", os.Getenv("PB_COMPANY_EMAIL"))
		record.Set("invoice_prefix", os.Getenv("PB_COMPANY_INVOICE_PREFIX"))
		record.Set("closure_email", os.Getenv("PB_COMPANY_CLOSURE_EMAIL"))

		// Timezone: default to Europe/Madrid if not set
		tz := os.Getenv("PB_COMPANY_TIMEZONE")
		if tz == "" {
			tz = "Europe/Madrid"
		}
		record.Set("timezone", tz)

		// Counters start at 0
		record.Set("last_ticket_number", 0)
		record.Set("last_factura_number", 0)
		record.Set("last_rectificativa_number", 0)

		return app.Save(record)
	}, nil)
}
