#!/bin/sh
set -e

# Run default Directus bootstrap (migrations + admin user)
npx directus bootstrap

# Apply schema snapshot if present
if [ -f /directus/snapshot/snapshot.yaml ]; then
  echo "Applying schema snapshot..."
  npx directus schema apply --yes /directus/snapshot/snapshot.yaml
fi

# Start Directus
npx directus start
