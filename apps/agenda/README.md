# @pulpo/agenda

Reservation and agenda management app for the pulpo.cloud platform.

Built with **Astro** + **Svelte 5** + **Tailwind CSS v4** + **Directus CMS**. All interactive logic runs client-side with real-time polling updates.

## Features

- Date-based reservation list with real-time updates (3s polling)
- Turn-based filtering with color-coded tabs
- Arrived status tracking (double-click/tap toggle)
- No-show detection (visual indicator for overdue reservations)
- Create, edit, and delete reservations
- Light/dark theme support
- Mobile-optimized with iOS-specific enhancements

## Getting Started

```bash
# From monorepo root
pnpm install
pnpm --filter @pulpo/agenda dev
```

Dev server: http://localhost:4321

### Environment Variables

Directus URL is hardcoded to `https://admin.pulpo.cloud` in `src/config.ts`.

## Tech Stack

| Technology | Purpose |
|---|---|
| [Astro](https://astro.build) | Static site framework |
| [Svelte 5](https://svelte.dev) | Interactive components (client:only) |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [@directus/sdk](https://docs.directus.io) | CMS client with auth |
| [nanostores](https://github.com/nanostores/nanostores) | Auth state |
| [lucide-svelte](https://lucide.dev) | Icons |
| [date-fns](https://date-fns.org) | Date formatting (Spanish locale) |

## Deployment

Deployed to Cloudflare Pages via `pnpm --filter @pulpo/agenda deploy`.
