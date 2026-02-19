#!/bin/sh

npx directus bootstrap

if [ -f /directus/snapshot.yaml ]; then
  echo "Applying schema snapshot..."
  npx directus schema apply --yes /directus/snapshot.yaml
fi

npx directus start
