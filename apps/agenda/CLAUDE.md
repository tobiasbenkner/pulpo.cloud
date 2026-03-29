# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This app is part of a pnpm monorepo at the root `pulpo.cloud/`. Run from the monorepo root or use `--filter`:

```bash
pnpm --filter @pulpo/agenda dev        # Dev server on http://localhost:4321
pnpm --filter @pulpo/agenda build      # Build static output to dist/
pnpm --filter @pulpo/agenda test       # Run unit tests (Vitest)
pnpm --filter @pulpo/agenda test:watch # Run tests in watch mode
```

## Architecture

**Astro (static) + Svelte 5 (client-only) + PocketBase (REST + polling)**

Reservation/agenda management app with floorplan and table assignment. Astro handles page routing, all interactive logic runs client-side via `client:only="svelte"`. No SSR.

### PocketBase Connection

- `src/lib/pb.ts` — PocketBase client (`localhost:8090` in dev, `/` in prod)
- Auth: `pb.authStore` with periodic refresh (4h interval in AgendaView)
- All data fetched client-side via PocketBase JS SDK

### Page Structure

All pages follow: Astro page → `Layout.astro` → `AuthGuard.svelte` (client:only) → View component (client:only).

- `/` — AgendaView — reservation list + floorplan toggle (Turn-based tabs)
- `/new` — ReservationForm — create reservation (date/time/pax/duration/table)
- `/edit` — ReservationForm — edit/delete reservation
- `/floorplan` — FloorplanView — table layout editor + occupancy assignment mode
- `/settings` — TurnsSettings — manage turns (label, start, color, duration, buffer)
- `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/support`

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/pb.ts` | PocketBase client |
| `src/lib/auth.ts` | checkAuthentication, logout |
| `src/lib/types.ts` | TypeScript interfaces for all collections |
| `src/lib/tableAssignment.ts` | Core table assignment algorithm (26 unit tests) |
| `src/lib/turnsCache.ts` | Turns cache with stale-while-revalidate |
| `src/lib/cms.ts` | PocketBase CRUD wrappers for reservations |
| `src/stores/userStore.ts` | Auth state (nanostores) |
| `src/stores/themeStore.ts` | Light/dark theme (Svelte writable) |
| `src/stores/reservationDraftStore.ts` | Form persistence during floorplan navigation |

### Table Assignment Algorithm (`tableAssignment.ts`)

Central logic used by AgendaView, FloorplanView, and ReservationForm:

- `computeTableAssignments(reservations, tables, groups)` — assigns tables to all reservations. Sort: fixed first, then by time, larger parties first at same time. Uses time slots to prevent double-booking.
- `displaceAndReassign(base, selectedTableIds, ...)` — stable displacement: only the displaced reservation gets reassigned.
- `buildAssignmentLabels(state, reservations, groups, colorMap, queryTime?, queryDuration?)` — builds labels, fixedIds, autoIds, tableColors. Time-filtered for turn-based display (no buffer in filter).
- `suggestTables(partySize, tables, groups, occupiedIds)` — finds smallest single table (min/max seats first, then seats), falls back to smallest matching group.

### Floorplan Components

| Component | Purpose |
|-----------|---------|
| `FloorplanView.svelte` | Main: state, CRUD, drag, zone/group management |
| `FloorplanCanvas.svelte` | SVG renderer, receives pre-computed `_style` per table |
| `TableEditPanel.svelte` | Side panel: edit table properties |
| `GroupPanel.svelte` | Side panel: manage table groups |
| `OccupancyPanel.svelte` | Side panel: assign table to reservation |

### Styling

Tailwind CSS v4 via `@tailwindcss/vite`. Theme in `src/styles/global.css`:
- Light/dark theme via CSS variables + `.dark` class
- Fonts: Playfair Display (serif), Inter (sans)
- Icons: `lucide-svelte` / `@lucide/astro`

### UI Language

Entire app UI is in **Spanish (es)**. All labels, buttons, error messages use Spanish. Date formatting uses `es` locale from `date-fns`.

### Key Patterns

- **Polling**: 3s chained setTimeout, pauses when tab hidden, AbortController for cancellation
- **Svelte reactivity**: Styles computed in parent as `_style` property on table objects (avoids stale `{@const}` in `{#each}`). Explicit `void` dependencies for reactive triggers.
- **Draft store**: ReservationForm saves to localStorage before navigating to floorplan, restores on return
- **Token refresh**: Every 4h in AgendaView polling loop + on visibility change
- **Turn-based display**: Floorplan shows occupancy filtered by selected turn time window (turn start to next turn start)
