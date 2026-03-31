package routes

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/shopspring/decimal"

	"github.com/pulpo-cloud/pulpo-app/invoice"
)

// --- Request types ---

type invoiceCreateRequest struct {
	Status    string               `json:"status"`
	Items     []invoiceItemRequest `json:"items"`
	Discount  *discountRequest     `json:"discount"`
	CustomerID *string             `json:"customer_id"`
	Payments  []paymentRequest     `json:"payments"`
}

type invoiceItemRequest struct {
	ProductID string           `json:"product_id"`
	Quantity  int              `json:"quantity"`
	Discount  *discountRequest `json:"discount"`
}

type discountRequest struct {
	Type  string  `json:"type"`
	Value float64 `json:"value"`
}

type paymentRequest struct {
	Method   string  `json:"method"`
	Amount   string  `json:"amount"`
	Tendered *string `json:"tendered"`
	Change   *string `json:"change"`
	Tip      *string `json:"tip"`
}

// --- Route registration ---

func RegisterInvoiceRoutes(app core.App, se *core.ServeEvent) {
	g := se.Router.Group("/api/custom")
	g.BindFunc(func(e *core.RequestEvent) error {
		if e.Auth == nil {
			return e.UnauthorizedError("Authentication required", nil)
		}
		return e.Next()
	})

	g.POST("/invoices", func(e *core.RequestEvent) error {
		return handleCreateInvoice(e)
	})

	g.POST("/invoices/rectify", func(e *core.RequestEvent) error {
		return handleRectifyInvoice(e)
	})

	g.POST("/invoices/swap-payment", func(e *core.RequestEvent) error {
		return handleSwapPaymentMethod(e)
	})
}

// --- Handlers ---

