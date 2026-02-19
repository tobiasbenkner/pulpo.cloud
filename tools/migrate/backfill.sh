#!/bin/bash
set -euo pipefail

# Load .env from same directory as this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/.env"

curl -X POST "${DIRECTUS_URL}/pulpo-extension/reports/backfill" \
    -H "Authorization: Bearer ${DIRECTUS_TOKEN}" \
    -H "Content-Type: application/json"