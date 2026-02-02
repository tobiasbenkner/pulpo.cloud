#!/bin/bash
set -euo pipefail

# --- Load .env ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  set -a
  source "$SCRIPT_DIR/.env"
  set +a
fi

# --- Config ---
BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?Env TELEGRAM_BOT_TOKEN is required}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:?Env TELEGRAM_CHAT_ID is required}"
MINIO_ENDPOINT="${MINIO_ENDPOINT:?Env MINIO_ENDPOINT is required}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:?Env MINIO_ACCESS_KEY is required}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:?Env MINIO_SECRET_KEY is required}"
MINIO_BUCKET="${MINIO_BUCKET:?Env MINIO_BUCKET is required}"
MINIO_RETENTION_DAYS="${MINIO_RETENTION_DAYS:-30}"
HOSTNAME=$(hostname)
LOGFILE=$(mktemp)

# --- Check prerequisites ---
if ! command -v mc &> /dev/null; then
  echo "ERROR: MinIO Client (mc) is not installed."
  echo "Install: https://min.io/docs/minio/linux/reference/minio-mc.html"
  exit 1
fi

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
  rm -rf "$BACKUP_DIR"
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
  # Skip anonymous volumes (64-char hex hashes)
  if [[ "$VOLUME" =~ ^[a-f0-9]{64}$ ]]; then
    echo "Skipping anonymous volume: ${VOLUME:0:12}..."
    continue
  fi
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

# --- Upload to MinIO ---
echo "=== Uploading to MinIO ==="
MINIO_ALIAS="backup_minio"
mc alias set "$MINIO_ALIAS" "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"

# Create bucket if it doesn't exist
mc mb --ignore-existing "${MINIO_ALIAS}/${MINIO_BUCKET}"

# Upload backup directory
mc cp --recursive "$BACKUP_DIR/" "${MINIO_ALIAS}/${MINIO_BUCKET}/$(date +%Y-%m-%d)/"
echo "Upload complete."

# --- Retention: delete old backups on MinIO ---
echo "=== Cleaning up backups older than ${MINIO_RETENTION_DAYS} days ==="
CUTOFF_DATE=$(date -d "-${MINIO_RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${MINIO_RETENTION_DAYS}d +%Y-%m-%d)
mc ls "${MINIO_ALIAS}/${MINIO_BUCKET}/" | awk '{print $NF}' | tr -d '/' | while read -r dir; do
  if [[ "$dir" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && [[ "$dir" < "$CUTOFF_DATE" ]]; then
    echo "Deleting old backup: $dir"
    mc rm --recursive --force "${MINIO_ALIAS}/${MINIO_BUCKET}/${dir}/"
  fi
done
echo "Retention cleanup complete."

# Success notification
FILECOUNT=$(ls -1 "$BACKUP_DIR" | wc -l | tr -d ' ')
TOTALSIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
send_telegram "*Backup erfolgreich* on \`${HOSTNAME}\`
Files: ${FILECOUNT}
Size: ${TOTALSIZE}
MinIO: \`${MINIO_BUCKET}/$(date +%Y-%m-%d)\`
Retention: ${MINIO_RETENTION_DAYS} Tage
Date: $(date '+%Y-%m-%d %H:%M:%S')"
