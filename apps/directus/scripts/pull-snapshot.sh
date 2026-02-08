#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SNAPSHOT_DIR="$SCRIPT_DIR/../snapshot"

if [ -z "${DIRECTUS_URL:-}" ] || [ -z "${DIRECTUS_TOKEN:-}" ]; then
  if [ -f "$SCRIPT_DIR/../.env" ]; then
    set -a
    source "$SCRIPT_DIR/../.env"
    set +a
  fi
fi

if [ -z "${DIRECTUS_URL:-}" ] || [ -z "${DIRECTUS_TOKEN:-}" ]; then
  echo "Error: DIRECTUS_URL and DIRECTUS_TOKEN must be set (via environment or .env file)"
  exit 1
fi

echo "Pulling schema snapshot from $DIRECTUS_URL ..."
curl -sf "$DIRECTUS_URL/schema/snapshot?access_token=$DIRECTUS_TOKEN" \
  | jq '.data' > "$SNAPSHOT_DIR/snapshot.json"
echo "Snapshot saved to snapshot/snapshot.json"
