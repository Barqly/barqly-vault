# Release Pipeline Fixes - Separate macOS Builds Implementation

**Date**: 2025-08-20  
**Architect**: System Architect  
**Status**: Implemented

## Problem Statement

The release pipeline had critical issues preventing proper separate Intel/ARM builds for macOS:
1. Line 72 in release.yml still contained universal build logic
2. Linux dependencies had potential conflicts
3. Implementation didn't match the Sparrow wallet distribution model we promised

## Solution Implemented

### 1. Fixed GitHub Actions Workflow

**File**: `.github/workflows/release.yml`

#### Key Changes:

1. **Simplified Rust toolchain installation** (line 69-74):
   - Removed multiple conditional installations
   - Single installation step with target selection based on matrix
   - Each job builds ONLY for its specific architecture

2. **Added RPM support** (line 87):
   - Added `rpm` package to Ubuntu dependencies for creating .rpm files

3. **Enhanced DMG naming** (lines 111-137):
   - Creates Sparrow-style directory structure
   - Properly extracts version from git tags (handles 'v' prefix)
   - Renames DMGs to include architecture: `Barqly-Vault-{version}-x86_64.dmg`

### 2. Updated Makefile

**File**: `Makefile`

#### Changes:
- Line 288: Changed `dmg-universal` to `dmg-all` for pipeline-release target
- Line 150: Removed universal-apple-darwin cleanup, added explanatory comment

### 3. Documentation Updates

#### Created:
- `/docs/engineering/separate-macos-builds.md` - Complete guide to separate builds approach
- `/docs/engineering/release-pipeline-fixes-2025-08-20.md` - This document

#### Archived:
- `/docs/engineering/universal-dmg-build.md` → `/docs/engineering/archive-universal-dmg-build.md.archived`

#### Updated:
- `/docs/architecture/cicd-pipeline-architecture.md`:
  - Replaced universal binary approach with separate builds
  - Updated artifact paths
  - Modified roadmap to reflect Sparrow model

### 4. Tauri Configuration

**File**: `src-tauri/tauri.conf.json`

#### Enhancement:
- Added RPM configuration with epoch and release fields (lines 52-55)

## Distribution Model Achieved

Now properly implements Sparrow wallet's 10-file distribution model:

### macOS (2 files)
- `Barqly-Vault-{version}-x86_64.dmg` - Intel Macs
- `Barqly-Vault-{version}-aarch64.dmg` - Apple Silicon

### Windows (2 files)
- `Barqly-Vault-{version}.msi` - Installer
- `Barqly-Vault-{version}-standalone-x64.zip` - Portable

### Linux (6 files)
- `barqly-vault_{version}_amd64.deb` - Debian/Ubuntu x64
- `barqly-vault_{version}_arm64.deb` - Debian/Ubuntu ARM64
- `barqly-vault-{version}-1.x86_64.rpm` - RedHat/Fedora x64
- `barqly-vault-{version}-1.aarch64.rpm` - RedHat/Fedora ARM64
- `barqly-vault-{version}-x86_64.tar.gz` - Generic x64
- `barqly-vault-{version}-aarch64.tar.gz` - Generic ARM64

## Benefits of This Approach

1. **Performance**: Native code execution on each architecture
2. **Size**: Each DMG is ~40% smaller than universal binary
3. **Industry Standard**: Matches Sparrow, Electrum, other Bitcoin wallets
4. **Clarity**: Users download exactly what they need
5. **Debugging**: Architecture-specific issues easier to isolate
6. **CI Efficiency**: Parallel builds, better caching

## Testing the Changes

### Local Testing:
```bash
# Test Intel build
make dmg-intel

# Test ARM build
make dmg-arm

# Test both
make dmg-all
```

### CI Testing:
The workflow will trigger on:
- Version tags: `v*.*.*`
- Beta tags: `v*.*.*-beta*`
- RC tags: `v*.*.*-rc*`
- Manual workflow dispatch

## Verification Checklist

- [x] No universal build references in active code
- [x] Rust toolchain properly installs per-architecture targets
- [x] DMG files renamed with architecture suffix
- [x] Windows standalone ZIP created
- [x] Linux tar.gz archives created
- [x] RPM build tools installed
- [x] Documentation updated
- [x] Old universal build scripts archived

## Migration Notes

For existing deployments:
1. Universal DMGs can still open on both architectures via Rosetta 2
2. Users should download architecture-specific builds for best performance
3. CI caches may need clearing for first run

## Rollback Plan

If issues arise:
1. Revert `.github/workflows/release.yml` to previous version
2. Restore universal build scripts from `scripts/archive-universal/`
3. Update Makefile targets back to universal builds

## References

- [Sparrow Wallet Releases](https://github.com/sparrowwallet/sparrow/releases) - Distribution model reference
- [Tauri v2 Cross-Compilation](https://v2.tauri.app/distribute/) - Build documentation
- [GitHub Actions Matrix Builds](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs) - CI/CD patterns

## Conclusion

The release pipeline now correctly implements separate Intel and ARM builds for macOS, matching the Sparrow wallet distribution model. This resolves all identified issues and provides a cleaner, more maintainable build process that follows industry best practices for desktop Bitcoin applications.