func handleCreateInvoice(e *core.RequestEvent) error {
	var req invoiceCreateRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	if len(req.Items) == 0 {
		return e.BadRequestError("No items provided", nil)
	}
	if len(req.Payments) == 0 {
		return e.BadRequestError("No payments provided", nil)
	}

	// Load company settings
	company, err := e.App.FindFirstRecordByFilter("company", "id != ''")
	if err != nil {
		return e.InternalServerError("Company settings not found", err)
	}

	postcode := company.GetString("zip")
	if postcode == "" {
		return e.BadRequestError("Company zip not configured", nil)
	}

	// Resolve tax rates
	taxRates, err := ResolveTaxRates(e.App, postcode)
	if err != nil {
		return e.InternalServerError("Failed to resolve tax rates", err)
	}

	// Load products
	productIDs := make([]any, len(req.Items))
	for i, item := range req.Items {
		productIDs[i] = item.ProductID
	}

	products, err := e.App.FindRecordsByIds("products", toStringSlice(productIDs))
	if err != nil {
		return e.InternalServerError("Failed to load products", err)
	}

	productMap := make(map[string]*core.Record, len(products))
	for _, p := range products {
		productMap[p.Id] = p
	}

	// Build invoice line inputs
	lineInputs := make([]invoice.LineInput, 0, len(req.Items))
	for _, item := range req.Items {
		product, ok := productMap[item.ProductID]
		if !ok {
			return e.BadRequestError(fmt.Sprintf("Product %s not found", item.ProductID), nil)
		}

		priceGross, err := decimal.NewFromString(product.GetString("price_gross"))
		if err != nil {
			return e.InternalServerError(fmt.Sprintf("Invalid price for product %s", item.ProductID), err)
		}

		// Resolve tax rate from product's tax_class
		taxClassID := product.GetString("tax_class")
		taxRate := decimal.Zero
		if taxClassID != "" {
			taxClass, err := e.App.FindRecordById("tax_classes", taxClassID)
			if err == nil {
				code := taxClass.GetString("code")
				if rate, ok := taxRates[code]; ok {
					taxRate = rate
				}
			}
		} else {
			// Default to STD
			if rate, ok := taxRates["STD"]; ok {
				taxRate = rate
			}
		}

		// Cost center name snapshot
		costCenter := ""
		if ccID := product.GetString("cost_center"); ccID != "" {
			if cc, err := e.App.FindRecordById("cost_centers", ccID); err == nil {
				costCenter = cc.GetString("name")
			}
		}

		li := invoice.LineInput{
			ProductID:   item.ProductID,
			ProductName: product.GetString("name"),
			PriceGross:  priceGross,
			TaxRate:     taxRate,
			Quantity:    item.Quantity,
			CostCenter:  costCenter,
		}

		if item.Discount != nil {
			li.Discount = &invoice.DiscountInput{
				Type:  item.Discount.Type,
				Value: decimal.NewFromFloat(item.Discount.Value),
			}
		}

		lineInputs = append(lineInputs, li)
	}

	// Calculate invoice
	var globalDiscount *invoice.DiscountInput
	if req.Discount != nil {
		globalDiscount = &invoice.DiscountInput{
			Type:  req.Discount.Type,
			Value: decimal.NewFromFloat(req.Discount.Value),
		}
	}

	calc := invoice.CalculateInvoice(lineInputs, globalDiscount)

	// Determine invoice type
	invoiceType := "ticket"
	if req.CustomerID != nil && *req.CustomerID != "" {
		invoiceType = "factura"
	}

	// Run everything in a transaction
	var createdInvoice *core.Record

	err = e.App.RunInTransaction(func(txApp core.App) error {
		// Load company for issuer data
		companyRecord, err := txApp.FindFirstRecordByFilter("company", "id != ''")
		if err != nil {
			return err
		}

		// Find open closure
		closure, err := txApp.FindFirstRecordByFilter("closures", "status = 'open'")
		if err != nil {
			return fmt.Errorf("NO_OPEN_CLOSURE")
		}

		// Lock and increment counter
		countersRecord, err := txApp.FindFirstRecordByFilter("counters", "id != ''")
		if err != nil {
			return fmt.Errorf("counters record not found: %w", err)
		}

		counterField := "ticket"
		if invoiceType == "factura" {
			counterField = "factura"
		}

		counter := countersRecord.GetInt(counterField) + 1
		countersRecord.Set(counterField, counter)
		if err := txApp.Save(countersRecord); err != nil {
			return err
		}

		invoiceNumber := generateInvoiceNumber(
			countersRecord.GetString("invoice_prefix"),
			invoiceType,
			counter,
		)

		// Create invoice record
		invoiceCollection, err := txApp.FindCollectionByNameOrId("invoices")
		if err != nil {
			return err
		}

		inv := core.NewRecord(invoiceCollection)
		inv.Set("invoice_number", invoiceNumber)
		inv.Set("invoice_type", invoiceType)
		inv.Set("status", req.Status)
		inv.Set("total_gross", calc.Gross)
		inv.Set("total_net", calc.Net)
		inv.Set("total_tax", calc.Tax)
		inv.Set("closure", closure.Id)

		if calc.DiscountType != nil {
			inv.Set("discount_type", *calc.DiscountType)
			inv.Set("discount_value", *calc.DiscountValue)
		}

		// Issuer snapshot
		inv.Set("issuer_name", companyRecord.GetString("name"))
		inv.Set("issuer_nif", companyRecord.GetString("nif"))
		inv.Set("issuer_street", companyRecord.GetString("street"))
		inv.Set("issuer_zip", companyRecord.GetString("zip"))
		inv.Set("issuer_city", companyRecord.GetString("city"))

		// Customer snapshot
		if req.CustomerID != nil && *req.CustomerID != "" {
			inv.Set("customer", *req.CustomerID)
			customer, err := txApp.FindRecordById("customers", *req.CustomerID)
			if err == nil {
				inv.Set("customer_name", customer.GetString("name"))
				inv.Set("customer_nif", customer.GetString("nif"))
				inv.Set("customer_street", customer.GetString("street"))
				inv.Set("customer_zip", customer.GetString("zip"))
				inv.Set("customer_city", customer.GetString("city"))
				inv.Set("customer_email", customer.GetString("email"))
				inv.Set("customer_phone", customer.GetString("phone"))
			}
		}

		if err := txApp.Save(inv); err != nil {
			return err
		}

		// Create invoice items
		itemsCollection, err := txApp.FindCollectionByNameOrId("invoice_items")
		if err != nil {
			return err
		}

		for i, calcItem := range calc.Items {
			itemRecord := core.NewRecord(itemsCollection)
			itemRecord.Set("invoice", inv.Id)
			itemRecord.Set("product", calcItem.ProductID)
			itemRecord.Set("product_name", calcItem.ProductName)
			itemRecord.Set("quantity", calcItem.Quantity)
			itemRecord.Set("price_gross_unit", calcItem.PriceGrossUnit)
			itemRecord.Set("tax_rate_snapshot", calcItem.TaxRateSnapshot)
			itemRecord.Set("row_total_gross", calcItem.RowTotalGross)

			if calcItem.DiscountType != nil {
				itemRecord.Set("discount_type", *calcItem.DiscountType)
				itemRecord.Set("discount_value", *calcItem.DiscountValue)
			}
			if calcItem.CostCenter != nil {
				itemRecord.Set("cost_center", *calcItem.CostCenter)
			}

			// Unit from product
			product := productMap[req.Items[i].ProductID]
			if product != nil {
				itemRecord.Set("unit", product.GetString("unit"))
			}

			if err := txApp.Save(itemRecord); err != nil {
				return err
			}
		}

		// Create payments
		paymentsCollection, err := txApp.FindCollectionByNameOrId("invoice_payments")
		if err != nil {
			return err
		}

		for _, p := range req.Payments {
			payRecord := core.NewRecord(paymentsCollection)
			payRecord.Set("invoice", inv.Id)
			payRecord.Set("method", p.Method)
			payRecord.Set("amount", p.Amount)
			if p.Tendered != nil {
				payRecord.Set("tendered", *p.Tendered)
			}
			if p.Change != nil {
				payRecord.Set("change", *p.Change)
			}
			if p.Tip != nil {
				payRecord.Set("tip", *p.Tip)
			}

			if err := txApp.Save(payRecord); err != nil {
				return err
			}
		}

		// Decrement stock (-1 = unlimited, skip)
		for _, reqItem := range req.Items {
			product := productMap[reqItem.ProductID]
			if product == nil {
				continue
			}
			currentStock := product.GetInt("stock")
			if currentStock < 0 {
				continue
			}
			newStock := currentStock - reqItem.Quantity
			if newStock < 0 {
				newStock = 0
			}
			product.Set("stock", newStock)
			if err := txApp.Save(product); err != nil {
				return err
			}
		}

		createdInvoice = inv
		return nil
	})

	if err != nil {
		errMsg := err.Error()
		if errMsg == "NO_OPEN_CLOSURE" {
			return e.JSON(http.StatusBadRequest, map[string]any{
				"error": "NO_OPEN_CLOSURE",
			})
		}
		return e.InternalServerError("Failed to create invoice", err)
	}

	// Load full invoice with relations for response
	result, err := e.App.FindRecordById("invoices", createdInvoice.Id)
	if err != nil {
		return e.InternalServerError("Failed to load created invoice", err)
	}

	// Expand items and payments
	e.App.ExpandRecord(result, []string{"customer"}, nil)

	// Load items and payments separately for response
	items, _ := e.App.FindRecordsByFilter("invoice_items", "invoice = {:id}", "-created", 0, 0, map[string]any{"id": result.Id})
	payments, _ := e.App.FindRecordsByFilter("invoice_payments", "invoice = {:id}", "-created", 0, 0, map[string]any{"id": result.Id})

	return e.JSON(http.StatusOK, map[string]any{
		"id":             result.Id,
		"invoice_number": result.GetString("invoice_number"),
		"invoice_type":   result.GetString("invoice_type"),
		"status":         result.GetString("status"),
		"total_gross":    result.GetString("total_gross"),
		"total_net":      result.GetString("total_net"),
		"total_tax":      result.GetString("total_tax"),
		"discount_type":  result.GetString("discount_type"),
		"discount_value": result.GetString("discount_value"),
		"customer":       result.GetString("customer"),
		"closure":        result.GetString("closure"),
		"created":        result.GetString("created"),
		"items":          items,
		"payments":       payments,
	})
}

