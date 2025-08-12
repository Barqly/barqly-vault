#!/bin/bash
# Script to manually clean up test keys from the Barqly Vault keys directory
# This uses the same logic as the TestSuiteCleanup::cleanup_all() function

set -e

KEY_DIR="$HOME/Library/Application Support/com.barqly.vault/keys"

echo "🧹 Cleaning up test keys..."

if [ ! -d "$KEY_DIR" ]; then
    echo "Keys directory does not exist: $KEY_DIR"
    exit 0
fi

# Count keys before cleanup
BEFORE_COUNT=$(ls -1 "$KEY_DIR" 2>/dev/null | wc -l | tr -d ' ')
echo "Found $BEFORE_COUNT files in keys directory before cleanup"

# Remove test keys (those with test-related names)
find "$KEY_DIR" -type f \( \
    -name "*test*" -o \
    -name "*key1*" -o \
    -name "*key2*" -o \
    -name "*key3*" -o \
    -name "*concurrent*" \
\) -delete 2>/dev/null || true

# Count keys after cleanup
AFTER_COUNT=$(ls -1 "$KEY_DIR" 2>/dev/null | wc -l | tr -d ' ')
REMOVED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

echo "Removed $REMOVED_COUNT test key files"
echo "Remaining files: $AFTER_COUNT"
echo "✅ Test key cleanup complete"