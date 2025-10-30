# Binary Dependencies - R2 Release

This directory contains external binary dependencies for Barqly Vault. Binaries are **NOT committed to git** but are fetched from GitHub Release during builds.

## Architecture Overview

**Storage:** GitHub Release `barqly-vault-dependencies`
- All binaries stored as release assets
- Permanent CDN-backed storage
- No git repository bloat

**Build Process:**
1. CI/CD fetches binaries from GitHub Release
2. Caches by SHA256 checksum
3. Tauri bundles into application packages

**Update Process:**
- One-time: Create/update dependency release when versions change
- Every build: Fetch from release (fast, cached)

## Required Binaries

### 1. age
- **Version**: 1.2.1
- **Purpose**: File encryption CLI (multi-recipient support)
- **Source**: https://github.com/FiloSottile/age
- **Platforms**: macOS (ARM/Intel), Linux, Windows

### 2. age-plugin-yubikey
- **Version**: 0.5.0
- **Purpose**: YubiKey plugin for age encryption
- **Source**: https://github.com/str4d/age-plugin-yubikey
- **Platforms**: macOS (ARM/Intel), Linux, Windows

### 3. ykman (YubiKey Manager)
- **Version**: 5.8.0
- **Purpose**: YubiKey configuration and management CLI
- **Source**: https://github.com/Yubico/yubikey-manager
- **Distribution**: Built from source using PyInstaller
- **Platforms**: macOS (universal), Linux, Windows

## Directory Structure

```
src-tauri/bin/                      # .gitignored (downloaded during build)
├── darwin/
│   ├── age                         # Fetched from GitHub Release
│   ├── age-plugin-yubikey          # Fetched from GitHub Release
│   ├── ykman.bat (if Windows)      # Wrapper script
│   ├── ykman (if Unix)             # Wrapper script
│   └── ykman-bundle/               # PyInstaller bundle
│       ├── ykman or ykman.exe      # Main binary
│       └── _internal/              # Dependencies
├── linux/                          # Same structure
├── windows/                        # Same structure
└── .keep                           # Tracked in git
```

**Note:** Only `.keep`, `README.md`, and `binary-dependencies.json` are committed to git.

## Creating/Updating Dependency Release (One-Time)

When updating binary versions (every 3-6 months):

```bash
# 1. Download age and age-plugin-yubikey (2 minutes)
./scripts/cicd/download-all-binaries.sh

# 2. Build ykman for all platforms in CI (8-10 minutes)
gh workflow run build-ykman-bundles.yml -f version=5.8.0
gh run watch

# 3. Download ykman artifacts
gh run list --workflow=build-ykman-bundles.yml --limit 1  # Get run ID
gh run download <run-id> --dir dist/ykman-temp
mv dist/ykman-temp/*/*.tar.gz dist/binaries/

# 4. Create/Update GitHub Release
cd dist/binaries
# Delete old release if updating
gh release delete barqly-vault-dependencies --yes

# Create new release
gh release create barqly-vault-dependencies \
  age-* age-plugin-yubikey-* ykman-* checksums.txt \
  --title "Barqly Vault Binary Dependencies" \
  --notes "Binary dependencies..." \
  --prerelease

# 5. Update binary-dependencies.json with new URLs/checksums
# (See Phase 2.6 in implementation plan)
```

**Frequency:** Only when age/age-plugin/ykman release new versions

## Every App Build (Automatic)

Binaries are fetched automatically during CI/CD:

```yaml
# In .github/workflows/release.yml
- name: Fetch Binary Dependencies
  run: ./scripts/cicd/fetch-binaries.sh
```

The fetch script:
- Reads `binary-dependencies.json` for URLs and checksums
- Downloads binaries from GitHub Release
- Verifies SHA256 checksums
- Places in `src-tauri/bin/{platform}/`
- Cached by GitHub Actions (fast subsequent builds)

## Local Development

For local builds:

```bash
# Fetch binaries for current platform
./scripts/cicd/fetch-binaries.sh

# Build application
cargo tauri build
```

Binaries are downloaded once, cached locally in `src-tauri/bin/`.

## Platform Coverage

| Binary | macOS ARM | macOS Intel | Linux x64 | Windows x64 |
|--------|-----------|-------------|-----------|-------------|
| age | ✅ | ✅ | ✅ | ✅ |
| age-plugin-yubikey | ✅ | ✅ | ✅ | ✅ |
| ykman | ✅ (universal) | ✅ (universal) | ✅ | ✅ |

**Total:** 11 binary files across all platforms

## Verification

All binaries include SHA256 checksums in `checksums.txt` within the GitHub Release.

To verify manually:
```bash
# Download checksums
curl -L https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies/checksums.txt -o checksums.txt

# Verify a binary
shasum -a 256 -c checksums.txt --ignore-missing
```

## Related Documentation

- **Release Process**: `docs/architecture/cicd/release-process.md`
- **Implementation Plan**: `docs/engineering/R2/r2-binary-dependency-integration-plan.md`
- **Dependency Versions**: `docs/architecture/dependency-versions.md`

---

**Last Updated:** 2025-10-29 (R2 Release - GitHub Releases approach)
