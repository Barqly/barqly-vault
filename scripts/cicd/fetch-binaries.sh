#!/bin/bash

# fetch-binaries.sh
# Downloads binary dependencies from GitHub Release based on current platform
# Reads from src-tauri/binary-dependencies.json for URLs and checksums
# Usage: ./scripts/cicd/fetch-binaries.sh

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MANIFEST="$PROJECT_ROOT/src-tauri/bin/binary-dependencies.json"
BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

echo -e "${GREEN}📦 Fetching binary dependencies for Barqly Vault${NC}"

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
  darwin)
    case "$ARCH" in
      arm64|aarch64) PLATFORM="darwin-arm64" ;;
      x86_64) PLATFORM="darwin-x86_64" ;;
      *) echo -e "${RED}❌ Unsupported macOS architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  linux)
    case "$ARCH" in
      x86_64) PLATFORM="linux-x86_64" ;;
      *) echo -e "${RED}❌ Unsupported Linux architecture: $ARCH${NC}"; exit 1 ;;
    esac
    ;;
  mingw*|msys*|cygwin*)
    PLATFORM="windows-x86_64"
    ;;
  *)
    echo -e "${RED}❌ Unsupported OS: $OS${NC}"
    exit 1
    ;;
esac

echo -e "Platform detected: ${YELLOW}$PLATFORM${NC}"

# Determine platform subdirectory
case "$OS" in
  darwin) PLATFORM_DIR="darwin" ;;
  linux) PLATFORM_DIR="linux" ;;
  mingw*|msys*|cygwin*) PLATFORM_DIR="windows" ;;
esac

# Create platform-specific bin directory
mkdir -p "$BIN_DIR/$PLATFORM_DIR"

# Download age
echo -e "\n${GREEN}Downloading age...${NC}"
AGE_URL=$(jq -r ".dependencies.age.platforms.\"$PLATFORM\".url" "$MANIFEST")
AGE_SHA=$(jq -r ".dependencies.age.platforms.\"$PLATFORM\".sha256" "$MANIFEST")

curl -L "$AGE_URL" -o "$BIN_DIR/$PLATFORM_DIR/age" --progress-bar

# Verify checksum
ACTUAL_SHA=$(shasum -a 256 "$BIN_DIR/$PLATFORM_DIR/age" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$AGE_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for age${NC}"
  exit 1
fi
chmod +x "$BIN_DIR/$PLATFORM_DIR/age"
echo -e "${GREEN}✓ age verified${NC}"

# Download age-plugin-yubikey
echo -e "\n${GREEN}Downloading age-plugin-yubikey...${NC}"
PLUGIN_URL=$(jq -r ".dependencies.\"age-plugin-yubikey\".platforms.\"$PLATFORM\".url" "$MANIFEST")
PLUGIN_SHA=$(jq -r ".dependencies.\"age-plugin-yubikey\".platforms.\"$PLATFORM\".sha256" "$MANIFEST")

curl -L "$PLUGIN_URL" -o "$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey" --progress-bar

# Verify checksum
ACTUAL_SHA=$(shasum -a 256 "$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$PLUGIN_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for age-plugin-yubikey${NC}"
  exit 1
fi
chmod +x "$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey"
echo -e "${GREEN}✓ age-plugin-yubikey verified${NC}"

# Download and extract ykman bundle
echo -e "\n${GREEN}Downloading ykman...${NC}"

# Determine ykman platform (darwin uses universal, others use arch-specific)
if [ "$OS" = "darwin" ]; then
  YKMAN_PLATFORM="darwin-universal"
else
  YKMAN_PLATFORM="$PLATFORM"
fi

YKMAN_URL=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".url" "$MANIFEST")
YKMAN_SHA=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".sha256" "$MANIFEST")
YKMAN_FILE=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".filename" "$MANIFEST")

curl -L "$YKMAN_URL" -o "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" --progress-bar

# Verify checksum
ACTUAL_SHA=$(shasum -a 256 "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$YKMAN_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for ykman${NC}"
  exit 1
fi

# Extract ykman bundle to platform directory
echo -e "Extracting ykman bundle..."
tar -xzf "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" -C "$BIN_DIR/$PLATFORM_DIR"
rm "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE"  # Remove tarball after extraction

# Create platform-appropriate wrapper
if [ "$OS" = "darwin" ] || [ "$OS" = "linux" ]; then
  # Unix wrapper
  cat > "$BIN_DIR/$PLATFORM_DIR/ykman" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/ykman-bundle/ykman" "$@"
EOF
  chmod +x "$BIN_DIR/$PLATFORM_DIR/ykman"
else
  # Windows wrapper
  cat > "$BIN_DIR/$PLATFORM_DIR/ykman.bat" << 'EOF'
@echo off
set SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%ykman-bundle\ykman.exe" %*
EOF
fi

echo -e "${GREEN}✓ ykman extracted and ready${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ All binaries downloaded and verified${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Location: $BIN_DIR/$PLATFORM_DIR/"
echo "Platform: $PLATFORM"
echo ""
echo "Files:"
echo "  ✓ age"
echo "  ✓ age-plugin-yubikey"
echo "  ✓ ykman (wrapper + bundle)"
echo ""
echo -e "${YELLOW}Binaries ready for Tauri bundling.${NC}"
