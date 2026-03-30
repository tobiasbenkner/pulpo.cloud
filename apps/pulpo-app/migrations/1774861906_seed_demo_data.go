package migrations

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/shopspring/decimal"

	"github.com/pulpo-cloud/pulpo-app/invoice"
	"github.com/pulpo-cloud/pulpo-app/routes"
)

// --- Demo data definitions ---

type demoCat struct {
	Name string
	Sort int
}

type demoProd struct {
	Name       string
	PriceGross string
	TaxClass   string // code: STD, RED, etc.
	CostCenter string // "Barra" or "Cocina"
	Category   int    // index into categories
	Sort       int
	Stock      int    // initial stock, 0 = no tracking (null)
}

type demoCust struct {
	Name   string
	NIF    string
	Street string
	Zip    string
	City   string
	Email  string
	Phone  string
}

var demoCategories = []demoCat{
	{"Bebidas", 1},
	{"Tapas", 2},
	{"Platos", 3},
	{"Postres", 4},
}

var demoProducts = []demoProd{
	// Bebidas (cat 0) — no stock tracking (0 = null)
	{"Café solo", "1.20", "STD", "Barra", 0, 1, 0},
	{"Cortado", "1.40", "STD", "Barra", 0, 2, 0},
	{"Café con leche", "1.60", "STD", "Barra", 0, 3, 0},
	{"Caña", "1.80", "STD", "Barra", 0, 4, 0},
	{"Copa de vino tinto", "2.50", "STD", "Barra", 0, 5, 0},
	{"Agua mineral", "1.00", "STD", "Barra", 0, 6, 50},
	{"Refresco", "2.00", "STD", "Barra", 0, 7, 48},
	{"Zumo natural", "3.00", "STD", "Barra", 0, 8, 20},
	// Tapas (cat 1)
	{"Papas arrugadas con mojo", "4.50", "STD", "Cocina", 1, 1, 30},
	{"Croquetas caseras", "5.00", "STD", "Cocina", 1, 2, 25},
	{"Tortilla española", "3.50", "STD", "Cocina", 1, 3, 12},
	{"Queso asado con mojo", "5.50", "STD", "Cocina", 1, 4, 15},
	{"Aceitunas aliñadas", "2.50", "STD", "Cocina", 1, 5, 20},
	{"Pimientos de padrón", "4.00", "STD", "Cocina", 1, 6, 18},
	// Platos (cat 2)
	{"Hamburguesa completa", "9.50", "STD", "Cocina", 2, 1, 20},
	{"Ensalada mixta", "7.00", "STD", "Cocina", 2, 2, 15},
	{"Pollo a la plancha", "9.00", "STD", "Cocina", 2, 3, 12},
	{"Pescado del día", "12.00", "STD", "Cocina", 2, 4, 8},
	// Postres (cat 3)
	{"Tarta de queso", "4.50", "STD", "Cocina", 3, 1, 10},
	{"Helado artesanal", "3.50", "STD", "Cocina", 3, 2, 15},
	{"Bienmesabe", "4.00", "STD", "Cocina", 3, 3, 8},
}

var demoCustomers = []demoCust{
	{"María García López", "43567891A", "Calle León y Castillo 25", "35003", "Las Palmas de Gran Canaria", "maria@example.com", "928123456"},
	{"Juan Rodríguez Pérez", "78234561B", "Av. Mesa y López 42", "35007", "Las Palmas de Gran Canaria", "juan@example.com", "928234567"},
	{"Carmen Hernández Díaz", "41234567C", "Calle Triana 15", "35002", "Las Palmas de Gran Canaria", "carmen@example.com", "928345678"},
	{"Pedro Alonso Ruiz", "52345678D", "Calle Viera y Clavijo 8", "35002", "Las Palmas de Gran Canaria", "pedro@example.com", "928456789"},
	{"Laura Santana Gil", "44567892E", "Calle Perojo 3", "35003", "Las Palmas de Gran Canaria", "laura@example.com", "928567890"},
}

