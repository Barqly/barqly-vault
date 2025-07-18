#!/bin/bash

# Link Validation Script for Barqly Vault Documentation
# This script checks all markdown files for broken links

set -e

echo "🔍 Validating all links in documentation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a file exists
check_file_exists() {
    local file_path="$1"
    local base_dir="$2"
    
    if [[ "$file_path" == http* ]]; then
        # External link - skip for now
        return 0
    elif [[ "$file_path" == \#* ]]; then
        # Anchor link - skip for now
        return 0
    else
        # Local file path
        local full_path="$base_dir/$file_path"
        if [[ -f "$full_path" ]]; then
            return 0
        else
            return 1
        fi
    fi
}

# Function to extract links from markdown files
extract_links() {
    local file="$1"
    local base_dir="$(dirname "$file")"
    
    # Extract markdown links [text](url)
    grep -o '\[[^]]*\]([^)]*)' "$file" | while read -r link; do
        # Extract the URL part
        url=$(echo "$link" | sed 's/.*(\([^)]*\)).*/\1/')
        
        if ! check_file_exists "$url" "$base_dir"; then
            echo -e "${RED}❌ Broken link in $file: $link${NC}"
            return 1
        else
            echo -e "${GREEN}✅ Valid link in $file: $link${NC}"
        fi
    done
}

# Check all markdown files in docs directory
broken_links=0

for file in docs/**/*.md; do
    if [[ -f "$file" ]]; then
        echo "Checking $file..."
        if ! extract_links "$file"; then
            ((broken_links++))
        fi
    fi
done

# Summary
echo ""
if [[ $broken_links -eq 0 ]]; then
    echo -e "${GREEN}🎉 All links are valid!${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $broken_links files with broken links${NC}"
    exit 1
fi 