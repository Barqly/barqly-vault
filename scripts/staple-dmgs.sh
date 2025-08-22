#!/bin/bash

# Script to staple already-notarized DMGs
# Usage: ./scripts/staple-dmgs.sh [directory-path]
# If no directory provided, uses current directory

set -e

echo "🔧 Stapling Notarized DMGs"
echo "=========================="
echo ""

# Get the directory path from argument or use current directory
ARTIFACTS_DIR="${1:-.}"

# Validate directory exists
if [ ! -d "$ARTIFACTS_DIR" ]; then
    echo "❌ Error: Directory '$ARTIFACTS_DIR' does not exist"
    echo "Usage: $0 [directory-path]"
    echo "Example: $0 ~/Downloads/github-artifacts"
    exit 1
fi

echo "📂 Working in directory: $ARTIFACTS_DIR"

# Create stapled subdirectory in the same location
STAPLED_DIR="$ARTIFACTS_DIR/stapled"
mkdir -p "$STAPLED_DIR"

echo ""
echo "🔍 Looking for DMG files..."

# Find and staple Intel DMG
INTEL_DMG=$(find "$ARTIFACTS_DIR" -maxdepth 1 -name "barqly-vault_0.1.0_x64.dmg" -type f | head -1)
if [ -f "$INTEL_DMG" ]; then
    echo "Found Intel DMG: $(basename "$INTEL_DMG")"
    echo "📌 Stapling..."
    
    # Check if already stapled
    if xcrun stapler validate "$INTEL_DMG" 2>/dev/null; then
        echo "✅ Already stapled!"
        cp "$INTEL_DMG" "$STAPLED_DIR/barqly-vault-0.1.0-macos-x64.dmg"
        echo "📦 Created: $STAPLED_DIR/barqly-vault-0.1.0-macos-x64.dmg"
    else
        # Try to staple
        if xcrun stapler staple "$INTEL_DMG"; then
            echo "✅ Successfully stapled!"
            cp "$INTEL_DMG" "$STAPLED_DIR/barqly-vault-0.1.0-macos-x64-signed-notarized.dmg"
            echo "📦 Created: $STAPLED_DIR/barqly-vault-0.1.0-macos-x64-signed-notarized.dmg"
        else
            echo "❌ Failed to staple Intel DMG"
            echo "   This DMG may not have been notarized yet"
        fi
    fi
else
    echo "❌ Intel DMG not found (barqly-vault_0.1.0_x64.dmg)"
fi

echo ""

# Find and staple ARM DMG
ARM_DMG=$(find "$ARTIFACTS_DIR" -maxdepth 1 -name "barqly-vault_0.1.0_aarch64.dmg" -type f | head -1)
if [ -f "$ARM_DMG" ]; then
    echo "Found ARM DMG: $(basename "$ARM_DMG")"
    echo "📌 Stapling..."
    
    # Check if already stapled
    if xcrun stapler validate "$ARM_DMG" 2>/dev/null; then
        echo "✅ Already stapled!"
        cp "$ARM_DMG" "$STAPLED_DIR/barqly-vault-0.1.0-macos-arm64.dmg"
        echo "📦 Created: $STAPLED_DIR/barqly-vault-0.1.0-macos-arm64.dmg"
    else
        # Try to staple
        if xcrun stapler staple "$ARM_DMG"; then
            echo "✅ Successfully stapled!"
            cp "$ARM_DMG" "$STAPLED_DIR/barqly-vault-0.1.0-macos-aarch64-signed-notarized.dmg"
            echo "📦 Created: $STAPLED_DIR/barqly-vault-0.1.0-macos-aarch64-signed-notarized.dmg"
        else
            echo "❌ Failed to staple ARM DMG"
            echo "   This DMG may not have been notarized yet"
        fi
    fi
else
    echo "❌ ARM DMG not found (barqly-vault_0.1.0_aarch64.dmg)"
fi

echo ""
echo "📋 Summary:"
echo "==========="

# Check what we have in the stapled directory
if ls "$STAPLED_DIR"/*.dmg >/dev/null 2>&1; then
    echo "✅ Stapled DMGs created in: $STAPLED_DIR/"
    echo ""
    echo "Final DMGs:"
    ls -la "$STAPLED_DIR"/*.dmg
    echo ""
    echo "📤 To upload to GitHub release:"
    echo "   gh release upload v0.1.0 '$STAPLED_DIR'/*.dmg"
else
    echo "❌ No DMGs were stapled"
    echo ""
    echo "Make sure you have:"
    echo "1. Downloaded the DMG artifacts from GitHub Actions"
    echo "2. Extracted them to the directory: $ARTIFACTS_DIR"
    echo "3. The DMGs were successfully notarized (check with check-notarization.sh)"
fi