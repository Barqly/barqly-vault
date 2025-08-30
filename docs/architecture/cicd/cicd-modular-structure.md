# CI/CD Modular Pipeline Architecture

## Overview

The release pipeline has been refactored from a monolithic 615-line workflow into a modular, maintainable architecture using composite actions.

## Structure

```
.github/
├── actions/                        # Reusable composite actions
│   ├── apple-certificates/         # Apple signing certificate management
│   ├── notarize-macos/            # macOS notarization process
│   ├── rename-artifacts/          # Artifact naming standardization
│   ├── create-checksums/          # SHA256 checksum generation
│   └── promote-release/           # Beta → Production promotion
├── workflows/
│   └── release.yml                # Main orchestrator (301 lines, down from 615)

scripts/
└── ci/
    └── generate-release-notes.sh  # Release notes generation
```

## Workflow Capabilities

### Tag Convention
The pipeline follows a three-tier tagging system:
- **Alpha**: Local checkpoints (NO CI/CD trigger)
- **Beta**: Testing builds (triggers CI/CD)
- **Production**: Final releases

### 1. Alpha Tags (Local Development)
```bash
git tag v1.0.0-alpha
git push origin v1.0.0-alpha
```
- **Does NOT trigger CI/CD**
- Use for local version checkpoints
- Rollback points during development
- Zero resource consumption

### 2. Beta Releases (Testing)
```bash
# Full platform build
git tag v1.0.0-beta
git push origin v1.0.0-beta
```
- Builds all platforms (macOS Intel/ARM, Windows, Linux)
- Creates draft release for testing

#### Selective Beta Builds
```bash
# Single platform testing
git tag v1.0.0-beta-linux    # Linux only
git tag v1.0.0-beta-mac      # macOS only (Intel + ARM)
git tag v1.0.0-beta-win      # Windows only

# Multi-platform combinations
git tag v1.0.0-beta-mac-linux    # macOS + Linux
git tag v1.0.0-beta-win-linux    # Windows + Linux
```
- Saves CI/CD time by building only what you need
- Avoids unnecessary macOS notarization cycles

### 3. Production Releases
```bash
git tag v1.0.0
git push origin v1.0.0
```
- Full platform build
- Production-ready release

### 4. Promotion (Beta → Production)
```bash
gh workflow run release.yml \
  -f promote_from=1.0.0-beta.1 \
  -f version=1.0.0
```
- Reuses beta artifacts
- No rebuild required
- Creates new production release

### 5. Manual Release with Selective Build
```bash
gh workflow run release.yml \
  -f version=1.0.0 \
  -f selective_build=true \
  -f build_macos_intel=false \
  -f build_macos_arm=false \
  -f build_linux=true \
  -f build_windows=true
```
- Manual control over which platforms to build
- Useful for testing specific platform changes

## Benefits

### Maintainability
- **Before**: 615 lines in single file
- **After**: 301 lines main + 6 focused actions (~50-100 lines each)
- **Result**: 50% reduction in main file complexity

### AI Agent Friendly
- Smaller files easier to edit
- Clear separation of concerns
- Isolated changes don't affect entire pipeline

### Reusability
- Composite actions can be used in other workflows
- Standardized patterns across CI/CD
- Easy to test individual components

### Flexibility
- Add new features as separate actions
- Modify specific functionality without touching core
- Support multiple release strategies

## Composite Actions

### apple-certificates
- **Purpose**: Manage Apple code signing
- **Operations**: setup, cleanup
- **Lines**: ~70

### notarize-macos
- **Purpose**: Apple notarization process
- **Operations**: submit, wait, staple, verify
- **Lines**: ~120

### rename-artifacts
- **Purpose**: Standardize artifact naming
- **Platforms**: macOS, Windows, Linux
- **Lines**: ~130

### create-checksums
- **Purpose**: Generate SHA256 checksums
- **Output**: checksums.txt
- **Lines**: ~30

### promote-release
- **Purpose**: Promote beta to production
- **Features**: Artifact reuse, version renaming
- **Lines**: ~140

## Release Artifacts

The pipeline generates the following artifacts for desktop platforms:

### macOS (2 files)
- `barqly-vault-{version}-macos-x86_64.dmg` - Intel processors
- `barqly-vault-{version}-macos-arm64.dmg` - Apple Silicon (M1/M2/M3)

### Windows (2 files)
- `barqly-vault-{version}-x64.msi` - MSI installer
- `barqly-vault-{version}-windows-x64.zip` - Standalone executable

### Linux (4 files)
- `barqly-vault-{version}-1_amd64.deb` - Debian/Ubuntu package
- `barqly-vault-{version}-1.x86_64.rpm` - RedHat/Fedora package
- `barqly-vault-{version}-1_amd64.AppImage` - Universal Linux app
- `barqly-vault-{version}-x86_64.tar.gz` - Standalone binary

### Additional Files
- `checksums.txt` - SHA256 checksums for all artifacts

**Note**: The `-1` in Linux package names is the release number, following standard Linux packaging conventions.

## Testing

### Test Alpha Tag (No Build)
```bash
# Create alpha tag - should NOT trigger CI/CD
git tag v0.7.0-alpha
git push origin v0.7.0-alpha
# Verify no workflow triggered in Actions tab
```

### Test Beta Release
```bash
# Create beta tag for testing
git tag v0.7.0-beta
git push origin v0.7.0-beta

# Or selective platform testing
git tag v0.7.0-beta-win
git push origin v0.7.0-beta-win

# Delete test release when done
gh release delete v0.7.0-beta --yes
git push --delete origin v0.7.0-beta
```

### Test Promotion
```bash
# Promote existing beta to production
gh workflow run release.yml \
  -f promote_from=0.7.0-beta \
  -f version=0.7.0
```

## Migration from Old Pipeline

The refactored pipeline is backward compatible:
- Same triggers (tags, workflow_dispatch)
- Same artifact outputs
- Same release format
- Added promotion capability


## Future Enhancements

1. **Platform-specific workflows**: Further split by OS
2. **Parallel testing**: Add test job in parallel with build
3. **Automatic changelogs**: Generate from commit history
4. **Incremental releases**: Delta updates for faster downloads
5. **Auto-update mechanism**: In-app update notifications