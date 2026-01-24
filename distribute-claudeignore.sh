#!/bin/bash

# distribute-claudeignore.sh
# Verteilt die .claudeignore Datei in alle Workspaces eines Turborepo

set -e

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Verteile .claudeignore in alle Workspaces...${NC}"

# Prüfe ob .claudeignore im Root existiert
if [ ! -f ".claudeignore" ]; then
    echo "❌ Keine .claudeignore im Root-Verzeichnis gefunden!"
    exit 1
fi

# Zähler für kopierte Dateien
count=0

# Finde alle package.json Dateien (außer im Root und node_modules)
# und kopiere .claudeignore in diese Verzeichnisse
find . -name "package.json" -not -path "*/node_modules/*" -not -path "./.git/*" | while read -r package; do
    dir=$(dirname "$package")
    
    # Überspringe das Root-Verzeichnis
    if [ "$dir" = "." ]; then
        continue
    fi
    
    # Kopiere .claudeignore
    cp .claudeignore "$dir/.claudeignore"
    echo -e "${GREEN}✓${NC} Kopiert nach: $dir"
    ((count++))
done

echo -e "${BLUE}✅ Fertig! .claudeignore wurde in alle Workspaces verteilt.${NC}"
