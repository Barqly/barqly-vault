#!/bin/bash
# YubiKey Development Environment Setup
# This script installs age-plugin-yubikey for development and testing

set -e  # Exit on any error

echo "🔐 YubiKey Development Environment Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if age-plugin-yubikey is already available
check_existing_installation() {
    print_status "Checking for existing age-plugin-yubikey installation..."
    
    if command -v age-plugin-yubikey &> /dev/null; then
        local version=$(age-plugin-yubikey --version 2>/dev/null || echo "unknown")
        print_success "age-plugin-yubikey is already installed: $version"
        return 0
    else
        print_warning "age-plugin-yubikey not found in PATH"
        return 1
    fi
}

# Install on macOS using Homebrew
install_macos() {
    print_status "Installing age-plugin-yubikey on macOS..."
    
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew is not installed. Please install Homebrew first:"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        return 1
    fi
    
    # Install age-plugin-yubikey
    if brew install age-plugin-yubikey; then
        print_success "age-plugin-yubikey installed successfully via Homebrew"
        return 0
    else
        print_error "Failed to install age-plugin-yubikey via Homebrew"
        return 1
    fi
}

# Install on Linux
install_linux() {
    print_status "Installing age-plugin-yubikey on Linux..."
    
    # Try different package managers
    if command -v apt-get &> /dev/null; then
        print_status "Detected Debian/Ubuntu system, trying apt..."
        # Note: age-plugin-yubikey may not be in official repos
        print_warning "age-plugin-yubikey may not be available in official repositories"
        print_status "Attempting to install via Cargo (Rust package manager)..."
        install_via_cargo
    elif command -v yum &> /dev/null; then
        print_status "Detected Red Hat/CentOS system, trying yum..."
        print_warning "age-plugin-yubikey may not be available in official repositories"
        print_status "Attempting to install via Cargo (Rust package manager)..."
        install_via_cargo
    elif command -v pacman &> /dev/null; then
        print_status "Detected Arch Linux system, trying pacman..."
        print_warning "age-plugin-yubikey may not be available in official repositories"
        print_status "Attempting to install via Cargo (Rust package manager)..."
        install_via_cargo
    else
        print_warning "Unknown Linux distribution, attempting Cargo installation..."
        install_via_cargo
    fi
}

# Install via Cargo (Rust package manager)
install_via_cargo() {
    print_status "Installing age-plugin-yubikey via Cargo..."
    
    # Check if Cargo is installed
    if ! command -v cargo &> /dev/null; then
        print_error "Cargo (Rust) is not installed. Please install Rust first:"
        echo "  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        return 1
    fi
    
    # Install age-plugin-yubikey
    if cargo install age-plugin-yubikey; then
        print_success "age-plugin-yubikey installed successfully via Cargo"
        print_warning "Make sure ~/.cargo/bin is in your PATH"
        return 0
    else
        print_error "Failed to install age-plugin-yubikey via Cargo"
        return 1
    fi
}

# Download pre-built binary (fallback)
install_prebuilt() {
    print_status "Attempting to download pre-built binary..."
    
    local os_type=$(uname -s)
    local arch_type=$(uname -m)
    local download_url=""
    
    case "$os_type" in
        Darwin)
            case "$arch_type" in
                x86_64) download_url="https://github.com/str4d/age-plugin-yubikey/releases/latest/download/age-plugin-yubikey-macos-x86_64" ;;
                arm64) download_url="https://github.com/str4d/age-plugin-yubikey/releases/latest/download/age-plugin-yubikey-macos-arm64" ;;
                *) print_error "Unsupported macOS architecture: $arch_type"; return 1 ;;
            esac
            ;;
        Linux)
            case "$arch_type" in
                x86_64) download_url="https://github.com/str4d/age-plugin-yubikey/releases/latest/download/age-plugin-yubikey-linux-x86_64" ;;
                *) print_error "Unsupported Linux architecture: $arch_type"; return 1 ;;
            esac
            ;;
        *)
            print_error "Unsupported operating system: $os_type"
            return 1
            ;;
    esac
    
    if [[ -n "$download_url" ]]; then
        print_status "Downloading from: $download_url"
        local temp_file=$(mktemp)
        
        if curl -L -o "$temp_file" "$download_url"; then
            # Install to user's local bin directory
            mkdir -p "$HOME/.local/bin"
            chmod +x "$temp_file"
            mv "$temp_file" "$HOME/.local/bin/age-plugin-yubikey"
            
            # Add to PATH if not already there
            if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
                print_warning "Add $HOME/.local/bin to your PATH:"
                echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
            fi
            
            print_success "age-plugin-yubikey downloaded and installed to $HOME/.local/bin/"
            return 0
        else
            print_error "Failed to download age-plugin-yubikey binary"
            rm -f "$temp_file"
            return 1
        fi
    fi
}

# Verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    if command -v age-plugin-yubikey &> /dev/null; then
        local version=$(age-plugin-yubikey --version 2>/dev/null || echo "unknown")
        print_success "Installation verified: $version"
        print_status "Location: $(which age-plugin-yubikey)"
        return 0
    else
        print_error "Installation verification failed"
        return 1
    fi
}

# Setup development configuration
setup_dev_config() {
    print_status "Setting up development configuration..."
    
    # Create development notes
    cat > "$(dirname "$0")/../YUBIKEY-DEV-SETUP.md" << 'EOF'
# YubiKey Development Setup

This document tracks the YubiKey development environment setup.

## Installation Status
- age-plugin-yubikey: ✅ Installed and verified
- Version: $(age-plugin-yubikey --version 2>/dev/null || echo "unknown")
- Location: $(which age-plugin-yubikey 2>/dev/null || echo "not found")

## Testing YubiKey Features

### Without Physical YubiKey
For development without hardware, the age-plugin-yubikey will gracefully fail with proper error messages that our error handling system should catch and handle appropriately.

### With Physical YubiKey
1. Insert YubiKey device
2. Run the app: `make app`
3. Navigate to Setup page
4. Select YubiKey or Hybrid protection modes
5. Follow the initialization workflow

## Troubleshooting

### Common Issues
1. **Binary not found**: Make sure age-plugin-yubikey is in PATH
2. **Permission errors**: Ensure proper permissions for binary execution
3. **YubiKey not detected**: Check physical connection and drivers

### Development Workflow
1. Test without YubiKey (should show graceful degradation)
2. Test with YubiKey inserted (should show device detection)
3. Test YubiKey removal during operation (should handle gracefully)

## Next Steps
- [ ] Implement proper error classification system
- [ ] Add graceful degradation for missing plugin
- [ ] Implement production binary bundling strategy
EOF
    
    print_success "Development configuration created"
}

# Main installation workflow
main() {
    print_status "Starting YubiKey development environment setup..."
    echo ""
    
    # Check if already installed
    if check_existing_installation; then
        print_status "Skipping installation, already available"
    else
        # Attempt installation based on platform
        local os_type=$(uname -s)
        local install_success=false
        
        case "$os_type" in
            Darwin)
                if install_macos; then
                    install_success=true
                fi
                ;;
            Linux)
                if install_linux; then
                    install_success=true
                fi
                ;;
            *)
                print_error "Unsupported operating system: $os_type"
                ;;
        esac
        
        # Fallback to pre-built binary if package manager failed
        if [[ "$install_success" != "true" ]]; then
            print_warning "Package manager installation failed, trying pre-built binary..."
            if install_prebuilt; then
                install_success=true
            fi
        fi
        
        if [[ "$install_success" != "true" ]]; then
            print_error "All installation methods failed"
            echo ""
            print_status "Manual installation options:"
            echo "1. Install Rust and use: cargo install age-plugin-yubikey"
            echo "2. Download binary from: https://github.com/str4d/age-plugin-yubikey/releases"
            echo "3. Build from source: https://github.com/str4d/age-plugin-yubikey"
            exit 1
        fi
    fi
    
    echo ""
    
    # Verify installation
    if verify_installation; then
        setup_dev_config
        echo ""
        print_success "YubiKey development environment setup complete!"
        print_status "You can now run 'make app' and test YubiKey features"
        echo ""
        print_status "Next steps:"
        echo "  1. Run the application: make app"
        echo "  2. Test protection mode selection (should work without hardware)"
        echo "  3. Test with YubiKey inserted (if available)"
    else
        print_error "Setup failed - age-plugin-yubikey not available"
        exit 1
    fi
}

# Run main function
main "$@"