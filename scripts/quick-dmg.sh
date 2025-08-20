#!/bin/bash

# Barqly Vault - Quick DMG Builder for Testing
# A faster alternative for testing when you've already validated the code

set -e

echo "⚡ Quick Universal DMG Build (skips validation)"
echo "=============================================="
echo ""
echo "This assumes you've already:"
echo "  1. Run 'make validate' successfully"
echo "  2. Built the frontend recently"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/build-universal-dmg.sh --skip-validation --skip-frontend
else
    echo "Build cancelled."
    exit 0
fi