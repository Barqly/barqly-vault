# Binary Management for YubiKey POC

This directory contains the binary dependencies required for the YubiKey POC project. We maintain pinned versions of these binaries to ensure reproducibility across development and production environments.

## Binaries

### 1. age-plugin-yubikey
- **Version**: 0.5.0
- **Purpose**: YubiKey plugin for age encryption
- **Source**: https://github.com/str4d/age-plugin-yubikey
- **Distribution**: Pre-built binaries from GitHub releases

### 2. ykman (YubiKey Manager)
- **Version**: 5.8.0
- **Purpose**: YubiKey configuration and management CLI
- **Source**: https://github.com/Yubico/yubikey-manager
- **Distribution**: Built from source using PyInstaller

## Directory Structure

```
bin/
├── darwin/           # macOS binaries
│   ├── age-plugin-yubikey
│   └── ykman
├── linux/            # Linux binaries (when needed)
└── checksums.json    # SHA256 checksums for verification
```

## Management Scripts

### Download age-plugin-yubikey
```bash
./scripts/download-age-plugin.sh [version]
```
Downloads the official pre-built binary from GitHub releases.

### Build ykman from source
```bash
./scripts/build-ykman.sh [version]
```
Clones the ykman repository and builds a standalone binary using PyInstaller.

## Version Pinning

We pin exact versions for both binaries to ensure:
1. **Security**: Known, tested versions
2. **Reproducibility**: Same behavior across all environments
3. **Stability**: No unexpected breaking changes

## Checksums

All binaries are verified using SHA256 checksums stored in `checksums.json`. This file is updated automatically by the management scripts.

## Local Development

For local development, you can either:
1. Use the binaries in this folder (recommended)
2. Install via package managers (brew, apt) but ensure version matches

## Production Bundle

For production releases, these binaries will be:
1. Downloaded/built during CI/CD
2. Verified against checksums
3. Bundled with the Tauri application

## Security Notes

- Never commit actual binaries to git (use .gitignore)
- Always verify checksums before use
- Build from official sources only
- For ykman: Built from official Yubico repository
- For age-plugin-yubikey: Downloaded from str4d's official releases

## Updating Binaries

To update to a new version:
1. Test the new version thoroughly
2. Update the script with new version number
3. Run the appropriate script
4. Verify functionality
5. Update this README with new version info
6. Commit the scripts and checksums.json (not the binaries)