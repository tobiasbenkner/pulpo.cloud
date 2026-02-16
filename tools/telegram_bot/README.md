# @pulpo/telegram-bot

Telegram bot for managing weekly event agenda images via PocketBase, with n8n webhook integration.

Built with **Grammy** + **@grammyjs/conversations** + **PocketBase**.

## Features

- Multi-step conversation flows for event image uploads
- Weekday-based event management (flyer + additional events)
- View and delete existing events with interactive keyboards
- n8n webhook integration for weekly agenda resets
- Whitelist-based access control

## Getting Started

```bash
# Start PocketBase + bot in dev mode
pnpm dev

# Stop containers
pnpm dev:stop

# Build for production
pnpm build

# Run production build
pnpm start
```

### Environment Variables

```env
BOT_TOKEN=telegram-bot-token
ALLOWED_USER_IDS=123456,789012
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/...
POCKETBASE_URL=http://localhost:8090
POCKETBASE_EMAIL=admin@example.com
POCKETBASE_PASSWORD=secret
```

## Bot Commands

| Command / Button | Description |
|---|---|
| `/start` | Show main menu with keyboard buttons |
| "Reset Week" | Triggers n8n webhook to reset weekly agenda |
| "Upload Agenda" | Multi-step: weekday -> type (flyer/other) -> photo upload |
| "List Events" | View and delete events by weekday |

## Tech Stack

| Technology | Purpose |
|---|---|
| [Grammy](https://grammy.dev) | Telegram bot framework |
| [@grammyjs/conversations](https://grammy.dev/plugins/conversations) | Stateful multi-step flows |
| [PocketBase](https://pocketbase.io) | Backend storage (`dancing_agenda` collection) |

## Deployment

Production Docker image via multi-stage build (Node 22 slim + pnpm). PocketBase runs as a separate container via Docker Compose.
