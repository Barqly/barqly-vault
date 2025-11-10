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

# Detect SHA256 command (platform-aware)
if command -v sha256sum &> /dev/null; then
  SHA_CMD="sha256sum"
elif command -v shasum &> /dev/null; then
  SHA_CMD="shasum -a 256"
else
  echo -e "${RED}❌ No SHA256 command available (need sha256sum or shasum)${NC}"
  exit 1
fi
echo -e "SHA command: ${YELLOW}$SHA_CMD${NC}"

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

# Determine output filename (add .exe for Windows)
if [[ "$PLATFORM_DIR" == "windows" ]]; then
  AGE_FILE="age.exe"
else
  AGE_FILE="age"
fi

curl -L "$AGE_URL" -o "$BIN_DIR/$PLATFORM_DIR/$AGE_FILE" --progress-bar

# Verify checksum
ACTUAL_SHA=$($SHA_CMD "$BIN_DIR/$PLATFORM_DIR/$AGE_FILE" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$AGE_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for age${NC}"
  echo -e "Expected: $AGE_SHA"
  echo -e "Got:      $ACTUAL_SHA"
  exit 1
fi

# Set executable permissions (skip for Windows .exe)
if [[ "$PLATFORM_DIR" != "windows" ]]; then
  chmod +x "$BIN_DIR/$PLATFORM_DIR/$AGE_FILE"
fi
echo -e "${GREEN}✓ age verified${NC}"

# Download age-plugin-yubikey
echo -e "\n${GREEN}Downloading age-plugin-yubikey...${NC}"
PLUGIN_URL=$(jq -r ".dependencies.\"age-plugin-yubikey\".platforms.\"$PLATFORM\".url" "$MANIFEST")
PLUGIN_SHA=$(jq -r ".dependencies.\"age-plugin-yubikey\".platforms.\"$PLATFORM\".sha256" "$MANIFEST")

# Determine output filename (add .exe for Windows)
if [[ "$PLATFORM_DIR" == "windows" ]]; then
  PLUGIN_FILE="age-plugin-yubikey.exe"
else
  PLUGIN_FILE="age-plugin-yubikey"
fi

curl -L "$PLUGIN_URL" -o "$BIN_DIR/$PLATFORM_DIR/$PLUGIN_FILE" --progress-bar

# Verify checksum
ACTUAL_SHA=$($SHA_CMD "$BIN_DIR/$PLATFORM_DIR/$PLUGIN_FILE" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$PLUGIN_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for age-plugin-yubikey${NC}"
  echo -e "Expected: $PLUGIN_SHA"
  echo -e "Got:      $ACTUAL_SHA"
  exit 1
fi

# Set executable permissions (skip for Windows .exe)
if [[ "$PLATFORM_DIR" != "windows" ]]; then
  chmod +x "$BIN_DIR/$PLATFORM_DIR/$PLUGIN_FILE"
fi
echo -e "${GREEN}✓ age-plugin-yubikey verified${NC}"

# Download and extract ykman bundle
echo -e "\n${GREEN}Downloading ykman...${NC}"

# Use platform-specific binaries for all platforms (no more universal)
YKMAN_PLATFORM="$PLATFORM"

YKMAN_URL=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".url" "$MANIFEST")
YKMAN_SHA=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".sha256" "$MANIFEST")
YKMAN_FILE=$(jq -r ".dependencies.ykman.platforms.\"$YKMAN_PLATFORM\".filename" "$MANIFEST")

curl -L "$YKMAN_URL" -o "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" --progress-bar

# Verify checksum
ACTUAL_SHA=$($SHA_CMD "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" | cut -d' ' -f1)
if [ "$ACTUAL_SHA" != "$YKMAN_SHA" ]; then
  echo -e "${RED}❌ Checksum mismatch for ykman${NC}"
  echo -e "Expected: $YKMAN_SHA"
  echo -e "Got:      $ACTUAL_SHA"
  exit 1
fi

# Extract ykman bundle to platform directory
echo -e "Extracting ykman bundle..."
tar -xzf "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE" -C "$BIN_DIR/$PLATFORM_DIR"
rm "$BIN_DIR/$PLATFORM_DIR/$YKMAN_FILE"  # Remove tarball after extraction

# Set executable permissions for extracted ykman binary
if [ "$OS" = "darwin" ] || [ "$OS" = "linux" ]; then
  chmod +x "$BIN_DIR/$PLATFORM_DIR/ykman-bundle/ykman"
fi

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
