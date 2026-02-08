# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This app is part of the `pulpo.cloud` pnpm monorepo. Run commands from the monorepo root or use the filter flag.

| Command | Description |
|---------|-------------|
| `pnpm --filter @pulpo/shop dev` | Start dev server (Astro) |
| `pnpm --filter @pulpo/shop build` | Build for production |
| `pnpm --filter @pulpo/shop preview` | Preview production build |
| `pnpm check-types` | TypeScript type checking (monorepo-wide) |

No test framework is configured for this app.

## Architecture

### Overview

A **Point-of-Sale (POS) application** built with Astro 5 + Tailwind CSS v4 + nanostores. It runs entirely client-side with localStorage persistence (no backend API yet). Product data is currently hardcoded in `index.astro`.

### Key Directories

- `src/pages/` — Single page app (`index.astro` is the only route)
- `src/components/` — Astro components (ProductCard, CartSidebar, modals)
- `src/stores/cartStore.ts` — All state management and business logic
- `src/types/shop.ts` — TypeScript interfaces (Product, CartItem, Customer, etc.)
- `src/layouts/ShopLayout.astro` — Master layout with product grid + 340px cart sidebar + modal layers

### State Management (nanostores)

All state lives in `src/stores/cartStore.ts`. Two categories:

**Persistent (localStorage):** `cartItems`, `lastTransaction`, `parkedCarts`, `globalDiscount`, `shouldPrintReceipt`

**Session (in-memory atoms):** modal open states, `selectedCustomer`

**Computed:** `cartTotals` derives subtotal, discount, gross, net, tax, and count from `cartItems` + `globalDiscount`

### Cross-Component Communication

Components communicate via `window.shop` and `window.cartActions` objects exposed by inline `<script>` tags in `ShopLayout.astro`. Components subscribe to nanostores for reactive DOM updates.

### Tax System

Uses IGIC (Canary Islands) tax rates calculated backwards from gross prices:
- `STD`: 7%, `RED`: 3%, `ZERO`: 0%

### Missing Features (from README)

- Rectificativa (invoice correction)
- Show list (parked carts UI)
- Caja cerrar (till closure/end-of-day)
- Backend integration
