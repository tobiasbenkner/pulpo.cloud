#!/bin/bash
set -euo pipefail

# --- Config ---
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Env TELEGRAM_BOT_TOKEN is required}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:?Env TELEGRAM_CHAT_ID is required}"
HOSTNAME=$(hostname)
LOGFILE=$(mktemp)

# --- Telegram helpers ---
send_telegram() {
  local message="$1"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d chat_id="$TELEGRAM_CHAT_ID" \
    -d parse_mode="Markdown" \
    -d text="$message" > /dev/null
}

# --- Cleanup: always restart containers ---
CONTAINERS=""
cleanup() {
  if [ -n "$CONTAINERS" ]; then
    echo "Starting containers again..."
    docker start $CONTAINERS || true
  fi
  rm -f "$LOGFILE"
}
trap cleanup EXIT

# --- Error handler ---
on_error() {
  local line=$1
  local cmd=$2
  local errors
  errors=$(tail -20 "$LOGFILE" 2>/dev/null || echo "no log available")
  local msg="*Backup fehlgeschlagen* on \`${HOSTNAME}\`

*Line:* \`${line}\`
*Command:* \`${cmd}\`
*Error:*
\`\`\`
${errors}
\`\`\`
*Date:* $(date '+%Y-%m-%d %H:%M:%S')"
  echo "ERROR at line $line: $cmd"
  send_telegram "$msg"
}
trap 'on_error ${LINENO} "$BASH_COMMAND"' ERR

# Redirect stderr to logfile (and still show in terminal)
exec 2> >(tee -a "$LOGFILE" >&2)

# --- Start ---
mkdir -p "$BACKUP_DIR"
echo "=== Backup started: $(date) ==="
echo "Target: $BACKUP_DIR"

# Stop all running containers
CONTAINERS=$(docker ps -q)
if [ -n "$CONTAINERS" ]; then
  echo "Stopping all containers..."
  docker stop $CONTAINERS
else
  echo "No running containers."
fi

# Backup all Docker volumes
echo "=== Backing up Docker volumes ==="
for VOLUME in $(docker volume ls -q); do
  echo "Backing up volume: $VOLUME"
  docker run --rm \
    -v "$VOLUME":/data \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/volume_${VOLUME}.tar.gz" -C /data .
  echo "  -> volume_${VOLUME}.tar.gz"
done

# Backup /srv
echo "=== Backing up /srv ==="
tar czf "$BACKUP_DIR/srv.tar.gz" -C / srv
echo "  -> srv.tar.gz"

echo "=== Backup finished: $(date) ==="
echo "Files:"
ls -lh "$BACKUP_DIR"

# Success notification
FILECOUNT=$(ls -1 "$BACKUP_DIR" | wc -l | tr -d ' ')
TOTALSIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
send_telegram "*Backup erfolgreich* on \`${HOSTNAME}\`
Files: ${FILECOUNT}
Size: ${TOTALSIZE}
Date: $(date '+%Y-%m-%d %H:%M:%S')"
