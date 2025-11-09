#!/bin/bash

# Manual signing script for macOS app bundles
# This signs all Mach-O binaries inside the app bundle
# Usage: APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)" ./scripts/cicd/sign-app.sh [path-to-app]

set -e

echo "🔐 macOS App Signing Script"
echo "============================"

# Check environment
if [[ -z "$APPLE_SIGNING_IDENTITY" ]]; then
    echo "❌ ERROR: APPLE_SIGNING_IDENTITY environment variable not set"
    echo "Set it to your Developer ID, e.g.:"
    echo '  export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name (TEAMID)"'
    exit 1
fi

# Find or use provided app path
if [[ -n "$1" ]]; then
    APP_PATH="$1"
else
    APP_PATH=$(find target -name "*.app" -type d 2>/dev/null | head -1)
fi

if [[ ! -d "$APP_PATH" ]]; then
    echo "❌ ERROR: App bundle not found at: $APP_PATH"
    echo "Usage: $0 [path-to-app]"
    exit 1
fi

echo "📦 App bundle: $APP_PATH"
echo "🔑 Signing identity: $APPLE_SIGNING_IDENTITY"
echo

# Clear quarantine
echo "🧹 Clearing quarantine attributes..."
xattr -r -d com.apple.quarantine "$APP_PATH" 2>/dev/null || true

# Create entitlements for bundled tools
BUNDLED_ENTITLEMENTS=$(mktemp)
cat > "$BUNDLED_ENTITLEMENTS" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
EOF

# Use app's main entitlements if they exist
APP_ENTITLEMENTS="$APP_PATH/Contents/Resources/entitlements.plist"
if [[ ! -f "$APP_ENTITLEMENTS" ]]; then
    APP_ENTITLEMENTS="src-tauri/entitlements.plist"
fi
if [[ ! -f "$APP_ENTITLEMENTS" ]]; then
    echo "⚠️  Warning: No entitlements.plist found, using bundled entitlements for all"
    APP_ENTITLEMENTS="$BUNDLED_ENTITLEMENTS"
fi

echo "📝 Signing strategy:"
echo "  - Bundled tools: minimal entitlements"
echo "  - App components: $APP_ENTITLEMENTS"
echo

# Sign bundled binaries first (inside-out)
echo "🔐 Phase 1: Signing bundled tools in Resources/bin..."
signed_count=0
failed_files=""

# Find all Mach-O files in Resources/bin
while IFS= read -r -d '' file; do
    if file "$file" | grep -q "Mach-O"; then
        rel_path="${file#$APP_PATH/}"
        echo -n "  Signing: $rel_path... "

        # Remove existing signature
        codesign --remove-signature "$file" 2>/dev/null || true

        # Sign with minimal entitlements
        if codesign --force \
            --sign "$APPLE_SIGNING_IDENTITY" \
            --options runtime \
            --timestamp \
            --entitlements "$BUNDLED_ENTITLEMENTS" \
            "$file" 2>/dev/null; then
            echo "✅"
            ((signed_count++))
        else
            echo "❌"
            failed_files="$failed_files\n  - $rel_path"
        fi
    fi
done < <(find "$APP_PATH/Contents/Resources/bin" -type f \( -perm -111 -o -name "*.dylib" -o -name "*.so" -o -name "*.bundle" \) -print0 2>/dev/null)

echo "  Signed $signed_count bundled tools"
echo

# Sign frameworks and libraries
echo "🔐 Phase 2: Signing frameworks and libraries..."
framework_count=0

while IFS= read -r -d '' file; do
    if file "$file" | grep -q "Mach-O"; then
        rel_path="${file#$APP_PATH/}"
        echo -n "  Signing: $rel_path... "

        # Remove existing signature
        codesign --remove-signature "$file" 2>/dev/null || true

        # Sign with app entitlements
        if codesign --force \
            --sign "$APPLE_SIGNING_IDENTITY" \
            --options runtime \
            --timestamp \
            --entitlements "$APP_ENTITLEMENTS" \
            "$file" 2>/dev/null; then
            echo "✅"
            ((framework_count++))
        else
            echo "❌"
            failed_files="$failed_files\n  - $rel_path"
        fi
    fi
done < <(find "$APP_PATH" -type f \( -name "*.dylib" -o -name "*.so" -o -name "*.bundle" \) ! -path "*/Resources/bin/*" -print0 2>/dev/null)

echo "  Signed $framework_count libraries"
echo

# Sign main executable
echo "🔐 Phase 3: Signing main executable..."
MAIN_BIN="$APP_PATH/Contents/MacOS/$(basename "$APP_PATH" .app)"
if [[ -f "$MAIN_BIN" ]]; then
    codesign --force \
        --sign "$APPLE_SIGNING_IDENTITY" \
        --options runtime \
        --timestamp \
        --entitlements "$APP_ENTITLEMENTS" \
        "$MAIN_BIN"
    echo "  ✅ Main executable signed"
else
    echo "  ⚠️  Main executable not found at: $MAIN_BIN"
fi
echo

# Sign the app bundle itself
echo "🔐 Phase 4: Signing app bundle..."
codesign --force --deep \
    --sign "$APPLE_SIGNING_IDENTITY" \
    --options runtime \
    --timestamp \
    --entitlements "$APP_ENTITLEMENTS" \
    "$APP_PATH"
echo "  ✅ App bundle signed"
echo

# Verification
echo "🔍 Verification:"
echo -n "  Deep signature check... "
if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1 | grep -q "valid on disk"; then
    echo "✅"
else
    echo "❌"
    echo "  Error details:"
    codesign --verify --deep --strict --verbose=4 "$APP_PATH" 2>&1 | grep -v "valid on disk" | head -10
fi

echo -n "  Gatekeeper assessment... "
if spctl --assess --type execute --verbose=4 "$APP_PATH" 2>&1 | grep -q "accepted"; then
    echo "✅"
else
    echo "⚠️  (expected before notarization)"
fi

# Cleanup
rm -f "$BUNDLED_ENTITLEMENTS"

# Summary
echo
echo "============================"
if [[ -n "$failed_files" ]]; then
    echo "⚠️  Some files failed to sign:"
    echo -e "$failed_files"
    echo
fi

total_signed=$((signed_count + framework_count + 1))
echo "✅ Signing complete! Signed $total_signed components."
echo
echo "Next steps:"
echo "1. Run verification: ./scripts/cicd/verify-signing.sh"
echo "2. Create DMG if needed"
echo "3. Submit for notarization"