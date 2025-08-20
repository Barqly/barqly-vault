#!/bin/bash

# Barqly Vault - Quick DMG Builder for Testing
# A faster alternative for testing when you've already validated the code

set -e

echo "⚡ Quick DMG Build (skips validation)"
echo "====================================="
echo ""
echo "This will build for your current architecture."
echo "For specific architectures, use:"
echo "  • Intel: make dmg-intel"
echo "  • Apple Silicon: make dmg-arm"
echo "  • Both: make dmg-all"
echo ""
echo "This assumes you've already:"
echo "  1. Run 'make validate' successfully"
echo "  2. Built the frontend recently"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Detect current architecture
    ARCH=$(uname -m)
    if [ "$ARCH" = "x86_64" ]; then
        echo "Building for Intel architecture..."
        TARGET="intel"
    elif [ "$ARCH" = "arm64" ]; then
        echo "Building for Apple Silicon..."
        TARGET="arm"
    else
        echo "Unknown architecture: $ARCH"
        exit 1
    fi
    
    ./scripts/build-macos-separate.sh --skip-validation --skip-frontend --target $TARGET
else
    echo "Build cancelled."
    exit 0
fi