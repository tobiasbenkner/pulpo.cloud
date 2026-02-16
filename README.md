# pulpo.cloud

Business management platform for hospitality and retail -- built with Astro, Svelte, and Directus.

## Tech Stack

- **Astro 5** -- Static site generation
- **Svelte 5** -- Reactive UI components
- **Tailwind CSS v4** -- Styling
- **Directus 11** -- Headless CMS
- **TypeScript 5.9** -- Type safety
- **Turborepo + pnpm** -- Monorepo management

## Project Structure

```
apps/
  agenda/                  # Reservation & calendar management
  shop/                    # Point-of-Sale system (POS)
  thermal-printer-service/ # ESC/POS thermal printer HTTP service
  directus/                # Directus CMS instance + custom extensions

packages/
  cms/                     # Typed Directus SDK wrapper (@pulpo/cms)
  auth/                    # Authentication layer + Svelte components (@pulpo/auth)
  i18n/                    # Multi-language routing framework (@pulpo/i18n)

tools/
  migrate/                 # PocketBase -> Directus data migration
  telegram_bot/            # Telegram bot for event uploads
  proxy/                   # Traefik reverse proxy config
```

## Apps

### Agenda (`@pulpo/agenda`)

Reservation management app with calendar views, time slot management, and arrival tracking. Uses polling-based real-time updates. Deployed as Docker image.

### Shop (`@pulpo/shop`)

Full point-of-sale system with product catalog, stock management, shopping cart, multi-region Spanish tax calculation (IGIC/IVA/IPSI), invoice generation (tickets & facturas), cash register workflows, thermal printer integration, and daily reporting. Deployed as Docker image.

### Thermal Printer Service

Standalone Express.js HTTP service for ESC/POS thermal printer communication via USB or network.

### Directus

Self-hosted Directus CMS with a custom `invoice-processor` extension handling invoice numbering, stock decrement, and tenant assignment. Runs via Docker Compose with PostgreSQL.

## Shared Packages

| Package       | Description                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@pulpo/cms`  | Typed Directus client factory, domain API functions (invoices, products, customers, tax, reports), and collection type definitions |
| `@pulpo/auth` | Token-based authentication with localStorage persistence, auth store (nanostores), and reusable Svelte login components            |

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm 10.28+

### Install

```bash
pnpm install
```

### Environment Variables

Create `.env` files in the respective app directories:

```env
DIRECTUS_URL=https://your-directus-instance.com
DIRECTUS_TOKEN=your-api-token
```

For Cloudflare deployment:

```env
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

### Development

```bash
# Start all dev servers
pnpm dev

# Start a specific app
pnpm --filter @pulpo/shop dev
pnpm --filter @pulpo/agenda dev
```

### Build

```bash
# Build all packages
pnpm build

# Build a specific app
pnpm --filter @pulpo/shop build
```

### Other Commands

```bash
pnpm lint          # Lint all packages
pnpm check-types   # TypeScript type checking
pnpm format        # Format code with Prettier
pnpm deploy        # Deploy all deployable packages
```

## Architecture Highlights

- **Client-side rendering** -- Astro generates static HTML, Svelte components handle interactivity via `client:only`
- **Shared CMS layer** -- All apps connect to a single Directus instance through `@pulpo/cms`
- **Multi-tenant** -- Tenant-aware schema with per-tenant invoice numbering and postcode-based tax region detection
- **Decimal precision** -- Financial calculations use `big.js` to avoid floating-point errors
- **Spanish tax compliance** -- Multi-region tax system (Canary Islands, Ceuta, Melilla, mainland) with VeriFactu invoice hashing
