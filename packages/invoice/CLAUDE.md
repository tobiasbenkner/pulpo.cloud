# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This package is part of the `pulpo.cloud` pnpm monorepo.

| Command | Description |
|---|---|
| `pnpm --filter @pulpo/invoice check-types` | TypeScript type checking |
| `pnpm --filter @pulpo/invoice test` | Run tests (vitest) |

No dev server or build step. This is a source-only package consumed via workspace dependency.

## Architecture

### Overview

A framework-agnostic, pure-function package for **invoice calculation** (totals, tax back-calculation, discounts). Uses `big.js` for precise decimal arithmetic. Consumed by both `@pulpo/shop` (frontend) and `pulpo-extension` (Directus backend) to ensure identical calculation results.

### Files

```
src/
├── index.ts          # Re-exports calculate + all types
├── types.ts          # Input/Output type definitions
├── calculate.ts      # calculateInvoice() — pure function
└── calculate.test.ts # Tests (vitest)
```

### Core Function

`calculateInvoice(items, globalDiscount?)` takes line items and an optional global discount, returns the full invoice calculation:

1. **Item discounts**: Per-line `percent` or `fixed` discount applied to `priceGross × quantity`, clamped to 0
2. **Subtotal**: Sum of all line gross amounts (after item discounts)
3. **Global discount**: Applied to subtotal (`percent` or `fixed`), clamped to 0
4. **Discount ratio**: `finalTotalGross / subtotalGross` distributes global discount proportionally across tax groups
5. **Cent correction**: Rounded group gross values are adjusted so their sum equals the rounded total gross (correction applied to the largest group)
6. **Tax back-calculation**: Per group: `net = groupGross / (1 + rate)` rounded to 2dp, `tax = groupGross - net`
7. **Tax breakdown**: Grouped by rate, sorted ascending
8. **Totals**: Derived from breakdown sums. Invariant: `net + tax === gross`

### Types

**Input:**
- `InvoiceLineInput` — Product ID, name, gross price (string), tax rate (percentage string like `"7"` for 7%), quantity, optional line discount (`{ type, value }`), optional cost center
- `InvoiceDiscountInput` — Global discount with `type` (`"percent"` | `"fixed"`) and `value` (number)

**Output:**
- `InvoiceCalculationResult` — `subtotal`, `discountTotal`, `gross`, `net`, `tax` (all string 2dp), `taxBreakdown`, `items`, `count`, `discountType`, `discountValue` (string 4dp or null)
- `InvoiceLineResult` — `productId`, `productName`, `quantity`, `priceGrossUnit` (string 4dp), `taxRateSnapshot` (string 2dp like `"7.00"`), `rowTotalGross` (string 2dp), `discountType`/`discountValue`, `costCenter`
- `TaxBreakdownEntry` — `rate` (percentage string 2dp), `net` (string 2dp), `tax` (string 2dp)

### Decimal Strategy

All monetary values are `string` types, never `number`. Internal arithmetic uses `big.js`. Output precision:
- Monetary totals: `.toFixed(2)`
- Unit prices / discount values: `.toFixed(4)`
- Tax rate snapshots: percentage with `.toFixed(2)` (e.g. `"7.00"`)

### Consumers

- **`@pulpo/shop`** (`apps/shop/src/stores/cartStore.ts`) — `cartTotals` computed store maps cart items to `InvoiceLineInput[]`, resolving tax rates from `taxRates` store.
- **`pulpo-extension`** (`packages/directus-extension/src/routes/invoice-create.ts`) — Server-side calculation after loading product prices and tax rates from DB.
