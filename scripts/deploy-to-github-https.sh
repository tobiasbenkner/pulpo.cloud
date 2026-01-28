#!/bin/bash

# Deploy Script für Turborepo → GitHub Pages (HTTPS mit Token)
# Usage: ./scripts/deploy-to-github-https.sh <project-name> <github-repo-url> [token]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$#" -lt 2 ]; then
    echo -e "${RED}Error: Falsche Anzahl an Argumenten${NC}"
    echo "Usage: $0 <project-name> <github-repo-url> [token]"
    echo ""
    echo "Beispiele:"
    echo "  $0 holacanterasclub https://github.com/username/holacanterasclub.git"
    echo "  $0 holacanterasclub https://github.com/username/holacanterasclub.git ghp_xxxxx"
    echo ""
    echo "Token erstellen: https://github.com/settings/tokens"
    echo "Required scope: repo (full control)"
    exit 1
fi

PROJECT_NAME=$1
GITHUB_REPO=$2
GITHUB_TOKEN=${3:-""}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${GREEN}🚀 Starting HTTPS deployment for ${PROJECT_NAME}${NC}"
echo ""

# Prüfe ob HTTPS URL
if [[ ! "$GITHUB_REPO" == https://* ]]; then
    echo -e "${RED}Error: Keine HTTPS URL${NC}"
    echo "Erwartet: https://github.com/username/repo.git"
    echo "Erhalten: ${GITHUB_REPO}"
    exit 1
fi

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

ENV_COUNT=$(find . -name ".env*" -type f | wc -l)
if [ "$ENV_COUNT" -gt 0 ]; then
    echo "Removing $ENV_COUNT .env file(s)..."
    find . -name ".env*" -type f -delete
fi

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

      - name: Install pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Find dist directory
        id: find-dist
        run: |
          DIST_PATH=$(find . -name "dist" -type d -not -path "*/node_modules/*" | head -n 1)
          echo "dist_path=$DIST_PATH" >> $GITHUB_OUTPUT

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ${{ steps.find-dist.outputs.dist_path }}

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

# 6. Git Setup mit HTTPS
echo -e "${YELLOW}🔧 Step 6: Setting up Git repository (HTTPS)...${NC}"

if [ -d ".git" ]; then
    echo "Existing Git repository found, resetting..."
    rm -rf .git
fi

git init
git branch -M main

# Baue HTTPS URL mit Token wenn vorhanden
if [ -n "$GITHUB_TOKEN" ]; then
    # Extrahiere username/repo aus URL
    REPO_PATH=$(echo "$GITHUB_REPO" | sed 's|https://github.com/||' | sed 's|.git$||')
    AUTH_URL="https://${GITHUB_TOKEN}@github.com/${REPO_PATH}.git"
    
    git remote add origin "$AUTH_URL" 2>/dev/null || git remote set-url origin "$AUTH_URL"
    echo -e "${GREEN}✓ Git repository initialized with token authentication${NC}"
else
    git remote add origin "${GITHUB_REPO}" 2>/dev/null || git remote set-url origin "${GITHUB_REPO}"
    echo -e "${GREEN}✓ Git repository initialized${NC}"
    echo -e "${YELLOW}⚠️  Kein Token angegeben - Du wirst nach Credentials gefragt${NC}"
fi

echo "  Remote: ${GITHUB_REPO}"
echo ""

# 7. Commit
echo -e "${YELLOW}💾 Step 7: Committing changes...${NC}"
git add .

COMMIT_MSG="Deploy ${PROJECT_NAME} - ${TIMESTAMP}

Automated deployment from Turborepo
Project: ${PROJECT_NAME}
Timestamp: ${TIMESTAMP}"

git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✓ Changes committed${NC}"
echo ""

# 8. Push zu GitHub
echo -e "${YELLOW}🚢 Step 8: Pushing to GitHub (HTTPS)...${NC}"
echo "Repository: ${GITHUB_REPO}"
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}Hinweis: Du wirst nach Username und Personal Access Token gefragt${NC}"
    echo ""
fi

if git push -u origin main --force; then
    echo ""
    echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
else
    echo ""
    echo -e "${RED}✗ HTTPS Push failed${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo ""
    echo "1. Personal Access Token erstellen:"
    echo "   → https://github.com/settings/tokens/new"
    echo "   → Name: 'Turborepo Deployment'"
    echo "   → Expiration: Custom (oder No expiration)"
    echo "   → Scopes: Wähle 'repo' (full control of private repositories)"
    echo "   → Generate Token"
    echo ""
    echo "2. Token speichern (eine dieser Optionen):"
    echo ""
    echo "   a) Im Script Parameter:"
    echo "      ./scripts/deploy-to-github-https.sh ${PROJECT_NAME} ${GITHUB_REPO} ghp_your_token"
    echo ""
    echo "   b) In Git Credential Helper:"
    echo "      git config --global credential.helper store"
    echo "      # Beim nächsten Push Token eingeben, wird dann gespeichert"
    echo ""
    echo "   c) Als Environment Variable:"
    echo "      export GITHUB_TOKEN=ghp_your_token"
    echo "      ./scripts/deploy-to-github-https.sh ${PROJECT_NAME} ${GITHUB_REPO} \$GITHUB_TOKEN"
    echo ""
    echo "3. Repository muss existieren:"
    echo "   → Erstelle es manuell auf GitHub, oder"
    echo "   → gh repo create ${PROJECT_NAME} --public"
    echo ""
    
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
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo ""
echo "1. GitHub Pages aktivieren:"
echo "   → https://github.com/$(echo ${GITHUB_REPO} | sed 's|https://github.com/||' | sed 's|.git$||')/settings/pages"
echo "   → Source: GitHub Actions"
echo ""
echo "2. Deployment verfolgen:"
echo "   → https://github.com/$(echo ${GITHUB_REPO} | sed 's|https://github.com/||' | sed 's|.git$||')/actions"
echo ""
REPO_OWNER=$(echo ${GITHUB_REPO} | sed 's|https://github.com/||' | sed 's|/.*||')
echo "3. Website nach ~2 Minuten verfügbar unter:"
echo "   → https://${REPO_OWNER}.github.io/${PROJECT_NAME}/"
echo ""

if [ -n "$GITHUB_TOKEN" ]; then
    echo -e "${GREEN}✓ Token wurde verwendet - zukünftige Pushes werden automatisch authentifiziert${NC}"
else
    echo -e "${YELLOW}💡 Tipp: Verwende einen Token als 3. Parameter für automatische Auth:${NC}"
    echo "   ./scripts/deploy-to-github-https.sh ${PROJECT_NAME} ${GITHUB_REPO} ghp_xxxxx"
fi

echo ""
echo -e "${YELLOW}🗂️  Deployment Directory:${NC} ${TEMP_DIR}"
echo -e "${YELLOW}   Cleanup mit:${NC} rm -rf ${TEMP_DIR}"
echo ""

cd "$ORIGINAL_DIR"
