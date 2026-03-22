# CLAUDE.md – @pulpo/landingpage

## Overview

Landing page for pulpo.cloud with integrated PocketBase backend for user auth, registration, and onboarding. **Does NOT use Directus** — this is a standalone app.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Astro (4321) + PocketBase (8090) concurrently |
| `pnpm dev:astro` | Astro dev server only |
| `pnpm dev:pb` | PocketBase backend only |
| `pnpm build` | Build Astro frontend to `dist/` |
| `pnpm dockerize` | Build & push Docker image (`pulpocloud/landingpage`) |
| `pnpm pb:setup` | Run PocketBase setup script |

Go backend (in `pb/`):
```bash
cd pb && go run . serve   # Start PocketBase
cd pb && go build .       # Build binary (requires pb_public/ to exist)
```

**Note:** Go build requires `pb_public/` directory. In production the Dockerfile copies `dist/` → `pb/pb_public/` before building Go. For local Go builds, ensure `pb_public/` exists (even empty with a `.gitkeep`).

## Architecture

```
src/
├── assets/          # Logo, static assets
├── components/      # Reusable Astro components
├── data/site.ts     # Site config (meta, contact, pricing plans)
├── layouts/         # Layout.astro (nav, footer)
├── lib/             # i18n, registry, types
├── pages/           # [...slug] dynamic router, robots.txt, sitemap.xml
├── styles/          # global.css
└── views/           # Page views
    ├── app/         # Auth views (not indexed by search engines)
    │   ├── login/
    │   ├── signup/
    │   ├── onboarding/
    │   └── verify/
    ├── home/
    ├── features/
    ├── pricing/
    ├── contact/
    ├── imprint/
    ├── privacy/
    └── terms/

pb/                  # PocketBase backend (Go)
├── main.go          # Server, hooks, email templates
├── migrations/      # DB schema migrations
└── pb_data/         # Runtime data (gitignored)
```

## Tech Stack

- **Frontend:** Astro 5 + Tailwind CSS 4 + astro-icon
- **Backend:** PocketBase v0.36.7 (Go 1.25)
- **Fonts:** DM Sans, Syne
- **Deployment:** Docker (Alpine) on port 8090 via Traefik

## Multi-Language Routing

4 languages: **es** (default), **de**, **en**, **it**

Convention-based auto-discovery via Vite `import.meta.glob()`:
- `src/views/{name}/{name}.route.ts` — route key + slugs per language
- `src/views/{name}/{name}.i18n.ts` — translations
- `src/views/{name}/{name}.page.astro` — component

URL patterns:
- Default (es): `/{slug}` (e.g., `/app/login`, `/funciones`)
- Other languages: `/{lang}/{slug}` (e.g., `/de/app/login`, `/de/funktionen`)

Use `getTranslatedPath(routeKey, lang)` for all internal links. For client-side redirects in `<script>` tags, pass paths via JSON script tags since `getTranslatedPath` is server-side only:
```astro
<script id="page-data" type="application/json" set:html={JSON.stringify({
  targetPath: getTranslatedPath("onboarding", lang),
})} />
<script>
  const data = JSON.parse(document.getElementById("page-data")!.textContent!);
  window.location.href = data.targetPath;
</script>
```

## PocketBase Hooks (pb/main.go)

- **OnRecordAfterCreateSuccess("users")** — Sends notification email to info@pulpo.cloud
- **OnMailerRecordVerificationSend("users")** — Replaces default verification email with branded, localized template (uses user's `lang` field)
- **OnRecordConfirmVerificationRequest("users")** — Returns auth token after verification (auto-login)
- **File server** — Serves embedded frontend with SPA fallback (404 → redirect to /)

## Users Collection (PocketBase)

Custom fields on `_pb_users_auth_`:
- `businessName`, `legalName`, `nif`, `address`, `postalCode`, `city` (text)
- `businessType` (select: gastro, retail, other)
- `lang` (text, 2-5 chars)
- `authRule`: `verified = true` (unverified users cannot authenticate)

## Auth Flow

1. **Signup** (`/app/registro`) → Creates user with `lang` field → PocketBase sends localized verification email
2. **Verify** (`/app/verificar?token=xxx`) → Confirms email → Returns auth token → Auto-login → Redirect to onboarding (5s countdown)
3. **Onboarding** (`/app/onboarding`) → Collects business info → Saves to user record
4. **Login** (`/app/login`) → Auth with password → 403 = unverified (specific error message), 400 = wrong credentials

## Environment Variables

- `PUBLIC_POCKETBASE_URL` — PocketBase API URL (default: `http://localhost:8090`)

PocketBase settings (configured via Admin UI at `/_/`):
- SMTP settings for verification emails
- `AppURL` — Used for email verification links (set to `http://localhost:4321` in dev, `https://pulpo.cloud` in prod)
