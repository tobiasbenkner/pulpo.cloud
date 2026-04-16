# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This app is the Go backend for the pulpo.cloud POS system, built on PocketBase.

| Command | Description |
|---------|-------------|
| `pnpm --filter @pulpo/app dev` | Start dev server (Go run + PocketBase) |
| `pnpm --filter @pulpo/app build` | Build Go binary |
| `pnpm --filter @pulpo/app test` | Run all Go tests |
| `go test ./invoice/ -v` | Run invoice calculation tests only |
| `go test ./routes/ -v` | Run route/aggregation tests only |
| `go test ./... -run TestCrossValidation -v` | Run cross-validation tests only |

## Architecture

### Overview

A PocketBase-based Go backend serving the POS shop, agenda, and settings as static frontends. Custom API endpoints handle invoice creation, cash register, and reports. The binary embeds all static files via `go:embed`.

### Directory Structure

```
main.go              # Entry point, registers routes + hooks, serves static files
invoice/             # Pure invoice calculation (port of @pulpo/invoice)
├── types.go         # Input/Output types (LineInput, CalculationResult, etc.)
├── calculate.go     # CalculateInvoice() — pure function with shopspring/decimal
├── calculate_test.go        # 27 unit tests
└── cross_validation_test.go # 7 cross-validation tests (same cases as TS)
excel/               # Reusable Excel generation
├── types.go         # Shared types (ClosureReportData, ProductRow, etc.)
├── products.go      # WriteProductosSheet() — grouped by cost center
└── closure.go       # GenerateClosureExcel(), GenerateReportExcel()
routes/              # API endpoints, hooks, helpers
├── invoices.go      # POST /api/custom/invoices, POST /api/custom/invoices/rectify
├── cash_register.go # POST /api/custom/cash-register/open, /close
├── reports.go       # GET /api/custom/reports/{period}, /excel
├── og.go            # MenuHandler — static file serving, OG meta + title injection
├── tax.go           # ResolveTaxRates(), TaxZoneName()
├── aggregator.go    # ComputeClosureSummary(), tax/product breakdown from items
├── email.go         # Closure email with Excel attachment via PocketBase SMTP
├── hooks.go         # OnRecordAfterUpdateSuccess("closures") → async email
├── *_test.go        # 57 tests
migrations/          # Auto-generated PocketBase schema migrations
pb_data/             # PocketBase SQLite data (gitignored)
pb_public/           # Embedded static frontends (shop, agenda, menu, launcher)
```

### Custom API Endpoints

All endpoints are auth-protected (`/api/custom/*`):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/custom/invoices` | POST | Create invoice with calculation, tax resolution, stock decrement |
| `/api/custom/invoices/rectify` | POST | Create rectificativa (negative invoice), restore stock |
| `/api/custom/cash-register/open` | POST | Open register, checks for existing open closure |
| `/api/custom/cash-register/close` | POST | Close register, compute all totals on-the-fly |
| `/api/custom/reports/{period}` | GET | JSON report (daily/weekly/monthly/quarterly/yearly) |
| `/api/custom/reports/{period}/excel` | GET | Excel download |

### Menu Static File Serving (`routes/og.go`)

`MenuHandler` serves the menu frontend (`apps/menu/`) as static files from the embedded FS:
- Injects OG meta tags (title, description, image) from `company` + `website_config` collections into `<!-- OG_META -->` placeholder
- Replaces `<title>` tag server-side with `PageName | CompanyName` (path-based: `/contact` → "Contacto", `/imprint` → "Aviso Legal", `/privacy` → "Privacidad")
- `resolveFile()` handles trailing slashes (trims `/` before lookup) and falls back to `index.html` for SPA-style routing

### Hooks

- `OnRecordAfterUpdateSuccess("closures")`: When a closure status changes to "closed", sends closure email with Excel attachment asynchronously via goroutine.

### Invoice Calculation

Port of `packages/invoice/src/calculate.ts`. Uses `shopspring/decimal` instead of `big.js`. Cross-validated with 7 shared test cases — both implementations produce identical results to the cent.

Flow: item discounts → subtotal → global discount → discount ratio → group by tax rate → round per group → cent correction → tax back-calculation (net = gross / (1+rate), tax = gross - net).

### Decimal Strategy

All monetary values are `string` in the DB (PocketBase text fields). Arithmetic uses `shopspring/decimal` in Go. Output precision:
- Monetary totals: `.StringFixed(2)`
- Unit prices / discount values: `.StringFixed(4)`
- Tax rate snapshots: `.StringFixed(2)` (percentage, e.g. "7.00")

### Tax Resolution

`ResolveTaxRates(app, postcode)` matches the company postcode against `tax_zones.regex` (sorted by priority), loads `tax_rules` for the matched zone, returns `map[taxClassCode]rate`.

Tax zones: IGIC (Canary Islands 35xxx/38xxx), IPSI (Ceuta 51xxx, Melilla 52xxx), IVA (mainland).

### Aggregation

Closure summaries (totals, tax breakdown, product breakdown) are NOT stored on closures. They are computed on-the-fly from invoices + items + payments via `ComputeClosureSummary()`. This avoids duplicate data and JSON fields.

### Excel Generation (reusable)

The `excel/` package generates Excel files for:
- Closure reports: Resumen + Productos sheets
- Period reports: Resumen + Productos + Turnos sheets

Used by both the email hook (attachment) and the `/excel` download endpoint.

### Dependencies

- `github.com/pocketbase/pocketbase` v0.36.7
- `github.com/shopspring/decimal` — precise decimal arithmetic
- `github.com/xuri/excelize/v2` — Excel generation

### PocketBase Collections (Shop)

Created via Admin UI, schema tracked in `migrations/`:
- `company` — business data + invoice counters
- `tax_classes`, `tax_zones`, `tax_rules` — Spanish multi-region tax system
- `cost_centers`, `customers`, `products_categories`, `products`
- `closures`, `closure_denominations` — cash register
- `invoices`, `invoice_items`, `invoice_payments` — 1 invoice per table, N payments

### Tests

125 tests total across Go and TypeScript:
- `invoice/`: 34 tests (27 unit + 7 cross-validation)
- `routes/`: 57 tests (helpers, aggregation, date ranges, tax zones)
- `packages/invoice/` (TS): 34 tests (27 unit + 7 cross-validation)
