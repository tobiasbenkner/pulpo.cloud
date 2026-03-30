# pulpo-app

Go backend for the pulpo.cloud POS system, built on [PocketBase](https://pocketbase.io).

## Quick Start

```bash
# Development
pnpm --filter @pulpo/app dev

# Build
pnpm --filter @pulpo/app build

# Tests
pnpm --filter @pulpo/app test
```

The dev server starts at `http://localhost:8090`. PocketBase Admin UI is available at `http://localhost:8090/_/`.

## Docker (Self-Deploy)

```bash
docker run -d \
  -v ./data:/pb_data \
  -p 8090:8090 \
  pulpocloud/app:latest
```

Open `http://localhost:8090` — PocketBase Admin UI at `http://localhost:8090/_/`.

## API Endpoints

All custom endpoints require authentication (`/api/custom/*`).

### Invoices

```
POST /api/custom/invoices          # Create invoice
POST /api/custom/invoices/rectify  # Create rectificativa
```

### Cash Register

```
POST /api/custom/cash-register/open   # Open register
POST /api/custom/cash-register/close  # Close register
```

### Reports

```
GET /api/custom/reports/{period}        # JSON report
GET /api/custom/reports/{period}/excel  # Excel download
```

Periods: `daily`, `weekly`, `monthly`, `quarterly`, `yearly`.

Query parameters:
- daily/weekly: `?date=2026-03-15`
- monthly: `?year=2026&month=3`
- quarterly: `?year=2026&quarter=1`
- yearly: `?year=2026`

## Project Structure

```
main.go          # Entry point
invoice/         # Invoice calculation (shopspring/decimal)
excel/           # Reusable Excel generation (excelize)
routes/          # API endpoints, hooks, helpers
migrations/      # PocketBase schema migrations
pb_data/         # SQLite data (gitignored)
pb_public/       # Embedded static frontends
```

## Tests

```bash
go test ./...                              # All tests
go test ./invoice/ -v                      # Invoice calculation
go test ./routes/ -v                       # Routes + aggregation
go test ./... -run TestCrossValidation -v  # Cross-validation (Go vs TS)
```