// --- Rectification ---

type rectifyRequest struct {
	OriginalInvoiceID string              `json:"original_invoice_id"`
	Reason            string              `json:"reason"`
	ReasonDetail      string              `json:"reason_detail"`
	PaymentMethod     string              `json:"payment_method"`
	Items             []rectifyItemRequest `json:"items"`
}

type rectifyItemRequest struct {
	ProductID   *string `json:"product_id"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
}

func handleRectifyInvoice(e *core.RequestEvent) error {
	var req rectifyRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	if req.OriginalInvoiceID == "" {
		return e.BadRequestError("original_invoice_id required", nil)
	}
	if len(req.Items) == 0 {
		return e.BadRequestError("No items to rectify", nil)
	}

	// Load original invoice
	original, err := e.App.FindRecordById("invoices", req.OriginalInvoiceID)
	if err != nil {
		return e.NotFoundError("Original invoice not found", err)
	}

	status := original.GetString("status")
	if status != "paid" && status != "rectificada" {
		return e.BadRequestError("Invoice cannot be rectified (status: "+status+")", nil)
	}
	if original.GetString("invoice_type") == "rectificativa" {
		return e.BadRequestError("Cannot rectify a rectificativa", nil)
	}

	// Load original items
	originalItems, err := e.App.FindRecordsByFilter(
		"invoice_items", "invoice = {:id}", "", 0, 0,
		map[string]any{"id": req.OriginalInvoiceID},
	)
	if err != nil {
		return e.InternalServerError("Failed to load original items", err)
	}

	// Build map of original items by product_id
	origItemMap := make(map[string]*core.Record, len(originalItems))
	for _, item := range originalItems {
		pid := item.GetString("product")
		if pid != "" {
			origItemMap[pid] = item
		}
	}

	// Build negative line inputs from original items
	lineInputs := make([]invoice.LineInput, 0, len(req.Items))
	for _, ri := range req.Items {
		var origItem *core.Record
		if ri.ProductID != nil {
			origItem = origItemMap[*ri.ProductID]
		}
		if origItem == nil {
			return e.BadRequestError(fmt.Sprintf("Product %v not found in original invoice", ri.ProductID), nil)
		}

		priceGross, _ := decimal.NewFromString(origItem.GetString("price_gross_unit"))
		taxRate, _ := decimal.NewFromString(origItem.GetString("tax_rate_snapshot"))

		lineInputs = append(lineInputs, invoice.LineInput{
			ProductID:   origItem.GetString("product"),
			ProductName: origItem.GetString("product_name"),
			PriceGross:  priceGross,
			TaxRate:     taxRate,
			Quantity:    ri.Quantity,
			CostCenter:  origItem.GetString("cost_center"),
		})
	}

	// Calculate (positive first, then negate)
	calc := invoice.CalculateInvoice(lineInputs, nil)

	// Negate all amounts
	negGross := negate(calc.Gross)
	negNet := negate(calc.Net)
	negTax := negate(calc.Tax)

	// Determine payment method
	paymentMethod := req.PaymentMethod
	if paymentMethod == "" {
		// Use original invoice's first payment method
		origPayments, _ := e.App.FindRecordsByFilter(
			"invoice_payments", "invoice = {:id}", "", 1, 0,
			map[string]any{"id": req.OriginalInvoiceID},
		)
		if len(origPayments) > 0 {
			paymentMethod = origPayments[0].GetString("method")
		}
		if paymentMethod == "" {
			paymentMethod = "cash"
		}
	}

	// Transaction
	var rectInvoice *core.Record

	err = e.App.RunInTransaction(func(txApp core.App) error {
		// Find open closure
		closure, err := txApp.FindFirstRecordByFilter("closures", "status = 'open'")
		if err != nil {
			return fmt.Errorf("NO_OPEN_CLOSURE")
		}

		// Lock and increment rectificativa counter
		countersRecord, err := txApp.FindFirstRecordByFilter("counters", "id != ''")
		if err != nil {
			return fmt.Errorf("counters record not found: %w", err)
		}

		counter := countersRecord.GetInt("rectificativa_number") + 1
		countersRecord.Set("rectificativa_number", counter)
		if err := txApp.Save(countersRecord); err != nil {
			return err
		}

		invoiceNumber := generateInvoiceNumber(
			countersRecord.GetString("invoice_prefix"),
			"rectificativa",
			counter,
		)

		// Create rectificativa
		invoiceCollection, err := txApp.FindCollectionByNameOrId("invoices")
		if err != nil {
			return err
		}

		rect := core.NewRecord(invoiceCollection)
		rect.Set("invoice_number", invoiceNumber)
		rect.Set("invoice_type", "rectificativa")
		rect.Set("status", "paid")
		rect.Set("total_gross", negGross)
		rect.Set("total_net", negNet)
		rect.Set("total_tax", negTax)
		rect.Set("original_invoice", req.OriginalInvoiceID)
		rect.Set("closure", closure.Id)

		reason := req.Reason
		if req.ReasonDetail != "" {
			reason = reason + ": " + req.ReasonDetail
		}
		rect.Set("rectification_reason", reason)

		// Copy issuer/customer snapshots from original
		for _, field := range []string{
			"issuer_name", "issuer_nif", "issuer_street", "issuer_zip", "issuer_city",
			"customer", "customer_name", "customer_nif", "customer_street",
			"customer_zip", "customer_city", "customer_email", "customer_phone",
		} {
			rect.Set(field, original.GetString(field))
		}

		if err := txApp.Save(rect); err != nil {
			return err
		}

		// Create negative items
		itemsCollection, err := txApp.FindCollectionByNameOrId("invoice_items")
		if err != nil {
			return err
		}

		for i, calcItem := range calc.Items {
			itemRecord := core.NewRecord(itemsCollection)
			itemRecord.Set("invoice", rect.Id)
			itemRecord.Set("product", calcItem.ProductID)
			itemRecord.Set("product_name", calcItem.ProductName)
			itemRecord.Set("quantity", -calcItem.Quantity) // negative
			itemRecord.Set("price_gross_unit", calcItem.PriceGrossUnit)
			itemRecord.Set("tax_rate_snapshot", calcItem.TaxRateSnapshot)
			itemRecord.Set("row_total_gross", negate(calcItem.RowTotalGross))

			if calcItem.CostCenter != nil {
				itemRecord.Set("cost_center", *calcItem.CostCenter)
			}

			// Unit from original item
			if i < len(originalItems) {
				itemRecord.Set("unit", originalItems[i].GetString("unit"))
			}

			if err := txApp.Save(itemRecord); err != nil {
				return err
			}
		}

		// Create negative payment
		paymentsCollection, err := txApp.FindCollectionByNameOrId("invoice_payments")
		if err != nil {
			return err
		}

		payRecord := core.NewRecord(paymentsCollection)
		payRecord.Set("invoice", rect.Id)
		payRecord.Set("method", paymentMethod)
		payRecord.Set("amount", negGross)
		if err := txApp.Save(payRecord); err != nil {
			return err
		}

		// Restore stock (-1 = unlimited, skip)
		for _, ri := range req.Items {
			if ri.ProductID == nil {
				continue
			}
			product, err := txApp.FindRecordById("products", *ri.ProductID)
			if err != nil {
				continue
			}
			currentStock := product.GetInt("stock")
			if currentStock < 0 {
				continue
			}
			product.Set("stock", currentStock+ri.Quantity)
			if err := txApp.Save(product); err != nil {
				return err
			}
		}

		// Check if original is fully rectified
		allOrigItems, _ := txApp.FindRecordsByFilter(
			"invoice_items", "invoice = {:id}", "", 0, 0,
			map[string]any{"id": req.OriginalInvoiceID},
		)
		allRectItems, _ := txApp.FindRecordsByFilter(
			"invoice_items", "invoice IN (SELECT id FROM invoices WHERE original_invoice = {:id} AND invoice_type = 'rectificativa')", "", 0, 0,
			map[string]any{"id": req.OriginalInvoiceID},
		)

		rectifiedQty := make(map[string]int)
		for _, ri := range allRectItems {
			pid := ri.GetString("product")
			rectifiedQty[pid] += abs(ri.GetInt("quantity"))
		}

		fullyRectified := true
		for _, oi := range allOrigItems {
			pid := oi.GetString("product")
			if rectifiedQty[pid] < oi.GetInt("quantity") {
				fullyRectified = false
				break
			}
		}

		if fullyRectified {
			origRecord, err := txApp.FindRecordById("invoices", req.OriginalInvoiceID)
			if err == nil {
				origRecord.Set("status", "rectificada")
				txApp.Save(origRecord)
			}
		}

		rectInvoice = rect
		return nil
	})

	if err != nil {
		errMsg := err.Error()
		if errMsg == "NO_OPEN_CLOSURE" {
			return e.JSON(http.StatusBadRequest, map[string]any{"error": "NO_OPEN_CLOSURE"})
		}
		return e.InternalServerError("Failed to create rectificativa", err)
	}

	// Reload for response
	items, _ := e.App.FindRecordsByFilter("invoice_items", "invoice = {:id}", "", 0, 0, map[string]any{"id": rectInvoice.Id})
	payments, _ := e.App.FindRecordsByFilter("invoice_payments", "invoice = {:id}", "", 0, 0, map[string]any{"id": rectInvoice.Id})

	// Reload original with items and payments
	updatedOriginal, _ := e.App.FindRecordById("invoices", req.OriginalInvoiceID)
	origItems, _ := e.App.FindRecordsByFilter("invoice_items", "invoice = {:id}", "", 0, 0, map[string]any{"id": req.OriginalInvoiceID})
	origPayments, _ := e.App.FindRecordsByFilter("invoice_payments", "invoice = {:id}", "", 0, 0, map[string]any{"id": req.OriginalInvoiceID})

	return e.JSON(http.StatusOK, map[string]any{
		"rectificativa": map[string]any{
			"id":                  rectInvoice.Id,
			"invoice_number":      rectInvoice.GetString("invoice_number"),
			"invoice_type":        "rectificativa",
			"status":              "paid",
			"total_gross":         negGross,
			"total_net":           negNet,
			"total_tax":           negTax,
			"original_invoice_id": req.OriginalInvoiceID,
			"rectification_reason": rectInvoice.GetString("rectification_reason"),
			"closure":             rectInvoice.GetString("closure"),
			"created":             rectInvoice.GetString("created"),
			"items":               items,
			"payments":            payments,
		},
		"original": map[string]any{
			"id":                  updatedOriginal.Id,
			"invoice_number":      updatedOriginal.GetString("invoice_number"),
			"invoice_type":        updatedOriginal.GetString("invoice_type"),
			"status":              updatedOriginal.GetString("status"),
			"total_gross":         updatedOriginal.GetString("total_gross"),
			"total_net":           updatedOriginal.GetString("total_net"),
			"total_tax":           updatedOriginal.GetString("total_tax"),
			"discount_type":       updatedOriginal.GetString("discount_type"),
			"discount_value":      updatedOriginal.GetString("discount_value"),
			"closure":             updatedOriginal.GetString("closure"),
			"customer":            updatedOriginal.GetString("customer"),
			"customer_name":       updatedOriginal.GetString("customer_name"),
			"customer_nif":        updatedOriginal.GetString("customer_nif"),
			"customer_street":     updatedOriginal.GetString("customer_street"),
			"customer_zip":        updatedOriginal.GetString("customer_zip"),
			"customer_city":       updatedOriginal.GetString("customer_city"),
			"tax_breakdown":       updatedOriginal.Get("tax_breakdown"),
			"rectification_reason": updatedOriginal.GetString("rectification_reason"),
			"original_invoice_id": updatedOriginal.GetString("original_invoice"),
			"created":             updatedOriginal.GetString("created"),
			"items":               origItems,
			"payments":            origPayments,
		},
	})
}

// --- Swap payment method ---

type swapPaymentRequest struct {
	PaymentID string `json:"payment_id"`
	Method    string `json:"method"`
}

func handleSwapPaymentMethod(e *core.RequestEvent) error {
	var req swapPaymentRequest
	if err := e.BindBody(&req); err != nil {
		return e.BadRequestError("Invalid request body", err)
	}

	if req.PaymentID == "" {
		return e.BadRequestError("payment_id required", nil)
	}
	if req.Method != "cash" && req.Method != "card" {
		return e.BadRequestError("method must be 'cash' or 'card'", nil)
	}

	payment, err := e.App.FindRecordById("invoice_payments", req.PaymentID)
	if err != nil {
		return e.NotFoundError("Payment not found", err)
	}

	// Only swap the method — amount stays the same, reset tendered/change
	payment.Set("method", req.Method)
	payment.Set("tendered", payment.GetString("amount"))
	payment.Set("change", "0.00")

	if err := e.App.Save(payment); err != nil {
		return e.InternalServerError("Failed to update payment", err)
	}

	return e.JSON(http.StatusOK, map[string]any{
		"id":       payment.Id,
		"method":   req.Method,
		"amount":   payment.GetString("amount"),
		"tendered": payment.GetString("amount"),
		"change":   "0.00",
	})
}

// --- Helpers ---

func generateInvoiceNumber(prefix string, invoiceType string, counter int) string {
	now := time.Now()

	number := prefix
	number = strings.ReplaceAll(number, "%year%", fmt.Sprintf("%d", now.Year()))
	number = strings.ReplaceAll(number, "%month%", fmt.Sprintf("%02d", now.Month()))
	number = strings.ReplaceAll(number, "%day%", fmt.Sprintf("%02d", now.Day()))
	number = strings.ReplaceAll(number, "%date%", fmt.Sprintf("%d%02d%02d", now.Year(), now.Month(), now.Day()))
	number = strings.ReplaceAll(number, "%count%", fmt.Sprintf("%05d", counter))

	// If prefix didn't contain %count%, append the counter
	if !strings.Contains(prefix, "%count%") {
		if number != "" {
			number += "-"
		}
		number += fmt.Sprintf("%05d", counter)
	}

	typePrefix := "T-"
	if invoiceType == "factura" {
		typePrefix = "F-"
	} else if invoiceType == "rectificativa" {
		typePrefix = "R-"
	}

	return typePrefix + number
}

func negate(s string) string {
	d, err := decimal.NewFromString(s)
	if err != nil {
		return s
	}
	return d.Neg().StringFixed(2)
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func toStringSlice(ids []any) []string {
	result := make([]string, len(ids))
	for i, id := range ids {
		result[i] = fmt.Sprintf("%v", id)
	}
	return result
}
