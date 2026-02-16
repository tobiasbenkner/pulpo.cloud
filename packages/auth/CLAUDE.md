# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This package is part of the `pulpo.cloud` pnpm monorepo.

| Command | Description |
|---|---|
| `pnpm --filter @pulpo/auth check-types` | TypeScript + Svelte type checking |

No dev server, build step, or tests configured. This is a source-only package consumed via workspace dependency.

## Architecture

### Overview

A shared **Svelte 5 component library** for Directus authentication. Provides pre-built UI components (login, logout, password reset) and client-side token management. Used by `@pulpo/shop` and `@pulpo/agenda`.

### Key Files

- `src/index.ts` — Public API exports
- `src/client.ts` — Directus SDK client singleton with token persistence
- `src/auth.ts` — High-level auth operations (check, logout)
- `src/stores/authStore.ts` — Nanostore for global auth state
- `src/components/` — Svelte 5 components

### Client Management (`client.ts`)

Single shared Directus client instance per app:

- `initAuthClient(url)` — Creates singleton with JSON auth mode, auto-refresh, localStorage persistence
- `getAuthClient()` — Returns singleton or throws if not initialized
- `getStoredToken()` — Reads `AuthenticationData` from localStorage key `"directus_auth"`
- `isTokenExpired(bufferMs = 30_000)` — Checks if token expires within buffer

### Authentication Flow (`auth.ts`)

**`checkAuthentication()`**: Returns `{ isAuthenticated: boolean }`. Checks stored token, attempts refresh if expired, retries once after 1.5s on failure (mobile resilience). Clears token and throws on final failure.

**`logout()`**: Calls Directus logout endpoint, always clears localStorage (even if API fails).

### Global State (`stores/authStore.ts`)

Nanostore `map` with `{ isAuthenticated: boolean, loading: boolean }`. Default: `{ isAuthenticated: false, loading: true }`.

### Components

**AuthGuard.svelte** — Route protection. Props: `protect = true`, `loginPath = "/login"`. On mount calls `checkAuthentication()`, redirects if unauthenticated. Shows loading spinner during check. Renders slot when authenticated.

**LoginForm.svelte** — Email/password login. Props: `redirectPath = "/"`, `forgotPasswordPath`, `supportPath`. Auto-redirects if already authenticated. Error messages in Spanish (`INVALID_CREDENTIALS` handling). Has `header` slot.

**LogoutView.svelte** — Confirmation dialog. Props: `loginPath = "/login"`, `backLabel = "Volver"`. Two actions: confirm (logout + redirect) or cancel (history.back).

**ForgotPasswordForm.svelte** — Password recovery. Props: `loginPath`, `resetPasswordPath`. Sends Directus `passwordRequest()` with generated reset URL. Two-state UI: form then success. Vague success message for security.

**ResetPasswordForm.svelte** — Password reset. Props: `loginPath`, `forgotPasswordPath`. Extracts token from URL `?token=...`. Three-state UI: invalid token / form / success. Validates passwords match and 8+ chars.

### Design System

All components use CSS custom properties for theming:
- `--fg`, `--fg-muted`, `--surface`, `--surface-hover` — Colors
- `--primary`, `--secondary`, `--error-*`, `--arrived-*` — Semantic colors
- `--btn-primary-bg`, `--btn-primary-text` — Button styles
- `--shadow-color` — Shadows

### UI Language

All component text is in **Spanish**. Custom text can be provided via named slots (`header` in LoginForm).

### Integration Pattern

Apps use this package by:
1. Calling `initAuthClient(url)` in `Layout.astro` (runs on every page)
2. Wrapping protected pages with `<AuthGuard>` (client:only="svelte")
3. Using auth page components directly in dedicated routes (`/login`, `/logout`, etc.)
4. Importing components via `@pulpo/auth/components/ComponentName.svelte`
