#!/bin/bash

# Script to verify app naming after build
# This helps ensure the app displays correctly as "Barqly Vault"

echo "🔍 Checking application naming configuration..."
echo "================================================"

# Check tauri.conf.json productName
echo ""
echo "1. Checking tauri.conf.json productName:"
grep '"productName"' src-tauri/tauri.conf.json || echo "❌ productName not found!"

# Check Info.plist display names
echo ""
echo "2. Checking Info.plist display names:"
if [ -f "src-tauri/Info.plist" ]; then
    grep -A1 "CFBundleDisplayName\|CFBundleName" src-tauri/Info.plist
else
    echo "❌ Info.plist not found!"
fi

# Check desktop file for Linux
echo ""
echo "3. Checking Linux desktop file:"
if [ -f "src-tauri/barqly-vault.desktop" ]; then
    grep "^Name=" src-tauri/barqly-vault.desktop
else
    echo "❌ Desktop file not found!"
fi

# Check Cargo.toml package name
echo ""
echo "4. Checking Cargo.toml package name (should be barqly-vault):"
grep '^name =' src-tauri/Cargo.toml | head -1

# If built artifacts exist, check them
echo ""
echo "5. Checking built artifacts (if available):"
if [ -d "target" ]; then
    # Check macOS app bundles
    if ls target/*/release/bundle/macos/*.app >/dev/null 2>&1; then
        echo "✅ macOS app bundles found:"
        ls -la target/*/release/bundle/macos/*.app 2>/dev/null | awk '{print "   " $NF}'
    fi
    
    # Check DMG files
    if ls target/*/release/bundle/dmg/*.dmg >/dev/null 2>&1; then
        echo "✅ DMG files found:"
        ls -la target/*/release/bundle/dmg/*.dmg 2>/dev/null | awk '{print "   " $NF}'
    fi
else
    echo "ℹ️  No build artifacts found (run 'make build' first)"
fi

echo ""
echo "================================================"
echo "✅ Configuration check complete!"
echo ""
echo "Expected naming:"
echo "  - App display name: 'Barqly Vault'"
echo "  - Package/binary name: 'barqly-vault'"
echo "  - DMG files: 'barqly-vault-VERSION-macos-ARCH.dmg'"
echo ""