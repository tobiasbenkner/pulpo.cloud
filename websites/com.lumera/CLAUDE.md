# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Lumera (`@pulpo/lumera`) is a bilingual (Polish + English) portfolio website for an AI portrait studio. It is part of the Pulpo.cloud pnpm monorepo and deploys to GitHub Pages.

## Commands

```bash
pnpm dev              # Start Astro dev server
pnpm build            # Production build (output: dist/)
pnpm preview          # Preview production build locally
pnpm deploy           # Build and deploy to GitHub Pages (requires GH_TOKEN)
```

From monorepo root:
```bash
pnpm --filter @pulpo/lumera dev
pnpm --filter @pulpo/lumera build
```

## Stack

- **Astro 5** (static site generation)
- **Tailwind CSS v4** via `@tailwindcss/vite` plugin (no tailwind.config — configured in CSS)
- **TypeScript** in strict mode (`astro/tsconfigs/strict`)
- **@pulpo/i18n** (workspace package) for routing and translations
- **astro-icon** with Iconify JSON sets (`lucide`, `circle-flags`)
- **marked** for markdown rendering
- **sharp** for image optimization

## Architecture

### View-Based Routing

Pages are defined as **views** in `src/views/{name}/`, each containing three files:

| File | Purpose |
|------|---------|
| `{name}.route.ts` | Route key and URL slugs per language |
| `{name}.i18n.ts` | Translations (nav label, SEO, page content) |
| `{name}.page.astro` | Page component (receives `lang` and `t` props) |

Views are auto-discovered via `import.meta.glob()` in `src/lib/registry.ts` and rendered through the catch-all route at `src/pages/[...slug]/index.astro`.

**To add a new page:** create a new directory under `src/views/` with all three files following the existing pattern in `src/views/home/`.

### i18n

Configured in `src/lib/i18n.ts`:
- **Languages:** `pl` (default), `en`
- Default language has no URL prefix (`/`, `/about`)
- Non-default languages get a prefix (`/en`, `/en/about`)
- Translations use a nested object structure that gets flattened at resolve time

### Layout & Components

- `src/layouts/Layout.astro` — main wrapper (includes SeoHead, Header, Footer, analytics)
- `src/components/SeoHead.astro` — handles meta tags, OG, hreflang, canonical URLs
- `src/components/Header.astro` — sticky nav with mobile hamburger menu
- `src/data/site.ts` — site metadata, contact info, social links

### Styling

Tailwind CSS v4 with global import in `src/styles/global.css`. Color palette:
- Off-white: `#F6F5F2`
- Black: `#111111`
- Olive accent: `#6E775F`

### Deployment

Deploys to **GitHub Pages** via `gh-pages` to repo `tobiasbenkner/lumera` with custom domain `lumera.benkner-it.com`. Site URL is set in `astro.config.mjs`.

### Path Aliases

`@/*` maps to `src/*` (configured in tsconfig.json).
