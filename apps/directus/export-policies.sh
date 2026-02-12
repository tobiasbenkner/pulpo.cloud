#!/bin/sh

set -a
source .env
set +a

DIR="migrations"
DATE=$(date +%Y%m%d)

echo $URL
echo $TOKEN

if [ -z "$TOKEN" ]; then
  echo "Usage: DIRECTUS_TOKEN=<token> ./export-policies.sh"
  exit 1
fi

echo "Exporting from $URL ..."

curl -s -H "Authorization: Bearer $TOKEN" "$URL/roles?limit=-1" | jq '.data' > "$DIR/$DATE-roles.json"
curl -s -H "Authorization: Bearer $TOKEN" "$URL/policies?limit=-1" | jq '.data' > "$DIR/$DATE-policies.json"
curl -s -H "Authorization: Bearer $TOKEN" "$URL/permissions?limit=-1" | jq '.data' > "$DIR/$DATE-permissions.json"
curl -s -H "Authorization: Bearer $TOKEN" "$URL/access?limit=-1" | jq '.data' > "$DIR/$DATE-access.json"

echo "Exported to $DIR/$DATE-*.json"
