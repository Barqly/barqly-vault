#!/bin/bash

# download-age-plugin.sh
# Downloads and installs age-plugin-yubikey binary for the current platform
# Usage: ./scripts/download-age-plugin.sh [version]

set -e  # Exit on any error

# Configuration
PLUGIN_VERSION="${1:-0.5.0}"  # Default to 0.5.0 if not specified
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
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

# Detect platform
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    # Convert arch to match GitHub release naming
    case "$arch" in
        arm64)
            arch="arm64"
            ;;
        aarch64)
            arch="arm64"
            ;;
        x86_64)
            arch="x86_64"
            ;;
        *)
            print_error "Unsupported architecture: $arch"
            exit 1
            ;;
    esac

    # Convert OS to match GitHub release naming
    case "$os" in
        darwin)
            PLATFORM="${arch}-darwin"
            PLATFORM_DIR="darwin"
            ;;
        linux)
            PLATFORM="${arch}-linux"
            PLATFORM_DIR="linux"
            ;;
        *)
            print_error "Unsupported OS: $os"
            exit 1
            ;;
    esac

    print_info "Detected platform: $PLATFORM"
}

# Download binary
download_binary() {
    local download_url="https://github.com/str4d/age-plugin-yubikey/releases/download/v${PLUGIN_VERSION}/age-plugin-yubikey-v${PLUGIN_VERSION}-${PLATFORM}.tar.gz"
    local temp_dir=$(mktemp -d)
    local archive_path="$temp_dir/age-plugin.tar.gz"

    print_info "Downloading age-plugin-yubikey v${PLUGIN_VERSION} from GitHub..."
    print_info "URL: $download_url"

    if ! curl -L "$download_url" -o "$archive_path" --progress-bar; then
        print_error "Failed to download binary"
        rm -rf "$temp_dir"
        exit 1
    fi

    print_info "Download complete"

    # Extract the archive
    print_info "Extracting archive..."
    cd "$temp_dir"
    tar -xzf age-plugin.tar.gz

    if [ ! -f "age-plugin-yubikey/age-plugin-yubikey" ]; then
        print_error "Binary not found in archive"
        rm -rf "$temp_dir"
        exit 1
    fi

    BINARY_PATH="$temp_dir/age-plugin-yubikey/age-plugin-yubikey"
}

# Calculate checksum
verify_checksum() {
    print_info "Calculating SHA256 checksum..."
    local checksum=$(shasum -a 256 "$BINARY_PATH" | cut -d' ' -f1)
    echo "SHA256: $checksum"

    # Store checksum for future reference
    CALCULATED_SHA256="$checksum"

    # TODO: In the future, we could verify against known good checksums
    # For now, we just display it
    print_warning "Manual verification recommended - compare with official release notes"
}

# Install binary
install_binary() {
    local target_dir="$BIN_DIR/$PLATFORM_DIR"

    # Create directory if it doesn't exist
    mkdir -p "$target_dir"

    # Backup existing binary if present
    if [ -f "$target_dir/age-plugin-yubikey" ]; then
        local backup_name="age-plugin-yubikey.backup.$(date +%Y%m%d_%H%M%S)"
        print_warning "Existing binary found, backing up to $backup_name"
        mv "$target_dir/age-plugin-yubikey" "$target_dir/$backup_name"
    fi

    # Copy new binary
    print_info "Installing binary to $target_dir/age-plugin-yubikey"
    cp "$BINARY_PATH" "$target_dir/age-plugin-yubikey"

    # Ensure executable permissions
    chmod +x "$target_dir/age-plugin-yubikey"

    print_info "Binary installed successfully"
}

# Test binary
test_binary() {
    local binary_path="$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey"

    print_info "Testing binary..."
    if "$binary_path" --version; then
        print_info "Binary test successful"
    else
        print_error "Binary test failed"
        exit 1
    fi
}

# Update checksums.json
update_checksums() {
    local checksums_file="$BIN_DIR/checksums.json"
    local binary_size=$(stat -f%z "$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey" 2>/dev/null || stat -c%s "$BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey" 2>/dev/null)

    print_info "Updating checksums.json..."

    # Create or update the checksums file
    cat > "$checksums_file" << EOF
{
  "age-plugin-yubikey": {
    "version": "$PLUGIN_VERSION",
    "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "checksums": {
      "$PLATFORM_DIR": {
        "platform": "$PLATFORM",
        "sha256": "$CALCULATED_SHA256",
        "size": $binary_size
      }
    },
    "download_url_template": "https://github.com/str4d/age-plugin-yubikey/releases/download/v{version}/age-plugin-yubikey-v{version}-{platform}.tar.gz"
  }
}
EOF

    print_info "Checksums file updated"
}

# Cleanup
cleanup() {
    if [ -n "$temp_dir" ] && [ -d "$temp_dir" ]; then
        print_info "Cleaning up temporary files..."
        rm -rf "$temp_dir"
    fi
}

# Main execution
main() {
    print_info "Starting age-plugin-yubikey installation for version $PLUGIN_VERSION"

    # Set up cleanup trap
    trap cleanup EXIT

    # Execute steps
    detect_platform
    download_binary
    verify_checksum
    install_binary
    test_binary
    update_checksums

    print_info "✅ Installation complete!"
    print_info "Binary location: $BIN_DIR/$PLATFORM_DIR/age-plugin-yubikey"
    print_info "SHA256: $CALCULATED_SHA256"
}

# Run main function
main "$@"