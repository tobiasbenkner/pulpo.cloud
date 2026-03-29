package routes

import (
	"fmt"
	"net/http"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/shopspring/decimal"
)

// RegisterCashRegisterRoutes registers the cash register open/close endpoints.
func RegisterCashRegisterRoutes(app core.App, se *core.ServeEvent) {
	g := se.Router.Group("/api/custom")
	g.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("Authentication required", nil)
		}
		return e.Next()
	})

	g.POST("/cash-register/open", func(e *core.RequestEvent) error {
		return handleOpenRegister(e)
	})

	g.POST("/cash-register/close", func(e *core.RequestEvent) error {
		return handleCloseRegister(e)
	})
}

// --- Open ---

type openRequest struct {
	StartingCash string `json:"starting_cash"`
}

func handleOpenRegister(e *core.RequestEvent) error {
	var req openRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	if req.StartingCash == "" {
		req.StartingCash = "0.00"
	}

	var createdClosure *core.Record

	err := e.App.RunInTransaction(func(txApp core.App) error {
		// Check for existing open closure
		existing, err := txApp.FindFirstRecordByFilter("closures", "status = 'open'")
		if err == nil && existing != nil {
			return fmt.Errorf("ALREADY_OPEN")
		}

		collection, err := txApp.FindCollectionByNameOrId("closures")
		if err != nil {
			return err
		}

		closure := core.NewRecord(collection)
		closure.Set("status", "open")
		closure.Set("period_start", time.Now().UTC().Format(time.RFC3339))
		closure.Set("starting_cash", req.StartingCash)

		if err := txApp.Save(closure); err != nil {
			return err
		}

		createdClosure = closure
		return nil
	})

	if err != nil {
		if err.Error() == "ALREADY_OPEN" {
			return e.JSON(http.StatusConflict, map[string]any{
				"error": "Es existiert bereits ein offener Kassenabschluss. Bitte zuerst schließen.",
			})
		}
		return e.InternalServerError("Failed to open register", err)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"success": true,
		"closure": createdClosure,
	})
}

// --- Close ---

type closeRequest struct {
	CountedCash      *string                `json:"counted_cash"`
	DenominationCount []denominationEntry   `json:"denomination_count"`
}

type denominationEntry struct {
	Cents int    `json:"cents"`
	Label string `json:"label"`
	Qty   int    `json:"qty"`
}

func handleCloseRegister(e *core.RequestEvent) error {
	var req closeRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	var closureID string

	err := e.App.RunInTransaction(func(txApp core.App) error {
		// Find open closure
		closure, err := txApp.FindFirstRecordByFilter("closures", "status = 'open'")
		if err != nil {
			return fmt.Errorf("NO_OPEN_CLOSURE")
		}

		closureID = closure.Id

		// Close it
		closure.Set("status", "closed")
		closure.Set("period_end", time.Now().UTC().Format(time.RFC3339))

		// Handle counted cash + denominations
		if req.CountedCash != nil {
			closure.Set("counted_cash", *req.CountedCash)
		}

		if err := txApp.Save(closure); err != nil {
			return err
		}

		// Save denomination counts
		if len(req.DenominationCount) > 0 {
			denomCollection, err := txApp.FindCollectionByNameOrId("closure_denominations")
			if err != nil {
				return err
			}
			for _, d := range req.DenominationCount {
				record := core.NewRecord(denomCollection)
				record.Set("closure", closureID)
				record.Set("cents", d.Cents)
				record.Set("label", d.Label)
				record.Set("qty", d.Qty)
				if err := txApp.Save(record); err != nil {
					return err
				}
			}
		}

		return nil
	})

	if err != nil {
		if err.Error() == "NO_OPEN_CLOSURE" {
			return e.JSON(http.StatusNotFound, map[string]any{
				"error": "Kein offener Kassenabschluss gefunden.",
			})
		}
		return e.InternalServerError("Failed to close register", err)
	}

	// Compute summary from invoices (outside transaction)
	summary, err := ComputeClosureSummary(e.App, closureID)
	if err != nil {
		return e.InternalServerError("Failed to compute closure summary", err)
	}

	// Load closure for response
	closure, _ := e.App.FindRecordById("closures", closureID)

	// Compute expected cash and difference
	startingCash := safeDec(closure.GetString("starting_cash"))
	expectedCash := startingCash.Add(safeDec(summary.TotalCash))

	response := map[string]any{
		"success": true,
		"closure": map[string]any{
			"id":                closure.Id,
			"status":            "closed",
			"period_start":      closure.GetString("period_start"),
			"period_end":        closure.GetString("period_end"),
			"starting_cash":     closure.GetString("starting_cash"),
			"total_gross":       summary.TotalGross,
			"total_net":         summary.TotalNet,
			"total_tax":         summary.TotalTax,
			"total_cash":        summary.TotalCash,
			"total_card":        summary.TotalCard,
			"total_change":      summary.TotalChange,
			"expected_cash":     expectedCash.StringFixed(2),
			"transaction_count": summary.TransactionCount,
			"invoice_type_counts": summary.InvoiceCounts,
			"tax_breakdown":     summary.TaxBreakdown,
			"product_breakdown": summary.ProductBreakdown,
		},
	}

	if req.CountedCash != nil {
		countedCash := safeDec(*req.CountedCash)
		difference := countedCash.Sub(expectedCash)
		response["closure"].(map[string]any)["counted_cash"] = countedCash.StringFixed(2)
		response["closure"].(map[string]any)["difference"] = difference.StringFixed(2)
	}

	// Load denominations
	denoms, _ := e.App.FindRecordsByFilter(
		"closure_denominations",
		"closure = {:id}", "", 0, 0,
		map[string]any{"id": closureID},
	)
	if len(denoms) > 0 {
		response["closure"].(map[string]any)["denomination_count"] = denoms
	}

	return e.JSON(http.StatusOK, response)
}

// Ensure decimal import is used
var _ = decimal.Zero
