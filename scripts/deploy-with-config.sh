#!/bin/bash

# Deploy Script mit Config-File Support (PRODUCTION)
# Usage: ./scripts/deploy-with-config.sh [path-to-project]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Bestimme Projekt-Pfad
if [ "$#" -eq 0 ]; then
    PROJECT_DIR="."
else
    PROJECT_DIR=$1
fi

CONFIG_FILE="${PROJECT_DIR}/deploy.config.json"

# Prüfe ob Config existiert
if [ ! -f "${CONFIG_FILE}" ]; then
    echo -e "${RED}Error: ${CONFIG_FILE} nicht gefunden${NC}"
    echo ""
    echo "Erstelle eine deploy.config.json mit folgendem Inhalt:"
    echo ""
    echo '{'
    echo '  "projectName": "your-project-name",'
    echo '  "githubRepo": "git@github.com:username/repo.git"'
    echo '}'
    echo ""
    exit 1
fi

# Lese Config
PROJECT_NAME=$(node -p "require('${CONFIG_FILE}').projectName" 2>/dev/null)
GITHUB_REPO=$(node -p "require('${CONFIG_FILE}').githubRepo" 2>/dev/null)

if [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_REPO" ]; then
    echo -e "${RED}Error: Ungültige Config in ${CONFIG_FILE}${NC}"
    echo "Benötigt: projectName und githubRepo"
    exit 1
fi

echo -e "${GREEN}📋 Configuration loaded from ${CONFIG_FILE}${NC}"
echo "  Project: ${PROJECT_NAME}"
echo "  Repo: ${GITHUB_REPO}"
echo ""

# Rufe das Haupt-Deploy-Script auf
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/deploy-to-github.sh" "${PROJECT_NAME}" "${GITHUB_REPO}"
