# @pulpo/auth

Shared authentication package for the pulpo.cloud platform.

Built with **Svelte 5** + **Directus SDK** + **nanostores**. Provides pre-built login/logout/password-reset components and client-side token management for Directus CMS.

## Features

- Directus authentication with JSON token persistence (localStorage)
- Auto-refresh with retry logic for mobile resilience
- Pre-built Svelte 5 components: login, logout, forgot password, reset password
- Route protection via `AuthGuard` component
- Global auth state via nanostores
- Theming via CSS custom properties

## Usage

```typescript
// Initialize in your app entry point
import { initAuthClient } from '@pulpo/auth';
initAuthClient(import.meta.env.DIRECTUS_URL);

// Protect a route (Astro page with client:only)
import AuthGuard from '@pulpo/auth/components/AuthGuard.svelte';
<AuthGuard protect={true} loginPath="/login">
  <YourProtectedPage />
</AuthGuard>

// Use auth state
import { authStore } from '@pulpo/auth';
```

## Components

| Component | Description |
|---|---|
| `AuthGuard.svelte` | Route protection wrapper with loading state |
| `LoginForm.svelte` | Email/password login with auto-redirect |
| `LogoutView.svelte` | Logout confirmation dialog |
| `ForgotPasswordForm.svelte` | Password recovery request |
| `ResetPasswordForm.svelte` | Password reset with token validation |

## Exports

```typescript
// Client initialization & token management
initAuthClient(url)      // Initialize Directus client
getAuthClient()          // Get initialized client
getStoredToken()         // Get token from localStorage
isTokenExpired()         // Check token expiration (30s buffer)
TOKEN_KEY                // "directus_auth"

// Authentication
checkAuthentication()    // Verify & refresh token
logout()                 // Logout & clear token

// State
authStore                // Nanostore { isAuthenticated, loading }
```

## Tech Stack

| Technology | Purpose |
|---|---|
| [Svelte 5](https://svelte.dev) | UI components (runes) |
| [@directus/sdk](https://docs.directus.io) | Directus authentication API |
| [nanostores](https://github.com/nanostores/nanostores) | Global auth state |
| [lucide-svelte](https://lucide.dev) | Icons |
