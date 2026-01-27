# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

**Becker Insurance Broker** - Insurance brokerage website for Grupo Becker, specialized in personalized insurance solutions in Las Palmas de Gran Canaria.

Website: https://seguros.beckernet.es

## Commands

This project uses `pnpm` as the package manager.

| Command | Description |
|---------|-------------|
| `pnpm install` | Install dependencies |
| `pnpm dev` | Start local dev server at `localhost:4321` |
| `pnpm build` | Build production site to `./dist/` |
| `pnpm preview` | Preview production build locally |
| `pnpm deploy` | Deploy to Cloudflare Pages |

## Architecture

This is an **Astro** website using **Tailwind CSS v4** with a custom multi-language routing system and CMS integration via Directus.

### Multi-Language Routing System

The site supports 3 languages: Spanish (default), German, and English.

**Key components:**
- `src/lib/i18n.ts` - Language configuration and translation resolver
- `src/lib/registry.ts` - Route registration and view component mapping
- `src/pages/[...slug]/index.astro` - Dynamic route handler for all pages

**How it works:**
1. Each view is defined in `src/views/{name}/` with three files:
   - `{name}.route.ts` - Defines the route key and slugs for each language
   - `{name}.i18n.ts` - Contains all translations for that view
   - `{name}.page.astro` - The actual page component

2. The registry auto-discovers these files using Vite's `import.meta.glob()` and builds a mapping of routes to components.

3. At build time, `getStaticPaths()` generates all language variants:
   - Default language (es): `/slug`
   - Other languages: `/de/slug` or `/en/slug`
   - Home page: `/` (es) or `/de`, `/en`

4. Translations are resolved at runtime using `resolveTranslations()` which:
   - Recursively traverses the translation object
   - Detects language keys and returns the appropriate string
   - Falls back to default language if translation is missing

**Adding a new page:**
1. Create `src/views/mypage/mypage.route.ts`:
   ```ts
   export const route = {
     key: 'mypage',
     slugs: { es: 'mi-pagina', de: 'meine-seite', en: 'my-page' }
   };
   ```
2. Create `src/views/mypage/mypage.i18n.ts` with translations
3. Create `src/views/mypage/mypage.page.astro` with the component
4. Pages are auto-registered, no manual import needed

### Pages

| Route Key | ES Slug | DE Slug | EN Slug | Description |
|-----------|---------|---------|---------|-------------|
| home | / | /de | /en | Homepage with benefits, insurers grid, services |
| insurers | /aseguradoras | /versicherer | /insurers | Insurance partners with detailed descriptions |
| about | /nuestros-comienzos | /unsere-anfaenge | /our-beginnings | Company story and values |
| contact | /contacto | /kontakt | /contact | Contact form and info |
| blog | /blog/* | /de/blog/* | /en/blog/* | Blog categories from CMS |

### CMS Integration

Content is fetched from **Directus CMS** (`@pulpo/cms` workspace package).

**Content collections** (defined in `src/content.config.ts`):
- `languages` - Available languages
- `categories` - Blog categories
- `posts` - Blog posts

Content is loaded at build time using Astro's content loaders, not at runtime.

**Environment variables** (required in `.env`):
- `DIRECTUS_URL` - Directus instance URL
- `DIRECTUS_TOKEN` - API token for authentication
- Tenant ID is hardcoded in `src/config.ts`

### File Structure

```
src/
├── pages/          # Astro page routes
│   ├── [...slug]   # Dynamic multi-language handler
│   └── [...blog]   # Blog post handler
├── views/          # Page components organized by route
│   ├── home/       # Homepage (benefits, insurers, services)
│   ├── insurers/   # Insurance partners page
│   ├── about/      # Company story
│   ├── contact/
│   └── ...
├── components/     # Reusable UI components
├── layouts/        # Page layouts (includes Tawk.to chat)
├── lib/            # Core utilities
│   ├── i18n.ts     # Translation system
│   ├── registry.ts # Route and view registry
│   ├── navbar.ts   # Navigation items
│   ├── cms.ts      # CMS helpers
│   └── client.ts   # Directus client
├── config.ts       # Environment configuration
└── content.config.ts # Content collections
public/
└── logos/          # Insurance company logos (SVG)
```

### Third-party Integrations

- **Tawk.to** - Live chat widget (configured in `Layout.astro`)

### Styling

Uses **Tailwind CSS v4** (configured via Vite plugin in `astro.config.mjs`).

Typography plugin is available for prose content (`@tailwindcss/typography`).

### Deployment

Deployed to **Cloudflare Pages** via Wrangler CLI. The deploy command pushes the `dist/` directory.
