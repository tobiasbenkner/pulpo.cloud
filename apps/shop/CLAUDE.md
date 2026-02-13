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
- `src/components/` — Svelte 5 components (ProductCard, CartSidebar, modals)
- `src/stores/cartStore.ts` — Cart state, discounts, transactions, computed totals
- `src/stores/taxStore.ts` — Tax rates (loaded from CMS at startup)
- `src/stores/productStore.ts` — Product loading, stock management, auto-refresh
- `src/stores/printerStore.ts` — Thermal printing via `printInvoice(invoice)`
- `src/stores/registerStore.ts` — Cash register open/close state
- `src/types/shop.ts` — TypeScript interfaces (Product, CartItem, Customer, etc.)
- `src/layouts/ShopLayout.astro` — Master layout with product grid + 340px cart sidebar + modal layers

### State Management (nanostores)

**Persistent (localStorage):** `cartItems`, `lastTransaction`, `parkedCarts`, `globalDiscount`, `shouldPrintReceipt`

**Session (in-memory atoms):** modal open states, `selectedCustomer`, `taxRates`, `taxLoaded`

**Computed:** `cartTotals` derives subtotal, discount, gross, net, tax, taxBreakdown, per-item invoice data, and count from `cartItems` + `globalDiscount` + `taxRates`

### Svelte 5 Runes

Components use Svelte 5 runes (`$state`, `$derived`, `$props`). The `svelte.config.js` does NOT set `runes: true` globally — runes mode is inferred per-component. Nanostore subscriptions happen via `onMount` with manual `.subscribe()` calls, assigning to `$state` variables for template reactivity.

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
4. Result is a `Record<classCode, rate>` stored in the `taxRates` atom (rates as decimal strings, e.g. `"0.07"`)
5. If the API call fails, `taxRates` remains empty and all rates default to `"0"` via `rates[item.taxClass] ?? "0"`

**CMS Collections** (Directus):
- `tax_classes` — Tax class definitions with `code` (e.g. `STD`, `RED`)
- `tax_zones` — Geographic zones with `regex` for postcode matching and `priority` for ordering
- `tax_rules` — Links a `tax_zone_id` + `tax_class_id` to a `rate` and `surcharge`

### Decimal Type Strategy

All monetary values and tax rates flow as **strings** from DB to frontend. No `number` type for decimals anywhere in the chain.

| Layer | Type | Example |
|-------|------|---------|
| Directus DB | `decimal(19,x)` | `"3.5000"` |
| CMS types (`@pulpo/cms`) | `string` | `"3.5000"` |
| Shop stores | `string` | `"3.5000"` |
| Arithmetic | `big.js` (`Big`) | full precision |
| Output / DB write | `string` via `.toFixed(n)` | `"3.27102804"` |
| UI display | `string` via `.toFixed(2)` | `"3.50"` |

DB field precisions:
- `price_gross`: `decimal(19,4)` → `.toFixed(4)`
- `price_net_unit_precise`, `row_total_net_precise`: `decimal(19,8)` → `.toFixed(8)`
- `row_total_gross`: `decimal(19,2)` → `.toFixed(2)`
- `tax_rate_snapshot`: `decimal(5,2)` → stored as percentage (e.g. `"7.00"` for 7%)
- `total_net`, `total_tax`, `total_gross`: `decimal(19,2)` → `.toFixed(2)`

### Price & Tax Calculation (`cartTotals` computed)

All arithmetic uses `big.js` for precision (20 decimal places internally). Prices are stored and displayed as **gross** (tax-inclusive).

1. **Line gross**: `priceGross * quantity`, then subtract item-level discount (fixed or percent)
2. **Subtotal**: Sum of all line gross values (before global discount)
3. **Global discount**: Applied to subtotal (fixed amount or percentage), producing `finalTotalGross`
4. **Tax back-calculation**: For each item, the global discount is distributed proportionally (`discountRatio = finalTotalGross / subtotal`). Net per line: `lineGrossAfterGlobal / (1 + rate)`, rounded to 8 decimal places. `total_net` is the sum of these rounded line values, ensuring `sum(rowTotalNetPrecise) == total_net` with zero cent differences. `total_tax = gross - net`.
5. **Per-item data**: Each item produces a `CartTotalsItem` with `priceGrossUnit`, `taxRateSnapshot`, `priceNetUnitPrecise`, `rowTotalGross`, `rowTotalNetPrecise` — ready for `InvoiceItem` creation.
6. **Tax breakdown**: Tax amounts grouped by rate for display in the sidebar (e.g. "IGIC 7%: 0.65 EUR").

