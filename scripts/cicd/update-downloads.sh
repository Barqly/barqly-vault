#!/bin/bash

# Update Downloads Page Script
# Updates download pages using the new Python template system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[38;5;208m'  # Brand orange for better visibility
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

echo -e "${ORANGE}🔄 Updating downloads page for version $VERSION${NC}"

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

# Save release data to temp file for Python to read
echo "$RELEASE_DATA" > /tmp/release-data.json

# Update the data.json with new version info and fetch asset sizes/checksums
python3 -c "
import json
import sys
import subprocess

# Read current data
with open('$DATA_FILE', 'r') as f:
    data = json.load(f)

# Fetch release assets from GitHub API (via temp file)
try:
    with open('/tmp/release-data.json', 'r') as f:
        release_info = json.load(f)
    assets = {asset['name']: asset for asset in release_info.get('assets', [])}
    print(f'✅ Loaded {len(assets)} assets from release', file=sys.stderr)
except Exception as e:
    print(f'⚠️ Could not parse release data: {e}', file=sys.stderr)
    assets = {}

# Download and parse checksums.txt if available
checksums = {}
try:
    result = subprocess.run(
        ['gh', 'release', 'download', 'v$VERSION', '--repo', '$REPO', '--pattern', 'checksums.txt', '--dir', '/tmp', '--clobber'],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode == 0:
        with open('/tmp/checksums.txt', 'r') as f:
            for line in f:
                parts = line.strip().split(maxsplit=1)
                if len(parts) == 2:
                    sha256, filename = parts
                    checksums[filename] = sha256
        print(f'✅ Loaded {len(checksums)} checksums from checksums.txt', file=sys.stderr)
except Exception as e:
    print(f'⚠️ Could not fetch checksums: {e}', file=sys.stderr)

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

# Create downloads dict with real sizes from GitHub release
downloads = {}
for platform, template in data['filename_templates'].items():
    filename = template.replace('{VERSION}', '$VERSION')

    # Get asset info if available
    if filename in assets:
        size_bytes = assets[filename]['size']
        size_mb = round(size_bytes / (1024 * 1024), 1)
        size_str = f'{size_mb} MB'
    else:
        size_bytes = 0
        size_str = 'TBD MB'

    # Get checksum if available
    sha256 = checksums.get(filename, 'TBD...')

    downloads[platform] = {
        'filename': filename,
        'size': size_str,
        'size_bytes': size_bytes,
        'sha256': sha256
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