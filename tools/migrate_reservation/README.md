# migrate_reservation

One-time migration tool for restaurant reservation data from PocketBase to Directus CMS.

Migrates reservations with user mapping and batch processing (200 records per batch).

## Usage

```bash
pnpm migrate
```

### Environment Variables

```env
PB_URL=http://localhost:8090
PB_EMAIL=admin@example.com
PB_PASSWORD=secret
DIRECTUS_URL=https://admin.pulpo.cloud
DIRECTUS_TOKEN=your-token
DIRECTUS_TENANT=tenant-id
```

## What It Migrates

| Field (PocketBase) | Field (Directus) | Transform |
|---|---|---|
| `person_count` (string) | `person_count` (number) | Parse to int |
| `was_there` | `arrived` | Rename |
| User IDs | User UUIDs | Hardcoded mapping |
| — | `tenant` | Added from env |

## Tech Stack

| Technology | Purpose |
|---|---|
| [PocketBase SDK](https://pocketbase.io) | Source data access |
| [@directus/sdk](https://docs.directus.io) | Target data access |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript runtime |
