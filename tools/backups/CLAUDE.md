# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---|---|
| `./run.sh` | Run backup manually |

Typically runs as a daily cronjob at 3 AM (as root). No package.json — pure Bash script.

## Architecture

### Overview

Automated **Docker volume and server backup** system. Backs up all Docker volumes and `/srv` as tar.gz archives, uploads to MinIO (S3-compatible storage), and sends Telegram notifications. Manages retention by deleting old backups.

### Files

- `run.sh` — Main backup script (Bash)
- `.env.example` — Environment variable template
- `readme.md` — German documentation

### Backup Flow (`run.sh`)

1. **Stop** all running Docker containers
2. **Backup Docker volumes**: iterates all volumes (skips anonymous 64-char hex names), creates `volume_{name}.tar.gz` for each
3. **Backup `/srv`**: creates `srv.tar.gz`
4. **Upload to MinIO**: configures `mc` alias, creates bucket if needed, uploads `BUCKET/YYYY-MM-DD/`
5. **Retention cleanup**: lists all backup directories on MinIO, deletes those older than `MINIO_RETENTION_DAYS` (default 30)
6. **Restart** all Docker containers (via `trap` on EXIT — runs even on failure)
7. **Cleanup** local backup directory
8. **Notify** via Telegram with file count and total size

### Error Handling

- `set -euo pipefail` — Strict mode
- `trap` on ERR — Sends last 20 lines of log to Telegram on failure
- `trap` on EXIT — Always restarts Docker containers and cleans up

### Environment Variables (all required)

- `TELEGRAM_BOT_TOKEN` — Telegram bot for notifications
- `TELEGRAM_CHAT_ID` — Telegram chat for notifications
- `MINIO_ENDPOINT` — MinIO server URL
- `MINIO_ACCESS_KEY` — MinIO credentials
- `MINIO_SECRET_KEY` — MinIO credentials
- `MINIO_BUCKET` — Target bucket name
- `MINIO_RETENTION_DAYS` — Days to keep backups (default 30)

### Prerequisites

- MinIO Client (`mc`) installed at `/usr/local/bin/mc`
- Docker runtime
- Root access (for cron, container control, volume access)

### Cronjob Setup

```bash
# /etc/crontab (as root)
PATH=/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin
LD_LIBRARY_PATH=/usr/local/lib
0 3 * * * /srv/backups/run.sh >> /var/log/backup.log 2>&1
```
