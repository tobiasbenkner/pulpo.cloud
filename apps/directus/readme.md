# @pulpo/directus

Directus CMS instance for the pulpo.cloud platform with custom extensions.

Runs as a **Docker container** based on Directus 11.15 with PostgreSQL, Redis, and a custom invoice-processor extension for POS operations.

## Getting Started

```bash
# Local development (Docker Compose: Directus + PostgreSQL + Redis + MailHog)
pnpm --filter @pulpo/directus dev

# Build production image
pnpm --filter @pulpo/directus build

# Deploy to Docker Hub
pnpm --filter @pulpo/directus deploy
```

Directus UI: http://localhost:8055
MailHog UI: http://localhost:8025

## Custom Extensions

### invoice-processor

Endpoint extension implementing the POS backend logic:

| Endpoint | Description |
|---|---|
| `POST /invoice-processor/invoices` | Create ticket/factura with auto-numbering and stock updates |
| `POST /invoice-processor/invoices/rectify` | Create rectificativa (corrective invoice) |
| `POST /invoice-processor/cash-register/open` | Open cash register shift |
| `POST /invoice-processor/cash-register/close` | Close shift with aggregation and denomination counting |
| `GET /invoice-processor/reports/{period}` | Aggregated reports (daily/weekly/monthly/quarterly/yearly) |
| `POST /invoice-processor/reports/backfill` | Backfill product breakdowns for existing closures |

### Third-Party Extensions

- `@timio23/directus-group-tabs` — UI tab grouping
- `@directus-labs/seo-plugin` — SEO metadata

## Utilities

```bash
# Create a new extension
npx create-directus-extension@latest

# Export schema snapshot
curl http://localhost:8055/schema/snapshot?export=yaml

# Export roles/policies/permissions
./export-policies.sh
```

## Tech Stack

| Technology | Purpose |
|---|---|
| [Directus 11.15](https://directus.io) | Headless CMS |
| PostgreSQL + PostGIS | Database |
| Redis | Caching |
| [big.js](https://github.com/MikeMcl/big.js) | Decimal arithmetic (invoice-processor) |

## Deployment

Built and deployed as Docker image `pulpocloud/directus`.
