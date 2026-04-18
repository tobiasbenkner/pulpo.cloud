# @pulpo/menu

Customer-facing restaurant website showing menu, contact info, and legal pages.

## Commands

```bash
pnpm --filter @pulpo/menu dev      # Dev server (port 4321)
pnpm --filter @pulpo/menu build    # Production build
pnpm --filter @pulpo/menu preview  # Preview production build
```

Requires PocketBase backend running on `http://localhost:8090` (dev). In production, PB is served from the same origin.

## Stack

- **Astro 6** — Static pages, no UI framework (vanilla JS in `<script>` blocks)
- **Tailwind CSS v4** — Via `@tailwindcss/vite` plugin
- **astro-icon** — Lucide icon set (`<Icon name="lucide:*" />`)
- **Fonts** — DM Sans (body), DM Serif Display (headings) via `@fontsource`

## Structure

```
src/
├── components/
│   ├── Header.astro      # Sticky nav, logo, language switcher, active link highlight
│   ├── Footer.astro      # © year + name, imprint/privacy links, admin link
│   └── PrivacyMap.astro  # Google Maps with GDPR consent overlay (localStorage-based)
├── layouts/
│   └── Layout.astro      # HTML shell, imports global CSS, wraps Header + Footer
├── lib/
│   └── i18n.ts           # Translation keys + getLang() helper
├── pages/
│   ├── index.astro       # Menu page (categories, products, lightbox)
│   ├── contact.astro     # Contact info, hours, social links, Google Maps (via PrivacyMap)
│   ├── imprint.astro     # Legal notice (LSSI-CE), company data from PB
│   └── privacy.astro     # Privacy policy (GDPR/LOPDGDD), consent management toggle
├── styles/
│   └── global.css        # Tailwind + theme colors + custom utilities
public/
└── allergens/            # 14 SVG allergen icons (filenames match i18n keys)
```

## Design System

Defined in `src/styles/global.css` via Tailwind v4 `@theme`:

| Token | Value | Usage |
|-------|-------|-------|
| `cream` / `cream-dark` | `#FFFFFF` / `#F5F5F5` | Backgrounds |
| `sand` / `sand-dark` | `#E5E5E5` / `#D4D4D4` | Borders, dividers |
| `bark` / `bark-light` | `#171717` / `#404040` | Primary text |
| `stone` / `stone-light` | `#737373` / `#A3A3A3` | Secondary text, labels |
| `accent` | `var(--accent, #171717)` | Dynamic brand color (set from PB) |
| `accent-light` | 10% mix of accent | Icon backgrounds |
| `font-sans` | DM Sans | Body text |
| `font-display` | DM Serif Display | Headings |

Custom CSS utilities:
- `.reveal` / `.reveal.visible` — Staggered entrance animation (opacity + translateY), use `style="transition-delay: Xms"` for stagger
- `.dotted-leader` — Dotted line between product name and price
- `.grain` — Subtle noise texture overlay
- `.no-scrollbar` — Hide scrollbar for horizontal nav

## i18n

`src/lib/i18n.ts` — ~45 translation keys, **7 languages**: es, de, en, it, ca, fr, nl.

- `t(key, lang)` — Returns translation, falls back to `es`
- `getLang(url, defaultLang)` — Reads `?lang=` param from URL
- Language selection persisted in `localStorage["menu-lang"]`
- Product/category translations come from PocketBase `translations` JSON field on each record, resolved via `tr(record, field, lang, defaultLang)`
- Legal page content (imprint, privacy) is provided as full-text templates per language (es, de, en) in each page's `<script>`, with company data interpolated. Other languages fall back to `es`.

## Data Loading Pattern

All pages load data client-side from PocketBase REST API:

1. Page shows loading spinner
2. `init()` fetches `company` + `website_config` collections
3. Calls `__initHeader(config, lang, t)` and `__initFooter(config, lang, t)` (globally exposed by Header/Footer components)
4. Sets `document.title` to `PageName | CompanyName` (translated)
5. Populates page content via `getElementById` + DOM manipulation
6. Hides loader, shows content, triggers `.reveal` animations

PocketBase URL: `http://localhost:8090` in dev, `""` (same origin) in production.

## PocketBase Collections Used

- `company` — Name, NIF, street, street_2, zip, city, phone, email, registry_entry, opening_hours (JSON array)
- `website_config` — logo, favicon, accent_color, languages (array), default_language, google_maps_url, social_instagram, social_facebook, social_whatsapp
- `products_categories` — name, description, image, sort, translations
- `products` — name, description, note, price_gross, image, category (relation), sort, allergens (array), translations

## Key Patterns

- **Dynamic page title**: Each page sets `document.title` to `PageName | CompanyName` after loading. The Go backend (`routes/og.go`) also replaces `<title>` server-side for crawlers.
- **Active nav link**: `Header.astro` script checks `window.location.pathname` and applies `bg-accent/10 text-accent` to matching nav link
- **Dynamic accent color**: Set from `website_config.accent_color` via `document.documentElement.style.setProperty("--accent", color)`
- **Product cards**: Two layouts — with image (thumbnail right, text left) and without image (dotted leader between name and price). Long product names wrap naturally (no `whitespace-nowrap`).
- **Allergens**: SVG icons in `/public/allergens/{key}.svg`, keys match i18n translation keys
- **PrivacyMap**: Google Maps iframe behind a GDPR consent overlay. Consent stored in `localStorage["maps-consent"]`. Can be revoked via toggle on `/privacy` page or `window.revokeMapConsent()`.
- **Legal pages**: Imprint and privacy pages use a section-based layout with company data card + staggered reveal sections. Content templates in es/de/en with company data placeholders.
