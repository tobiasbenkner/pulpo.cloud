# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This package is part of the `pulpo.cloud` pnpm monorepo.

| Command | Description |
|---|---|
| `pnpm --filter @pulpo/invoice check-types` | TypeScript type checking |

No dev server, build step, or tests configured. This is a source-only package consumed via workspace dependency.

## Architecture

### Overview

A framework-agnostic, pure-function package for **invoice calculation** (totals, tax back-calculation, discounts). Uses `big.js` for precise decimal arithmetic. Consumed by both `@pulpo/shop` (frontend) and `pulpo-extension` (Directus backend) to ensure identical calculation results.

### Files

```
src/
├── index.ts       # Re-exports calculate + all types
├── types.ts       # Input/Output type definitions
└── calculate.ts   # calculateInvoice() — pure function
```

### Core Function

`calculateInvoice(items, globalDiscount?)` takes line items and an optional global discount, returns the full invoice calculation:

1. **Item discounts**: Per-line `percent` or `fixed` discount applied to `priceGross × quantity`
2. **Subtotal**: Sum of all line gross amounts (after item discounts)
3. **Global discount**: Applied to subtotal (`percent` or `fixed`)
4. **Tax back-calculation**: `lineNet = lineGrossAfterDiscount / (1 + taxRate)`, rounded to 8 decimal places
5. **Tax breakdown**: Grouped by rate, sorted ascending
6. **Totals**: `gross`, `net`, `tax` (= gross - net), `subtotal`, `discountTotal`

### Types

**Input:**
- `InvoiceLineInput` — Product ID, name, gross price (string), tax rate (percentage string like `"7"` for 7%), quantity, optional line discount, optional cost center
- `InvoiceDiscountInput` — Global discount with `type` (`"percent"` | `"fixed"`) and `value`

**Output:**
- `InvoiceCalculationResult` — Totals, tax breakdown, computed items, count, discount info
- `InvoiceLineResult` — Per-line computed values (gross unit, net unit precise, row totals, tax rate snapshot as percentage like `"7.00"`)
- `TaxBreakdownEntry` — Rate (decimal) + amount

### Decimal Strategy

All monetary values are `string` types, never `number`. Internal arithmetic uses `big.js`. Output precision:
- Monetary totals: `.toFixed(2)`
- Unit prices: `.toFixed(4)`
- Precise net values: `.toFixed(8)`
- Tax rate snapshots: percentage with `.toFixed(2)` (e.g. `"7.00"`)

### Consumers

- **`@pulpo/shop`** (`apps/shop/src/stores/cartStore.ts`) — `cartTotals` computed store maps cart items to `InvoiceLineInput[]`, resolving tax rates from `taxRates` store. Types `CartTotals` and `CartTotalsItem` are re-exported aliases from this package.
- **`pulpo-extension`** (`packages/directus-extension/src/routes/invoice-create.ts`) — Server-side calculation after loading product prices and tax rates from DB.
