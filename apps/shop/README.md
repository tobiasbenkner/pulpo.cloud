# @pulpo/shop

Point-of-Sale (POS) application for the pulpo.cloud platform.

Built with **Astro 5** + **Svelte 5** + **Tailwind CSS v4** + **nanostores**. Products, tax rates, and tenant data are loaded from Directus CMS. State is client-side with localStorage persistence.

## Features

- Product grid with categories, stock tracking, and custom amounts
- Cart with item-level and global discounts
- Multi-region Spanish tax system (IGIC / IVA / IPSI)
- Invoice generation (ticket, factura, rectificativa) compliant with RD 1619/2012
- Customer management with invoice denormalization
- Cash register open/close with shift closures
- Thermal receipt printing (ESC/POS)
- Reports: daily, weekly, monthly, quarterly, yearly
- Parked carts for saving and restoring orders
- Cost center tracking for product reporting

## Getting Started

```bash
# From monorepo root
pnpm install
pnpm --filter @pulpo/shop dev
```

### Environment Variables

- `DIRECTUS_URL` — Directus instance URL
- `DIRECTUS_TOKEN` — API token

## Tech Stack

| Technology | Purpose |
|---|---|
| [Astro 5](https://astro.build) | Static site framework |
| [Svelte 5](https://svelte.dev) | Interactive components (runes) |
| [Tailwind CSS v4](https://tailwindcss.com) | Styling |
| [nanostores](https://github.com/nanostores/nanostores) | Client-side state management |
| [big.js](https://github.com/MikeMcl/big.js) | Decimal arithmetic |
| [Directus](https://directus.io) | Headless CMS backend |
| [lucide-svelte](https://lucide.dev) | Icons |

## Deployment

Deployed as a Docker container via `pnpm --filter @pulpo/shop deploy`.
