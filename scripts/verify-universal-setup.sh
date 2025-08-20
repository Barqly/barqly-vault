#!/bin/bash

# Barqly Vault - Universal Build Setup Verification
# Checks that all components are properly configured for universal DMG creation

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verifying Universal DMG Build Setup"
echo "======================================"
echo ""

ISSUES=0

# Check Rust installation
echo "Checking Rust toolchain..."
if command -v rustc &> /dev/null; then
    echo -e "${GREEN}✓${NC} Rust installed: $(rustc --version)"
else
    echo -e "${RED}✗${NC} Rust not found"
    ISSUES=$((ISSUES + 1))
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    echo -e "${GREEN}✓${NC} Cargo installed: $(cargo --version)"
else
    echo -e "${RED}✗${NC} Cargo not found"
    ISSUES=$((ISSUES + 1))
fi

echo ""
echo "Checking Rust targets..."

# Check ARM64 target
if rustup target list --installed | grep -q "aarch64-apple-darwin"; then
    echo -e "${GREEN}✓${NC} Apple Silicon target (aarch64-apple-darwin) installed"
else
    echo -e "${RED}✗${NC} Apple Silicon target missing"
    echo "  Run: rustup target add aarch64-apple-darwin"
    ISSUES=$((ISSUES + 1))
fi

# Check x86_64 target
if rustup target list --installed | grep -q "x86_64-apple-darwin"; then
    echo -e "${GREEN}✓${NC} Intel target (x86_64-apple-darwin) installed"
else
    echo -e "${RED}✗${NC} Intel target missing"
    echo "  Run: rustup target add x86_64-apple-darwin"
    ISSUES=$((ISSUES + 1))
fi

echo ""
echo "Checking build tools..."

# Check lipo
if command -v lipo &> /dev/null; then
    echo -e "${GREEN}✓${NC} lipo tool available (for universal binary creation)"
else
    echo -e "${RED}✗${NC} lipo tool not found (required for universal binaries)"
    ISSUES=$((ISSUES + 1))
fi

# Check hdiutil
if command -v hdiutil &> /dev/null; then
    echo -e "${GREEN}✓${NC} hdiutil available (for DMG creation)"
else
    echo -e "${RED}✗${NC} hdiutil not found (required for DMG creation)"
    ISSUES=$((ISSUES + 1))
fi

echo ""
echo "Checking project files..."

# Check entitlements.plist
if [ -f "src-tauri/entitlements.plist" ]; then
    echo -e "${GREEN}✓${NC} entitlements.plist exists"
else
    echo -e "${RED}✗${NC} entitlements.plist missing"
    ISSUES=$((ISSUES + 1))
fi

# Check build script
if [ -f "scripts/build-universal-dmg.sh" ]; then
    if [ -x "scripts/build-universal-dmg.sh" ]; then
        echo -e "${GREEN}✓${NC} build-universal-dmg.sh exists and is executable"
    else
        echo -e "${YELLOW}⚠${NC} build-universal-dmg.sh exists but is not executable"
        echo "  Run: chmod +x scripts/build-universal-dmg.sh"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}✗${NC} build-universal-dmg.sh missing"
    ISSUES=$((ISSUES + 1))
fi

# Check Node.js
echo ""
echo "Checking Node.js environment..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓${NC} Node.js installed: $(node --version)"
else
    echo -e "${RED}✗${NC} Node.js not found"
    ISSUES=$((ISSUES + 1))
fi

if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm installed: $(npm --version)"
else
    echo -e "${RED}✗${NC} npm not found"
    ISSUES=$((ISSUES + 1))
fi

# Check frontend dependencies
if [ -d "src-ui/node_modules" ]; then
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
else
    echo -e "${YELLOW}⚠${NC} Frontend dependencies not installed"
    echo "  Run: cd src-ui && npm install"
fi

# Summary
echo ""
echo "======================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "You're ready to build a universal DMG:"
    echo "  • Full build: make dmg-universal"
    echo "  • Quick build: ./scripts/quick-dmg.sh"
else
    echo -e "${RED}❌ Found $ISSUES issue(s)${NC}"
    echo ""
    echo "Please fix the issues above before building."
fi

exit $ISSUES