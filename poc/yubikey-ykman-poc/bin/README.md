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
- **Distribution**: Built from source using PyInstaller with official Yubico spec

## Directory Structure

```
bin/
├── darwin/                 # macOS binaries
│   ├── age-plugin-yubikey  # Downloaded binary
│   ├── ykman               # Wrapper script
│   └── ykman-bundle/       # PyInstaller bundle
├── linux/                  # Linux binaries (when needed)
└── checksums.json          # SHA256 checksums for verification
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
Clones the ykman repository and builds a standalone binary using PyInstaller with Yubico's official spec file, which includes the Entrypoint() function to properly handle Python package imports.

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
- For ykman: Built from official Yubico repository using their ykman.spec
- For age-plugin-yubikey: Downloaded from str4d's official releases

## Updating Binaries

To update to a new version:
1. Test the new version thoroughly
2. Update the script with new version number
3. Run the appropriate script
4. Verify functionality
5. Update this README with new version info
6. Commit the scripts and checksums.json (not the binaries)

## CI/CD Pipeline (Future Implementation)

### Cross-Platform Build Requirements

**Platform-Specific Builds:**
- **macOS (Intel & ARM64)**: Build on macOS runner with universal2 or separate architectures
- **Windows**: Build on Windows runner (x64 primarily, ARM64 if needed)
- **Linux**: Build on oldest supported Linux distro for glibc compatibility

**Why Platform-Specific Builds Are Required:**
- PyInstaller bundles platform-specific Python interpreter and system libraries
- Each OS has different dynamic library formats (.dylib, .dll, .so)
- System calls, paths, and USB drivers differ across platforms

### Recommended CI/CD Strategy

#### 1. GitHub Actions / GitLab CI Matrix Builds
```yaml
# Example matrix strategy
strategy:
  matrix:
    os: [ubuntu-20.04, windows-latest, macos-latest]
    arch: [x64, arm64]  # where applicable
```

#### 2. Build Process per Platform
- **Linux**: Use oldest supported distro (e.g., Ubuntu 20.04) for maximum glibc compatibility
- **Windows**: Include Visual C++ Redistributables if needed
- **macOS**: Use `target_arch="universal2"` for Intel + ARM64 support

#### 3. Platform-Specific Considerations

**Windows:**
- Wrapper script: `.bat` file or use PyInstaller's `--onefile` mode
- USB drivers: WinUSB vs libusb handling
- Path separators in spec file

**Linux:**
- Build on oldest supported distro to avoid glibc version issues
- Include udev rules for YubiKey USB permissions
- Consider AppImage or similar for distribution

**macOS:**
- Code signing and notarization for distribution
- Universal binary support for both Intel and Apple Silicon
- Gatekeeper compatibility

### Build Confidence

We have **high confidence** (90%) that the current build approach will work across platforms because:
1. We're using Yubico's official `ykman.spec` with their Entrypoint() function
2. This spec handles the Python import issues we encountered
3. Yubico successfully ships ykman on all platforms using this approach
4. PyInstaller + official spec is battle-tested

### CI/CD Implementation Notes

When implementing CI/CD:
1. Store binaries as build artifacts with SHA256 checksums
2. Use the existing build scripts with minor platform adaptations
3. Implement checksum verification in download/deployment steps
4. Consider using release tags to trigger binary builds
5. Cache Python dependencies to speed up builds

### Binary Distribution Strategy

**age-plugin-yubikey:**
- Download pre-built binaries from GitHub releases (simpler, faster)
- All platforms already provided by str4d

**ykman:**
- Build from source using our scripts
- Ensures compatibility and control over the build process
- Uses official Yubico spec for reliability