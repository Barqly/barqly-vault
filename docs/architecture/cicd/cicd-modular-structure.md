# CI/CD Modular Pipeline Architecture

**Created**: 2025-08-20  
**Updated**: 2025-09-02  
**Status**: Active Implementation  
**Author**: System Architect

## Overview

The release pipeline uses a modular architecture with composite actions, implementing a three-tier release process (alpha/beta/production) optimized for cost efficiency and security compliance.

**For detailed release process steps, see [release-process.md](./release-process.md)**

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
└── cicd/                         # CI/CD automation scripts
    ├── generate-release-notes.sh  # Release notes generation
    ├── promote-beta.sh            # Beta to production promotion
    ├── publish-production.sh      # Production publication
    ├── update-downloads.sh        # Download page updates
    └── generate-downloads.py      # Template-based page generation
```

## Workflow Capabilities

### Tag Convention
The pipeline follows a three-tier tagging system with incremental versioning:
- **Alpha**: `v{VERSION}-alpha.{N}` - Development checkpoints (NO CI/CD trigger)
- **Beta**: `v{VERSION}-beta.{N}` - Testing builds (triggers full CI/CD)
- **Production**: `v{VERSION}` - Final releases (manual promotion)

### 1. Alpha Tags (Development Checkpoints)
```bash
# Incremental alpha development
git tag v0.3.0-alpha.1
git push origin v0.3.0-alpha.1

git tag v0.3.0-alpha.2
git push origin v0.3.0-alpha.2
```
- **Does NOT trigger CI/CD**
- Use for development milestones and feature completion markers
- Allows multiple iterations on same base version
- Zero resource consumption, purely organizational

### 2. Beta Releases (Full Build + Testing)
```bash
# Incremental beta testing
git tag v0.3.0-beta.1
git push origin v0.3.0-beta.1

# If issues found, iterate
git tag v0.3.0-beta.2
git push origin v0.3.0-beta.2
```
- Triggers complete CI/CD pipeline
- Builds all platforms (macOS Intel/ARM, Windows, Linux)
- Includes macOS DMG notarization and code signing
- Creates beta draft release with all artifacts
- Auto-creates corresponding production draft release
- **Cost-efficient**: Only betas trigger expensive builds

### 3. Production Releases (Manual Promotion)
```bash
# Promote stable beta to production
make promote-beta FROM=0.3.0-beta.2 TO=0.3.0
# OR: ./scripts/cicd/promote-beta.sh --from 0.3.0-beta.2 --to 0.3.0
```
- **Reuses beta artifacts** - no rebuild required
- **Renames files** to remove "-beta" suffix (standardized naming)
- **Creates production tag** and draft release
- **Security-compliant** - manual approval gate

### 4. Production Publication (Manual Security Gate)
```bash
# Publish production release and update documentation
make publish-prod VERSION=0.3.0
# OR: ./scripts/cicd/publish-production.sh 0.3.0
```
- **Publishes GitHub release** from draft to public
- **Updates documentation** (downloads page, version history)
- **Commits changes** to main branch with bypass
- **Maintains compliance** with branch protection rules

### 5. Manual Workflow Dispatch (Testing)
```bash
# Manual workflow trigger with platform selection
gh workflow run release.yml \
  -f version=0.3.0 \
  -f selective_build=true \
  -f build_macos_intel=false \
  -f build_macos_arm=true \
  -f build_linux=true \
  -f build_windows=false
```
- Manual control over which platforms to build
- Useful for testing specific platform changes
- Available for debugging and special cases

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
git tag v0.3.0-alpha.1
git push origin v0.3.0-alpha.1
# Verify no workflow triggered in Actions tab
```

### Test Beta Release
```bash
# Create beta tag for testing
git tag v0.3.0-beta.1
git push origin v0.3.0-beta.1

# Monitor build progress
gh run list --workflow=release.yml --limit 5

# Delete test release when done
gh release delete v0.3.0-beta.1 --yes
git tag -d v0.3.0-beta.1
git push --delete origin v0.3.0-beta.1
```

### Test Full Release Cycle
```bash
# 1. Create beta
git tag v0.3.0-beta.1 && git push origin v0.3.0-beta.1

# 2. Wait for build completion, then promote
make promote-beta FROM=0.3.0-beta.1 TO=0.3.0

# 3. Publish production
make publish-prod VERSION=0.3.0
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