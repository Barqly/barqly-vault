#!/bin/bash

# build-ykman.sh
# Builds ykman (YubiKey Manager CLI) from source using PyInstaller
# This creates a standalone binary that doesn't require Python runtime
# Usage: ./scripts/build-ykman.sh [version]

set -e  # Exit on any error

# Configuration
YKMAN_VERSION="${1:-5.8.0}"  # Default to 5.8.0 if not specified
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
BIN_DIR="$PROJECT_ROOT/bin"

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
            ;;
        linux)
            PLATFORM="linux"
            PLATFORM_NAME="Linux"
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
    source venv/bin/activate

    # Upgrade pip
    pip install --upgrade pip setuptools wheel

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

    # Check if ykman.spec exists
    if [ ! -f "ykman.spec" ]; then
        print_warning "ykman.spec not found, creating one..."

        # Create a basic spec file
        cat > ykman.spec << 'EOF'
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['ykman/__main__.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('ykman', 'ykman'),
    ],
    hiddenimports=[
        'ykman',
        'yubikit',
        'cryptography',
        'fido2',
        'smartcard',
        'usb',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ykman',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ykman',
)
EOF
    fi

    # Build with PyInstaller
    if ! pyinstaller ykman.spec; then
        print_error "PyInstaller build failed"
        exit 1
    fi

    print_info "Build complete"
}

# Test the built binary
test_binary() {
    print_info "Testing built binary..."

    local binary_path="$BUILD_DIR/yubikey-manager/dist/ykman/ykman"

    if [ ! -f "$binary_path" ]; then
        print_error "Binary not found at expected location: $binary_path"
        exit 1
    fi

    # Test binary
    local version=$("$binary_path" --version)
    print_info "Built binary version: $version"

    # Calculate checksum
    local checksum=$(shasum -a 256 "$binary_path" | cut -d' ' -f1)
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

    # Clean up old broken installation if it exists
    if [ -d "$target_dir/ykman" ]; then
        print_warning "Removing old broken ykman directory installation"
        rm -rf "$target_dir/ykman"
    fi

    # For PyInstaller bundles, we need to copy the entire directory
    if [ -d "$BUILD_DIR/yubikey-manager/dist/ykman" ]; then
        print_info "Copying PyInstaller bundle..."
        cp -R "$BUILD_DIR/yubikey-manager/dist/ykman" "$target_dir/ykman-bundle"

        # Create a wrapper script
        cat > "$target_dir/ykman" << EOF
#!/bin/bash
# Wrapper script for ykman
exec "\$(dirname "\$0")/ykman-bundle/ykman" "\$@"
EOF
        chmod +x "$target_dir/ykman"
    else
        # Single binary (unlikely with PyInstaller but just in case)
        cp "$BUILD_DIR/yubikey-manager/dist/ykman/ykman" "$target_dir/ykman"
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
    if "$BIN_DIR/$PLATFORM/ykman" --version; then
        print_info "Installation verified successfully!"
    else
        print_warning "Installed binary test failed - may need dependencies"
    fi
}

# Run main function
main "$@"