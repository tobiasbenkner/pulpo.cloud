# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---|---|
| `pnpm migrate` | Run migration (`tsx src/index.ts`) |

This is a one-time migration tool. No dev server, build, or tests configured.

## Architecture

### Overview

One-time migration tool for **reservation data** from PocketBase to Directus. Handles user ID mapping and batch processing.

### Source Files

- `src/index.ts` — Single migration script

### Migration Flow

1. Authenticate with PocketBase (superuser)
2. Fetch all reservations from PocketBase `reservations` collection
3. Transform each record:
   - Map PocketBase user ID to Directus UUID (hardcoded map for 5 users)
   - Convert `person_count` from string to number
   - Rename `was_there` to `arrived`
   - Add `tenant` from environment
4. Batch upload to Directus in chunks of 200 records

### Key Patterns

- Hardcoded user ID mapping (PocketBase ID -> Directus UUID) for 5 specific users
- Batch processing: splits records into chunks of 200 for Directus bulk create
- Field transformations during migration (type conversions, renames)

### Environment Variables (all required)

- `PB_URL`, `PB_EMAIL`, `PB_PASSWORD` — PocketBase connection
- `DIRECTUS_URL`, `DIRECTUS_TOKEN`, `DIRECTUS_TENANT` — Directus connection
