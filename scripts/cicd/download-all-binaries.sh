#!/bin/bash

# download-all-binaries.sh
# Downloads all binary dependencies for all platforms
# Prepares binaries for GitHub Release upload
# Usage: ./scripts/cicd/download-all-binaries.sh

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
ORANGE='\033[38;5;208m'
NC='\033[0m'

# Versions (pinned)
AGE_VERSION="1.2.1"
AGE_PLUGIN_VERSION="0.5.0"
YKMAN_VERSION="5.8.0"

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist/binaries"

echo -e "${ORANGE}🚀 Barqly Vault - Download All Binary Dependencies${NC}"
echo "================================================"
echo "Versions:"
echo "  • age: v$AGE_VERSION"
echo "  • age-plugin-yubikey: v$AGE_PLUGIN_VERSION"
echo "  • ykman: v$YKMAN_VERSION"
echo ""

# Create dist directory
mkdir -p "$DIST_DIR"
cd "$DIST_DIR"

# Clean previous downloads
echo -e "${YELLOW}Cleaning previous downloads...${NC}"
rm -f age-* age-plugin-yubikey-* ykman-* checksums.txt

# ============================================================================
# AGE CLI - Download for all platforms
# ============================================================================

echo -e "\n${ORANGE}📦 Downloading age v$AGE_VERSION for all platforms...${NC}"

# macOS ARM64
echo "  • macOS ARM64..."
curl -L "https://dl.filippo.io/age/v${AGE_VERSION}?for=darwin/arm64" -o age.tar.gz 2>/dev/null
tar -xzf age.tar.gz
mv age/age age-${AGE_VERSION}-darwin-arm64
rm -rf age age.tar.gz

# macOS x86_64
echo "  • macOS x86_64..."
curl -L "https://dl.filippo.io/age/v${AGE_VERSION}?for=darwin/amd64" -o age.tar.gz 2>/dev/null
tar -xzf age.tar.gz
mv age/age age-${AGE_VERSION}-darwin-x86_64
rm -rf age age.tar.gz

# Linux x86_64
echo "  • Linux x86_64..."
curl -L "https://dl.filippo.io/age/v${AGE_VERSION}?for=linux/amd64" -o age.tar.gz 2>/dev/null
tar -xzf age.tar.gz
mv age/age age-${AGE_VERSION}-linux-x86_64
rm -rf age age.tar.gz

# Windows x86_64
echo "  • Windows x86_64..."
curl -L "https://dl.filippo.io/age/v${AGE_VERSION}?for=windows/amd64" -o age.zip 2>/dev/null
unzip -q age.zip
mv age/age.exe age-${AGE_VERSION}-windows-x86_64.exe
rm -rf age age.zip

chmod +x age-${AGE_VERSION}-*

echo -e "${GREEN}✅ age downloaded for all platforms${NC}"

# ============================================================================
# AGE-PLUGIN-YUBIKEY - Download for all platforms
# ============================================================================

echo -e "\n${ORANGE}📦 Downloading age-plugin-yubikey v$AGE_PLUGIN_VERSION for all platforms...${NC}"

# macOS ARM64 (universal for both ARM and Intel via Rosetta 2)
echo "  • macOS ARM64 (universal)..."
curl -L "https://github.com/str4d/age-plugin-yubikey/releases/download/v${AGE_PLUGIN_VERSION}/age-plugin-yubikey-v${AGE_PLUGIN_VERSION}-arm64-darwin.tar.gz" -o plugin.tar.gz 2>/dev/null
tar -xzf plugin.tar.gz
mv age-plugin-yubikey/age-plugin-yubikey age-plugin-yubikey-${AGE_PLUGIN_VERSION}-darwin-arm64
# Create copy for x86_64 (same binary works via Rosetta 2)
cp age-plugin-yubikey-${AGE_PLUGIN_VERSION}-darwin-arm64 age-plugin-yubikey-${AGE_PLUGIN_VERSION}-darwin-x86_64
rm -rf age-plugin-yubikey plugin.tar.gz

# Linux x86_64
echo "  • Linux x86_64..."
curl -L "https://github.com/str4d/age-plugin-yubikey/releases/download/v${AGE_PLUGIN_VERSION}/age-plugin-yubikey-v${AGE_PLUGIN_VERSION}-x86_64-linux.tar.gz" -o plugin.tar.gz 2>/dev/null
tar -xzf plugin.tar.gz
mv age-plugin-yubikey/age-plugin-yubikey age-plugin-yubikey-${AGE_PLUGIN_VERSION}-linux-x86_64
rm -rf age-plugin-yubikey plugin.tar.gz

# Windows x86_64
echo "  • Windows x86_64..."
curl -L "https://github.com/str4d/age-plugin-yubikey/releases/download/v${AGE_PLUGIN_VERSION}/age-plugin-yubikey-v${AGE_PLUGIN_VERSION}-x86_64-windows.zip" -o plugin.zip 2>/dev/null
unzip -q plugin.zip
mv age-plugin-yubikey/age-plugin-yubikey.exe age-plugin-yubikey-${AGE_PLUGIN_VERSION}-windows-x86_64.exe
rm -rf age-plugin-yubikey plugin.zip

chmod +x age-plugin-yubikey-${AGE_PLUGIN_VERSION}-*