func init() {
	m.Register(func(app core.App) error {
		if os.Getenv("PB_SEED_DEMO") != "true" {
			return nil
		}

		// Skip if products already exist (demo already seeded)
		existing, _ := app.FindFirstRecordByFilter("products", "id != ''")
		if existing != nil {
			return nil
		}

		// --- Ensure company exists ---
		company, _ := app.FindFirstRecordByFilter("company", "id != ''")
		if company == nil {
			col, err := app.FindCollectionByNameOrId("company")
			if err != nil {
				return err
			}
			company = core.NewRecord(col)
			company.Set("name", "Demo Bar El Pulpo")
			company.Set("nif", "B76543210")
			company.Set("street", "Calle Mayor 1")
			company.Set("zip", "35001")
			company.Set("city", "Las Palmas de Gran Canaria")
			company.Set("email", "demo@pulpo.cloud")
			company.Set("timezone", "Atlantic/Canary")
			company.Set("invoice_prefix", "%count%")
			company.Set("last_ticket_number", 0)
			company.Set("last_factura_number", 0)
			company.Set("last_rectificativa_number", 0)
			if err := app.Save(company); err != nil {
				return fmt.Errorf("failed to create demo company: %w", err)
			}
		}

		// --- Cost centers ---
		ccCol, err := app.FindCollectionByNameOrId("cost_centers")
		if err != nil {
			return err
		}
		costCenterIDs := map[string]string{}
		for _, name := range []string{"Barra", "Cocina"} {
			rec := core.NewRecord(ccCol)
			rec.Set("name", name)
			if err := app.Save(rec); err != nil {
				return err
			}
			costCenterIDs[name] = rec.Id
		}

		// --- Tax class IDs ---
		taxClassIDs := map[string]string{}
		for _, code := range []string{"STD", "RED", "INC", "SUPER_RED", "EXEMPT"} {
			rec, err := app.FindFirstRecordByFilter("tax_classes", "code = {:code}", map[string]any{"code": code})
			if err != nil {
				return fmt.Errorf("tax class %s not found: %w", code, err)
			}
			taxClassIDs[code] = rec.Id
		}

		// --- Categories ---
		catCol, err := app.FindCollectionByNameOrId("products_categories")
		if err != nil {
			return err
		}
		categoryIDs := make([]string, len(demoCategories))
		for i, c := range demoCategories {
			rec := core.NewRecord(catCol)
			rec.Set("name", c.Name)
			rec.Set("sort", c.Sort)
			if err := app.Save(rec); err != nil {
				return err
			}
			categoryIDs[i] = rec.Id
		}

		// --- Products ---
		prodCol, err := app.FindCollectionByNameOrId("products")
		if err != nil {
			return err
		}

		type productInfo struct {
			ID         string
			Name       string
			PriceGross string
			TaxCode    string
			CostCenter string
		}
		products := make([]productInfo, len(demoProducts))

		for i, p := range demoProducts {
			rec := core.NewRecord(prodCol)
			rec.Set("name", p.Name)
			rec.Set("price_gross", p.PriceGross)
			rec.Set("tax_class", taxClassIDs[p.TaxClass])
			rec.Set("cost_center", costCenterIDs[p.CostCenter])
			rec.Set("category", categoryIDs[p.Category])
			rec.Set("sort", p.Sort)
			rec.Set("unit", "unit")
			if p.Stock > 0 {
				rec.Set("stock", p.Stock)
			}
			if err := app.Save(rec); err != nil {
				return err
			}
			products[i] = productInfo{
				ID:         rec.Id,
				Name:       p.Name,
				PriceGross: p.PriceGross,
				TaxCode:    p.TaxClass,
				CostCenter: p.CostCenter,
			}
		}

		// --- Customers ---
		custCol, err := app.FindCollectionByNameOrId("customers")
		if err != nil {
			return err
		}
		customerIDs := make([]string, len(demoCustomers))
		for i, c := range demoCustomers {
			rec := core.NewRecord(custCol)
			rec.Set("name", c.Name)
			rec.Set("nif", c.NIF)
			rec.Set("street", c.Street)
			rec.Set("zip", c.Zip)
			rec.Set("city", c.City)
			rec.Set("email", c.Email)
			rec.Set("phone", c.Phone)
			if err := app.Save(rec); err != nil {
				return err
			}
			customerIDs[i] = rec.Id
		}

		// --- Resolve tax rates ---
		postcode := company.GetString("zip")
		taxRates, err := routes.ResolveTaxRates(app, postcode)
		if err != nil {
			return fmt.Errorf("failed to resolve tax rates: %w", err)
		}

		// setCreated overrides PocketBase's autodate via raw SQL
		setCreated := func(collection, id string, t time.Time) {
			ts := t.UTC().Format("2006-01-02 15:04:05.000Z")
			_, _ = app.DB().NewQuery("UPDATE " + collection + " SET created = {:ts}, updated = {:ts} WHERE id = {:id}").
				Bind(map[string]any{"ts": ts, "id": id}).Execute()
		}

		// --- Generate 90 days of historical data ---
		rng := rand.New(rand.NewSource(42))
		now := time.Now()
		loc, err := time.LoadLocation(company.GetString("timezone"))
		if err != nil {
			loc = time.UTC
		}
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)

		closureCol, _ := app.FindCollectionByNameOrId("closures")
		invoiceCol, _ := app.FindCollectionByNameOrId("invoices")
		itemCol, _ := app.FindCollectionByNameOrId("invoice_items")
		paymentCol, _ := app.FindCollectionByNameOrId("invoice_payments")

		prefix := company.GetString("invoice_prefix")
		ticketCounter := 0
		facturaCounter := 0

		for dayOffset := 90; dayOffset >= 1; dayOffset-- {
			day := today.AddDate(0, 0, -dayOffset)

			// Skip Sundays
			if day.Weekday() == time.Sunday {
				continue
			}

			// More invoices on Friday/Saturday
			minInvoices, maxInvoices := 6, 12
			if day.Weekday() == time.Friday || day.Weekday() == time.Saturday {
				minInvoices, maxInvoices = 10, 18
			}
			numInvoices := minInvoices + rng.Intn(maxInvoices-minInvoices+1)

			// Create closure
			openTime := day.Add(9*time.Hour + time.Duration(rng.Intn(30))*time.Minute)
			closeTime := day.Add(22*time.Hour + time.Duration(rng.Intn(30))*time.Minute)
			startingCash := decimal.NewFromInt(int64(100 + rng.Intn(100)))

			closure := core.NewRecord(closureCol)
			closure.Set("status", "closed")
			closure.Set("period_start", openTime.UTC().Format("2006-01-02 15:04:05.000Z"))
			closure.Set("period_end", closeTime.UTC().Format("2006-01-02 15:04:05.000Z"))
			closure.Set("starting_cash", startingCash.StringFixed(2))
			if err := app.Save(closure); err != nil {
				return fmt.Errorf("failed to create closure for %s: %w", day.Format("2006-01-02"), err)
			}
			setCreated("closures", closure.Id, openTime)

			// Generate invoices for this day
			totalCash := decimal.Zero
			for j := 0; j < numInvoices; j++ {
				// Random time during the day
				minuteOffset := 60 + rng.Intn(int(closeTime.Sub(openTime).Minutes())-60)
				invoiceTime := openTime.Add(time.Duration(minuteOffset) * time.Minute)

				// Pick 1-4 random products
				numItems := 1 + rng.Intn(4)
				usedProducts := map[int]bool{}
				lines := make([]invoice.LineInput, 0, numItems)

				for k := 0; k < numItems; k++ {
					idx := rng.Intn(len(products))
					if usedProducts[idx] {
						continue
					}
					usedProducts[idx] = true
					p := products[idx]
					qty := 1 + rng.Intn(3)

					rate := taxRates[p.TaxCode]
					lines = append(lines, invoice.LineInput{
						ProductID:   p.ID,
						ProductName: p.Name,
						PriceGross:  decimal.RequireFromString(p.PriceGross),
						TaxRate:     rate,
						Quantity:    qty,
						CostCenter:  p.CostCenter,
					})
				}

				if len(lines) == 0 {
					continue
				}

				// Calculate
				calc := invoice.CalculateInvoice(lines, nil)

				// 85% tickets, 15% facturas
				invoiceType := "ticket"
				var customerID string
				if rng.Float64() < 0.15 {
					invoiceType = "factura"
					customerID = customerIDs[rng.Intn(len(customerIDs))]
				}

				// Invoice number
				var invoiceNumber string
				if invoiceType == "ticket" {
					ticketCounter++
					invoiceNumber = fmtInvoiceNumber(prefix, "ticket", ticketCounter, invoiceTime)
				} else {
					facturaCounter++
					invoiceNumber = fmtInvoiceNumber(prefix, "factura", facturaCounter, invoiceTime)
				}

				// Payment: 55% cash, 45% card
				method := "cash"
				if rng.Float64() < 0.45 {
					method = "card"
				}

				grossDec := decimal.RequireFromString(calc.Gross)
				tendered := calc.Gross
				change := "0.00"
				if method == "cash" {
					// Round up to nearest euro for tendered
					rounded := grossDec.Ceil()
					if rounded.Equal(grossDec) {
						rounded = grossDec
					}
					tendered = rounded.StringFixed(2)
					change = rounded.Sub(grossDec).StringFixed(2)
					totalCash = totalCash.Add(grossDec)
				}

				// Create invoice
				inv := core.NewRecord(invoiceCol)
				inv.Set("invoice_number", invoiceNumber)
				inv.Set("invoice_type", invoiceType)
				inv.Set("status", "paid")
				inv.Set("total_gross", calc.Gross)
				inv.Set("total_net", calc.Net)
				inv.Set("total_tax", calc.Tax)
				inv.Set("closure", closure.Id)
				inv.Set("issuer_name", company.GetString("name"))
				inv.Set("issuer_nif", company.GetString("nif"))
				inv.Set("issuer_street", company.GetString("street"))
				inv.Set("issuer_zip", company.GetString("zip"))
				inv.Set("issuer_city", company.GetString("city"))

				// Tax breakdown as JSON
				if len(calc.TaxBreakdown) > 0 {
					tbJSON, _ := json.Marshal(calc.TaxBreakdown)
					inv.Set("tax_breakdown", string(tbJSON))
				}

				if customerID != "" {
					inv.Set("customer", customerID)
					cust, err := app.FindRecordById("customers", customerID)
					if err == nil {
						inv.Set("customer_name", cust.GetString("name"))
						inv.Set("customer_nif", cust.GetString("nif"))
						inv.Set("customer_street", cust.GetString("street"))
						inv.Set("customer_zip", cust.GetString("zip"))
						inv.Set("customer_city", cust.GetString("city"))
						inv.Set("customer_email", cust.GetString("email"))
						inv.Set("customer_phone", cust.GetString("phone"))
					}
				}

				if err := app.Save(inv); err != nil {
					return fmt.Errorf("failed to create invoice: %w", err)
				}
				setCreated("invoices", inv.Id, invoiceTime)

				// Create items
				for _, item := range calc.Items {
					rec := core.NewRecord(itemCol)
					rec.Set("invoice", inv.Id)
					rec.Set("product", item.ProductID)
					rec.Set("product_name", item.ProductName)
					rec.Set("quantity", item.Quantity)
					rec.Set("price_gross_unit", item.PriceGrossUnit)
					rec.Set("tax_rate_snapshot", item.TaxRateSnapshot)
					rec.Set("row_total_gross", item.RowTotalGross)
					rec.Set("unit", "unit")
					if item.DiscountType != nil {
						rec.Set("discount_type", *item.DiscountType)
					}
					if item.DiscountValue != nil {
						rec.Set("discount_value", *item.DiscountValue)
					}
					if item.CostCenter != nil {
						rec.Set("cost_center", *item.CostCenter)
					}
					if err := app.Save(rec); err != nil {
						return fmt.Errorf("failed to create invoice item: %w", err)
					}
					setCreated("invoice_items", rec.Id, invoiceTime)
				}

				// Create payment
				pmt := core.NewRecord(paymentCol)
				pmt.Set("invoice", inv.Id)
				pmt.Set("method", method)
				pmt.Set("amount", calc.Gross)
				pmt.Set("tendered", tendered)
				pmt.Set("change", change)
				if err := app.Save(pmt); err != nil {
					return fmt.Errorf("failed to create payment: %w", err)
				}
				setCreated("invoice_payments", pmt.Id, invoiceTime)
			}

			// Update closure with counted cash (realistic: small random difference)
			expectedCash := startingCash.Add(totalCash)
			diff := decimal.NewFromFloat(float64(rng.Intn(5)-2) * 0.5)
			countedCash := expectedCash.Add(diff)
			closure.Set("counted_cash", countedCash.StringFixed(2))
			if err := app.Save(closure); err != nil {
				return err
			}
			setCreated("closures", closure.Id, openTime)
		}

		// Update company counters
		company.Set("last_ticket_number", ticketCounter)
		company.Set("last_factura_number", facturaCounter)
		return app.Save(company)

	}, nil)
}

func fmtInvoiceNumber(prefix, invoiceType string, counter int, t time.Time) string {
	number := prefix
	number = strings.ReplaceAll(number, "%year%", fmt.Sprintf("%d", t.Year()))
	number = strings.ReplaceAll(number, "%month%", fmt.Sprintf("%02d", t.Month()))
	number = strings.ReplaceAll(number, "%day%", fmt.Sprintf("%02d", t.Day()))
	number = strings.ReplaceAll(number, "%date%", fmt.Sprintf("%d%02d%02d", t.Year(), t.Month(), t.Day()))
	number = strings.ReplaceAll(number, "%count%", fmt.Sprintf("%05d", counter))

	typePrefix := "T-"
	if invoiceType == "factura" {
		typePrefix = "F-"
	} else if invoiceType == "rectificativa" {
		typePrefix = "R-"
	}
	return typePrefix + number
}
