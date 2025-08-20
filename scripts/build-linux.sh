#!/bin/bash

# Barqly Vault - Linux Build Script
# Creates AppImage and .deb packages for Linux distribution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "success")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "error")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        "step")
            echo -e "${BLUE}→ $message${NC}"
            ;;
    esac
}

echo "🐧 Barqly Vault - Linux Build Script"
echo "====================================="
echo ""

# Check if we're on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    print_status "warning" "This script is designed to run on Linux for native builds"
    print_status "info" "Cross-compilation from macOS/Windows requires additional setup"
    echo ""
    print_status "info" "Recommended approach:"
    echo "  1. Use GitHub Actions for automated Linux builds"
    echo "  2. Run this script on a Linux machine (Ubuntu, PopOS, etc.)"
    echo "  3. Use Docker with Linux container for local builds"
    echo ""
    echo "Continue anyway? (y/N)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        print_status "info" "Build cancelled"
        exit 0
    fi
fi

# Check if we're in the right directory
if [ ! -d "src-tauri" ] || [ ! -d "src-ui" ]; then
    print_status "error" "Must be run from the project root directory"
    exit 1
fi

# Build frontend
print_status "info" "Building frontend for production..."
cd src-ui
if [ ! -d "node_modules" ]; then
    print_status "step" "Installing frontend dependencies..."
    npm install
fi
npm run build
cd ..
print_status "success" "Frontend build completed"

# Build Linux packages
print_status "info" "Building Linux packages..."
cd src-tauri

# Install Linux dependencies if needed (for GitHub Actions)
if command -v apt-get >/dev/null 2>&1; then
    print_status "step" "Installing Linux build dependencies..."
    sudo apt-get update >/dev/null 2>&1 || true
    sudo apt-get install -y \
        libwebkit2gtk-4.1-dev \
        libappindicator3-dev \
        librsvg2-dev \
        patchelf \
        libgtk-3-dev \
        libayatana-appindicator3-dev >/dev/null 2>&1 || true
fi

print_status "step" "Building AppImage and .deb packages..."
cargo tauri build

cd ..

# Find and display results
print_status "info" "Build complete! Searching for output files..."

# Look for AppImage
APPIMAGE_PATH=$(find target -name "*.AppImage" 2>/dev/null | head -1)
if [ -n "$APPIMAGE_PATH" ]; then
    APPIMAGE_SIZE=$(du -h "$APPIMAGE_PATH" | cut -f1)
    print_status "success" "AppImage created: $APPIMAGE_SIZE"
    echo "    📦 $APPIMAGE_PATH"
else
    print_status "warning" "No AppImage found"
fi

# Look for .deb package
DEB_PATH=$(find target -name "*.deb" 2>/dev/null | head -1)
if [ -n "$DEB_PATH" ]; then
    DEB_SIZE=$(du -h "$DEB_PATH" | cut -f1)
    print_status "success" "Debian package created: $DEB_SIZE"
    echo "    📦 $DEB_PATH"
else
    print_status "warning" "No .deb package found"
fi

echo ""
echo "=========================================="
print_status "success" "🎉 Linux Build Complete!"
echo "=========================================="
echo ""

if [ -n "$APPIMAGE_PATH" ]; then
    echo "🧪 Testing AppImage:"
    echo "1. Copy to your Linux machine:"
    echo "   scp '$APPIMAGE_PATH' user@linux-machine:~/"
    echo ""
    echo "2. Make executable and run:"
    echo "   chmod +x ~/$(basename "$APPIMAGE_PATH")"
    echo "   ./$(basename "$APPIMAGE_PATH")"
    echo ""
fi

if [ -n "$DEB_PATH" ]; then
    echo "🧪 Testing .deb package:"
    echo "1. Install on Ubuntu/Debian/PopOS:"
    echo "   sudo dpkg -i '$DEB_PATH'"
    echo ""
    echo "2. If missing dependencies:"
    echo "   sudo apt-get install -f"
    echo ""
fi

echo "💡 The AppImage is more universal and works on most Linux distributions"
echo "💡 The .deb package integrates better with Ubuntu/Debian-based systems"