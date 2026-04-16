package routes

import (
	"bytes"
	"fmt"
	"io"
	"net/mail"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/mailer"

	"github.com/pulpo-cloud/pulpo-app/excel"
)

// SendClosureEmail sends the closure report email with an Excel attachment.
// Exported so hook packages can invoke it.
func SendClosureEmail(app core.App, closureID string, summary *ClosureSummary) error {
	// Load company
	company, err := app.FindFirstRecordByFilter("company", "id != ''")
	if err != nil {
		return err
	}

	recipientEmail := company.GetString("closure_email")
	if recipientEmail == "" {
		return nil // no email configured
	}

	tenantName := company.GetString("name")
	postcode := company.GetString("zip")
	taxName := TaxZoneName(postcode)

	// Load closure
	closure, err := app.FindRecordById("closures", closureID)
	if err != nil {
		return err
	}

	startingCash := closure.GetString("starting_cash")
	countedCash := closure.GetString("counted_cash")
	expectedCash := safeDec(startingCash).Add(safeDec(summary.TotalCash)).StringFixed(2)

	difference := ""
	if countedCash != "" {
		difference = safeDec(countedCash).Sub(safeDec(expectedCash)).StringFixed(2)
	}

	// Build Excel data
	reportData := excel.ClosureReportData{
		PeriodStart:      closure.GetString("period_start"),
		PeriodEnd:        closure.GetString("period_end"),
		StartingCash:     startingCash,
		TotalGross:       summary.TotalGross,
		TotalNet:         summary.TotalNet,
		TotalTax:         summary.TotalTax,
		TotalCash:        summary.TotalCash,
		TotalCard:        summary.TotalCard,
		TotalChange:      summary.TotalChange,
		ExpectedCash:     expectedCash,
		CountedCash:      countedCash,
		Difference:       difference,
		TransactionCount: summary.TransactionCount,
		InvoiceCounts: excel.InvoiceTypeCounts{
			Tickets:        summary.InvoiceCounts.Tickets,
			Facturas:       summary.InvoiceCounts.Facturas,
			Rectificativas: summary.InvoiceCounts.Rectificativas,
		},
		TaxBreakdown:     toExcelTaxBreakdown(summary.TaxBreakdown),
		ProductBreakdown: toExcelProductRows(summary.ProductBreakdown),
	}

	// Generate Excel
	f, err := excel.GenerateClosureExcel(reportData, taxName, tenantName)
	if err != nil {
		return fmt.Errorf("failed to generate Excel: %w", err)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return fmt.Errorf("failed to write Excel: %w", err)
	}
	f.Close()

	// Format date for filename and subject
	periodEnd := closure.GetString("period_end")
	dateStr := formatEmailDate(periodEnd)

	// Build HTML email
	html := buildClosureEmailHTML(summary, taxName, tenantName,
		closure.GetString("period_start"), periodEnd, difference)

	// Send
	recipients := strings.Split(recipientEmail, ",")
	toAddrs := make([]mail.Address, 0, len(recipients))
	for _, r := range recipients {
		r = strings.TrimSpace(r)
		if r != "" {
			toAddrs = append(toAddrs, mail.Address{Address: r})
		}
	}

	message := &mailer.Message{
		From: mail.Address{
			Address: app.Settings().Meta.SenderAddress,
			Name:    app.Settings().Meta.SenderName,
		},
		To:      toAddrs,
		Subject: fmt.Sprintf("Cierre de caja — %s — %s", tenantName, dateStr),
		HTML:    html,
		Attachments: map[string]io.Reader{
			fmt.Sprintf("Cierre_%s.xlsx", dateStr): bytes.NewReader(buf.Bytes()),
		},
	}

	return app.NewMailClient().Send(message)
}

func buildClosureEmailHTML(summary *ClosureSummary, taxName, tenantName, periodStart, periodEnd, difference string) string {
	start := formatEmailDateTime(periodStart)
	end := formatEmailDateTime(periodEnd)

	html := fmt.Sprintf(`
<h2>Cierre de caja — %s</h2>
<p><strong>Periodo:</strong> %s — %s</p>
<table style="border-collapse:collapse;margin:12px 0">
  <tr><td style="padding:4px 12px 4px 0">Total bruto</td><td style="text-align:right;padding:4px 0"><strong>%s &euro;</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0">Total neto</td><td style="text-align:right;padding:4px 0">%s &euro;</td></tr>
  <tr><td style="padding:4px 12px 4px 0">Impuestos</td><td style="text-align:right;padding:4px 0">%s &euro;</td></tr>
  <tr><td style="padding:4px 12px 4px 0">Efectivo</td><td style="text-align:right;padding:4px 0">%s &euro;</td></tr>
  <tr><td style="padding:4px 12px 4px 0">Tarjeta</td><td style="text-align:right;padding:4px 0">%s &euro;</td></tr>
  <tr><td style="padding:4px 12px 4px 0">Transacciones</td><td style="text-align:right;padding:4px 0">%d</td></tr>
</table>`,
		tenantName, start, end,
		summary.TotalGross, summary.TotalNet, summary.TotalTax,
		summary.TotalCash, summary.TotalCard, summary.TransactionCount)

	if difference != "" {
		html += fmt.Sprintf(`<p><strong>Diferencia:</strong> %s &euro;</p>`, difference)
	}

	html += `<p style="color:#888;font-size:12px">El informe completo se encuentra en el documento adjunto (Excel).</p>`

	return html
}

func formatEmailDate(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	loc, _ := time.LoadLocation("Europe/Madrid")
	return t.In(loc).Format("2006-01-02")
}

func formatEmailDateTime(iso string) string {
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	loc, _ := time.LoadLocation("Europe/Madrid")
	return t.In(loc).Format("02/01/2006 15:04")
}

// --- Conversion helpers ---

func toExcelTaxBreakdown(rows []TaxBreakdown) []excel.TaxBreakdownRow {
	result := make([]excel.TaxBreakdownRow, len(rows))
	for i, r := range rows {
		result[i] = excel.TaxBreakdownRow{Rate: r.Rate, Net: r.Net, Tax: r.Tax}
	}
	return result
}

func toExcelProductRows(rows []ProductBreakdown) []excel.ProductRow {
	result := make([]excel.ProductRow, len(rows))
	for i, r := range rows {
		result[i] = excel.ProductRow{
			ProductName:  r.ProductName,
			CostCenter:   r.CostCenter,
			Unit:         r.Unit,
			Quantity:     r.Quantity,
			CashQuantity: r.CashQuantity,
			CardQuantity: r.CardQuantity,
			TotalGross:   r.TotalGross,
			CashGross:    r.CashGross,
			CardGross:    r.CardGross,
		}
	}
	return result
}
