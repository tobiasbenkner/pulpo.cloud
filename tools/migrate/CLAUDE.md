# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---|---|
| `pnpm migrate` | Run migration (`tsx src/index.ts`) |

This is a one-time migration tool. No dev server, build, or tests configured.

## Architecture

### Overview

One-time data migration tool from **PocketBase** to **Directus CMS**. Migrates products, categories, and blog posts with images and multilingual translations.

### Source Files

- `src/index.ts` — Main migration: categories and products
- `src/blog.ts` — Blog post migration (separate entry point)

### Migration Flow (`index.ts`)

**Categories:**
1. Fetch all categories from PocketBase
2. Download category images from PocketBase URL
3. Upload images to Directus (hardcoded folder UUID)
4. Create category records with multilingual translations (es, en, de)
5. Build ID mapping: PocketBase ID -> Directus UUID

**Products:**
1. Fetch all products from PocketBase
2. Download product images
3. Upload to Directus (different folder UUID)
4. Resolve category via ID map
5. Create product with translations, pricing, allergies, tax info

**Blog Posts** (`blog.ts`):
1. Fetch articles from PocketBase
2. Download and upload images
3. Create posts with translations and SEO metadata
4. Assign to categories (real estate or insurance)

### Key Patterns

- Image transfer: download from PocketBase as `arraybuffer`, upload to Directus via `FormData`
- ID mapping: `Map<string, string>` to resolve PocketBase -> Directus references
- Hardcoded Directus folder UUIDs for asset organization
- Multilingual: creates separate translation records for each language

### Environment Variables (all required)

- `PB_URL`, `PB_EMAIL`, `PB_PASSWORD` — PocketBase connection
- `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `DIRECTUS_TENANT` — Directus connection
