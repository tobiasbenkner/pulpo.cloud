# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This is a **pnpm monorepo** managed with **Turborepo**.

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start dev servers for all packages |
| `pnpm build` | Build all packages |
| `pnpm build:website` | Build only @pulpo/website |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Run all tests (Vitest via Turbo) |
| `pnpm check-types` | TypeScript type checking |
| `pnpm deploy` | Deploy all deployable packages |

To run commands for a specific workspace:
```bash
pnpm --filter @pulpo/website dev
pnpm --filter @pulpo/shop build
pnpm --filter @pulpo/menu dev   # Customer-facing menu website
pnpm --filter @pulpo/app dev    # Go backend (reads .env automatically via godotenv)
```

## Architecture

### Monorepo Structure

```
apps/           # Applications
├── agenda/     # Reservation & floorplan app (Astro + Svelte 5 + PocketBase)
├── menu/       # Customer-facing menu & contact website (Astro + PocketBase)
├── pulpo-app/  # Go backend (PocketBase), serves agenda/shop as static files
├── shop/       # POS app (Astro + Svelte 5 + PocketBase SDK + nanostores)
└── website/    # Standard website template

packages/       # Shared libraries
├── cms/                # Directus SDK wrapper — DEPRECATED, no longer used by shop/agenda
├── directus-extension/ # Directus endpoint extension — DEPRECATED, replaced by Go hooks
└── invoice/            # Shared invoice calculation logic (@pulpo/invoice)

websites/       # Client website instances
├── docs/             # Documentation site
└── landingpage/      # Landing page

tools/          # Development and migration tools
├── migrate/    # Data migration scripts
└── proxy/      # Traefik reverse proxy config
```

### Apps vs Websites

