# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This app is part of the `pulpo.cloud` pnpm monorepo.

| Command | Description |
|---|---|
| `pnpm --filter @pulpo/directus dev` | Start local stack (Docker Compose) |
| `pnpm --filter @pulpo/directus build` | Build Docker image (`pulpocloud/directus`) |
| `pnpm --filter @pulpo/directus deploy` | Push Docker image |

No test framework configured. Testing is manual via the Directus UI and API calls.

## Architecture

### Overview

A **Directus CMS instance** running as Docker container with PostgreSQL, Redis, and a custom endpoint extension (`invoice-processor`) that implements the POS backend logic for `@pulpo/shop`.

### Key Files

- `Dockerfile` — Multi-stage build: compiles invoice-processor extension, installs third-party extensions, runs on `directus/directus:11.15.3`
- `docker-compose.yml` — Local dev stack: Directus (8055), PostgreSQL, Redis, MailHog (8025)
- `start.sh` — Entrypoint: bootstraps Directus, optionally applies schema snapshot
- `export-policies.sh` — Exports roles/policies/permissions to migrations directory
- `snapshot.yaml` — Full Directus schema snapshot (~12k lines)
- `migrations/` — JSON exports of roles, policies, permissions, access rules
- `extensions/invoice-processor/` — Custom endpoint extension

### Invoice Processor Extension (`extensions/invoice-processor/`)

Custom Directus endpoint extension implementing the full POS backend. All routes are tenant-scoped (tenant derived from authenticated user).

**Source Structure:**
```
src/
├── index.ts              # Registers 5 route modules
├── types.ts              # Directus service types
├── helpers.ts            # Invoice numbering, tenant resolution
├── helpers/
│   └── report-aggregator.ts  # Report computation logic
└── routes/
    ├── cash-register-open.ts   # POST /cash-register/open
    ├── cash-register-close.ts  # POST /cash-register/close
    ├── invoice-create.ts       # POST /invoices
    ├── invoice-rectify.ts      # POST /invoices/rectify
    └── reports.ts              # GET /reports/{period}, POST /reports/backfill
```

**Invoice Creation** (`routes/invoice-create.ts`):
1. Determines invoice type: `ticket` (no customer) or `factura` (with customer/NIF)
2. Generates sequential `invoice_number` from tenant prefix + series-specific counter (`last_ticket_number` / `last_factura_number`)
3. Links to active cash register closure
4. Creates invoice with nested items and payments in one transaction
5. Decrements product stock: `GREATEST(stock - qty, 0)`
6. Snapshots customer data on the invoice

**Invoice Rectification** (`routes/invoice-rectify.ts`):
1. Creates negative rectificativa invoice referencing original
2. Validates partial/full rectification (prevents over-rectification)
3. Negates all amounts (negative quantities)
4. Increments product stock for returned items
5. Marks original as `"rectificada"` when fully rectified
6. Uses separate counter: `last_rectificativa_number`

**Cash Register** (`routes/cash-register-open.ts`, `cash-register-close.ts`):
- Open: Creates `register_closures` record, validates only one open per tenant
- Close: Calculates expected cash, stores difference, aggregates totals/tax/products

**Reports** (`routes/reports.ts`):
- Supports daily, weekly, monthly, quarterly, yearly periods
- Aggregates multiple closures into `AggregatedReport`
- Uses `report-aggregator.ts` for product breakdown computation
- Daily reports include shift-level detail

**Invoice Numbering** (`helpers.ts`):
- `generateInvoiceNumber(services, tenant, series)` — Thread-safe sequential numbering
- Template placeholders: `%date%`, `%year%`, `%month%`, `%day%`, `%count%`
- Three independent series: ticket, factura, rectificativa
- Prefix format configurable per tenant (e.g. `"F-%year%%month%-%count%"`)

### Schema

The `snapshot.yaml` contains the full Directus schema. Key collections:

**Finance:** `invoices`, `invoice_items`, `invoice_payments`, `cash_register_closures`, `customers`
**Products:** `products`, `products_translations`, `categories`, `cost_centers`
**Tax:** `tax_classes`, `tax_zones`, `tax_rules`
**Content:** `posts`, `events`, `reservations`, `reservations_turns`
**System:** `tenants`, `languages`, `opening_hours`, `actions`

### Multi-Tenant Architecture

- Each record belongs to a `tenant` (M2O relation)
- Tenant resolved from authenticated user via `getTenantFromUser()`
- Invoice counters stored per tenant (`last_ticket_number`, `last_factura_number`, `last_rectificativa_number`)
- Timezone per tenant for date-based invoice numbering

### Migrations

JSON exports in `migrations/`:
- `001-roles.json` — 8 roles (Administrator, Build Service, App User, etc.)
- `001-policies.json` — 15 policies with granular permissions
- `001-permissions.json` — Detailed field-level permissions
- `001-access.json` — Role-to-policy mappings
- `001-seed-policies.js` — JavaScript migration for seeding

### Docker Compose (Local Dev)

| Service | Port | Purpose |
|---|---|---|
| directus | 8055 | Directus CMS |
| database | 5432 | PostgreSQL + PostGIS |
| redis | 6379 | Cache |
| mail | 8025 | MailHog (email testing) |

### Deployment

Built as Docker image `pulpocloud/directus`. The Dockerfile compiles the invoice-processor extension, installs third-party extensions, and copies the start script.
