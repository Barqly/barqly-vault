#!/bin/bash

# Promote Beta to Production Script
# Promotes a beta release to a production draft release by reusing artifacts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[38;5;208m'  # Brand orange for better visibility
NC='\033[0m' # No Color

REPO="barqly/barqly-vault"

# Function to list available betas
list_betas() {
    echo -e "${ORANGE}📋 Available Beta Releases:${NC}"
    echo "================================================"
    
    # Get all beta releases
    BETAS=$(gh api repos/$REPO/releases --jq '.[] | select(.tag_name | contains("-beta")) | .tag_name' | sort -V)
    
    if [ -z "$BETAS" ]; then
        echo -e "${YELLOW}No beta releases found${NC}"
        return 1
    else
        echo "$BETAS" | while read -r beta; do
            # Get release info (handle both releases and tags)
            RELEASE_INFO=$(gh api repos/$REPO/releases/tags/$beta 2>/dev/null || echo "{}")
            if [ "$RELEASE_INFO" != "{}" ]; then
                RELEASE_DATE=$(echo "$RELEASE_INFO" | jq -r '.published_at // empty' | cut -d'T' -f1)
                IS_DRAFT=$(echo "$RELEASE_INFO" | jq -r '.draft // false')
                STATUS=""
                [ "$IS_DRAFT" = "true" ] && STATUS=" (draft)"
                echo -e "  ${GREEN}$beta${NC} (released: $RELEASE_DATE)$STATUS"
            else
                # If no release, check if tag exists
                if git ls-remote --tags origin | grep -q "refs/tags/$beta"; then
                    echo -e "  ${GREEN}$beta${NC} (tag only - no release created)"
                else
                    echo -e "  ${GREEN}$beta${NC}"
                fi
            fi
        done
        echo ""
        return 0
    fi
}

# Parse arguments
BETA_VERSION=""
PROD_VERSION=""
LIST_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --list|-l)
            LIST_ONLY=true
            shift
            ;;
        --from|-f)
            BETA_VERSION="$2"
            shift 2
            ;;
        --to|-t)
            PROD_VERSION="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --list, -l              List available beta releases"
            echo "  --from, -f <version>    Beta version to promote (e.g., 0.1.0-beta.1)"
            echo "  --to, -t <version>      Production version (e.g., 0.1.0)"
            echo "  --help, -h              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 --list                                    # List available betas"
            echo "  $0 --from 0.1.0-beta.3 --to 0.1.0           # Promote specific beta"
            echo "  $0 -f 0.1.0-beta.3 -t 0.1.0                 # Short form"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# If list only, show betas and exit
if [ "$LIST_ONLY" = true ]; then
    list_betas
    exit 0
fi

# Check required parameters for promotion
if [ -z "$BETA_VERSION" ] || [ -z "$PROD_VERSION" ]; then
    echo -e "${RED}❌ Error: Both beta and production versions required${NC}"
    echo ""
    echo "First, list available betas:"
    echo "  $0 --list"
    echo ""
    echo "Then promote one:"
    echo "  $0 --from 0.1.0-beta.3 --to 0.1.0"
    echo ""
    
    # Show available betas for convenience
    list_betas
    exit 1
fi

echo -e "${ORANGE}🚀 Promoting Beta to Production${NC}"
echo "================================================"
echo -e "From: ${YELLOW}v$BETA_VERSION${NC}"
echo -e "To:   ${GREEN}v$PROD_VERSION${NC} (draft)"
echo ""

# Verify beta release exists
echo -e "${YELLOW}1. Verifying beta release...${NC}"

# Try to find the release by tag_name (handles draft/untagged releases)
BETA_RELEASE=$(gh api repos/$REPO/releases --jq '.[] | select(.tag_name == "v'$BETA_VERSION'")' 2>/dev/null || echo "")

if [ -z "$BETA_RELEASE" ]; then
    echo -e "${RED}❌ Error: Beta release v$BETA_VERSION not found${NC}"
    echo ""
    echo "Available betas:"
    list_betas
    exit 1
fi

# Check if it's a draft
IS_DRAFT=$(echo "$BETA_RELEASE" | jq -r '.draft // false')
if [ "$IS_DRAFT" = "true" ]; then
    echo -e "${YELLOW}⚠️  Note: v$BETA_VERSION is a draft release${NC}"
fi

echo -e "${GREEN}✅ Beta release found${NC}"

# Check if production release already exists
echo -e "\n${YELLOW}2. Checking target version...${NC}"
if gh api repos/$REPO/releases/tags/v$PROD_VERSION &>/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Release v$PROD_VERSION already exists${NC}"
    read -p "Do you want to replace it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    
    # Delete existing release
    echo "Deleting existing release..."
    gh release delete v$PROD_VERSION --yes
fi
echo -e "${GREEN}✅ Target version available${NC}"

# Trigger the promotion workflow
echo -e "\n${YELLOW}3. Triggering promotion workflow...${NC}"
echo "Running: gh workflow run release.yml -f promote_from=$BETA_VERSION -f version=$PROD_VERSION"

gh workflow run release.yml \
    -f promote_from=$BETA_VERSION \
    -f version=$PROD_VERSION

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Workflow triggered successfully${NC}"
    
    # Get the workflow run URL
    echo -e "\n${YELLOW}4. Monitoring workflow...${NC}"
    echo "Waiting for workflow to start..."
    sleep 5
    
    # Get the latest workflow run
    RUN_URL=$(gh run list --workflow=release.yml --limit=1 --json url --jq '.[0].url')
    
    if [ -n "$RUN_URL" ]; then
        echo -e "Workflow URL: ${ORANGE}$RUN_URL${NC}"
        echo ""
        echo -e "${YELLOW}You can monitor the progress at the URL above${NC}"
        echo -e "Or use: ${ORANGE}gh run watch${NC}"
    fi
    
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Promotion Initiated!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "📦 Beta:       ${YELLOW}v$BETA_VERSION${NC}"
    echo -e "🎯 Target:     ${GREEN}v$PROD_VERSION${NC} (draft)"
    echo -e "⏱️  Status:     In Progress"
    echo ""
    echo -e "${YELLOW}Next steps after workflow completes:${NC}"
    echo -e "1. Review the draft release on GitHub"
    echo -e "2. When ready to publish: ${ORANGE}make publish-prod VERSION=$PROD_VERSION${NC}"
    echo ""
else
    echo -e "${RED}❌ Error: Failed to trigger workflow${NC}"
    echo "Please check your GitHub CLI authentication and permissions"
    exit 1
fi