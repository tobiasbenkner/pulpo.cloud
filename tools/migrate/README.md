# migrate

One-time data migration tool from PocketBase to Directus CMS.

Migrates **products**, **categories**, and **blog posts** with images and multilingual translations (Spanish, English, German).

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

| Source (PocketBase) | Target (Directus) |
|---|---|
| Categories + images | `categories` + `categories_translations` |
| Products + images + allergies | `products` + `products_translations` |
| Blog articles + images | `posts` + translations |

## Tech Stack

| Technology | Purpose |
|---|---|
| [PocketBase SDK](https://pocketbase.io) | Source data access |
| [@directus/sdk](https://docs.directus.io) | Target data access |
| [axios](https://axios-http.com) | Image downloads |
| [tsx](https://github.com/privatenumber/tsx) | TypeScript runtime |
