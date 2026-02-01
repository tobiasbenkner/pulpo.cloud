# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start PocketBase container + bot in dev mode (tsx) |
| `pnpm dev:stop` | Stop Docker containers |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run production build (`node dist/bot.js`) |

## Architecture

Telegram bot built with **Grammy** + **@grammyjs/conversations** that manages event uploads to **PocketBase**, with **n8n** webhook integration for workflow automation.

### Source Structure

- `src/bot.ts` — Entry point. Sets up middleware pipeline: access control → conversations plugin → command/text handlers.
- `src/config.ts` — Validates and exports all required env vars. Fails fast on missing config.
- `src/services/pocketbase.ts` — Singleton PocketBase client with lazy authentication via `_superusers`. Only writes (creates `events` records with type, weekday, image).
- `src/handlers/start.ts` — `/start` command. Shows persistent reply keyboard with "Reset Week" and "Upload Event" buttons.
- `src/handlers/resetWeek.ts` — POSTs to n8n webhook URL.
- `src/handlers/uploadEvent.ts` — Multi-step conversation: event type → weekday → photo upload → PocketBase create. Uses `conversation.external()` for async ops (fetch, PocketBase calls).

### Key Patterns

- **Access control** is middleware-based — checks `ctx.from.id` against `ALLOWED_USER_IDS` whitelist, silently drops unauthorized users.
- **Conversations** use `@grammyjs/conversations` for stateful multi-step flows (`waitForCallbackQuery`, `waitFor("message:photo")`).
- **PocketBase auth** is lazy-cached — `ensureAuth()` only re-authenticates when `authStore.isValid` is false.
- **All imports use `.js` extensions** (required for ESM with `"type": "module"`).

### Infrastructure

- `docker-compose.yml` — PocketBase container only (bot runs locally in dev). Persistent `pb_data` volume. Admin credentials injected from `.env`.
- `Dockerfile` — Multi-stage build (Node 22 slim + pnpm via corepack) for production bot container.

## Environment Variables (all required)

```
BOT_TOKEN              # Telegram bot token
ALLOWED_USER_IDS       # Comma-separated Telegram user IDs
N8N_WEBHOOK_URL        # n8n webhook for reset workflow
POCKETBASE_URL         # e.g. http://localhost:8090
POCKETBASE_EMAIL       # PocketBase admin email
POCKETBASE_PASSWORD    # PocketBase admin password
```
