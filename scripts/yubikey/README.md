# YubiKey Binary Management Scripts

This directory contains scripts for building and managing YubiKey-related binaries.

## Setup

First, setup the Python environment:
```bash
./scripts/yubikey/setup-env.sh
```

This will:
- Install `uv` (fast Python package manager) if not present
- Create a virtual environment at `.venv-yubikey`
- Install PyInstaller and yubikey-manager

## Building Binaries

### Build ykman from source
```bash
# Build ykman for current platform (macOS, Linux, or Windows)
./scripts/yubikey/build-ykman.sh [version]

# Example with specific version
./scripts/yubikey/build-ykman.sh 5.8.0
```

This script:
- Auto-detects the current platform (macOS/Linux/Windows)
- Clones the yubikey-manager repository
- Builds a standalone binary using PyInstaller
- Creates platform-appropriate wrapper (bash script or .bat file)
- Places the bundle in `bin/{platform}/ykman-bundle/`

**Platform Support:**
- ✅ macOS (Intel & ARM64)
- ✅ Linux (x86_64)
- ✅ Windows (x86_64 via Git Bash)

### Download age-plugin-yubikey
```bash
./scripts/yubikey/download-age-plugin.sh
```

This downloads the official pre-built binary from GitHub releases.

### Download age CLI
```bash
./scripts/yubikey/download-age.sh
```

This downloads the official pre-built age CLI binary from filippo.io for multi-recipient encryption support.

## Binary Locations

After running the scripts, binaries will be located at:
```
bin/
├── darwin/
│   ├── age                 # Downloaded age CLI binary
│   ├── age-plugin-yubikey  # Downloaded binary
│   ├── ykman               # Wrapper script (bash)
│   └── ykman-bundle/       # PyInstaller bundle directory
├── linux/
│   ├── age
│   ├── age-plugin-yubikey
│   ├── ykman               # Wrapper script (bash)
│   └── ykman-bundle/
├── windows/
│   ├── age.exe
│   ├── age-plugin-yubikey.exe
│   ├── ykman.bat           # Wrapper script (batch)
│   └── ykman-bundle/
└── checksums.json          # SHA256 checksums for verification
```

## Development Usage

The Rust code uses a hybrid approach for age encryption:

### Age Architecture Components:
1. **Age Crate (Rust Library)** - Used for:
   - Single-recipient passphrase encryption/decryption
   - Simple operations where only x25519 recipients are involved

2. **Age CLI Binary** - Used for:
   - Multi-recipient encryption (mixing passphrase + YubiKey recipients)
   - Any decryption involving YubiKey recipients
   - Downloaded from filippo.io via `download-age.sh`

3. **Age-Plugin-YubiKey Binary** - Used for:
   - Direct YubiKey operations (identity generation, listing)
   - Called automatically by age CLI when YubiKey recipients are encountered
   - Downloaded from GitHub via `download-age-plugin.sh`

  Terminology Clarification:

  - Age CLI = The age binary executable
  - Age Plugin = The age-plugin-yubikey binary executable
  - Age Crate = The Rust library age crate

  So we're using:
  1. Age CLI (not "age plugin") for multi-recipient encryption
  2. Age Plugin (age-plugin-yubikey) for YubiKey-specific operations
  3. Age Crate for simple passphrase-only operations
  
### Binary Discovery Order:
1. Bundled binaries in `bin/` directory
2. System-installed binaries in PATH
3. Error if not found

## Production Bundle

For production releases, these binaries will be included in the Tauri bundle.

## CI/CD Integration

GitHub Actions workflows automatically build binaries for all platforms:

### ykman Builds
Workflow: `.github/workflows/build-ykman-bundles.yml`
- Trigger: Manual workflow dispatch
- Platforms: macOS, Linux (Ubuntu 22.04), Windows
- Uses the unified `build-ykman.sh` script for all platforms

### age & age-plugin-yubikey Downloads
These are downloaded from official sources using platform-specific download scripts.

**Testing Locally:**
```bash
# Test script syntax
bash -n scripts/yubikey/build-ykman.sh

# Test build on your platform
./scripts/yubikey/build-ykman.sh 5.8.0
```