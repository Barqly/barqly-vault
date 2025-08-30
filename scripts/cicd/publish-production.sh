#!/bin/bash

# Publish Production Release Script
# Publishes a draft production release and updates documentation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if version is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Version number required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 0.1.0"
    exit 1
fi

VERSION="$1"
REPO="barqly/barqly-vault"

echo -e "${BLUE}🚀 Publishing Production Release v$VERSION${NC}"
echo "================================================"

# Step 1: Verify draft release exists
echo -e "\n${YELLOW}1. Verifying draft release...${NC}"

# Get release ID first (works for both tagged and untagged releases)
RELEASE_ID=$(gh api repos/$REPO/releases --jq '.[] | select(.tag_name == "v'$VERSION'") | .id' 2>/dev/null || echo "")

if [ -z "$RELEASE_ID" ]; then
    echo -e "${RED}❌ Error: Release v$VERSION not found${NC}"
    echo "Please ensure the draft release exists before running this script."
    exit 1
fi

# Now get the full release data using the ID
RELEASE_DATA=$(gh api repos/$REPO/releases/$RELEASE_ID)

IS_DRAFT=$(echo "$RELEASE_DATA" | jq -r '.draft // false')
IS_PRERELEASE=$(echo "$RELEASE_DATA" | jq -r '.prerelease // false')

if [ "$IS_DRAFT" != "true" ]; then
    echo -e "${YELLOW}⚠️  Warning: Release v$VERSION is not a draft${NC}"
    read -p "Do you want to continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

if [ "$IS_PRERELEASE" = "true" ]; then
    echo -e "${YELLOW}⚠️  Warning: Release v$VERSION is marked as pre-release${NC}"
fi

# Step 2: Ensure we're on main branch and up to date
echo -e "\n${YELLOW}2. Updating local repository...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Switching to main branch..."
    git checkout main
fi

echo "Pulling latest changes..."
git pull origin main

# Step 3: Publish the release
echo -e "\n${YELLOW}3. Publishing release on GitHub...${NC}"
echo "Converting draft to published release..."
gh release edit v$VERSION --draft=false

# Verify publication
RELEASE_DATA=$(gh api repos/$REPO/releases/tags/v$VERSION)
IS_DRAFT=$(echo "$RELEASE_DATA" | jq -r '.draft')
if [ "$IS_DRAFT" = "false" ]; then
    echo -e "${GREEN}✅ Release published successfully${NC}"
    RELEASE_URL=$(echo "$RELEASE_DATA" | jq -r '.html_url')
    echo "Release URL: $RELEASE_URL"
else
    echo -e "${RED}❌ Error: Failed to publish release${NC}"
    exit 1
fi

# Step 4: Update download pages
echo -e "\n${YELLOW}4. Updating download documentation...${NC}"
./scripts/cicd/update-downloads.sh "$VERSION"

# Step 5: Review changes
echo -e "\n${YELLOW}5. Review changes...${NC}"
echo "Modified files:"
git status --short public-docs/ scripts/cicd/downloads/data.json

echo -e "\n${YELLOW}Summary:${NC}"
echo "✅ Downloads updated to v$VERSION"
echo "✅ Version history updated"
echo "✅ All template files generated"

# Step 6: Commit and push
echo -e "\n${YELLOW}6. Commit and push changes...${NC}"
read -p "Do you want to commit and push these changes? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}⚠️  Changes not committed. You can manually commit with:${NC}"
    echo "   git add public-docs/downloads.*"
    echo "   git commit -m \"docs: update downloads for v$VERSION\""
    echo "   git push"
else
    echo "Committing changes..."
    git add public-docs/downloads.md public-docs/downloads/ scripts/cicd/downloads/data.json
    git commit --no-verify -m "docs: update downloads for v$VERSION

- Published production release v$VERSION
- Updated downloads.md and index.html with latest version
- Updated data.json with release information
- Updated version history"
    
    echo "Pushing to remote..."
    git push origin main
    
    echo -e "${GREEN}✅ Changes committed and pushed${NC}"
fi

# Step 7: Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Production Release Published!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📦 Version: ${BLUE}v$VERSION${NC}"
echo -e "🔗 Release: ${BLUE}$RELEASE_URL${NC}"
echo -e "📄 Downloads: ${BLUE}https://barqly.com/vault/downloads/${NC}"
echo ""

# Optional: Trigger documentation deployment
echo -e "${YELLOW}Note: Documentation will deploy automatically via GitHub Pages workflow${NC}"
echo "      You can monitor the deployment at:"
echo "      https://github.com/$REPO/actions/workflows/deploy-docs.yml"

echo -e "\n${GREEN}🎉 All done!${NC}"