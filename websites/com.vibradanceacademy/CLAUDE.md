# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VibraDance Academy (`@pulpo/vibradanceacademy`) — a static multilingual marketing website for a dance academy in Maspalomas, Gran Canaria. Deployed to GitHub Pages at **hektorysara.com**.

Part of the Pulpo Cloud pnpm monorepo at `websites/com.vibradanceacademy/`.

## Commands

```bash
# From this directory
npm run dev        # Start Astro dev server
npm run build      # Build static site to dist/
npm run preview    # Preview production build

# From monorepo root
pnpm --filter @pulpo/vibradanceacademy dev
pnpm --filter @pulpo/vibradanceacademy build
```

Deployment uses `gh-pages` to push `dist/` to GitHub Pages (requires `GH_TOKEN` env var):
```bash
npm run deploy
```

## Architecture

**Stack:** Astro 5 + Tailwind CSS 4 + TypeScript. Pure static output — zero client-side JavaScript.

### Single-page structure

One dynamic route (`src/pages/[...lang]/index.astro`) generates three language variants via `getStaticPaths()`. Each section is an Astro component receiving a translation object `t`:

```
Layout → Navbar → Hero → Schedule → Teachers → Classes → Booking → Footer
```

### Internationalization

- **Languages:** Spanish (default, no URL prefix), English (`/en`), German (`/de`)
- **Translations:** `src/i18n/ui.ts` — flat object keyed by locale, passed as `t` prop to all components
- **Routing:** Astro's built-in i18n with `prefixDefaultLocale: false`

### Data & configuration

- `src/data/site.json` — contact info, social links, external integrations (Calendly, Google Maps)
- `src/styles/global.css` — Tailwind theme with custom colors (`vibra-pink`, `vibra-teal`), fonts (Playfair Display + Montserrat), and utility classes (`glass-panel-light`, `shadow-luxury`, `text-gradient-luxury`)

### Design conventions

- Fonts: Playfair Display (headings), Montserrat (body) — loaded via Google Fonts in Layout
- No border-radius (sharp corners, editorial aesthetic)
- Brand colors: `vibra-pink` (#ec008c), `vibra-teal` (#00bfd6)
