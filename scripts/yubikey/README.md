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
# Activate the virtual environment
source .venv-yubikey/bin/activate

# Build ykman
./scripts/yubikey/build-ykman.sh
```

This creates a standalone ykman binary at `bin/darwin/ykman` (or appropriate platform).

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
│   ├── ykman               # Wrapper script
│   └── ykman-bundle/       # PyInstaller bundle
├── linux/                  # Linux binaries (when built)
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

GitHub Actions will use these scripts to build binaries for all platforms:
- macOS (Intel & ARM64)
- Windows (x64)
- Linux (x64)

See `.github/workflows/build-binaries.yml` (to be created).