#!/bin/bash

# Update Downloads Page Script
# Updates download pages using the new Python template system

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

echo -e "${BLUE}🔄 Updating downloads page for version $VERSION${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_FILE="$SCRIPT_DIR/downloads/data.json"

# Step 1: Update data.json with the new version info
echo -e "${YELLOW}1. Fetching release information...${NC}"

# Get release information from GitHub API
RELEASE_DATA=$(gh api repos/$REPO/releases/tags/v$VERSION 2>/dev/null || echo "{}")
if [ "$RELEASE_DATA" = "{}" ]; then
    echo -e "${YELLOW}⚠️ Warning: Could not fetch release data from API, using defaults${NC}"
    RELEASE_URL="https://github.com/$REPO/releases/tag/v$VERSION"
    PUBLISHED_DATE=$(date +%Y-%m-%d)
else
    RELEASE_URL=$(echo "$RELEASE_DATA" | jq -r '.html_url // empty')
    PUBLISHED_DATE=$(echo "$RELEASE_DATA" | jq -r '.published_at // empty' | cut -d'T' -f1)
fi

echo -e "  Release URL: $RELEASE_URL"
echo -e "  Published: $PUBLISHED_DATE"

# Step 2: Update data.json with new version information
echo -e "\n${YELLOW}2. Updating data.json...${NC}"

# Create a backup of the current data.json
cp "$DATA_FILE" "$DATA_FILE.bak"

# Update the data.json with new version info
# Note: This is a simple update - file sizes and checksums would need to be updated manually
# or we could fetch them from the GitHub release assets
python3 -c "
import json
import sys

# Read current data
with open('$DATA_FILE', 'r') as f:
    data = json.load(f)

# Move current latest to archive (if it exists)
if 'latest' in data and data['latest']['version'] != '$VERSION':
    if 'archive' not in data:
        data['archive'] = []
    
    # Add current latest to archive
    archive_entry = {
        'version': data['latest']['version'],
        'release_date': data['latest']['release_date'],
        'github_release_url': data['latest']['github_release_url']
    }
    # Insert at beginning of archive list
    data['archive'].insert(0, archive_entry)

# Create downloads dict with generated filenames
downloads = {}
for platform, template in data['filename_templates'].items():
    filename = template.replace('{VERSION}', '$VERSION')
    downloads[platform] = {
        'filename': filename,
        'size': 'TBD MB',  # Would need to be fetched from actual release
        'size_bytes': 0,
        'sha256': 'TBD...'
    }

# Update latest version info
data['latest'] = {
    'version': '$VERSION',
    'release_date': '$PUBLISHED_DATE',
    'github_release_url': '$RELEASE_URL',
    'downloads': downloads,
    'verification': {
        'checksums_url': 'https://github.com/$REPO/releases/download/v$VERSION/checksums.txt'
    }
}

# Write updated data
with open('$DATA_FILE', 'w') as f:
    json.dump(data, f, indent=2)

print('✅ data.json updated')
"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error updating data.json${NC}"
    # Restore backup
    cp "$DATA_FILE.bak" "$DATA_FILE"
    exit 1
fi

# Step 3: Generate download pages using Python template system
echo -e "\n${YELLOW}3. Generating download pages...${NC}"
python3 "$SCRIPT_DIR/generate-downloads.py"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Download pages generated successfully${NC}"
    # Clean up backup
    rm "$DATA_FILE.bak"
else
    echo -e "${RED}❌ Error generating download pages${NC}"
    # Restore backup
    cp "$DATA_FILE.bak" "$DATA_FILE"
    rm "$DATA_FILE.bak"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Downloads pages updated locally${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo -e "   1. Update file sizes manually in $DATA_FILE (fetch from GitHub release)"
echo -e "   2. Review the changes: git diff public-docs/"
echo -e "   3. Commit: git add public-docs/downloads.* scripts/cicd/downloads/data.json"
echo -e "   4. Push: git push"