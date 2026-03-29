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
```

## Architecture

### Monorepo Structure

```
apps/           # Astro applications
├── agenda/     # Reservation & floorplan app (Astro + Svelte 5 + PocketBase)
├── pulpo-app/  # Go backend (PocketBase), serves agenda/shop as static files
├── shop/       # POS app with nanostores (still on Directus, migration pending)
└── website/    # Standard website template

packages/       # Shared libraries
├── cms/                # Directus SDK wrapper — DEPRECATED, being replaced by PocketBase SDK
├── directus-extension/ # Directus endpoint extension — will be replaced by Go hooks
└── invoice/            # Shared invoice calculation logic (@pulpo/invoice)

websites/       # Client website instances
├── beckernet.es/
├── holacanterasclub.com/
└── pulpo.cloud/          # Landing page

tools/          # Development and migration tools
├── migrate/    # Data migration scripts
└── proxy/      # Traefik reverse proxy config
```

### Apps vs Websites

- **apps/** contain reusable Astro application templates
- **websites/** are client-specific deployments that may extend or customize apps
- Both use the same patterns: Astro + Tailwind CSS v4

### Shared CMS Package (@pulpo/cms) — DEPRECATED

Being replaced by PocketBase SDK directly in each app. Do not add new functionality here.

### Shared Invoice Package (@pulpo/invoice)

Located at `packages/invoice/`, provides:
- `calculateInvoice(lines, discount?)` - Pure function for invoice calculation (totals, tax, discounts)
- Uses `big.js` for precise decimal arithmetic
- Source-only package (no build step), consumed by both `@pulpo/shop` and `pulpo-extension`

### Directus Extension (pulpo-extension)

Located at `packages/directus-extension/`, a custom Directus endpoint extension implementing the POS backend (invoices, cash register, reports). Built via `directus-extension build` and installed into the Directus Docker image.

All shared packages are used via workspace dependency:
```json
"@pulpo/cms": "workspace:*"
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

Required for CMS-connected apps:
- `DIRECTUS_URL` - Directus instance URL
- `DIRECTUS_TOKEN` - API token

For deployment:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Deployment

Apps deploy to **Cloudflare Pages** via Wrangler CLI. The `pnpm deploy` command builds and pushes to the configured Cloudflare project.

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

### PocketBase Collections (agenda)

Created via Admin UI, not code migrations:
- `reservations` — date, time, name, person_count, contact, notes, arrived, user, duration, reservations_tables
- `reservations_turns` — label, start, color, duration, buffer
- `reservations_tables` — label, seats, min_seats, max_seats, x, y, shape, rotation, width, zone
- `reservations_zones` — label, sort
- `reservations_table_groups` — label, tables, zone, sort, color

### Pending Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 3 | Invoice calculation in Go | Not started |
| 4 | Shop backend endpoints (Go) | Not started |
| 5 | Shop frontend migration | Not started |
| 6 | Settings view | Not started |
| 7 | Docker + npm distribution | Dockerfile exists |
| 8 | Data migration Directus→PB | Not started |
| 9 | Platform/SaaS (optional) | Not started |
