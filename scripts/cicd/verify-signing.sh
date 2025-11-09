#!/bin/bash

# Verification script to test signing before pushing to CI
# Usage: ./scripts/cicd/verify-signing.sh

set -e

echo "🔍 macOS Code Signing Verification Script"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on macOS
if [[ "$OSNAME" != "Darwin" ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

# Function to check a binary
check_binary() {
    local file="$1"
    local name=$(basename "$file")

    echo -n "  Checking $name... "

    # Check if file is Mach-O
    if ! file "$file" | grep -q "Mach-O"; then
        echo -e "${YELLOW}⚠️  Not a Mach-O file${NC}"
        return 1
    fi

    # Check signature
    if codesign -dv "$file" 2>&1 | grep -q "not signed"; then
        echo -e "${RED}❌ NOT SIGNED${NC}"
        return 1
    fi

    # Check for Developer ID
    local signer=$(codesign -dv "$file" 2>&1 | grep "Authority=Developer ID Application" || true)
    if [[ -z "$signer" ]]; then
        echo -e "${RED}❌ Not signed with Developer ID${NC}"
        return 1
    fi

    # Check for timestamp
    if ! codesign -dv "$file" 2>&1 | grep -q "Timestamp="; then
        echo -e "${RED}❌ No secure timestamp${NC}"
        return 1
    fi

    # Check for hardened runtime
    if ! codesign -dv "$file" 2>&1 | grep -q "flags=0x10000"; then
        echo -e "${YELLOW}⚠️  No hardened runtime${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Properly signed${NC}"
    return 0
}

# Find the .app bundle
echo "1. Locating .app bundle..."
APP_PATH=$(find target -name "*.app" -type d 2>/dev/null | head -1)

if [[ -z "$APP_PATH" ]]; then
    echo -e "${RED}❌ No .app bundle found. Please build first with: cargo tauri build${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found: $APP_PATH${NC}"
echo

# Check main app signature
echo "2. Checking main app signature..."
check_binary "$APP_PATH"
echo

# Check bundled binaries
echo "3. Checking bundled binaries in Resources/bin..."
BIN_DIR="$APP_PATH/Contents/Resources/bin/darwin"

if [[ ! -d "$BIN_DIR" ]]; then
    echo -e "${RED}❌ Binary directory not found: $BIN_DIR${NC}"
    exit 1
fi

failed_count=0
checked_count=0

# Check age
if [[ -f "$BIN_DIR/age" ]]; then
    check_binary "$BIN_DIR/age" || ((failed_count++))
    ((checked_count++))
fi

# Check age-plugin-yubikey
if [[ -f "$BIN_DIR/age-plugin-yubikey" ]]; then
    check_binary "$BIN_DIR/age-plugin-yubikey" || ((failed_count++))
    ((checked_count++))
fi

# Check ykman wrapper
if [[ -f "$BIN_DIR/ykman" ]]; then
    check_binary "$BIN_DIR/ykman" || ((failed_count++))
    ((checked_count++))
fi

# Check ykman-bundle internal files (especially .so files)
echo
echo "4. Checking ykman-bundle internal files..."
BUNDLE_DIR="$BIN_DIR/ykman-bundle"

if [[ -d "$BUNDLE_DIR" ]]; then
    # Find all .so, .dylib files in the bundle
    while IFS= read -r -d '' file; do
        if file "$file" | grep -q "Mach-O"; then
            check_binary "$file" || ((failed_count++))
            ((checked_count++))
        fi
    done < <(find "$BUNDLE_DIR" -type f \( -name "*.so" -o -name "*.dylib" \) -print0)
else
    echo -e "${YELLOW}⚠️  ykman-bundle directory not found${NC}"
fi

echo
echo "5. Deep verification of entire .app..."
if codesign --verify --deep --strict --verbose=4 "$APP_PATH" 2>&1 | grep -q "valid on disk"; then
    echo -e "${GREEN}✅ Deep verification passed${NC}"
else
    echo -e "${RED}❌ Deep verification failed${NC}"
    codesign --verify --deep --strict --verbose=4 "$APP_PATH" 2>&1 | head -20
fi

echo
echo "6. Gatekeeper assessment..."
if spctl --assess --type execute --verbose=4 "$APP_PATH" 2>&1 | grep -q "accepted"; then
    echo -e "${GREEN}✅ Gatekeeper would accept this app${NC}"
else
    echo -e "${YELLOW}⚠️  Gatekeeper assessment failed (expected before notarization)${NC}"
fi

# Summary
echo
echo "========================================="
echo "SUMMARY:"
echo "  Binaries checked: $checked_count"
echo "  Failed signatures: $failed_count"

if [[ $failed_count -eq 0 ]]; then
    echo -e "${GREEN}✅ All signatures look good! Ready for notarization.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $failed_count unsigned or improperly signed binaries.${NC}"
    echo
    echo "To fix:"
    echo "1. Ensure APPLE_SIGNING_IDENTITY environment variable is set"
    echo "2. Run the signing script: ./scripts/cicd/sign-app.sh"
    echo "3. Re-run this verification"
    exit 1
fi