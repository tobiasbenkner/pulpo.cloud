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

A **Point-of-Sale (POS) application** built with Astro 5 + Tailwind CSS v4 + nanostores. Products and tax rates are loaded from Directus CMS at startup. State is client-side with localStorage persistence.

### Key Directories

- `src/pages/` — Single page app (`index.astro` is the only route)
- `src/components/` — Astro components (ProductCard, CartSidebar, modals)
- `src/stores/cartStore.ts` — Cart state, discounts, transactions, computed totals
- `src/stores/taxStore.ts` — Tax rates (loaded from CMS, fallback to hardcoded)
- `src/stores/productStore.ts` — Product loading from CMS API
- `src/types/shop.ts` — TypeScript interfaces (Product, CartItem, Customer, etc.)
- `src/layouts/ShopLayout.astro` — Master layout with product grid + 340px cart sidebar + modal layers

### State Management (nanostores)

**Persistent (localStorage):** `cartItems`, `lastTransaction`, `parkedCarts`, `globalDiscount`, `shouldPrintReceipt`

**Session (in-memory atoms):** modal open states, `selectedCustomer`, `taxRates`, `taxLoaded`

**Computed:** `cartTotals` derives subtotal, discount, gross, net, tax, and count from `cartItems` + `globalDiscount` + `taxRates`

### Cross-Component Communication

Components communicate via `window.shop` and `window.cartActions` objects exposed by inline `<script>` tags in `ShopLayout.astro`. Components subscribe to nanostores for reactive DOM updates.

### Tax System

IGIC (Canary Islands) tax system with dynamic rates loaded from Directus CMS.

**Tax Classes** (`TaxClassCode` in `types/shop.ts`):
- `STD` (7%) — Standard IGIC rate
- `RED` (3%) — Reduced rate
- `INC` (9.5%) — Incrementado rate
- `SUPER_RED` (0%) — Super-reduced rate
- `NULL` (0%) — Null rate
- `ZERO` (0%) — Zero-rated / exempt

**How rates are determined:**
1. At app start, `productStore.loadProducts()` triggers `taxStore.loadTaxRates(postcode)`
2. The postcode comes from `PUBLIC_TENANT_POSTCODE` env var (e.g. `35001`)
3. `getTaxRulesForPostcode()` in `@pulpo/cms` loads all `tax_zones` sorted by priority, matches the postcode against each zone's regex, then loads `tax_rules` for the matched zone
4. Result is a `Record<classCode, rate>` stored in the `taxRates` atom
5. Hardcoded Canary Islands defaults are used as fallback if the API call fails

**CMS Collections** (Directus):
- `tax_classes` — Tax class definitions with `code` (e.g. `STD`, `RED`)
- `tax_zones` — Geographic zones with `regex` for postcode matching and `priority` for ordering
- `tax_rules` — Links a `tax_zone_id` + `tax_class_id` to a `rate` and `surcharge`

### Price & Tax Calculation (`cartTotals` computed)

All arithmetic uses `big.js` for precision. Prices are stored and displayed as **gross** (tax-inclusive).

1. **Line gross**: `priceGross * quantity`, then subtract item-level discount (fixed or percent)
2. **Subtotal**: Sum of all line gross values (before global discount)
3. **Global discount**: Applied to subtotal (fixed amount or percentage), producing `finalTotalGross`
4. **Tax back-calculation**: For each item, the global discount is distributed proportionally (`discountRatio = finalTotalGross / subtotal`). Net per line: `lineGrossAfterGlobal / (1 + rate)`. Total tax = `gross - net`.

### Discounts

Two levels, both support `"percent"` or `"fixed"` types:
- **Item-level**: Stored as `CartItem.discount`, applied before subtotal
- **Global**: Stored in `globalDiscount` atom, applied to the subtotal

### Invoice System

**Transaction types** (determined by customer presence):
- No customer selected → `"ticket"` (simplified receipt)
- Customer selected → `"invoice"` (full invoice with customer data)

**Invoice structure** (Directus `invoices` collection):
- `Invoice`: header with `total_net`, `total_tax`, `total_gross`, `invoice_number`, `tenant`, `status` (`draft`/`paid`/`cancelled`), VeriFactu fields (`previous_record_hash`, `chain_hash`, `qr_url`, `generation_date`)
- `InvoiceItem`: per-line with `quantity`, `price_gross_unit`, `price_net_unit_precise`, `row_total_net_precise`, `row_total_gross`, `tax_rate_snapshot` (rate frozen at time of sale)
- `InvoicePayment`: payment method (`cash`/`card`), `amount`, `tendered`, `change`, `tip`

**API** (`@pulpo/cms`): `createInvoice()` creates invoice with nested items and payments in one request. `getInvoices()` and `getInvoice()` read with all relations.

### Parked Carts

Carts can be parked (saved) and restored later. A `ParkedCart` stores all `cartItems`, the `customer`, and the `globalDiscount` so the full state is preserved.

### Environment Variables

- `PUBLIC_TENANT_POSTCODE` — Tenant postcode for tax zone lookup (e.g. `35001`)
- `DIRECTUS_URL` / `DIRECTUS_TOKEN` — CMS connection (via `@pulpo/auth`)

### Missing Features (from README)

- Rectificativa (invoice correction)
- Caja cerrar (till closure/end-of-day)
