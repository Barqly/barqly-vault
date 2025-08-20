#!/bin/bash

# Barqly Vault - Universal DMG Builder
# Creates a universal binary DMG that works on both Intel and Apple Silicon Macs
# This script maintains the integrity of your development workflow while enabling distribution

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

# Function to check dependencies
check_dependencies() {
    print_status "info" "Checking build dependencies..."
    
    # Check for Rust
    if ! command -v rustc &> /dev/null; then
        print_status "error" "Rust is not installed. Please install Rust first."
        exit 1
    fi
    
    # Check for both targets
    if ! rustup target list --installed | grep -q "aarch64-apple-darwin"; then
        print_status "warning" "Apple Silicon target not installed. Installing..."
        rustup target add aarch64-apple-darwin
    fi
    
    if ! rustup target list --installed | grep -q "x86_64-apple-darwin"; then
        print_status "warning" "Intel target not installed. Installing..."
        rustup target add x86_64-apple-darwin
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_status "error" "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_status "success" "All dependencies verified"
}

# Function to validate the project
validate_project() {
    print_status "info" "Running project validation..."
    
    # Run the existing validation script
    if ! ./scripts/validate.sh; then
        print_status "error" "Project validation failed. Please fix issues before building."
        exit 1
    fi
    
    print_status "success" "Project validation passed"
}

# Function to build the frontend
build_frontend() {
    print_status "info" "Building frontend for production..."
    
    cd src-ui
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        print_status "step" "Installing frontend dependencies..."
        npm install
    fi
    
    # Build the frontend
    print_status "step" "Creating optimized production build..."
    npm run build
    
    cd ..
    
    print_status "success" "Frontend build completed"
}

# Function to build universal binary
build_universal_binary() {
    print_status "info" "Building universal binary for macOS..."
    
    # Clean previous builds from project root (where cargo actually puts them)
    print_status "step" "Cleaning previous builds..."
    rm -rf target/release/bundle
    rm -rf target/aarch64-apple-darwin
    rm -rf target/x86_64-apple-darwin
    rm -rf target/universal-apple-darwin
    
    # Build for Apple Silicon
    print_status "step" "Building for Apple Silicon (ARM64)..."
    cd src-tauri
    cargo build --release --target aarch64-apple-darwin
    cd ..
    
    # Build for Intel
    print_status "step" "Building for Intel (x86_64)..."
    cd src-tauri
    cargo build --release --target x86_64-apple-darwin
    cd ..
    
    # Create universal binary using lipo
    print_status "step" "Creating universal binary with lipo..."
    
    # Create directory for universal binary
    mkdir -p target/universal-apple-darwin/release
    
    # Combine the binaries (they're in project root target/)
    lipo -create \
        target/aarch64-apple-darwin/release/barqly-vault \
        target/x86_64-apple-darwin/release/barqly-vault \
        -output target/universal-apple-darwin/release/barqly-vault
    
    # Verify the universal binary
    print_status "step" "Verifying universal binary..."
    lipo -info target/universal-apple-darwin/release/barqly-vault
    
    print_status "success" "Universal binary created successfully"
}

# Function to create the app bundle
create_app_bundle() {
    print_status "info" "Creating macOS app bundle..."
    
    cd src-tauri
    
    # Use Tauri to create the bundle structure
    print_status "step" "Generating app bundle with Tauri..."
    
    # First, build with Tauri for the current architecture to get the bundle structure
    cargo tauri build --target aarch64-apple-darwin
    
    cd ..
    
    # Copy the bundle to universal location (bundles are in project root target/)
    print_status "step" "Preparing universal app bundle..."
    rm -rf target/universal-apple-darwin/release/bundle
    cp -R target/aarch64-apple-darwin/release/bundle target/universal-apple-darwin/release/
    
    # Replace the binary with the universal one
    print_status "step" "Injecting universal binary into app bundle..."
    APP_PATH="target/universal-apple-darwin/release/bundle/macos/Barqly Vault.app"
    if [ -d "$APP_PATH" ]; then
        cp target/universal-apple-darwin/release/barqly-vault "$APP_PATH/Contents/MacOS/Barqly Vault"
        
        # Update Info.plist to indicate universal binary support
        /usr/libexec/PlistBuddy -c "Add :LSArchitecturePriority array" "$APP_PATH/Contents/Info.plist" 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :LSArchitecturePriority:0 string arm64" "$APP_PATH/Contents/Info.plist" 2>/dev/null || true
        /usr/libexec/PlistBuddy -c "Add :LSArchitecturePriority:1 string x86_64" "$APP_PATH/Contents/Info.plist" 2>/dev/null || true
    else
        print_status "error" "App bundle not found at expected location"
        exit 1
    fi
    
    print_status "success" "App bundle created with universal binary"
}

