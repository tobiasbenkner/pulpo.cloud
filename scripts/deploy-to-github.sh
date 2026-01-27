#!/bin/bash

# Deploy Script für Turborepo → GitHub Pages (PRODUCTION)
# Usage: ./scripts/deploy-to-github.sh <project-name> <github-repo-url>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -ne 2 ]; then
    echo -e "${RED}Error: Falsche Anzahl an Argumenten${NC}"
    echo "Usage: $0 <project-name> <github-repo-url>"
    echo "Beispiel: $0 holacanterasclub git@github.com:username/holacanterasclub.git"
    exit 1
fi

PROJECT_NAME=$1
GITHUB_REPO=$2
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}🚀 Starting deployment for ${PROJECT_NAME}${NC}"
echo ""

# Finde Turborepo Root
ORIGINAL_DIR=$(pwd)

if [ -f "turbo.json" ]; then
    TURBO_ROOT="."
elif [ -f "../turbo.json" ]; then
    TURBO_ROOT=".."
elif [ -f "../../turbo.json" ]; then
    TURBO_ROOT="../.."
else
    echo -e "${RED}Error: turbo.json not found. Are you in a Turborepo?${NC}"
    exit 1
fi

cd "$TURBO_ROOT"
TURBO_ROOT=$(pwd)
echo -e "${GREEN}✓ Turborepo root: ${TURBO_ROOT}${NC}"
echo ""

# 1. Prune das Projekt
echo -e "${YELLOW}📦 Step 1: Pruning project...${NC}"
rm -rf out

if ! turbo prune --scope="${PROJECT_NAME}" 2>&1 | grep -v "npm warn"; then
    echo -e "${RED}Error: turbo prune failed${NC}"
    exit 1
fi

if [ ! -d "out" ]; then
    echo -e "${RED}Error: 'out' directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prune successful${NC}"
echo ""

# 2. Erstelle temporäres Deployment-Verzeichnis
echo -e "${YELLOW}📁 Step 2: Preparing deployment directory...${NC}"
TEMP_DIR="$TURBO_ROOT/temp-deploy-${PROJECT_NAME}"
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"
cp -r "$TURBO_ROOT/out/." "${TEMP_DIR}/"
cd "${TEMP_DIR}"
echo -e "${GREEN}✓ Deployment directory created${NC}"
echo ""

# 3. Bereinige sensitive Daten
echo -e "${YELLOW}🧹 Step 3: Cleaning sensitive data...${NC}"

# Entferne .env files
ENV_COUNT=$(find . -name ".env*" -type f | wc -l)
if [ "$ENV_COUNT" -gt 0 ]; then
    echo "Removing $ENV_COUNT .env file(s)..."
    find . -name ".env*" -type f -delete
fi

# Erstelle .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
.astro/
.env
.env.*
!.env.example
.DS_Store
EOF
echo -e "${GREEN}✓ Sensitive data cleaned${NC}"
echo ""

# 4. Erstelle README
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
echo -e "${GREEN}✓ README created${NC}"
echo ""

# 5. Erstelle GitHub Action Workflow
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
echo -e "${GREEN}✓ GitHub Actions workflow created${NC}"
echo ""

# 6. Git Setup
echo -e "${YELLOW}🔧 Step 6: Setting up Git repository...${NC}"

# Prüfe ob bereits ein Git Repo existiert
if [ -d ".git" ]; then
    echo "Existing Git repository found, resetting..."
    rm -rf .git
fi

git init
git branch -M main

# Prüfe ob Remote bereits existiert und setze/update ihn
git remote add origin "${GITHUB_REPO}" 2>/dev/null || git remote set-url origin "${GITHUB_REPO}"

echo -e "${GREEN}✓ Git repository initialized${NC}"
echo "  Remote: ${GITHUB_REPO}"
echo ""

# 7. Commit
echo -e "${YELLOW}💾 Step 7: Committing changes...${NC}"
git add .

# Erstelle Commit Message mit Details
COMMIT_MSG="Deploy ${PROJECT_NAME} - ${TIMESTAMP}

Automated deployment from Turborepo
Project: ${PROJECT_NAME}
Timestamp: ${TIMESTAMP}"

git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# 8. Push zu GitHub
echo -e "${YELLOW}🚢 Step 8: Pushing to GitHub...${NC}"
echo "Repository: ${GITHUB_REPO}"
echo ""

if git push -u origin main --force; then
    echo ""
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo ""
    echo -e "${RED}✗ Push failed${NC}"
    echo ""
    echo "Mögliche Ursachen:"
    echo "1. SSH Key nicht konfiguriert"
    echo "2. Keine Berechtigung für das Repository"
    echo "3. Repository existiert nicht"
    echo ""
    echo "Troubleshooting:"
    echo "- SSH: ssh -T git@github.com"
    echo "- Repo erstellen: gh repo create ${PROJECT_NAME} --public"
    exit 1
fi

# 9. Cleanup
echo ""
echo -e "${YELLOW}🧹 Step 9: Cleaning up...${NC}"
cd "$TURBO_ROOT"
rm -rf out
echo -e "${GREEN}✓ Temporary files cleaned${NC}"

# 10. Zusammenfassung
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📦 Project:${NC} ${PROJECT_NAME}"
echo -e "${YELLOW}🔗 Repository:${NC} ${GITHUB_REPO}"
echo -e "${YELLOW}📁 Deployed from:${NC} ${TEMP_DIR}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. GitHub Pages aktivieren:"
echo "   → Gehe zu: https://github.com/$(echo ${GITHUB_REPO} | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/settings/pages"
echo "   → Source: GitHub Actions"
echo ""
echo "2. Deployment verfolgen:"
echo "   → https://github.com/$(echo ${GITHUB_REPO} | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/actions"
echo ""
echo "3. Website nach ~2 Minuten verfügbar unter:"
echo "   → https://$(echo ${GITHUB_REPO} | sed 's/.*github.com[:/]\([^/]*\).*/\1/').github.io/${PROJECT_NAME}/"
echo ""
echo -e "${YELLOW}💡 Tipp:${NC} Für Custom Domain, füge eine CNAME Datei hinzu:"
echo "   cd ${TEMP_DIR}"
echo "   echo 'www.domain.com' > public/CNAME"
echo "   git add public/CNAME && git commit -m 'Add custom domain' && git push"
echo ""

# Optional: Temp-Directory behalten für weitere Anpassungen
echo -e "${YELLOW}🗂️  Deployment Directory:${NC}"
echo "   ${TEMP_DIR}"
echo ""
echo -e "${YELLOW}   Cleanup mit:${NC} rm -rf ${TEMP_DIR}"
echo ""

# Zurück zum ursprünglichen Verzeichnis
cd "$ORIGINAL_DIR"
