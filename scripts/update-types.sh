#!/bin/bash

# Script to regenerate and update TypeScript types from Rust definitions
# Usage: ./scripts/update-types.sh

set -e

echo "🔧 Regenerating TypeScript types from Rust definitions..."

# Build with type generation feature
cd src-tauri
cargo build --features generate-types

# Find the most recent generated types file
GENERATED_FILE=$(find ../target/debug/build -name "types.ts" -type f -exec ls -t {} \; 2>/dev/null | head -1)

if [ -z "$GENERATED_FILE" ]; then
    echo "❌ Error: Could not find generated types.ts file"
    exit 1
fi

echo "✅ Found generated types at: $GENERATED_FILE"

# Target file location
TARGET_FILE="../src-ui/src/lib/api-types.ts"

# Create backup of existing file
cp "$TARGET_FILE" "${TARGET_FILE}.backup"
echo "📦 Created backup at: ${TARGET_FILE}.backup"

# Copy the header from the existing file (to preserve the warning)
head -25 "$TARGET_FILE" > /tmp/api-types-header.txt

# Copy the generated content (skipping its header)
tail -n +9 "$GENERATED_FILE" > /tmp/api-types-content.txt

# Combine header and content
cat /tmp/api-types-header.txt /tmp/api-types-content.txt > "$TARGET_FILE"

echo "✅ Updated TypeScript types at: $TARGET_FILE"
echo ""
echo "📝 Summary:"
echo "  - Generated from: $GENERATED_FILE"
echo "  - Updated file: $TARGET_FILE"
echo "  - Backup saved: ${TARGET_FILE}.backup"
echo ""
echo "🎉 Type generation complete!"