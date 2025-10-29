#!/bin/bash

# build-ykman.sh
# Builds ykman (YubiKey Manager CLI) from source using PyInstaller
# This creates a standalone binary that doesn't require Python runtime
# Usage: ./scripts/build-ykman.sh [version]

set -e  # Exit on any error

# Configuration
YKMAN_VERSION="${1:-5.8.0}"  # Default to 5.8.0 if not specified
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$PROJECT_ROOT/scripts/build"
BIN_DIR="$PROJECT_ROOT/src-tauri/bin"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    # Check Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi

    local python_version=$(python3 --version | cut -d' ' -f2)
    print_info "Found Python $python_version"

    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is required but not installed"
        exit 1
    fi

    print_info "Prerequisites check passed"
}

# Detect platform
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    case "$os" in
        darwin)
            PLATFORM="darwin"
            PLATFORM_NAME="macOS"
            VENV_ACTIVATE="venv/bin/activate"
            CHECKSUM_CMD="shasum -a 256"
            BINARY_EXT=""
            ;;
        linux)
            PLATFORM="linux"
            PLATFORM_NAME="Linux"
            VENV_ACTIVATE="venv/bin/activate"
            CHECKSUM_CMD="sha256sum"
            BINARY_EXT=""
            ;;
        mingw*|msys*|cygwin*)
            PLATFORM="windows"
            PLATFORM_NAME="Windows"
            VENV_ACTIVATE="venv/Scripts/activate"
            CHECKSUM_CMD="sha256sum"
            BINARY_EXT=".exe"
            ;;
        *)
            print_error "Unsupported OS: $os"
            exit 1
            ;;
    esac

    print_info "Building for $PLATFORM_NAME ($arch)"
}

# Clone yubikey-manager repository
clone_repository() {
    print_info "Cloning yubikey-manager repository (version $YKMAN_VERSION)..."

    # Clean up any existing build directory
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR"

    cd "$BUILD_DIR"

    # Clone specific tag
    if ! git clone --depth 1 --branch "$YKMAN_VERSION" https://github.com/Yubico/yubikey-manager.git; then
        print_error "Failed to clone repository. Version $YKMAN_VERSION may not exist."
        exit 1
    fi

    cd yubikey-manager
    print_info "Repository cloned successfully"
}

# Setup Python virtual environment
setup_venv() {
    print_info "Setting up Python virtual environment..."

    # Create virtual environment
    python3 -m venv venv

    # Activate virtual environment
    source "$VENV_ACTIVATE"

    # Upgrade pip (use python -m pip for better Windows compatibility)
    python -m pip install --upgrade pip setuptools wheel

    print_info "Virtual environment ready"
}

# Install dependencies and build
build_ykman() {
    print_info "Installing dependencies..."

    # Install ykman and its dependencies
    pip install -e .

    # Install PyInstaller
    pip install pyinstaller

    # Verify ykman works in development mode
    print_info "Testing ykman installation..."
    if ! ykman --version; then
        print_error "Failed to run ykman after installation"
        exit 1
    fi

    local dev_version=$(ykman --version)
    print_info "Development version: $dev_version"

    print_info "Building standalone binary with PyInstaller..."

    # Download official spec files from Yubico
    print_info "Downloading official ykman.spec from Yubico..."
    if ! curl -L https://raw.githubusercontent.com/Yubico/yubikey-manager/${YKMAN_VERSION}/ykman.spec -o ykman.spec; then
        print_error "Failed to download ykman.spec"
        exit 1
    fi

    if ! curl -L https://raw.githubusercontent.com/Yubico/yubikey-manager/${YKMAN_VERSION}/version_info.txt.in -o version_info.txt.in; then
        print_error "Failed to download version_info.txt.in"
        exit 1
    fi

    # Modify spec for ARM64 instead of universal2 (for Apple Silicon)
    local arch=$(uname -m)
    if [ "$PLATFORM" = "darwin" ] && [ "$arch" = "arm64" ]; then
        print_info "Modifying spec for ARM64 architecture..."
        sed -i.bak 's/target_arch="universal2"/target_arch="arm64"/' ykman.spec
    fi

    # Remove target_arch on Windows (not supported)
    if [ "$PLATFORM" = "windows" ]; then
        print_info "Removing target_arch for Windows build..."
        sed -i.bak '/target_arch=/d' ykman.spec
    fi

    # Build with PyInstaller using official spec
    print_info "Building with official Yubico spec file..."
    if ! pyinstaller ykman.spec; then
        print_error "PyInstaller build failed"
        exit 1
    fi

    print_info "Build complete"
}

# Test the built binary
test_binary() {
    print_info "Testing built binary..."

    # With official spec, binary is in dist/ykman/ directory
    local binary_path="$BUILD_DIR/yubikey-manager/dist/ykman/ykman${BINARY_EXT}"

    if [ ! -f "$binary_path" ]; then
        print_error "Binary not found at expected location: $binary_path"
        exit 1
    fi

    # Test binary
    local version=$("$binary_path" --version)
    print_info "Built binary version: $version"

    # Calculate checksum
    local checksum=$($CHECKSUM_CMD "$binary_path" | cut -d' ' -f1)
    print_info "Binary SHA256: $checksum"

    BINARY_SHA256="$checksum"
}

