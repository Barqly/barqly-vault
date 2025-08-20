# Universal DMG Build Guide

## Overview

This guide documents the universal DMG build system for Barqly Vault, enabling distribution to both Intel and Apple Silicon Macs from a single installer.

## Quick Start

### First-Time Setup

```bash
# Install required Rust targets (one-time only)
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
```

### Build Universal DMG

```bash
# Full build with validation
make dmg-universal

# Quick build (skip validation for faster iteration)
./scripts/quick-dmg.sh
```

## Architecture

### Build Pipeline

```
1. Validate Project → Ensures code quality standards
2. Build Frontend → Creates optimized React production build  
3. Build ARM64 Binary → Native Apple Silicon binary
4. Build x86_64 Binary → Native Intel binary
5. Create Universal Binary → Combines using `lipo` tool
6. Generate App Bundle → Tauri bundle with universal binary
7. Create DMG → Distributable disk image
```

### Technical Details

#### Universal Binary Creation

The build system uses Apple's `lipo` tool to combine architecture-specific binaries:

```bash
lipo -create \
    target/aarch64-apple-darwin/release/barqly-vault \
    target/x86_64-apple-darwin/release/barqly-vault \
    -output target/universal-apple-darwin/release/barqly-vault
```

#### Cross-Compilation

- **From Apple Silicon**: Can build for both ARM64 and x86_64
- **From Intel Mac**: Can build for both x86_64 and ARM64
- Uses Rust's built-in cross-compilation capabilities
- No emulation or Rosetta required during build

## Build Scripts

### Main Build Script: `build-universal-dmg.sh`

**Location**: `/scripts/build-universal-dmg.sh`

**Features**:
- Dependency checking and auto-installation
- Project validation integration
- Progress indicators and error handling
- Supports skip flags for faster iteration

**Options**:
- `--skip-validation`: Skip code quality checks
- `--skip-frontend`: Reuse existing frontend build
- `--help`: Display usage information

### Quick Build Script: `quick-dmg.sh`

**Location**: `/scripts/quick-dmg.sh`

**Purpose**: Faster builds during development when code is already validated

## Output Locations

### Build Artifacts

```
src-tauri/
├── target/
│   ├── aarch64-apple-darwin/     # ARM64 build
│   ├── x86_64-apple-darwin/      # Intel build
│   └── universal-apple-darwin/   # Universal build
│       └── release/
│           ├── barqly-vault      # Universal binary
│           └── bundle/
│               └── macos/
│                   ├── Barqly Vault.app/  # Universal app
│                   └── Barqly-Vault-Universal.dmg
```

### Final DMG Location

```
src-tauri/target/universal-apple-darwin/release/bundle/macos/Barqly-Vault-Universal.dmg
```

## Testing the Universal DMG

### On Apple Silicon Mac

1. Mount the DMG by double-clicking
2. Drag app to Applications folder
3. Verify with: `file "/Applications/Barqly Vault.app/Contents/MacOS/Barqly Vault"`
   - Should show: `Mach-O universal binary with 2 architectures`

### On Intel Mac

1. Copy DMG to Intel Mac
2. Mount and install as above
3. App runs natively without Rosetta

### Architecture Verification

Right-click app → Get Info → Should show "Kind: Application (Universal)"

## Troubleshooting

### Common Issues

#### "Cannot find binary" Error

**Solution**: Ensure both Rust targets are installed:
```bash
rustup target add x86_64-apple-darwin aarch64-apple-darwin
```

#### Build Fails on Validation

**Solution**: Run `make validate` and fix any issues before building

#### DMG Creation Fails

**Solution**: Ensure you have sufficient disk space (need ~500MB free)

### Build Performance

Typical build times on M4 Mac:
- Full build with validation: ~3-5 minutes
- Quick build (skip validation): ~2-3 minutes
- Rebuild after code change: ~1-2 minutes

## CI/CD Integration

### Future GitHub Actions Workflow

The build system is designed for easy CI/CD integration:

```yaml
# Example workflow structure (future implementation)
- name: Build Universal DMG
  run: |
    rustup target add x86_64-apple-darwin aarch64-apple-darwin
    make dmg-universal
    
- name: Upload DMG Artifact
  uses: actions/upload-artifact@v3
  with:
    name: barqly-vault-universal-dmg
    path: src-tauri/target/universal-apple-darwin/release/bundle/macos/*.dmg
```

## Security Considerations

### Code Signing (Future)

Currently, the DMG is unsigned. For production release:

1. Obtain Apple Developer ID certificate
2. Add to build script:
   ```bash
   codesign --deep --force --verify --verbose \
     --sign "Developer ID Application: Your Name" \
     "Barqly Vault.app"
   ```

### Notarization (Future)

For distribution without Gatekeeper warnings:

1. Submit app to Apple for notarization
2. Staple notarization ticket to DMG
3. Use `xcrun notarytool` in build pipeline

## Maintenance

### Updating Tauri Configuration

When modifying `tauri.conf.json`, ensure:
- `minimumSystemVersion` remains compatible (currently 10.13)
- Bundle identifiers stay consistent
- Icon paths are correct

### Updating Entitlements

The `entitlements.plist` file controls app permissions. Modify carefully:
- Add only required entitlements
- Test thoroughly after changes
- Document any new permissions

## Best Practices

1. **Always validate before release builds**: `make validate`
2. **Test on both architectures** before distribution
3. **Keep build scripts idempotent**: Can run multiple times safely
4. **Document any build customizations** in this file
5. **Version DMG files** for release tracking

## Related Documentation

- [System Architecture](../architecture/system-architecture.md)
- [Development Workflow](../context/foundation/development-workflow.md)
- [Quality Standards](../common/quality-standards.md)