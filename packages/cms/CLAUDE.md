# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This package is part of the `pulpo.cloud` pnpm monorepo.

| Command | Description |
|---|---|
| `pnpm --filter @pulpo/cms lint` | ESLint |
| `pnpm --filter @pulpo/cms check-types` | TypeScript type checking |

No dev server, build step, or tests configured. This is a source-only package consumed via workspace dependency.

## Architecture

### Overview

A TypeScript wrapper around the Directus SDK providing **type-safe access** to all CMS collections and **domain-specific API helpers** for a multi-tenant restaurant/e-commerce platform. Used by `@pulpo/shop`, `@pulpo/agenda`, and website apps.

### Key Directories

- `src/index.ts` — Re-exports everything
- `src/client.ts` — Client factory functions
- `src/config.ts` — Default URL from env (`PUBLIC_DIRECTUS_URL`, fallback `https://admin.pulpo.cloud`)
- `src/utils.ts` — Asset URL helpers
- `src/i18n.ts` — Translation reduction (`reduceTranslations`)
- `src/types/` — TypeScript interfaces for all collections
- `src/api/` — Domain-specific query functions

### Client Layer (`client.ts`)

- `createClient(url?, token?)` — Singleton with static token auth, REST + WebSocket
- `createClientPublic(url?)` — Public client, REST only

### Type Layer (`types/`)

**Schema** (`schema.ts`): Main Directus schema interface mapping collection names to types.

**Collections**:
- `invoice.ts` — `Invoice`, `InvoiceItem`, `InvoicePayment` with VeriFactu fields
- `products.ts` — `Product`, `ProductCategory` with translations and tax class
- `customer.ts` — `Customer` with NIF, address, tenant
- `tax.ts` — `TaxClass`, `TaxZone` (regex-based postcode matching), `TaxRule`
- `cash-register.ts` — `CashRegisterClosure` with denomination counting, product breakdown
- `report.ts` — `AggregatedReport`, `ClosureProductBreakdown`, `InvoiceTypeCounts`
- `agenda.ts` — `Reservation`, `ReservationCreate`, `ReservationTurn`
- `blog.ts` — `BlogPost`, `BlogPostCategory` with multilingual fields
- `event.ts` — `Event` with translations
- `language.ts` — `Language`
- `user.ts` — `User`

**Decimal Strategy**: All monetary values and tax rates are `string` types, never `number`. Arithmetic happens with `big.js` in consuming apps.

**Translation Pattern**: Multilingual fields use `ReducedTranslations` (`Record<string, string>`, e.g. `{ es: "Hola", en: "Hello" }`). The `reduceTranslations()` helper converts Directus translation arrays to this format.

### API Layer (`api/`)

All functions take a Directus client as first argument. Most filter by `tenant`.

**Products** (`products.ts`):
- `getCategoriesWithProducts(client, { tenant })` — Categories with nested products, translations reduced, sorted by `sort`
- `updateProductStock(client, productId, stock)` — Update stock field

**Invoices** (`invoices.ts`):
- `createInvoice(client, data)` — POST to custom `/pulpo-extension/invoices` endpoint (sends product IDs + quantities, server calculates totals)
- `getInvoices(client, query?)` — Filter by tenant, status, date range, closure ID
- `getInvoice(client, id)` — Single invoice with items and payments
- `rectifyInvoice(client, data)` — POST to `/pulpo-extension/invoices/rectify`
- `updateInvoicePaymentMethod(client, paymentId, method, amount)` — Swap cash/card

**Tax** (`tax.ts`):
- `getTaxRulesForPostcode(client, postcode)` — Loads zones sorted by priority, matches postcode against each zone's regex, returns `{ classCode, rate, surcharge }[]`

**Cash Register** (`cash-register.ts`):
- `openClosure(client, data)` — POST to `/pulpo-extension/cash-register/open`
- `closeClosure(client, data)` — POST to `/pulpo-extension/cash-register/close`
- `getOpenClosure(client)` — Find open closure for current tenant
- `getClosuresForDate(client, date)` — Closures for a specific date
- `getLastClosure(client)` — Most recent closure

**Reports** (`reports.ts`):
- `getReport(client, period, params)` — GET from `/pulpo-extension/reports/{period}`. Returns `AggregatedReport`
- `backfillClosures(client)` — POST to backfill product breakdowns

**Customers** (`customers.ts`):
- CRUD operations: `getCustomers`, `searchCustomers`, `createCustomer`, `updateCustomer`, `deleteCustomer`

**Tenant** (`tenant.ts`):
- `getTenant(client, tenantId)` — Full tenant with contacts and opening hours
- `getOpeningHours(client, tenantId)`

**Agenda** (`agenda.ts`):
- `createReservation`, `updatedReservation`, `toggleArrived`, `deleteReservation`, `readReservation`, `listReservations`, `listReservationTurns`

**Blog** (`blog.ts`):
- `getBlogCategories(client, { tenant, categoryId? })` — Categories with reduced translations
- `getBlogPosts(client, { tenant, categoryId? })` — Posts with reduced translations

**Events** (`event.ts`):
- `getEvents(client, { tenant, date? })` — Events with reduced translations

**Auth** (`auth.ts`):
- `getProfile(client)` — Current user profile
- `listUsers(client)` — All users

### Custom Extension Endpoints

Several API functions call custom Directus extension endpoints (implemented in `packages/directus-extension/`):

- `/pulpo-extension/invoices` — Invoice creation with auto-numbering and stock management
- `/pulpo-extension/invoices/rectify` — Corrective invoice creation
- `/pulpo-extension/cash-register/open` — Open register
- `/pulpo-extension/cash-register/close` — Close register with aggregation
- `/pulpo-extension/reports/{period}` — Aggregated reports

### Adding New API Functions

1. Add types to `src/types/` (or extend existing files)
2. Update `src/types/schema.ts` if adding a new collection
3. Create or extend an API file in `src/api/`
4. Re-export from `src/api.ts` and `src/types.ts`
5. All functions should take `client` as first argument
