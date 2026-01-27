#!/bin/bash

# Deploy Script für Turborepo → GitHub Pages
# Usage: ./scripts/deploy-to-github.sh <project-name> <github-repo-url>

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Argumente prüfen
if [ "$#" -ne 2 ]; then
    echo -e "${RED}Error: Falsche Anzahl an Argumenten${NC}"
    echo "Usage: $0 <project-name> <github-repo-url>"
    echo "Beispiel: $0 kunde-abc-web git@github.com:username/kunde-abc-web.git"
    exit 1
fi

PROJECT_NAME=$1
GITHUB_REPO=$2
TEMP_DIR="./temp-deploy-${PROJECT_NAME}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}🚀 Starting deployment process for ${PROJECT_NAME}${NC}"

# 1. Prune das Projekt
echo -e "${YELLOW}📦 Step 1: Pruning project...${NC}"
npx turbo prune --scope="${PROJECT_NAME}"

if [ ! -d "out" ]; then
    echo -e "${RED}Error: Prune failed, 'out' directory not found${NC}"
    exit 1
fi

# 2. Erstelle temporäres Deployment-Verzeichnis
echo -e "${YELLOW}📁 Step 2: Preparing deployment directory...${NC}"
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"

# 3. Kopiere pruned content
cp -r out/. "${TEMP_DIR}/"

# 4. Bereinige sensitive Daten
echo -e "${YELLOW}🧹 Step 3: Cleaning sensitive data...${NC}"
cd "${TEMP_DIR}"

# Entferne .env files
find . -name ".env*" -type f -delete

# Erstelle .gitignore wenn nicht vorhanden
if [ ! -f ".gitignore" ]; then
    cat > .gitignore << 'EOF'
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
.DS_Store
EOF
fi

# 5. Erstelle README für Kunden
echo -e "${YELLOW}📝 Step 4: Creating README...${NC}"
cat > README.md << EOF
# ${PROJECT_NAME}

Dieses Projekt wurde automatisch aus einem Turborepo exportiert.

## Deployment

Dieses Projekt wird automatisch via GitHub Actions auf GitHub Pages deployed.

Bei jedem Push auf \`main\` wird die Website neu gebaut und veröffentlicht.

## Lokale Entwicklung

\`\`\`bash
# Dependencies installieren
npm install

# Dev Server starten
npm run dev

# Production Build
npm run build
\`\`\`

## Technologie

- **Framework**: Astro
- **Deployment**: GitHub Pages
- **CI/CD**: GitHub Actions

---

*Letzte Aktualisierung: ${TIMESTAMP}*
EOF

# 6. Erstelle GitHub Action Workflow
echo -e "${YELLOW}⚙️  Step 5: Creating GitHub Actions workflow...${NC}"
mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << 'EOF'
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
EOF

# 7. Git Setup
echo -e "${YELLOW}🔧 Step 6: Initializing Git repository...${NC}"

if [ -d ".git" ]; then
    echo "Git repository already exists, using existing one..."
else
    git init
    git branch -M main
fi

# 8. Commit und Push
echo -e "${YELLOW}💾 Step 7: Committing changes...${NC}"
git add .
git commit -m "Deploy: ${TIMESTAMP}" || echo "No changes to commit"

# Prüfe ob Remote existiert
if git remote | grep -q "origin"; then
    git remote set-url origin "${GITHUB_REPO}"
else
    git remote add origin "${GITHUB_REPO}"
fi

echo -e "${YELLOW}🚢 Step 8: Pushing to GitHub...${NC}"
git push -u origin main --force

# 9. Cleanup
cd ..
echo -e "${YELLOW}🧹 Step 9: Cleaning up...${NC}"
rm -rf out
# rm -rf "${TEMP_DIR}" # Optional: Kommentiere aus wenn du temp behalten willst

echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}Repository: ${GITHUB_REPO}${NC}"
echo -e "${GREEN}Nächste Schritte:${NC}"
echo "1. Gehe zu GitHub → Settings → Pages"
echo "2. Source: GitHub Actions"
echo "3. Warte auf den ersten Workflow-Run"
echo ""
echo -e "${YELLOW}Tipp: Du kannst den Deploy Status hier verfolgen:${NC}"
echo "https://github.com/$(echo ${GITHUB_REPO} | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"