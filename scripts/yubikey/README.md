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

## Binary Locations

After running the scripts, binaries will be located at:
```
bin/
├── darwin/
│   ├── age-plugin-yubikey  # Downloaded binary
│   ├── ykman               # Wrapper script
│   └── ykman-bundle/       # PyInstaller bundle
├── linux/                  # Linux binaries (when built)
└── checksums.json          # SHA256 checksums for verification
```

## Development Usage

The Rust code automatically discovers binaries in this order:
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