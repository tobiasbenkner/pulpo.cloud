# pulpo.cloud

Business management platform for hospitality and retail — built with Astro, Svelte, PocketBase, and Go.

## Tech Stack

- **Go + PocketBase** — Backend (API, auth, SQLite database)
- **Astro 6** — Static site generation
- **Svelte 5** — Reactive UI components
- **Tailwind CSS v4** — Styling
- **TypeScript 5.9** — Type safety
- **Turborepo + pnpm** — Monorepo management

## Project Structure

```
apps/
  pulpo-app/   # Go backend (PocketBase), serves all frontends as static files
  agenda/      # Reservation & floorplan management (Astro + Svelte 5)
  shop/        # Point-of-Sale system (Astro + Svelte 5 + nanostores)
  website/     # Standard website template

packages/
  invoice/     # Shared invoice calculation logic (@pulpo/invoice, big.js)

websites/      # Client website instances
  beckernet.es/
  holacanterasclub.com/
  pulpo.cloud/

tools/
  migrate/     # Data migration scripts
  proxy/       # Traefik reverse proxy config
```

## Apps

### POS Shop (`@pulpo/shop`)

Full point-of-sale system with product catalog, stock management, shopping cart, multi-region Spanish tax calculation (IGIC/IVA/IPSI), invoice generation (tickets, facturas & rectificativas), cash register workflows, thermal printer integration, and reporting with Excel export.

### Agenda (`@pulpo/agenda`)

Reservation management with floorplan editor, table assignment algorithm, time slot management, and arrival tracking. Real-time updates via polling.

### Backend (`@pulpo/app`)

Go backend with PocketBase providing:
- Custom API endpoints for invoices, cash register, and reports
- Invoice calculation with `shopspring/decimal` (cross-validated with TypeScript version)
- Excel report generation
- Email notifications on cash register closure
- Auto-migrations for schema + seed data

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 10.28+
- Go 1.23+

### Install

```bash
pnpm install
```

### Configuration

Create `apps/pulpo-app/.env`:

```env
# Demo mode (seeds products, customers, 90 days of sample data)
PB_SEED_DEMO=true

# PocketBase superuser (for /_/ admin panel)
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=changeme

# App user (for shop/agenda login)
PB_USER_EMAIL=user@example.com
PB_USER_PASSWORD=changeme
PB_USER_NAME=Demo User

# Company data
PB_COMPANY_NAME=My Restaurant
PB_COMPANY_NIF=B12345678
PB_COMPANY_STREET=Calle Mayor 1
PB_COMPANY_ZIP=35001
PB_COMPANY_CITY=Las Palmas de Gran Canaria
PB_COMPANY_TIMEZONE=Atlantic/Canary
PB_COMPANY_INVOICE_PREFIX=%count%
```

### Development

```bash
# Start Go backend (reads .env, runs migrations, seeds data)
pnpm --filter @pulpo/app dev

# Start frontend dev servers (in separate terminals)
pnpm --filter @pulpo/shop dev
pnpm --filter @pulpo/agenda dev
```

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test                        # All tests
go test ./... -C apps/pulpo-app  # Go tests only
```

## Architecture Highlights

- **Per-customer deployment** — Each customer gets their own PocketBase process + SQLite database
- **Single binary** — Go binary embeds all frontends via `go:embed`
- **Client-side rendering** — Astro generates static HTML, Svelte handles interactivity via `client:only`
- **Decimal precision** — Financial calculations use `big.js` (frontend) and `shopspring/decimal` (backend)
- **Spanish tax compliance** — Multi-region tax system (Canary Islands, Ceuta, Melilla, mainland)
- **Timezone-aware** — All date queries use the restaurant's timezone (`company.timezone`), not the browser's
