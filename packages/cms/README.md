# @pulpo/cms

Shared Directus SDK wrapper with typed collections and API helpers for the pulpo.cloud platform.

Provides a single entry point for all CMS operations: client creation, type definitions, and domain-specific query functions.

## Usage

```typescript
import { createClient, getCategoriesWithProducts, getTenant } from '@pulpo/cms';

const client = createClient(url, token);
const categories = await getCategoriesWithProducts(client, { tenant: 'my-tenant' });
const tenant = await getTenant(client, 'my-tenant');
```

## Exports

### Client

- `createClient(url?, token?)` — Authenticated Directus client (REST + WebSocket)
- `createClientPublic(url?)` — Public Directus client (REST only)
- `DIRECTUS_URL` — Default Directus URL from env

### Utilities

- `getAssetUrl(id, cmsUrl, token, options?)` — Asset URL with optional transforms
- `imageUrl(id, width?)` — Simplified image URL (default 800px)
- `reduceTranslations(trans, fieldName)` — Convert translation arrays to `{ langCode: value }` maps

### API Modules

| Module | Functions |
|---|---|
| Products | `getCategoriesWithProducts()`, `updateProductStock()` |
| Invoices | `createInvoice()`, `getInvoices()`, `getInvoice()`, `rectifyInvoice()`, `updateInvoicePaymentMethod()` |
| Customers | `getCustomers()`, `searchCustomers()`, `createCustomer()`, `updateCustomer()`, `deleteCustomer()` |
| Tax | `getTaxRulesForPostcode()` |
| Cash Register | `openClosure()`, `closeClosure()`, `getOpenClosure()`, `getClosuresForDate()`, `getLastClosure()` |
| Reports | `getReport()`, `backfillClosures()` |
| Tenant | `getTenant()`, `getOpeningHours()` |
| Agenda | `createReservation()`, `updatedReservation()`, `toggleArrived()`, `deleteReservation()`, `readReservation()`, `listReservations()`, `listReservationTurns()` |
| Auth | `getProfile()`, `listUsers()` |
| Blog | `getBlogCategories()`, `getBlogPosts()` |
| Events | `getEvents()` |
| Languages | `getLanguages()` |

### Types

Full TypeScript interfaces for all Directus collections: `Invoice`, `InvoiceItem`, `InvoicePayment`, `Customer`, `Product`, `ProductCategory`, `TaxClass`, `TaxZone`, `TaxRule`, `Reservation`, `ReservationTurn`, `CashRegisterClosure`, `AggregatedReport`, `BlogPost`, `Event`, `Tenant`, `Language`, `User`, and more.

## Tech Stack

| Technology | Purpose |
|---|---|
| [@directus/sdk](https://docs.directus.io) | Directus API client |
| TypeScript | Type-safe collection definitions |