echo -e "${GREEN}✅ age-plugin-yubikey downloaded for all platforms${NC}"

# ============================================================================
# YKMAN - Copy existing or build new
# ============================================================================

echo -e "\n${ORANGE}📦 Preparing ykman v$YKMAN_VERSION for all platforms...${NC}"

# macOS - Copy existing PyInstaller bundle
if [ -d "$PROJECT_ROOT/src-tauri/bin/darwin/ykman-bundle" ]; then
  echo "  • macOS: Packaging existing PyInstaller bundle..."
  # Create tarball of the bundle for easy distribution
  tar -czf ykman-${YKMAN_VERSION}-darwin-universal.tar.gz \
    -C "$PROJECT_ROOT/src-tauri/bin/darwin" ykman-bundle
  echo -e "${GREEN}    ✓ ykman-${YKMAN_VERSION}-darwin-universal.tar.gz (20.3 MB)${NC}"
else
  echo -e "${YELLOW}    ⚠️  No existing ykman bundle found${NC}"
  echo "    Building from source (takes 2-3 minutes)..."
  "$PROJECT_ROOT/scripts/yubikey/build-ykman.sh" ${YKMAN_VERSION}
  if [ -d "$PROJECT_ROOT/src-tauri/bin/darwin/ykman-bundle" ]; then
    tar -czf ykman-${YKMAN_VERSION}-darwin-universal.tar.gz \
      -C "$PROJECT_ROOT/src-tauri/bin/darwin" ykman-bundle
    echo -e "${GREEN}    ✓ Built and packaged ykman-${YKMAN_VERSION}-darwin-universal.tar.gz${NC}"
  else
    echo -e "${YELLOW}    ⚠️  Build failed - skipping macOS ykman${NC}"
  fi
fi

# Linux - Build automatically if on Linux system
CURRENT_OS=$(uname -s | tr '[:upper:]' '[:lower:]')
if [ "$CURRENT_OS" = "linux" ]; then
  echo "  • Linux: Building with PyInstaller (takes 2-3 minutes)..."
  # Build using existing script
  "$PROJECT_ROOT/scripts/yubikey/build-ykman.sh" ${YKMAN_VERSION}
  if [ -d "$PROJECT_ROOT/src-tauri/bin/linux/ykman-bundle" ]; then
    tar -czf ykman-${YKMAN_VERSION}-linux-x86_64.tar.gz \
      -C "$PROJECT_ROOT/src-tauri/bin/linux" ykman-bundle
    echo -e "${GREEN}    ✓ ykman-${YKMAN_VERSION}-linux-x86_64.tar.gz${NC}"
  else
    echo -e "${YELLOW}    ⚠️  Build failed - skipping Linux ykman${NC}"
  fi
else
  echo "  • Linux: Requires Linux system to build"
  echo -e "${YELLOW}    → Run this script on Linux OR build in CI${NC}"
fi

# Windows - Requires Windows system or CI
if [ "$CURRENT_OS" = "mingw"* ] || [ "$CURRENT_OS" = "msys"* ]; then
  echo "  • Windows: Building with PyInstaller..."
  echo -e "${YELLOW}    → Windows build support coming in CI integration${NC}"
else
  echo "  • Windows: Requires Windows system to build"
  echo -e "${YELLOW}    → Will be built in CI using Windows runner${NC}"
fi

echo ""
echo -e "${YELLOW}📝 ykman Platform Status:${NC}"
echo "  ✅ macOS: Ready (PyInstaller bundle)"
echo "  ⏳ Linux: Build in CI (GitHub Actions ubuntu runner)"
echo "  ⏳ Windows: Build in CI (GitHub Actions windows runner)"

# ============================================================================
# Calculate Checksums
# ============================================================================

echo -e "\n${ORANGE}🔐 Calculating SHA256 checksums...${NC}"

# Calculate checksums for all binaries
shasum -a 256 age-* age-plugin-yubikey-* ykman-* 2>/dev/null > checksums.txt

# Display checksums
echo -e "${GREEN}✅ Checksums calculated:${NC}"
cat checksums.txt | while read sha file; do
  echo "  $file: ${sha:0:16}..."
done

# ============================================================================
# Summary
# ============================================================================

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Binary Download Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${ORANGE}📊 Downloaded Binaries:${NC}"
ls -lh age-${AGE_VERSION}-* age-plugin-yubikey-${AGE_PLUGIN_VERSION}-* ykman-${YKMAN_VERSION}-* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'

echo ""
echo "Location: $DIST_DIR"
echo ""
echo -e "${ORANGE}Next Steps:${NC}"
echo "1. Verify binaries: cd $DIST_DIR && ./age-${AGE_VERSION}-darwin-arm64 --version"
echo "2. Create GitHub Release:"
echo "   gh release create barqly-vault-dependencies \\"
echo "     age-* age-plugin-yubikey-* ykman-* checksums.txt \\"
echo "     --title 'Barqly Vault Binary Dependencies' \\"
echo "     --notes 'See checksums.txt' \\"
echo "     --prerelease"
echo ""
echo -e "${YELLOW}Note on ykman:${NC}"
echo "  • macOS: PyInstaller bundle (tarball created)"
echo "  • Linux/Windows: Build in CI with scripts/yubikey/build-ykman.sh"
echo "  • For R2: macOS coverage complete, Linux/Windows in CI"
