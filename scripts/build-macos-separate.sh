#!/bin/bash

# Build separate Intel and ARM DMGs for macOS
# This creates two distinct DMG files, matching Sparrow wallet's distribution model

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored status messages
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "error")
            echo -e "${RED}✗ $message${NC}"
            ;;
        "success")
            echo -e "${GREEN}✓ $message${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ $message${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠ $message${NC}"
            ;;
        "step")
            echo -e "  → $message"
            ;;
    esac
}

# Parse command line arguments
SKIP_VALIDATION=false
SKIP_FRONTEND=false
TARGET=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --target)
            TARGET="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--skip-validation] [--skip-frontend] [--target intel|arm]"
            exit 1
            ;;
    esac
done

# Change to project root
cd "$(dirname "$0")/.."

# Function to check prerequisites
check_prerequisites() {
    print_status "info" "Checking prerequisites..."
    
    # Check for required tools
    if ! command -v cargo &> /dev/null; then
        print_status "error" "Rust/Cargo not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_status "error" "Node.js/npm not installed"
        exit 1
    fi
    
    # Check for Tauri CLI
    if ! cargo tauri --version &> /dev/null; then
        print_status "warning" "Tauri CLI not found, installing..."
        cargo install tauri-cli
    fi
    
    print_status "success" "All prerequisites met"
}

# Function to install Rust targets
install_targets() {
    print_status "info" "Checking Rust targets..."
    
    # Install Intel target if needed
    if [ "$TARGET" != "arm" ]; then
        if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
            print_status "step" "Installing Intel target..."
            rustup target add x86_64-apple-darwin
        else
            print_status "success" "Intel target already installed"
        fi
    fi
    
    # Install ARM target if needed
    if [ "$TARGET" != "intel" ]; then
        if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
            print_status "step" "Installing Apple Silicon target..."
            rustup target add aarch64-apple-darwin
        else
            print_status "success" "Apple Silicon target already installed"
        fi
    fi
}

# Function to build frontend
build_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        print_status "info" "Skipping frontend build (--skip-frontend flag)"
        return
    fi
    
    print_status "info" "Building frontend..."
    
    # Install dependencies if needed
    if [ ! -d "src-ui/node_modules" ]; then
        print_status "step" "Installing frontend dependencies..."
        (cd src-ui && npm install)
    fi
    
    # Build frontend
    print_status "step" "Building React application..."
    (cd src-ui && npm run build)
    
    print_status "success" "Frontend build complete"
}

# Function to validate before build
run_validation() {
    if [ "$SKIP_VALIDATION" = true ]; then
        print_status "info" "Skipping validation (--skip-validation flag)"
        return
    fi
    
    print_status "info" "Running validation..."
    
    if make validate; then
        print_status "success" "Validation passed"
    else
        print_status "error" "Validation failed"
        exit 1
    fi
}

# Function to build Intel DMG
build_intel_dmg() {
    print_status "info" "Building Intel (x86_64) DMG..."
    
    # Clean previous Intel build
    rm -rf src-tauri/target/x86_64-apple-darwin
    
    # Build for Intel
    print_status "step" "Running Tauri build for Intel..."
    (cd src-tauri && cargo tauri build --target x86_64-apple-darwin)
    
    # Check if DMG was created
    DMG_PATH="src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Barqly Vault.dmg"
    if [ -f "$DMG_PATH" ]; then
        # Get version from Cargo.toml
        VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
        
        # Rename to include architecture
        NEW_NAME="src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-x86_64.dmg"
        mv "$DMG_PATH" "$NEW_NAME"
        
        print_status "success" "Intel DMG created: $(basename "$NEW_NAME")"
        echo "📦 Intel DMG location: $NEW_NAME"
    else
        print_status "error" "Failed to create Intel DMG"
        exit 1
    fi
}

# Function to build ARM DMG
build_arm_dmg() {
    print_status "info" "Building Apple Silicon (aarch64) DMG..."
    
    # Clean previous ARM build
    rm -rf src-tauri/target/aarch64-apple-darwin
    
    # Build for ARM
    print_status "step" "Running Tauri build for Apple Silicon..."
    (cd src-tauri && cargo tauri build --target aarch64-apple-darwin)
    
    # Check if DMG was created
    DMG_PATH="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Barqly Vault.dmg"
    if [ -f "$DMG_PATH" ]; then
        # Get version from Cargo.toml
        VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
        
        # Rename to include architecture
        NEW_NAME="src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-aarch64.dmg"
        mv "$DMG_PATH" "$NEW_NAME"
        
        print_status "success" "Apple Silicon DMG created: $(basename "$NEW_NAME")"
        echo "📦 Apple Silicon DMG location: $NEW_NAME"
    else
        print_status "error" "Failed to create Apple Silicon DMG"
        exit 1
    fi
}

# Main execution
main() {
    echo "🚀 Barqly Vault - Separate macOS Builds"
    echo "========================================"
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Install targets
    install_targets
    
    # Build frontend
    build_frontend
    
    # Run validation
    run_validation
    
    # Build based on target selection
    if [ "$TARGET" = "intel" ]; then
        build_intel_dmg
    elif [ "$TARGET" = "arm" ]; then
        build_arm_dmg
    else
        # Build both
        build_intel_dmg
        build_arm_dmg
    fi
    
    echo ""
    echo "✨ Build complete!"
    echo ""
    
    # Show summary
    VERSION=$(grep '^version' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
    
    if [ "$TARGET" != "arm" ] && [ -f "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-x86_64.dmg" ]; then
        echo "📦 Intel DMG: Barqly-Vault-${VERSION}-x86_64.dmg"
        echo "   Size: $(du -h "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-x86_64.dmg" | cut -f1)"
    fi
    
    if [ "$TARGET" != "intel" ] && [ -f "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-aarch64.dmg" ]; then
        echo "📦 Apple Silicon DMG: Barqly-Vault-${VERSION}-aarch64.dmg"
        echo "   Size: $(du -h "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Barqly-Vault-${VERSION}-aarch64.dmg" | cut -f1)"
    fi
    
    echo ""
    echo "These DMGs match Sparrow wallet's distribution model:"
    echo "• Separate Intel and Apple Silicon builds"
    echo "• Architecture clearly indicated in filename"
    echo "• Users download only what they need"
}

# Run main function
main