# Install binary to bin directory
install_binary() {
    print_info "Installing binary to $BIN_DIR/$PLATFORM/"

    local target_dir="$BIN_DIR/$PLATFORM"
    mkdir -p "$target_dir"

    # Backup existing if present
    if [ -f "$target_dir/ykman" ]; then
        local backup_name="ykman.backup.$(date +%Y%m%d_%H%M%S)"
        print_warning "Existing ykman found, backing up to $backup_name"
        mv "$target_dir/ykman" "$target_dir/$backup_name"
    fi

    # Clean up old broken installations if they exist
    if [ -d "$target_dir/ykman" ]; then
        print_warning "Removing old broken ykman directory installation"
        rm -rf "$target_dir/ykman"
    fi
    if [ -d "$target_dir/ykman-bundle" ]; then
        print_warning "Removing old ykman-bundle directory"
        rm -rf "$target_dir/ykman-bundle"
    fi

    # With official spec, we have a directory structure in dist/ykman/
    print_info "Copying ykman bundle..."
    cp -R "$BUILD_DIR/yubikey-manager/dist/ykman" "$target_dir/ykman-bundle"

    # Create a platform-specific wrapper script that calls the actual binary
    if [ "$PLATFORM" = "windows" ]; then
        print_info "Creating Windows wrapper script..."
        cat > "$target_dir/ykman.bat" << 'EOF'
@echo off
REM Wrapper script for ykman on Windows
set SCRIPT_DIR=%~dp0
"%SCRIPT_DIR%ykman-bundle\ykman.exe" %*
EOF
    else
        print_info "Creating Unix wrapper script..."
        cat > "$target_dir/ykman" << 'EOF'
#!/bin/bash
# Wrapper script for ykman
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/ykman-bundle/ykman" "$@"
EOF
        chmod +x "$target_dir/ykman"
    fi

    print_info "Binary installed successfully"
}

# Update checksums file
update_checksums() {
    print_info "Updating checksums.json..."

    local checksums_file="$BIN_DIR/checksums.json"
    local temp_file="$BIN_DIR/checksums.json.tmp"

    # Read existing checksums if file exists
    if [ -f "$checksums_file" ]; then
        # Update existing file (keeping age-plugin-yubikey)
        python3 -c "
import json
import sys

try:
    with open('$checksums_file', 'r') as f:
        data = json.load(f)
except:
    data = {}

# Add or update ykman entry
data['ykman'] = {
    'version': '$YKMAN_VERSION',
    'updated': '$(date -u +%Y-%m-%dT%H:%M:%SZ)',
    'build_method': 'pyinstaller',
    'platform': '$PLATFORM',
    'sha256': '$BINARY_SHA256',
    'source_url': 'https://github.com/Yubico/yubikey-manager/tree/$YKMAN_VERSION'
}

with open('$temp_file', 'w') as f:
    json.dump(data, f, indent=2)
"
        mv "$temp_file" "$checksums_file"
    else
        # Create new file
        cat > "$checksums_file" << EOF
{
  "ykman": {
    "version": "$YKMAN_VERSION",
    "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "build_method": "pyinstaller",
    "platform": "$PLATFORM",
    "sha256": "$BINARY_SHA256",
    "source_url": "https://github.com/Yubico/yubikey-manager/tree/$YKMAN_VERSION"
  }
}
EOF
    fi

    print_info "Checksums file updated"
}

# Cleanup
cleanup() {
    print_info "Cleaning up build directory..."
    rm -rf "$BUILD_DIR"
    print_info "Cleanup complete"
}

# Main execution
main() {
    print_info "Starting ykman build process for version $YKMAN_VERSION"

    check_prerequisites
    detect_platform
    clone_repository
    setup_venv
    build_ykman
    test_binary
    install_binary
    update_checksums
    cleanup

    print_info "✅ Build and installation complete!"
    print_info "Binary location: $BIN_DIR/$PLATFORM/ykman"
    print_info "Version: $YKMAN_VERSION"
    print_info "SHA256: $BINARY_SHA256"

    # Test installed binary
    print_info "Testing installed binary..."
    if [ "$PLATFORM" = "windows" ]; then
        if cmd //c "$BIN_DIR/$PLATFORM/ykman.bat" --version; then
            print_info "Installation verified successfully!"
        else
            print_warning "Installed binary test failed - may need dependencies"
        fi
    else
        if "$BIN_DIR/$PLATFORM/ykman" --version; then
            print_info "Installation verified successfully!"
        else
            print_warning "Installed binary test failed - may need dependencies"
        fi
    fi
}

# Run main function
main "$@"