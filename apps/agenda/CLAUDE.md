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

- **authentication** (JSON mode with localStorage persistence, autoRefresh)
- **rest** (for CRUD operations)
- **realtime** (WebSocket with handshake auth)

Hardcoded backend URL: `https://admin.pulpo.cloud` (in `src/config.ts`).

### Two-Layer API Pattern

API calls are split across two modules:

- **`src/lib/cms.ts`** — Wraps `@pulpo/cms` shared package functions by injecting the local directus client. Use this for operations that are shared across multiple apps (e.g., `listReservations`, `readReservation`, `listReservationTurns`).
- **`src/lib/api.ts`** — Direct `@directus/sdk` calls for app-specific operations (e.g., `getProfile`, `toggleArrived`, `deleteReservation`).

When adding new API functions: if the operation is reusable across apps, add it to `@pulpo/cms` and wrap it in `cms.ts`. If it's agenda-specific, add it to `api.ts`.

### Realtime Hook (`src/hooks/useDirectusRealtime.ts`)

`useDirectusRealtime<T>()` is a Svelte lifecycle hook that manages WebSocket subscriptions to Directus collections. It handles auto-reconnect with exponential backoff, browser visibility/online state changes, and exposes a `state` store with connection status. The `AgendaView` uses this to get live updates, then re-fetches via REST when relevant changes are detected.

### State Management

- **Svelte stores** (`writable`/`derived`) for component-local state
- **nanostores** (`map`) for `authStore` — shared auth state across components
- `localStorage` persists: auth tokens (`directus_auth`), UI preferences (`pulpo_agenda_show_arrived`), and cached turns data (`pulpo_agenda_turns`)

### Styling

Tailwind CSS v4 with a custom theme defined in `src/styles/global.css`:

- `--color-primary`: #1a202c (dark navy)
- `--color-secondary`: #c2b280 (muted gold)
- Fonts: Playfair Display (serif headings), Inter (sans body)
- Icons: `lucide-svelte` / `@lucide/astro`

### Key Runtime Patterns

- **Optimistic updates**: `AgendaTable` toggles "arrived" status immediately in the UI, with rollback on REST API error.
- **Race condition prevention**: REST fetches use `AbortController` to cancel stale requests when the date changes.
- **Query string state**: Date and reservation ID are passed via URL query params (`?date=`, `?id=`), making views shareable/bookmarkable.
- **Responsive layout**: Mobile renders a compact list; desktop renders a full table. Breakpoint-driven via Tailwind.
- **Double-click/tap to toggle arrived**: Both mobile and desktop use a unified `handleRowClick` handler with a 300ms timer — single click/tap navigates to edit, double click/tap toggles the arrived status. No `<a>` links on rows; navigation is programmatic.
- **Turns cache** (`src/lib/turnsCache.ts`): Reservation turns are cached in `localStorage` with a 24h TTL. Both `AgendaView` and `ReservationForm` read from the same cache. A manual "Actualizar turnos" button in the agenda footer invalidates the cache and re-fetches.
- **Turn color dots**: Each reservation row shows a small colored dot matching its turn's color (matched by time). Falls back to gray if no turn matches.

### Data Model

The app manages `reservations` with fields: `id`, `date`, `time`, `name`, `contact`, `person_count`, `notes`, `arrived`, `user`. Related collections: `reservation_turns` (predefined time slots with `id`, `label`, `start`, `color`) and `directus_users`.

### UI Language

The entire app UI is in **Spanish**. All labels, buttons, error messages, placeholders, and aria-labels use Spanish. Date formatting uses the Spanish (`es`) locale from `date-fns`. New UI text must be written in Spanish.

### Dev Server

The dev server binds to `0.0.0.0:4321` with `local.pulpo.cloud` as an allowed host. Use this hostname for local development if needed.
