#!/bin/bash

# Deploy Script TEST MODE - Kein Push zu GitHub
# Usage: ./scripts/deploy-to-github-test.sh <project-name> <github-repo-url>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$#" -ne 2 ]; then
    echo -e "${RED}Error: Falsche Anzahl an Argumenten${NC}"
    echo "Usage: $0 <project-name> <github-repo-url>"
    exit 1
fi

PROJECT_NAME=$1
GITHUB_REPO=$2
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo -e "${BLUE}🧪 TEST MODE - Kein Push zu GitHub${NC}"
echo -e "${GREEN}🚀 Starting deployment process for ${PROJECT_NAME}${NC}"
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
echo "Running: turbo prune --scope=${PROJECT_NAME}"

# Entferne altes out directory
rm -rf out

# Führe prune aus
if ! turbo prune --scope="${PROJECT_NAME}" 2>&1 | grep -v "npm warn"; then
    echo -e "${RED}Error: turbo prune command failed${NC}"
    exit 1
fi

# Prüfe ob out directory erstellt wurde
if [ ! -d "out" ]; then
    echo -e "${RED}Error: 'out' directory not found after prune${NC}"
    echo "Current directory: $(pwd)"
    echo "Contents:"
    ls -la
    exit 1
fi

echo -e "${GREEN}✓ Prune successful${NC}"
echo "  Output directory: $TURBO_ROOT/out"
echo "  Contents:"
ls -la out/ | head -10
echo ""

# 2. Erstelle temporäres Deployment-Verzeichnis
echo -e "${YELLOW}📁 Step 2: Preparing deployment directory...${NC}"
TEMP_DIR="$TURBO_ROOT/temp-deploy-${PROJECT_NAME}"
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"
cp -r "$TURBO_ROOT/out/." "${TEMP_DIR}/"
echo -e "${GREEN}✓ Deployment directory created: ${TEMP_DIR}${NC}"
echo ""

# 3. Bereinige sensitive Daten
echo -e "${YELLOW}🧹 Step 3: Cleaning sensitive data...${NC}"
cd "${TEMP_DIR}"

# Zeige welche .env files gefunden wurden
ENV_FILES=$(find . -name ".env*" -type f 2>/dev/null || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${YELLOW}Found .env files (would be deleted):${NC}"
    echo "$ENV_FILES"
else
    echo -e "${GREEN}✓ No .env files found${NC}"
fi

# Erstelle .gitignore
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
    echo -e "${GREEN}✓ .gitignore created${NC}"
else
    echo -e "${GREEN}✓ .gitignore already exists${NC}"
fi
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
echo -e "${GREEN}✓ README.md created${NC}"
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

# 6. Zeige Struktur
echo -e "${YELLOW}📂 Step 6: Deployment structure:${NC}"
echo ""
if command -v tree &> /dev/null; then
    tree -L 2 -a . 2>/dev/null | head -50
else
    find . -maxdepth 2 \( -type f -o -type d \) ! -path "*/node_modules/*" | head -30
fi
echo ""

# 7. Zeige package.json Infos
echo -e "${YELLOW}📦 Step 7: Package info:${NC}"
if [ -f "package.json" ]; then
    echo "Package name: $(node -p "require('./package.json').name" 2>/dev/null || echo 'N/A')"
    echo "Version: $(node -p "require('./package.json').version" 2>/dev/null || echo 'N/A')"
    echo ""
    echo "Scripts available:"
    node -p "Object.keys(require('./package.json').scripts || {}).join(', ')" 2>/dev/null || echo "No scripts found"
    echo ""
    echo "Dependencies:"
    node -p "Object.keys(require('./package.json').dependencies || {}).join(', ')" 2>/dev/null || echo "No dependencies"
else
    echo -e "${YELLOW}⚠️  No package.json found in root${NC}"
fi
echo ""

# 8. Git Status (ohne Push)
echo -e "${YELLOW}🔧 Step 8: Git initialization (TEST - no push)...${NC}"
git init -q
git branch -M main
git add .

echo "Files to be committed:"
git status --short | head -20
if [ $(git status --short | wc -l) -gt 20 ]; then
    echo "... and $(( $(git status --short | wc -l) - 20 )) more files"
fi
echo ""

# 9. Zusammenfassung
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ TEST COMPLETED SUCCESSFULLY!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📍 Test deployment location:${NC}"
echo "   ${TEMP_DIR}"
echo ""
echo -e "${YELLOW}📋 What would happen in production:${NC}"
echo "   1. ✓ Project pruned"
echo "   2. ✓ Deployment directory created"
echo "   3. ✓ Sensitive data cleaned"
echo "   4. ✓ README generated"
echo "   5. ✓ GitHub Actions workflow created"
echo "   6. ✓ Git repository initialized"
echo "   7. ⏭  Git push to: ${GITHUB_REPO}"
echo ""
echo -e "${YELLOW}🔍 Next steps - Inspect the deployment:${NC}"
echo "   cd ${TEMP_DIR}"
echo "   npm install    # Test installation"
echo "   npm run build  # Test build"
echo "   npm run preview # Test preview (if available)"
echo ""
echo -e "${YELLOW}🧹 To cleanup when done:${NC}"
echo "   rm -rf ${TEMP_DIR}"
echo "   rm -rf ${TURBO_ROOT}/out"
echo ""

# Zurück zum ursprünglichen Verzeichnis
cd "$ORIGINAL_DIR"