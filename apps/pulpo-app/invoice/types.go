package invoice

import "github.com/shopspring/decimal"

// LineInput represents a single line item for invoice calculation.
type LineInput struct {
	ProductID   string
	ProductName string
	PriceGross  decimal.Decimal
	TaxRate     decimal.Decimal // percentage, e.g. 7 for 7%
	Quantity    int
	Discount    *DiscountInput
	CostCenter  string
}

// DiscountInput represents a discount (per-item or global).
type DiscountInput struct {
	Type  string // "percent" or "fixed"
	Value decimal.Decimal
}

// LineResult is the computed output for a single line item.
type LineResult struct {
	ProductID      string  `json:"productId"`
	ProductName    string  `json:"productName"`
	Quantity       int     `json:"quantity"`
	PriceGrossUnit string  `json:"priceGrossUnit"`
	TaxRateSnapshot string `json:"taxRateSnapshot"`
	RowTotalGross  string  `json:"rowTotalGross"`
	DiscountType   *string `json:"discountType"`
	DiscountValue  *string `json:"discountValue"`
	CostCenter     *string `json:"costCenter"`
}

// TaxBreakdownEntry is one row in the tax breakdown grouped by rate.
type TaxBreakdownEntry struct {
	Rate string `json:"rate"`
	Net  string `json:"net"`
	Tax  string `json:"tax"`
}

// CalculationResult is the full result of CalculateInvoice.
type CalculationResult struct {
	Subtotal      string              `json:"subtotal"`
	DiscountTotal string              `json:"discountTotal"`
	Gross         string              `json:"gross"`
	Net           string              `json:"net"`
	Tax           string              `json:"tax"`
	TaxBreakdown  []TaxBreakdownEntry `json:"taxBreakdown"`
	Items         []LineResult        `json:"items"`
	Count         int                 `json:"count"`
	DiscountType  *string             `json:"discountType"`
	DiscountValue *string             `json:"discountValue"`
}
