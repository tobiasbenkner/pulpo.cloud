package excel

// ClosureReportData contains all data needed to generate a closure Excel report.
type ClosureReportData struct {
	PeriodStart      string             `json:"period_start"`
	PeriodEnd        string             `json:"period_end"`
	StartingCash     string             `json:"starting_cash"`
	TotalGross       string             `json:"total_gross"`
	TotalNet         string             `json:"total_net"`
	TotalTax         string             `json:"total_tax"`
	TotalCash        string             `json:"total_cash"`
	TotalCard        string             `json:"total_card"`
	TotalChange      string             `json:"total_change"`
	ExpectedCash     string             `json:"expected_cash"`
	CountedCash      string             `json:"counted_cash"`
	Difference       string             `json:"difference"`
	TransactionCount int                `json:"transaction_count"`
	InvoiceCounts    InvoiceTypeCounts  `json:"invoice_type_counts"`
	TaxBreakdown     []TaxBreakdownRow  `json:"tax_breakdown"`
	ProductBreakdown []ProductRow       `json:"product_breakdown"`
}

// AggregatedReportData contains all data needed for a period report Excel.
type AggregatedReportData struct {
	Label            string             `json:"label"`
	TenantName       string             `json:"tenant_name"`
	TotalGross       string             `json:"total_gross"`
	TotalNet         string             `json:"total_net"`
	TotalTax         string             `json:"total_tax"`
	TotalCash        string             `json:"total_cash"`
	TotalCard        string             `json:"total_card"`
	TransactionCount int                `json:"transaction_count"`
	InvoiceCounts    InvoiceTypeCounts  `json:"invoice_counts"`
	TaxBreakdown     []TaxBreakdownRow  `json:"tax_breakdown"`
	ProductBreakdown []ProductRow       `json:"product_breakdown"`
	Shifts           []ShiftRow         `json:"shifts"`
}

type InvoiceTypeCounts struct {
	Tickets        int `json:"tickets"`
	Facturas       int `json:"facturas"`
	Rectificativas int `json:"rectificativas"`
}

type TaxBreakdownRow struct {
	Rate string `json:"rate"`
	Net  string `json:"net"`
	Tax  string `json:"tax"`
}

type ProductRow struct {
	ProductName  string `json:"product_name"`
	CostCenter   string `json:"cost_center"`
	Unit         string `json:"unit"`
	Quantity     int    `json:"quantity"`
	CashQuantity int    `json:"cash_quantity"`
	CardQuantity int    `json:"card_quantity"`
	TotalGross   string `json:"total_gross"`
	CashGross    string `json:"cash_gross"`
	CardGross    string `json:"card_gross"`
}

type ShiftRow struct {
	ID               string            `json:"id"`
	PeriodStart      string            `json:"period_start"`
	PeriodEnd        string            `json:"period_end"`
	TransactionCount int               `json:"transaction_count"`
	InvoiceCounts    InvoiceTypeCounts `json:"invoice_counts"`
	TotalGross       string            `json:"total_gross"`
	TotalCash        string            `json:"total_cash"`
	TotalCard        string            `json:"total_card"`
	Difference       string            `json:"difference"`
	ProductBreakdown []ProductRow      `json:"product_breakdown"`
}