- **apps/** contain reusable Astro application templates
- **websites/** are client-specific deployments that may extend or customize apps
- Both use the same patterns: Astro + Tailwind CSS v4

### Shared Invoice Package (@pulpo/invoice)

Located at `packages/invoice/`, provides:
- `calculateInvoice(lines, discount?)` - Pure function for invoice calculation (totals, tax, discounts)
- Uses `big.js` for precise decimal arithmetic
- Source-only package (no build step), consumed by `@pulpo/shop` for cart preview
- Cross-validated against the Go implementation (7 shared test cases, identical results)

All shared packages are used via workspace dependency:
```json
"@pulpo/invoice": "workspace:*"
```

### Multi-Language Routing Pattern

Website apps use a convention-based routing system:

1. **Views** are defined in `src/views/{name}/` with:
   - `{name}.route.ts` - Route key and slugs per language
   - `{name}.i18n.ts` - Translations
   - `{name}.page.astro` - Page component

2. **Auto-discovery** via Vite's `import.meta.glob()` in `src/lib/registry.ts`

3. **Dynamic routing** in `src/pages/[...slug]/index.astro` generates all language variants

### Environment Variables

For PocketBase backend (`apps/pulpo-app/.env`):
- `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` — PocketBase superuser
- `PB_USER_EMAIL` / `PB_USER_PASSWORD` / `PB_USER_NAME` — App user
- `PB_COMPANY_*` — Company data (NAME, NIF, STREET, ZIP, CITY, TIMEZONE, INVOICE_PREFIX)
- `PB_SEED_DEMO` — Enable demo data seeding (products, customers, 90 days of invoices)

For deployment:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Deployment

- **Shop + Agenda**: Served as static files embedded in the Go binary via `go:embed`
- **Websites**: Deploy to **Cloudflare Pages** via Wrangler CLI
- **Per-customer deployment**: Each customer gets their own PocketBase process + SQLite database

## Migration Status: Directus → PocketBase

See `ARCHITECTURE.md` and `MIGRATION_PLAN.md` for the full plan.

### Completed: Agenda (Phase 2)

`apps/agenda/` has been fully migrated from Directus to PocketBase:
- Auth: PocketBase SDK (`src/lib/pb.ts`), token refresh every 4h
- Reservations: CRUD, 3s polling, turn-based filtering
- Floorplan: SVG canvas, zones, tables (drag, rotation, width), groups with DB colors
- Table assignment: auto-algorithm + manual override via floorplan
- Shared logic: `src/lib/tableAssignment.ts` (computeTableAssignments, displaceAndReassign, buildAssignmentLabels, suggestTables)
- Tests: 26 unit tests in `tableAssignment.test.ts`
- PocketBase URL: `http://localhost:8090` (dev), `/` (prod)

### Completed: Shop Backend (Phase 3+4)

`apps/pulpo-app/` — Go backend with PocketBase, all shop endpoints implemented:

**Go Packages:**
- `invoice/` — `CalculateInvoice()` with `shopspring/decimal` (port of `@pulpo/invoice`)
- `excel/` — Reusable Excel generation (`GenerateClosureExcel`, `GenerateReportExcel`, `WriteProductosSheet`)
- `routes/` — Custom API endpoints + hooks

**API Endpoints (all auth-protected):**
- `POST /api/custom/invoices` — Create invoice (load products, resolve tax, calculate, store in transaction)
- `POST /api/custom/invoices/rectify` — Create rectificativa (negative invoice, restore stock)
- `POST /api/custom/invoices/swap-payment` — Swap payment method (cash↔card, amount unchanged)
- `POST /api/custom/cash-register/open` — Open register (checks for existing open closure)
- `POST /api/custom/cash-register/close` — Close register (computes all totals on-the-fly)
- `GET /api/custom/reports/{period}` — JSON reports (daily/weekly/monthly/quarterly/yearly)
- `GET /api/custom/reports/{period}/excel` — Excel download

**Hook:** `OnRecordAfterUpdateSuccess("closures")` — sends closure email with Excel attachment (async)

**Seed Migrations:**
- `seed_tax_data.go` — 5 tax classes, 4 zones (Spanish regions), 19 rules (idempotent)
- `seed_company.go` — Company record from `PB_COMPANY_*` env vars
- `seed_demo_data.go` — Demo data (`PB_SEED_DEMO=true`): 21 products, 5 customers, 90 days of historical invoices

**Tests: 125 total**
- 34 Go invoice tests (27 unit + 7 cross-validation)
- 34 TS invoice tests (27 unit + 7 cross-validation)
- 57 Go route tests (helpers, aggregation, reports, tax)

**Design decisions:**
- All monetary values as text (string-decimals), arithmetic via `shopspring/decimal`
- No JSON fields — everything normalized or computed on-the-fly
- 1 invoice per table, N payments per invoice (Spanish POS standard)
- Closures store no aggregated data — totals computed from invoices
- Invoice prefix supports placeholders: `%count%`, `%year%`, `%month%`, `%day%`, `%date%`
- PocketBase datetime format: `"2006-01-02 15:04:05.000Z"` (not RFC3339)
- Timezone from `company.timezone` field, never browser timezone

### Completed: Shop Frontend (Phase 5)

`apps/shop/` has been fully migrated from Directus to PocketBase:
- Auth: PocketBase SDK (`src/lib/pb.ts`), local auth components in `src/components/auth/`
- API: All functions in `src/lib/api.ts` using `pb.collection()` and `pb.send()` for custom endpoints
- Types: Local type definitions in `src/lib/types.ts` extending PocketBase `RecordModel`
- Stores: All 5 stores migrated (taxStore, printerStore, productStore, registerStore, cartStore)
- `normalizeInvoice()`: Maps PB back-relations to `items`/`payments` arrays, adds Directus field aliases
- Timezone-aware date queries via `localDayToUTCRange()` using `company.timezone`
- Dependencies: `pocketbase` SDK replaces `@directus/sdk`, `@pulpo/auth`, `@pulpo/cms`
- `@pulpo/invoice` kept for cart live-preview (server recalculates at checkout)

### Completed: Settings & Product Management (Phase 6)

`apps/shop/` dashboard views for admin configuration:

**Dashboard Pages (`/dashboard/*`):**
- `/dashboard` — Overview (KPIs, charts)
- `/dashboard/invoices` — Invoice list
- `/dashboard/reports` — Reports with multi-period navigation
- `/dashboard/products` — Product management (3 tabs: Productos, Categorias, Centros de coste)
- `/dashboard/settings` — Settings (4 tabs: Empresa, Usuarios, Impresoras, Caja)

**Product Management:**
- Product CRUD with image upload, search, category filter, sortable columns
- Category CRUD with expandable product lists and up/down reordering
- Cost center CRUD
- Product form with sectioned layout (Basic info, Classification, Inventory, Details, Image)

**Settings:**
- Company data editing (name, NIF, address, timezone)
- User management (CRUD, admin-only, role-based: admin/user)
- Printer configuration (USB/IP, multiple printers, default printer)
- Cash register settings (closure email)

**Collection changes:**
- `counters` collection: `invoice_prefix`, `ticket`, `factura`, `rectificativa_number` (all API rules `null` — Go-backend only)
- `company` collection: counter fields removed, `updateRule` set to admin-only
- `users` collection: `role` field added (select: admin/user), CRUD rules for admin users
- `printers` collection: name, connection (USB/IP), ip, port, width, encoding, replace_accents, feed, vendor_id, product_id, is_default

**Go backend changes:**
- `routes/invoices.go`: reads/writes counters from `counters` collection instead of `company`
- `seed_company.go`: seeds `counters` record separately
- `seed_demo_data.go`: uses `counters` for prefix/counter

### Menu App (@pulpo/menu)

`apps/menu/` — Customer-facing restaurant website showing menu, contact info, and legal pages.

**Stack:** Astro 6 + Tailwind CSS v4 + astro-icon (Lucide)

**Pages:**
- `/` — Menu with categories, products (image/no-image layouts), allergens, lightbox
- `/contact` — Contact info, opening hours, social links, Google Maps (via PrivacyMap consent overlay)
- `/imprint` — Legal notice (LSSI-CE), company data from PocketBase
- `/privacy` — Privacy policy (GDPR/LOPDGDD), Google Maps consent toggle

**Components:**
- `Header.astro` — Sticky nav, logo, language switcher, active link highlight
- `Footer.astro` — `© {year} {name}`, imprint/privacy links, admin link
- `PrivacyMap.astro` — Google Maps iframe behind GDPR consent overlay, consent stored in `localStorage["maps-consent"]`

**Design System (defined in `src/styles/global.css`):**
- Colors: `cream`, `sand`, `bark`, `stone`, `accent` (dynamic via `--accent` CSS var)
- Fonts: DM Sans (body), DM Serif Display (headings)
- Utilities: `.reveal` (staggered entrance animation), `.dotted-leader`, `.grain`

**i18n:** `src/lib/i18n.ts` — ~45 translation keys, 7 languages (es, de, en, it, ca, fr, nl). Language selected via `?lang=` URL param or localStorage fallback. Product/category translations come from PocketBase `translations` JSON field. Legal page content templates in es/de/en.

**Dynamic page titles:** Each page sets `document.title` to `PageName | CompanyName` (translated). The Go backend also replaces `<title>` server-side for crawlers via `routes/og.go`.

**Data loading:** All pages fetch from PocketBase API client-side (`/api/collections/...`). Header/Footer initialized via global `__initHeader`/`__initFooter` functions. Active nav link highlighted based on `window.location.pathname`.

**PocketBase config:** Uses `website_config` collection for logo, favicon, accent color, and enabled languages.

### PocketBase Collections

**Agenda:** `reservations`, `reservations_turns`, `reservations_tables`, `reservations_zones`, `reservations_table_groups`

**Shop:** `company`, `counters`, `printers`, `tax_classes`, `tax_zones`, `tax_rules`, `cost_centers`, `customers`, `products_categories`, `products`, `closures`, `closure_denominations`, `invoices`, `invoice_items`, `invoice_payments`

**Menu:** `website_config` (logo, favicon, accent_color, languages, default_language, google_maps_url, opening_hours, social links)

### Pending Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 6 | Settings & Product Management | Completed |
| 7 | Docker + npm distribution | Dockerfile exists |
| 8 | Data migration Directus→PB | Not started |
| 9 | Platform/SaaS (optional) | Not started |
