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
apps/           # Astro applications (reusable app templates)
├── agenda/     # Event/calendar app with Svelte components
├── shop/       # E-commerce app with nanostores
└── website/    # Standard website template

packages/       # Shared libraries
└── cms/        # Directus SDK wrapper and types (@pulpo/cms)

websites/       # Client website instances
├── beckernet.es/
├── holacanterasclub.com/
└── pulpo.cloud/          # Landing page

tools/          # Development and migration tools
├── migrate/    # Data migration scripts (PocketBase → Directus)
└── proxy/      # Traefik reverse proxy config
```

### Apps vs Websites

- **apps/** contain reusable Astro application templates
- **websites/** are client-specific deployments that may extend or customize apps
- Both use the same patterns: Astro + Tailwind CSS v4 + Directus CMS

### Shared CMS Package (@pulpo/cms)

Located at `packages/cms/`, provides:
- `createClient(url, token)` - Create typed Directus client
- Type definitions for all CMS collections
- API helpers for common queries

Used by apps via workspace dependency:
```json
"@pulpo/cms": "workspace:*"
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
