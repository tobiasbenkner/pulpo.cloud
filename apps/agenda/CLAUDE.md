# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This app is part of a pnpm monorepo at the root `pulpo.cloud/`. Run from the monorepo root or use `--filter`:

```bash
pnpm --filter @pulpo/agenda dev        # Dev server on http://localhost:4321
pnpm --filter @pulpo/agenda build      # Build static output to dist/
pnpm --filter @pulpo/agenda deploy     # Deploy to Cloudflare Pages (pulpo-agenda)
```

There are no tests or linting configured for this package.

## Architecture

**Astro (static) + Svelte 5 (client-only) + Directus CMS (REST + WebSocket realtime)**

This is a reservation/agenda management app. Astro handles page routing and layout, but all interactive logic runs client-side via `client:only="svelte"` — there is no SSR data fetching.

### Page Structure

All pages follow the same pattern: Astro page → `Layout.astro` → `AuthGuard.svelte` (client:only) → View component (client:only).

- `/` — `AgendaView` — main table of reservations for a selected date, with realtime updates
- `/new` — `ReservationForm` — create a new reservation (date passed via `?date=` query param)
- `/edit` — `ReservationEditWrapper` → `ReservationForm` — edit/delete reservation (`?id=` query param)
- `/login` — `LoginForm` — Directus email/password auth
- `/logout` — `LogoutView` — clears auth tokens

### Authentication

Client-side Directus auth with JSON tokens stored in `localStorage` under the key `directus_auth`. The `AuthGuard` component wraps protected pages — it attempts a token refresh on mount and redirects to `/login` if unauthenticated.

### Directus Client (`src/lib/directus.ts`)

Single shared client instance configured with:
- **authentication** (JSON mode with localStorage persistence)
- **rest** (for CRUD operations)
- **realtime** (WebSocket with handshake auth)

Hardcoded backend URL: `https://admin.pulpo.cloud` (in `src/config.ts`).

### Realtime Hook (`src/hooks/useDirectusRealtime.ts`)

`useDirectusRealtime<T>()` is a Svelte lifecycle hook that manages WebSocket subscriptions to Directus collections. It handles auto-reconnect with exponential backoff, browser visibility/online state changes, and exposes a `state` store with connection status. The `AgendaView` uses this to get live updates, then re-fetches via REST when relevant changes are detected.

### State Management

- **Svelte stores** (`writable`/`derived`) for component-local state
- **nanostores** (`map`) for `authStore` — shared auth state across components
- `localStorage` persists: auth tokens (`directus_auth`) and UI preferences (`pulpo_agenda_show_arrived`)

### Styling

Tailwind CSS v4 with a custom theme defined in `src/styles/global.css`:
- `--color-primary`: #1a202c (dark navy)
- `--color-secondary`: #c2b280 (muted gold)
- Fonts: Playfair Display (serif headings), Inter (sans body)
- Icons: `lucide-svelte` / `@lucide/astro`

### Data Model

The app manages a single `reservations` collection with fields: `id`, `date`, `time`, `name`, `contact`, `person_count`, `notes`, `arrived`, `user`.

### UI Language

The app UI is mixed Spanish (user-facing labels, buttons) and German (some form labels, error messages). Date formatting uses the Spanish (`es`) locale from `date-fns`.
