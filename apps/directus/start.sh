#!/bin/sh

npx directus bootstrap

if [ -f /directus/snapshot.json ]; then
  echo "Applying schema snapshot..."
  npx directus schema apply --yes /directus/snapshot.json
fi

npx directus start
