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

**Astro (static) + Svelte 4 (client-only) + Directus CMS (REST polling)**

This is a reservation/agenda management app. Astro handles page routing and layout, but all interactive logic runs client-side via `client:only="svelte"` — there is no SSR data fetching.

### Page Structure

All pages follow the same pattern: Astro page → `Layout.astro` → `AuthGuard.svelte` (client:only) → View component (client:only).

- `/` — `AgendaView` — main table of reservations for a selected date, with polling updates
- `/new` — `ReservationForm` — create a new reservation (date passed via `?date=` query param)
- `/edit` — `ReservationEditWrapper` → `ReservationForm` — edit/delete reservation (`?id=` query param)
- `/login` — `LoginForm` — Directus email/password auth
- `/logout` — `LogoutView` — clears auth tokens

### Authentication

Client-side Directus auth with JSON tokens stored in `localStorage` under the key `directus_auth`. The `AuthGuard` component wraps protected pages — it attempts a token refresh on mount (with a 1.5s retry for mobile resilience) and redirects to `/login` if unauthenticated.

### Directus Client (`src/lib/directus.ts`)

Single shared client instance configured with:

- **authentication** (JSON mode with localStorage persistence, autoRefresh)
- **rest** (for CRUD operations)

Hardcoded backend URL: `https://admin.pulpo.cloud` (in `src/config.ts`).

### Two-Layer API Pattern

API calls are split across two modules:

- **`src/lib/cms.ts`** — Wraps `@pulpo/cms` shared package functions by injecting the local directus client. Use this for operations that are shared across multiple apps (e.g., `listReservations`, `readReservation`, `listReservationTurns`).
- **`src/lib/api.ts`** — Direct `@directus/sdk` calls for app-specific operations (e.g., `getProfile`, `toggleArrived`, `deleteReservation`).

When adding new API functions: if the operation is reusable across apps, add it to `@pulpo/cms` and wrap it in `cms.ts`. If it's agenda-specific, add it to `api.ts`.

### Auth Module (`src/lib/auth.ts`)

Provides `checkAuthentication()` (validates/refreshes stored token with retry) and `logout()` (clears token and localStorage). Used by `AuthGuard` and `LogoutView`. The retry (1.5s delay) prevents false logouts on mobile when the network stack isn't immediately ready after app-switching.

### State Management

- **Plain `let` variables** with `$:` reactive statements for component-local state in `AgendaView` (no Svelte stores needed)
- **Dedicated stores** in `src/stores/`: `userStore.ts` (nanostores `map` with `isAuthenticated`/`loading`), `themeStore.ts` (writable with localStorage persistence)
- `localStorage` persists: auth tokens (`directus_auth`), UI preferences (`pulpo_agenda_show_arrived`, `pulpo_agenda_view_mode`), theme (`pulpo_agenda_theme`), and cached turns data (`pulpo_agenda_turns`)

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin (no `tailwind.config.js` — all theme config lives in `src/styles/global.css`):

- `--color-primary`: #1a202c (dark navy)
- `--color-secondary`: #c2b280 (muted gold)
- Light/dark theme support via CSS variables, toggled with `.dark` class on `<html>`
- Muted, desaturated status colors: sage green (#5B8C6B / #8ABB9A) for arrived, brick/coral (#B85C50 / #D4897E) for overdue
- Fonts: Playfair Display (serif headings), Inter (sans body)
- Icons: `lucide-svelte` / `@lucide/astro`

### iOS Mobile Optimizations

- `touch-action: manipulation` globally to prevent double-tap zoom
- `font-size: 16px !important` on inputs (via `@supports (-webkit-touch-callout: none)`) to prevent iOS auto-zoom on focus
- `100dvh` with `100vh` fallback (`.h-screen-safe` / `.min-h-screen-safe` utilities) for correct viewport height accounting for browser chrome
- Pickers (DatePicker, TimePicker, Calendar) open as bottom-sheets on mobile with dark backdrop, absolute dropdowns on desktop

### Key Runtime Patterns

- **Polling**: `AgendaView` polls the REST API every 3 seconds using chained `setTimeout` (not `setInterval`) to prevent request overlap. Polling pauses when the tab is hidden (`visibilitychange`) and resumes on return. Requests use `withOptions()` from `@directus/sdk` to pass an `AbortSignal` for proper cancellation.
- **Silent updates**: Polling fetches are completely invisible (no loading/refetching indicators). Only the initial page load shows a loading state. Data is compared via `JSON.stringify` per-reservation to avoid unnecessary re-renders.
- **Change highlighting**: When polling detects changed reservations, the affected rows get a subtle gold highlight animation (`@keyframes highlight`, 2s fade-out at 25% opacity of `--color-secondary`). Changes made by the current user (via `localIds` tracking) are excluded from highlighting.
- **Fade-out on removal**: Reservations that disappear (remote deletion, filter change) use Svelte's `out:fade` transition (2s). This is suppressed (`duration: 0`) during turn/view-mode switches via a `skipFade` flag.
- **Optimistic updates**: `AgendaView` toggles "arrived" status immediately in the UI, with rollback on REST API error.
- **Race condition prevention**: REST fetches use `AbortController` with the signal passed to fetch via `withOptions()`, enabling actual network-level cancellation visible in the browser's Network tab.
- **Query string state**: Date and reservation ID are passed via URL query params (`?date=`, `?id=`), making views shareable/bookmarkable.
- **Responsive layout**: Mobile renders a compact list; desktop renders a full table. Breakpoint-driven via Tailwind.
- **Double-click/tap to toggle arrived**: Both mobile and desktop use a unified `handleRowClick` handler with a 300ms timer — double click/tap toggles the arrived status. A separate pencil icon (`Pencil` from lucide) navigates to the edit page via `stopPropagation`.
- **No-show detection**: A `now` timer updates every 60s. Reservations whose time has passed without `arrived=true` show a red X icon and red name text. Only visual — no DB changes.
- **View modes**: `AgendaView` supports two modes toggled via a settings dropdown in the footer:
  - `"all"` (default) — flat list of all reservations
  - `"tabs"` — tab bar with turn-based filtering (pill buttons with turn color dots). Persisted in `localStorage` under `pulpo_agenda_view_mode`.
- **Settings dropdown**: Footer contains a gear icon that opens a dropdown with: view mode toggle, theme toggle (light/dark), and refresh turns.
- **Turns cache** (`src/lib/turnsCache.ts`): Reservation turns are cached in `localStorage` with a 24h TTL. Both `AgendaView` and `ReservationForm` read from the same cache. "Actualizar turnos" in the settings dropdown invalidates the cache and re-fetches.
- **Turn color dots**: Each reservation row shows a small colored dot matching its turn's color (matched by time). Falls back to gray if no turn matches.

### Data Model

The app manages `reservations` with fields: `id`, `date`, `time`, `name`, `contact`, `person_count`, `notes`, `arrived`, `user`. Related collections: `reservation_turns` (predefined time slots with `id`, `label`, `start`, `color`) and `directus_users`.

### UI Language

The entire app UI is in **Spanish**. All labels, buttons, error messages, placeholders, and aria-labels use Spanish. Date formatting uses the Spanish (`es`) locale from `date-fns`. New UI text must be written in Spanish.

### Dev Server

The dev server binds to `0.0.0.0:4321` with `local.pulpo.cloud` as an allowed host. Use this hostname for local development if needed.