### Discounts

Two levels, both support `"percent"` or `"fixed"` types:
- **Item-level**: Stored as `CartItem.discount`, applied before subtotal
- **Global**: Stored in `globalDiscount` atom, applied to the subtotal

### Invoice System

**Transaction types** (determined by customer presence):
- No customer selected → `"ticket"` (simplified receipt)
- Customer selected → `"invoice"` (full invoice with customer data)

**Invoice structure** (Directus `invoices` collection, all monetary fields are `string`):
- `Invoice`: header with `total_net`, `total_tax`, `total_gross`, `invoice_number`, `tenant`, `status` (`draft`/`paid`/`cancelled`), VeriFactu fields (`previous_record_hash`, `chain_hash`, `qr_url`, `generation_date`). `invoice_number` and VeriFactu fields are generated server-side via Directus hooks/flows.
- `InvoiceItem`: per-line with `product_id`, `quantity`, `price_gross_unit` (19,4), `price_net_unit_precise` (19,8), `row_total_net_precise` (19,8), `row_total_gross` (19,2), `tax_rate_snapshot` (5,2 as percentage), `discount_type`, `discount_value`. Data comes from `cartTotals.items`.
- `InvoicePayment`: payment method (`cash`/`card`), `amount`, `tendered`, `change`, `tip`

**API** (`@pulpo/cms`): `createInvoice()` creates invoice with nested items and payments in one Directus request. `tenant` is set server-side by the invoice-processor extension. `getInvoices()` and `getInvoice()` read with all relations.

**Server-side** (`apps/directus/extensions/invoice-processor/`): Custom Directus endpoint extension that handles invoice creation (`POST /invoices`). Generates `invoice_number` from tenant prefix + counter, assigns `tenant` to invoice/items/payments, finds open cash register closure, decrements product stock (`GREATEST(stock - qty, 0)`), and returns the full invoice.

### Printing

All print paths use a single `printInvoice(invoice: Invoice)` function in `printerStore.ts`. It maps `Invoice` data (snake_case) to the internal receipt format, computes tax breakdown from items, and sends ESC/POS commands to a thermal printer service. Three call sites:

1. **Checkout** (`cartStore.completeTransaction`): prints after successful `createInvoice()` API call
2. **Reprint** (`LastChangeWidget`): loads invoice via `getInvoice()` API, then prints
3. **Invoice list** (`ShiftInvoicesModal`): prints any invoice from the shift list

### Stock Management

- Products have an optional `stock` field (nullable integer, `null` = no tracking)
- **Server-side**: invoice-processor decrements stock on invoice creation with `GREATEST(stock - qty, 0)` (never goes negative)
- **Client-side optimistic update**: `decrementStock()` in productStore immediately reduces displayed stock after a sale
- **Auto-refresh**: `startAutoRefresh()` polls products every 15 minutes + on `visibilitychange` (tab becomes active). Cleanup via `onDestroy` in `ShopApp.svelte`
- **Out-of-stock products are still sellable** — they show a warning indicator (orange triangle + "Agotado" label) but are not disabled, since stock may be inaccurate

### Parked Carts

Carts can be parked (saved) and restored later. A `ParkedCart` stores all `cartItems`, the `customer`, and the `globalDiscount` so the full state is preserved.

### Environment Variables

- `PUBLIC_TENANT_POSTCODE` — Tenant postcode for tax zone lookup (e.g. `35001`)
- `DIRECTUS_URL` / `DIRECTUS_TOKEN` — CMS connection (via `@pulpo/auth`)

### Missing Features

- Rectificativa (invoice correction)
- Customer assignment to invoices
