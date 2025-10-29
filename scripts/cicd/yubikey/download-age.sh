#!/bin/bash

# download-age.sh
# Downloads and installs age CLI binary for the current platform
# Usage: ./scripts/download-age.sh [version]

set -e  # Exit on any error

# Configuration
AGE_VERSION="${1:-latest}"  # Default to latest if not specified
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
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

# Detect platform
detect_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)

    # Convert arch to match age download naming
    case "$arch" in
        arm64)
            arch="arm64"
            ;;
        aarch64)
            arch="arm64"
            ;;
        x86_64)
            arch="amd64"
            ;;
        *)
            print_error "Unsupported architecture: $arch"
            exit 1
            ;;
    esac

    # Convert OS to match age download naming
    case "$os" in
        darwin)
            PLATFORM="${os}/${arch}"
            PLATFORM_DIR="darwin"
            BINARY_NAME="age"
            ;;
        linux)
            PLATFORM="${os}/${arch}"
            PLATFORM_DIR="linux"
            BINARY_NAME="age"
            ;;
        mingw*|msys*|cygwin*)
            PLATFORM="windows/${arch}"
            PLATFORM_DIR="windows"
            BINARY_NAME="age.exe"
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
    local download_url="https://dl.filippo.io/age/${AGE_VERSION}?for=${PLATFORM}"
    local temp_dir=$(mktemp -d)
    local archive_path="$temp_dir/age.tar.gz"

    print_info "Downloading age ${AGE_VERSION} from filippo.io..."
    print_info "URL: $download_url"

    if ! curl -L "$download_url" -o "$archive_path" --progress-bar; then
        print_error "Failed to download binary"
        rm -rf "$temp_dir"
        exit 1
    fi

    print_info "Download complete"

    # Extract the archive (age releases are gzipped tar archives)
    print_info "Extracting archive..."
    cd "$temp_dir"

    if ! tar -xzf "$archive_path"; then
        print_error "Failed to extract archive"
        rm -rf "$temp_dir"
        exit 1
    fi

    rm "$archive_path"

    # Find the age binary - should be in age/age
    if [ ! -f "age/age" ]; then
        print_error "Age binary not found in expected location (age/age)"
        print_info "Archive contents:"
        ls -la
        rm -rf "$temp_dir"
        exit 1
    fi

    # Copy the binary to avoid name conflicts
    cp "age/age" "age-binary"
    BINARY_PATH="$temp_dir/age-binary"

    # Verify it's an executable
    if ! file "$BINARY_PATH" | grep -q "executable"; then
        print_error "Downloaded file is not an executable"
        print_error "File type: $(file "$BINARY_PATH")"
        rm -rf "$temp_dir"
        exit 1
    fi

    TEMP_DIR="$temp_dir"
}

# Calculate checksum
verify_checksum() {
    print_info "Calculating SHA256 checksum..."
    local checksum=$(shasum -a 256 "$BINARY_PATH" | cut -d' ' -f1)
    echo "SHA256: $checksum"

    # Store checksum for future reference
    CALCULATED_SHA256="$checksum"

    # Get binary size
    local binary_size
    if [[ "$OSTYPE" == "darwin"* ]]; then
        binary_size=$(stat -f%z "$BINARY_PATH")
    else
        binary_size=$(stat -c%s "$BINARY_PATH")
    fi
    BINARY_SIZE="$binary_size"

    print_info "Binary size: $binary_size bytes"
}

# Install binary
install_binary() {
    local target_dir="$BIN_DIR/$PLATFORM_DIR"

    # Create directory if it doesn't exist
    mkdir -p "$target_dir"

    # Backup existing binary if present
    if [ -f "$target_dir/age" ]; then
        local backup_name="age.backup.$(date +%Y%m%d_%H%M%S)"
        print_warning "Existing binary found, backing up to $backup_name"
        mv "$target_dir/age" "$target_dir/$backup_name"
    fi

    # Copy new binary (BINARY_PATH points to the renamed binary)
    print_info "Installing binary to $target_dir/age"
    cp "$BINARY_PATH" "$target_dir/age"

    # Ensure executable permissions
    chmod +x "$target_dir/age"

    print_info "Binary installed successfully"
}

# Test binary
test_binary() {
    local binary_path="$BIN_DIR/$PLATFORM_DIR/age"

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

    print_info "Updating checksums.json..."

    # For simplicity, follow the same pattern as age-plugin script
    # We'll create a combined file with both age and age-plugin-yubikey
    local age_plugin_content="{}"

    # Read existing age-plugin-yubikey content if it exists
    if [ -f "$checksums_file" ] && command -v jq >/dev/null 2>&1; then
        age_plugin_content=$(jq '."age-plugin-yubikey" // {}' "$checksums_file" 2>/dev/null || echo "{}")
    fi

    # Create or update the checksums file
    cat > "$checksums_file" << EOF
{
  "age-plugin-yubikey": $age_plugin_content,
  "age": {
    "version": "$AGE_VERSION",
    "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "checksums": {
      "$PLATFORM_DIR": {
        "platform": "$PLATFORM",
        "sha256": "$CALCULATED_SHA256",
        "size": $BINARY_SIZE
      }
    },
    "download_url_template": "https://dl.filippo.io/age/{version}?for={platform}"
  }
}
EOF

    print_info "Checksums file updated"
}

# Cleanup
cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        print_info "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

# Main execution
main() {
    print_info "Starting age installation for version $AGE_VERSION"

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
    print_info "Binary location: $BIN_DIR/$PLATFORM_DIR/age"
    print_info "SHA256: $CALCULATED_SHA256"
}

# Run main function
main "$@"