# Function to create DMG
create_dmg() {
    print_status "info" "Creating universal DMG installer..."
    
    DMG_NAME="Barqly-Vault-Universal.dmg"
    APP_PATH="target/universal-apple-darwin/release/bundle/macos/Barqly Vault.app"
    DMG_PATH="target/universal-apple-darwin/release/bundle/macos/$DMG_NAME"
    
    # Remove old DMG if it exists
    rm -f "$DMG_PATH"
    
    # Create a temporary directory for DMG contents
    print_status "step" "Preparing DMG contents..."
    TEMP_DIR=$(mktemp -d)
    cp -R "$APP_PATH" "$TEMP_DIR/"
    
    # Create Applications symlink
    ln -s /Applications "$TEMP_DIR/Applications"
    
    # Create the DMG
    print_status "step" "Building DMG package..."
    hdiutil create -volname "Barqly Vault" \
                   -srcfolder "$TEMP_DIR" \
                   -ov \
                   -format UDZO \
                   "$DMG_PATH"
    
    # Clean up
    rm -rf "$TEMP_DIR"
    
    # Get file size
    DMG_SIZE=$(du -h "$DMG_PATH" | cut -f1)
    
    print_status "success" "Universal DMG created: $DMG_SIZE"
    echo ""
    print_status "info" "📦 DMG Location:"
    echo "    $(pwd)/$DMG_PATH"
}

# Function to display final instructions
show_instructions() {
    echo ""
    echo "=========================================="
    print_status "success" "🎉 Universal DMG Build Complete!"
    echo "=========================================="
    echo ""
    echo "📦 Your universal DMG is ready at:"
    echo "   target/universal-apple-darwin/release/bundle/macos/Barqly-Vault-Universal.dmg"
    echo ""
    echo "🧪 Testing Instructions:"
    echo ""
    echo "1. On Apple Silicon Mac (M1/M2/M3/M4):"
    echo "   - Double-click the DMG to mount it"
    echo "   - Drag 'Barqly Vault' to Applications"
    echo "   - Run and verify it works natively"
    echo ""
    echo "2. On Intel Mac:"
    echo "   - Copy the DMG to an Intel Mac"
    echo "   - Double-click the DMG to mount it"
    echo "   - Drag 'Barqly Vault' to Applications"
    echo "   - Run and verify it works natively"
    echo ""
    echo "3. Verify Architecture:"
    echo "   - Right-click the app → Get Info"
    echo "   - Should show 'Kind: Application (Universal)'"
    echo ""
    echo "⚠️  Note: The app is not code-signed. Users will need to:"
    echo "   - Right-click → Open on first launch"
    echo "   - Or go to System Settings → Privacy & Security to allow"
    echo ""
    echo "💡 For production release, you'll need:"
    echo "   - Apple Developer account for code signing"
    echo "   - Notarization for distribution without warnings"
    echo ""
}

# Main execution
main() {
    echo "🏗️  Barqly Vault - Universal DMG Builder"
    echo "=========================================="
    echo ""
    
    # Check if we're in the right directory
    if [ ! -d "src-tauri" ] || [ ! -d "src-ui" ]; then
        print_status "error" "Must be run from the project root directory"
        exit 1
    fi
    
    # Parse command line arguments
    SKIP_VALIDATION=false
    SKIP_FRONTEND=false
    
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
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-validation  Skip project validation (faster builds)"
                echo "  --skip-frontend    Skip frontend rebuild (use existing build)"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                print_status "error" "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Execute build steps
    check_dependencies
    
    if [ "$SKIP_VALIDATION" = false ]; then
        validate_project
    else
        print_status "warning" "Skipping validation (--skip-validation flag)"
    fi
    
    if [ "$SKIP_FRONTEND" = false ]; then
        build_frontend
    else
        print_status "warning" "Skipping frontend build (--skip-frontend flag)"
    fi
    
    build_universal_binary
    create_app_bundle
    create_dmg
    show_instructions
}

# Run the main function
main "$@"