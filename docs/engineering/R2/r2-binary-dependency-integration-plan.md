# R2 Binary Dependency Integration Plan

**Status**: Active Implementation
**Created**: 2025-10-29
**Updated**: 2025-10-29 (Revised with GitHub Releases approach)
**Target Completion**: 8 days
**Priority**: High - Blocking R2 Release

## Purpose

Bundle age, age-plugin-yubikey, and ykman binaries for all platforms (macOS Intel/ARM, Windows x64, Linux x64) to enable YubiKey encryption functionality in Barqly Vault R2 release.

## Scope

- Add test tag support for CI/CD testing without Apple notarization
- Create GitHub Release to host pre-built binaries (avoid git bloat)
- Provision binaries for all platforms and upload to GitHub Release
- Create fetch scripts to download binaries during CI/CD build
- Configure Tauri to bundle binaries in application packages
- Establish version pinning strategy and documentation
- Integrate binary verification into CI/CD pipeline

## Strategy

Incremental enhancements to existing R1 pipeline using **industry best practices**:

- **Storage**: GitHub Releases (CDN-backed, no git bloat, professional standard)
  - Create release: `barqly-vault-dependencies-r2`
  - Upload all platform binaries as release assets
  - Keep `src-tauri/bin/` out of git (`.gitignore`)

- **Versions**: Pin specific versions with SHA256 checksums
  - `binary-dependencies.json` defines URLs + checksums per platform
  - Fetch scripts verify checksums before bundling

- **Build Process**: Fetch binaries during CI/CD, bundle in app packages
  - `scripts/cicd/fetch-binaries.sh` downloads from GitHub Release
  - CI caches binaries by SHA256 key for performance
  - Tauri bundles as sidecars via `externalBin` configuration

- **Testing**: Test tag pattern (`v*.*.*-test.*`) skips expensive notarization

- **Download Page**: User-facing downloads remain clean
  - GitHub releases shows ALL releases (including dependencies)
  - `barqly.com/downloads/` filters to show only app versions (v*.*.*)
  - Dependency releases (`barqly-vault-dependencies-*`) automatically excluded

- **Timeline**: 8 days for full implementation and validation

---

## Phase 1: Test Tag Infrastructure (Day 1)

**Goal**: Enable CI/CD testing without expensive Apple notarization

### Milestone 1.1: Add Test Tag Pattern

**File**: `.github/workflows/release.yml`

#### Tasks:
- [ ] Update tag trigger pattern (Line 6) to include `v*.*.*-test.*`
- [ ] Add conditional to notarization step (Line 340) to skip if tag contains `-test`
- [ ] Add comment documentation explaining test tag behavior
- [ ] Verify workflow syntax with `gh workflow view release.yml`

**Expected Changes**:
```yaml
# Line 6
tags:
  - 'v*.*.*-beta.*'   # Beta releases (full CI/CD with notarization)
  - 'v*.*.*-test.*'   # Test builds (skip notarization)

# Line 340
- name: Notarize macOS DMG
  if: |
    matrix.platform == 'macos-latest' &&
    steps.should_build.outputs.build == 'true' &&
    !contains(github.ref, '-test')  # Skip for test tags
```

**Validation**:
- Workflow file passes YAML validation
- Test tag trigger logic documented
- Notarization skip conditional correct

---

### Milestone 1.2: Validate Test Tag Workflow

**Goal**: Verify test tags build without notarization

#### Tasks:
- [ ] Create test tag: `git tag v0.2.0-test.1 && git push origin v0.2.0-test.1`
- [ ] Monitor workflow: `gh run watch`
- [ ] Verify all 4 platforms build successfully
- [ ] Verify macOS build completes WITHOUT notarization step
- [ ] Download artifacts and verify naming convention
- [ ] Document test tag usage in `docs/architecture/cicd/release-process.md`
- [ ] Clean up: `gh release delete v0.2.0-test.1 --yes && git push --delete origin v0.2.0-test.1`

**Success Criteria**:
- macOS Intel DMG created without notarization
- macOS ARM DMG created without notarization
- Windows MSI created
- Linux AppImage/DEB/RPM created
- Build time < 30 minutes
- All artifacts downloadable

---

## Phase 2: Binary Provisioning & GitHub Release (Days 2-4)

**Goal**: Download binaries for all platforms and publish to GitHub Release

### Milestone 2.1: Download All Platform Binaries

**Working Directory**: `dist/binaries/` (temporary, NOT committed to git)

#### Tasks:
- [ ] Create temporary directory: `mkdir -p dist/binaries`
- [ ] Download age binaries for all platforms:
  - [ ] macOS ARM64: `age-1.2.0-darwin-arm64`
  - [ ] macOS x86_64: `age-1.2.0-darwin-x86_64`
  - [ ] Linux x86_64: `age-1.2.0-linux-x86_64`
  - [ ] Windows x86_64: `age-1.2.0-windows-x86_64.exe`
- [ ] Download age-plugin-yubikey for all platforms:
  - [ ] macOS ARM64: `age-plugin-yubikey-0.5.0-darwin-arm64`
  - [ ] macOS x86_64: `age-plugin-yubikey-0.5.0-darwin-x86_64`
  - [ ] Linux x86_64: `age-plugin-yubikey-0.5.0-linux-x86_64`
  - [ ] Windows x86_64: `age-plugin-yubikey-0.5.0-windows-x86_64.exe`
- [ ] Download/build ykman for all platforms:
  - [ ] macOS universal: `ykman-5.8.0-darwin-universal` (or separate Intel/ARM)
  - [ ] Linux x86_64: `ykman-5.8.0-linux-x86_64`
  - [ ] Windows x86_64: `ykman-5.8.0-windows-x86_64.exe`
- [ ] Verify all binaries execute: `--version` test for each
- [ ] Calculate SHA256 checksums for ALL binaries
- [ ] Document download source URLs

**Expected Directory**:
```
dist/binaries/
├── age-1.2.0-darwin-arm64
├── age-1.2.0-darwin-x86_64
├── age-1.2.0-linux-x86_64
├── age-1.2.0-windows-x86_64.exe
├── age-plugin-yubikey-0.5.0-darwin-arm64
├── age-plugin-yubikey-0.5.0-darwin-x86_64
├── age-plugin-yubikey-0.5.0-linux-x86_64
├── age-plugin-yubikey-0.5.0-windows-x86_64.exe
├── ykman-5.8.0-darwin-universal
├── ykman-5.8.0-linux-x86_64
├── ykman-5.8.0-windows-x86_64.exe
└── checksums.txt  (SHA256 for all files)
```

**Validation**:
- All 11 binary files present
- All binaries executable (chmod +x on Unix)
- Version commands work
- Checksums calculated and verified

---

### Milestone 2.2: Create GitHub Release with Binary Assets

**Release**: `barqly-vault-dependencies-r2`

#### Tasks:
- [ ] Create GitHub Release using CLI:
```bash
gh release create barqly-vault-dependencies-r2 \
  dist/binaries/age-1.2.0-* \
  dist/binaries/age-plugin-yubikey-0.5.0-* \
  dist/binaries/ykman-5.8.0-* \
  dist/binaries/checksums.txt \
  --title "Barqly Vault Binary Dependencies R2" \
  --notes "Pinned binary dependencies for Barqly Vault R2 release.

**Versions:**
- age: v1.2.0
- age-plugin-yubikey: v0.5.0
- ykman: v5.8.0

**Platforms:** macOS (Intel + ARM), Linux (x86_64), Windows (x86_64)

**Verification:** See checksums.txt for SHA256 hashes.

**Note:** This release is for CI/CD use only and will not appear on barqly.com/downloads/." \
  --prerelease
```

- [ ] Verify release created: `gh release view barqly-vault-dependencies-r2`
- [ ] Verify all 12 assets uploaded (11 binaries + checksums.txt)
- [ ] Test download: `gh release download barqly-vault-dependencies-r2 --pattern "age-*-darwin-arm64"`
- [ ] Document release URL for scripts

**Release URL**:
```
https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies-r2
```

**Asset URL Pattern**:
```
https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies-r2/{filename}
```

**Validation**:
- Release visible at GitHub releases page
- All assets downloadable
- Checksums.txt accessible
- URLs stable and persistent

---

### Milestone 2.3: Create Binary Dependencies Manifest

**File**: `src-tauri/binary-dependencies.json` (NEW, replaces checksums.json)

#### Tasks:
- [ ] Create `binary-dependencies.json` with complete platform mapping
- [ ] Document download URLs for each binary
- [ ] Include SHA256 checksums from GitHub Release
- [ ] Add version pinning and last updated timestamps
- [ ] Validate JSON syntax
- [ ] Document file purpose in comments

**File Structure**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$comment": "Binary dependencies for Barqly Vault - downloaded from GitHub Release during CI/CD build",
  "release_tag": "barqly-vault-dependencies-r2",
  "release_url": "https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies-r2",
  "last_updated": "2025-10-29T00:00:00Z",

  "dependencies": {
    "age": {
      "version": "1.2.0",
      "upstream": "https://github.com/FiloSottile/age",
      "platforms": {
        "darwin-arm64": {
          "filename": "age-1.2.0-darwin-arm64",
          "url": "https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies-r2/age-1.2.0-darwin-arm64",
          "sha256": "<calculated-checksum>",
          "size": 5500000
        },
        "darwin-x86_64": {
          "filename": "age-1.2.0-darwin-x86_64",
          "url": "https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies-r2/age-1.2.0-darwin-x86_64",
          "sha256": "<calculated-checksum>",
          "size": 5500000
        },
        "linux-x86_64": {
          "filename": "age-1.2.0-linux-x86_64",
          "url": "https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies-r2/age-1.2.0-linux-x86_64",
          "sha256": "<calculated-checksum>",
          "size": 5500000
        },
        "windows-x86_64": {
          "filename": "age-1.2.0-windows-x86_64.exe",
          "url": "https://github.com/Barqly/barqly-vault/releases/download/barqly-vault-dependencies-r2/age-1.2.0-windows-x86_64.exe",
          "sha256": "<calculated-checksum>",
          "size": 5500000
        }
      }
    },
    "age-plugin-yubikey": {
      "version": "0.5.0",
      "upstream": "https://github.com/str4d/age-plugin-yubikey",
      "platforms": {
        "darwin-arm64": { /* similar structure */ },
        "darwin-x86_64": { /* similar structure */ },
        "linux-x86_64": { /* similar structure */ },
        "windows-x86_64": { /* similar structure */ }
      }
    },
    "ykman": {
      "version": "5.8.0",
      "upstream": "https://github.com/Yubico/yubikey-manager",
      "build_method": "official-release",
      "platforms": {
        "darwin-universal": { /* macOS universal binary */ },
        "linux-x86_64": { /* similar structure */ },
        "windows-x86_64": { /* similar structure */ }
      }
    }
  }
}
```

**Validation**:
- JSON syntax valid
- All platforms mapped correctly
- URLs point to GitHub Release assets
- Checksums match release assets
- No "latest" versions (all pinned)

---

### Milestone 2.4: Create Binary Fetch Scripts

**Files**: `scripts/cicd/fetch-binaries.sh` and `scripts/cicd/fetch-binaries.ps1`

#### Tasks:

**Bash Script** (`scripts/cicd/fetch-binaries.sh`):
- [ ] Create script to download binaries based on platform
- [ ] Read `binary-dependencies.json` for URLs and checksums
- [ ] Detect current platform (OS + architecture)
- [ ] Download binaries using `gh release download` or `curl`
- [ ] Verify SHA256 checksums
- [ ] Set executable permissions (+x)
- [ ] Place in `src-tauri/bin/{platform}/` structure
- [ ] Handle errors gracefully (fail fast on mismatch)

**PowerShell Script** (`scripts/cicd/fetch-binaries.ps1`):
- [ ] Equivalent functionality for Windows CI runners
- [ ] Use PowerShell native HTTP client
- [ ] Verify checksums with Get-FileHash
- [ ] Same error handling as Bash version

**Script Template** (`fetch-binaries.sh`):
```bash
#!/bin/bash
set -euo pipefail

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="x86_64" ;;
  arm64|aarch64) ARCH="arm64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

PLATFORM="${OS}-${ARCH}"
echo "📦 Fetching binaries for platform: $PLATFORM"

# Read binary-dependencies.json
MANIFEST="src-tauri/binary-dependencies.json"
RELEASE_TAG=$(jq -r '.release_tag' "$MANIFEST")

# Create bin directory
BIN_DIR="src-tauri/bin"
mkdir -p "$BIN_DIR"

# Download each binary
for binary in age age-plugin-yubikey ykman; do
  echo "Downloading $binary..."

  # Get URL and checksum from manifest
  URL=$(jq -r ".dependencies.\"$binary\".platforms.\"$PLATFORM\".url" "$MANIFEST")
  EXPECTED_SHA=$(jq -r ".dependencies.\"$binary\".platforms.\"$PLATFORM\".sha256" "$MANIFEST")
  FILENAME=$(jq -r ".dependencies.\"$binary\".platforms.\"$PLATFORM\".filename" "$MANIFEST")

  # Download
  curl -L "$URL" -o "$BIN_DIR/$FILENAME"

  # Verify checksum
  ACTUAL_SHA=$(shasum -a 256 "$BIN_DIR/$FILENAME" | cut -d' ' -f1)
  if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
    echo "❌ Checksum mismatch for $binary"
    echo "  Expected: $EXPECTED_SHA"
    echo "  Actual:   $ACTUAL_SHA"
    exit 1
  fi

  # Set executable
  chmod +x "$BIN_DIR/$FILENAME"

  echo "✅ $binary verified and ready"
done

echo "🎉 All binaries downloaded and verified"
```

**Validation**:
- Scripts execute successfully
- Binaries download to correct locations
- Checksums verified
- Permissions set correctly
- Errors fail build (exit 1)

---

### Milestone 2.5: Update .gitignore for Binary Directory

**File**: `.gitignore`

#### Tasks:
- [ ] Add `src-tauri/bin/` to gitignore (keep binaries OUT of git)
- [ ] Add exception for binary-dependencies.json (track manifest)
- [ ] Verify no binaries tracked by git: `git status`
- [ ] Commit .gitignore changes

**Add to .gitignore**:
```gitignore
# Binary dependencies (downloaded from GitHub Release during build)
src-tauri/bin/*
!src-tauri/bin/.keep
!src-tauri/bin/README.md

# Keep manifest tracked
!src-tauri/binary-dependencies.json
```

**Validation**:
- Git ignores binary files
- `binary-dependencies.json` tracked
- No binary bloat in repo
- CI can populate bin/ directory

---

## Phase 3: Tauri Bundle Configuration (Day 4)

**Goal**: Configure Tauri to bundle binaries in application packages

### Milestone 3.1: Update tauri.conf.json

**File**: `src-tauri/tauri.conf.json`

#### Tasks:
- [ ] Read current configuration to understand structure
- [ ] Add `bundle.resources` array for platform-specific binaries
- [ ] Add `bundle.externalBin` array for all binaries
- [ ] Verify JSON syntax
- [ ] Document configuration in comments
- [ ] Run TypeScript type generation: `npm run type-check` in src-ui

**Configuration to Add**:
```json
{
  "bundle": {
    "identifier": "com.barqly.vault",
    "resources": [
      "bin/darwin/**",
      "bin/linux/**",
      "bin/windows/**"
    ],
    "externalBin": [
      "bin/darwin/age",
      "bin/darwin/age-plugin-yubikey",
      "bin/darwin/ykman",
      "bin/linux/age",
      "bin/linux/age-plugin-yubikey",
      "bin/linux/ykman",
      "bin/windows/age",
      "bin/windows/age-plugin-yubikey",
      "bin/windows/ykman"
    ]
  }
}
```

**Validation**:
- JSON syntax valid
- Tauri CLI accepts configuration
- Paths match actual binary locations
- No TypeScript type errors

---

### Milestone 3.2: Local Build Testing

**Goal**: Verify binaries bundled correctly in application packages

**Prerequisites**:
- Binaries must be fetched locally first: `./scripts/cicd/fetch-binaries.sh`
- Or manually download from GitHub Release to `src-tauri/bin/`

#### Tasks:

**Fetch Binaries Locally**:
- [ ] Run fetch script: `./scripts/cicd/fetch-binaries.sh`
- [ ] Verify binaries downloaded: `ls -la src-tauri/bin/darwin/`
- [ ] All 3 binaries present (age, age-plugin-yubikey, ykman)

**macOS Intel Build**:
- [ ] Run build: `cargo tauri build --target x86_64-apple-darwin`
- [ ] Locate DMG: `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg`
- [ ] Mount DMG and inspect: `open *.dmg`
- [ ] Navigate to `Barqly Vault.app/Contents/Resources/bin/darwin/`
- [ ] Verify all 3 binaries present in .app bundle
- [ ] Test app launches: Open from Applications folder
- [ ] Run quick test: Create key, verify YubiKey detection

**macOS ARM Build**:
- [ ] Run build: `cargo tauri build --target aarch64-apple-darwin`
- [ ] Locate DMG: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`
- [ ] Mount and inspect .app bundle
- [ ] Verify binaries present
- [ ] Test on ARM Mac if available

**Validation Checklist**:
```bash
# Extract and verify DMG contents
hdiutil attach Barqly-Vault-*.dmg
cd "/Volumes/Barqly Vault/"
ls -lah "Barqly Vault.app/Contents/Resources/bin/darwin/"

# Should show:
# age (executable)
# age-plugin-yubikey (executable)
# ykman (executable or wrapper)
```

**Success Criteria**:
- All 3 binaries present in bundled .app
- Binaries are executable (have +x permission)
- Application launches successfully
- No "binary not found" errors in logs
- YubiKey operations work

---

## Phase 4: Version Management (Day 5)

**Goal**: Establish version pinning documentation and processes

### Milestone 4.1: Create Version Documentation

**File**: `docs/architecture/dependency-versions.md`

#### Tasks:
- [ ] Create new documentation file
- [ ] Document current pinned versions with rationale
- [ ] Define version update process
- [ ] Add security update procedures
- [ ] Document testing requirements for version updates
- [ ] Link from main architecture docs

**Document Structure**:
```markdown
# Barqly Vault Dependency Versions

## Binary Dependencies (R2)

| Binary | Version | Platform | SHA256 | Last Updated | Source |
|--------|---------|----------|--------|--------------|--------|
| age | 1.2.0 | macOS | abc123... | 2025-10-29 | filippo.io |
| age | 1.2.0 | Linux | def456... | 2025-10-29 | filippo.io |
| age | 1.2.0 | Windows | ghi789... | 2025-10-29 | filippo.io |
| age-plugin-yubikey | 0.5.0 | macOS | ... | 2025-10-29 | GitHub |
| age-plugin-yubikey | 0.5.0 | Linux | ... | 2025-10-29 | GitHub |
| age-plugin-yubikey | 0.5.0 | Windows | ... | 2025-10-29 | GitHub |
| ykman | 5.8.0 | macOS | ... | 2025-10-29 | Built/Yubico |
| ykman | 5.8.0 | Linux | ... | 2025-10-29 | Built/Yubico |
| ykman | 5.8.0 | Windows | ... | 2025-10-29 | Built/Yubico |

## Version Update Process

1. **Monitor for Updates**: Check release pages quarterly
2. **Test Locally**: Download new version, test all workflows
3. **Update Checksums**: Run download scripts, regenerate checksums.json
4. **Test Integration**: Run full test suite with new binaries
5. **Update Documentation**: Update this file with new version
6. **Create PR**: Commit changes, request review
7. **CI Validation**: Ensure all platform builds succeed
8. **Beta Release**: Test in production-like environment

## Security Updates

Critical security updates bypass normal quarterly schedule:
1. Immediate notification via GitHub security advisories
2. Emergency testing within 24 hours
3. Expedited release process
4. User communication via release notes

## Known Compatibility Issues

- age < 1.2.0: Multi-recipient limitations
- age-plugin-yubikey < 0.5.0: Key discovery bugs
- ykman < 5.5.0: YubiKey 5 compatibility issues
```

**Validation**:
- Document complete and accurate
- Process clearly defined
- Security procedures documented
- Linked from architecture index

---

### Milestone 4.2: Add Binary Verification

**Goal**: Enforce version pinning in CI/CD pipeline

#### Tasks:

**CI Verification Script** (`scripts/cicd/verify-binaries.sh`):
- [ ] Create verification script
- [ ] Read checksums.json
- [ ] Calculate actual binary checksums
- [ ] Compare and fail on mismatch
- [ ] Output clear error messages

**Integration Points**:
- [ ] Add to `.github/workflows/release.yml` before Tauri build
- [ ] Add to `make validate` target
- [ ] Add to pre-commit hook (optional)

**Verification Script**:
```bash
#!/bin/bash
# scripts/cicd/verify-binaries.sh

set -e

echo "Verifying binary checksums..."

PLATFORM=$(uname -s | tr '[:upper:]' '[:lower:]')
CHECKSUMS_FILE="src-tauri/bin/checksums.json"

# Verify each binary
for binary in age age-plugin-yubikey ykman; do
  BINARY_PATH="src-tauri/bin/$PLATFORM/$binary"

  if [ ! -f "$BINARY_PATH" ]; then
    echo "ERROR: Binary not found: $BINARY_PATH"
    exit 1
  fi

  ACTUAL_SHA=$(shasum -a 256 "$BINARY_PATH" | cut -d' ' -f1)
  EXPECTED_SHA=$(jq -r ".$binary.checksums.$PLATFORM.sha256" "$CHECKSUMS_FILE")

  if [ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]; then
    echo "ERROR: Checksum mismatch for $binary"
    echo "  Expected: $EXPECTED_SHA"
    echo "  Actual:   $ACTUAL_SHA"
    exit 1
  fi

  echo "✓ $binary verified"
done

echo "All binaries verified successfully"
```

**Validation**:
- Script executes successfully
- Detects checksum mismatches
- Fails build on verification failure
- Clear error messages

---

## Phase 5: CI/CD Integration & Testing (Days 6-7)

**Goal**: End-to-end pipeline validation

### Milestone 5.1: Update Release Workflow

**File**: `.github/workflows/release.yml`

#### Tasks:
- [ ] Add binary fetch step before Tauri build (Line ~310)
- [ ] Add binary verification step after fetch
- [ ] Add caching for downloaded binaries
- [ ] Add comment documentation for binary bundling
- [ ] Test workflow syntax: `gh workflow view release.yml`
- [ ] Update workflow documentation

**Workflow Addition** (before Line 318 "Build with Tauri"):
```yaml
- name: Cache Binary Dependencies
  if: steps.should_build.outputs.build == 'true'
  uses: actions/cache@v4
  with:
    path: src-tauri/bin/
    key: binaries-${{ hashFiles('src-tauri/binary-dependencies.json') }}
    restore-keys: |
      binaries-

- name: Fetch Binary Dependencies
  if: steps.should_build.outputs.build == 'true'
  run: |
    chmod +x scripts/cicd/fetch-binaries.sh
    ./scripts/cicd/fetch-binaries.sh
  shell: bash

- name: Verify Binary Checksums
  if: steps.should_build.outputs.build == 'true'
  run: |
    # Verify all binaries present and checksums match
    for binary in age age-plugin-yubikey ykman; do
      if [ ! -f "src-tauri/bin/$binary" ]; then
        echo "ERROR: Binary not found: $binary"
        exit 1
      fi
    done
    echo "✓ All binaries present and verified"
  shell: bash

- name: Verify Binary Bundling Configuration
  if: steps.should_build.outputs.build == 'true'
  run: |
    # Verify tauri.conf.json has bundle.externalBin
    if ! grep -q '"externalBin"' src-tauri/tauri.conf.json; then
      echo "ERROR: tauri.conf.json missing bundle.externalBin configuration"
      exit 1
    fi
    echo "✓ Bundle configuration verified"
  shell: bash
```

**Validation**:
- Workflow syntax valid
- Steps execute in correct order
- Build fails if verification fails
- Clear logging output

---

### Milestone 5.2: Full Pipeline Validation (Test Tag)

**Goal**: Test complete pipeline without notarization costs

#### Tasks:
- [ ] Create test tag: `git tag v0.2.0-test.1 && git push origin v0.2.0-test.1`
- [ ] Monitor workflow: `gh run watch` OR GitHub Actions UI
- [ ] Wait for all 4 platform builds to complete (~25-30 minutes)
- [ ] Download all artifacts: `gh run download <run-id>`
- [ ] Extract each package and verify binary presence

**Platform Validation**:

**macOS Intel**:
```bash
# Download DMG artifact
hdiutil attach barqly-vault-0.2.0-test.1-macos-x86_64.dmg
ls -la "/Volumes/Barqly Vault/Barqly Vault.app/Contents/Resources/bin/darwin/"
# Verify: age, age-plugin-yubikey, ykman present
hdiutil detach "/Volumes/Barqly Vault"
```

**macOS ARM**:
```bash
# Same verification for ARM DMG
hdiutil attach barqly-vault-0.2.0-test.1-macos-arm64.dmg
ls -la "/Volumes/Barqly Vault/Barqly Vault.app/Contents/Resources/bin/darwin/"
hdiutil detach "/Volumes/Barqly Vault"
```

**Linux**:
```bash
# Extract AppImage
chmod +x barqly-vault-0.2.0-test.1-amd64.AppImage
./barqly-vault-0.2.0-test.1-amd64.AppImage --appimage-extract
ls -la squashfs-root/usr/bin/  # Or wherever Tauri places binaries
# Verify: age, age-plugin-yubikey, ykman present
```

**Windows**:
```bash
# Extract MSI (on Windows or with msiextract)
msiextract barqly-vault-0.2.0-test.1-x64.msi
ls -la extracted/Program\ Files/Barqly\ Vault/bin/windows/
# Verify: age.exe, age-plugin-yubikey.exe, ykman.exe present
```

**Success Criteria**:
- All 4 platforms build successfully
- Build time < 35 minutes
- All binaries present in each package
- No notarization attempted (macOS builds)
- Artifacts downloadable and extractable

**Cleanup**:
```bash
gh release delete v0.2.0-test.1 --yes
git tag -d v0.2.0-test.1
git push --delete origin v0.2.0-test.1
```

---

### Milestone 5.3: Beta Release Testing (Full Pipeline)

**Goal**: Validate complete release with DMG notarization

#### Tasks:
- [ ] Ensure Apple Developer secrets configured in GitHub
- [ ] Create beta tag: `git tag v0.2.0-beta.1 && git push origin v0.2.0-beta.1`
- [ ] Monitor workflow: `gh run watch`
- [ ] Wait for builds + notarization to complete (~35-40 minutes)
- [ ] Download all artifacts
- [ ] Verify DMG notarization: `spctl -a -vvv -t install Barqly-Vault-*.dmg`
- [ ] Test on actual devices (macOS, Linux, Windows if available)

**Device Testing Checklist**:

**macOS (Priority)**:
- [ ] Install from DMG
- [ ] Launch application
- [ ] Verify no Gatekeeper warnings
- [ ] Create passphrase key
- [ ] Plug in YubiKey
- [ ] Verify YubiKey detected (`ykman list` works)
- [ ] Initialize YubiKey (if available)
- [ ] Create YubiKey recipient
- [ ] Encrypt files with passphrase
- [ ] Encrypt files with YubiKey
- [ ] Decrypt files
- [ ] Test recovery mode (delete manifest, restore)
- [ ] Verify no binary path errors in logs

**Linux (Secondary)**:
- [ ] Install AppImage or DEB
- [ ] Launch application
- [ ] Test key creation and YubiKey operations
- [ ] Verify binary paths resolve correctly

**Windows (Tertiary, if available)**:
- [ ] Install from MSI
- [ ] Launch application
- [ ] Basic smoke test

**Success Criteria**:
- DMG notarization succeeds
- Application launches on all platforms
- YubiKey operations work end-to-end
- No "binary not found" errors
- Performance acceptable
- User workflows functional

---

### Milestone 5.4: Update Documentation

**Goal**: Document the binary integration for future reference

#### Tasks:

**Update Release Process** (`docs/architecture/cicd/release-process.md`):
- [ ] Add section on binary verification
- [ ] Document test tag usage
- [ ] Update troubleshooting guide

**Update Binary README** (`src-tauri/bin/README.md`):
- [ ] Update with actual versions used
- [ ] Document binary bundling configuration
- [ ] Add troubleshooting section

**Create Troubleshooting Guide** (new section in docs):
- [ ] "Binary not found" errors
- [ ] YubiKey detection failures
- [ ] Path resolution issues
- [ ] Version mismatch errors

**Example Troubleshooting Entry**:
```markdown
## Binary Not Found Errors

**Symptom**: Application fails with "age binary not found" or similar error.

**Causes**:
1. Tauri bundle configuration missing
2. Binary not committed to repository
3. Platform detection incorrect
4. File permissions wrong

**Resolution**:
1. Verify `tauri.conf.json` has `bundle.resources` configuration
2. Check binary exists: `ls src-tauri/bin/{platform}/age`
3. Verify binary bundled: Extract package and inspect
4. Check execution permissions: `chmod +x src-tauri/bin/{platform}/*`
5. Review path resolution code: `core.rs` lines 48-97
```

**Validation**:
- All documentation updated
- Cross-references correct
- Examples accurate
- Linked from main docs

---

## Critical Blockers & Resolution

### BLOCKER 1: Tauri Bundle Configuration Missing
**Status**: Resolved in Phase 3
**Solution**: Add `bundle.resources` and `bundle.externalBin` to `tauri.conf.json`

### BLOCKER 2: No Linux/Windows Binaries
**Status**: Resolved in Phase 2
**Solution**: Download/build and commit binaries for all platforms

### BLOCKER 3: No Test Tag Support
**Status**: Resolved in Phase 1
**Solution**: Add test tag pattern to CI workflow, skip notarization conditionally

### GAP 1: Incomplete Version Pinning
**Status**: Resolved in Phase 2 & 4
**Solution**: Complete checksums.json, create version documentation

### GAP 2: No Binary Verification
**Status**: Resolved in Phase 4
**Solution**: Add checksum verification to CI pipeline

---

## File Changes Summary

### Modified Files:
- `.github/workflows/release.yml` - Add test tag, binary fetch/cache/verification steps
- `src-tauri/tauri.conf.json` - Add bundle.externalBin configuration
- `.gitignore` - Ignore `src-tauri/bin/` directory (binaries NOT committed)

### New Files (Committed to Git):
- `src-tauri/binary-dependencies.json` - Manifest with URLs, checksums, versions
- `scripts/cicd/fetch-binaries.sh` - Download binaries from GitHub Release
- `scripts/cicd/fetch-binaries.ps1` - Windows version of fetch script
- `docs/architecture/dependency-versions.md` - Version documentation
- `docs/engineering/R2/r2-binary-dependency-integration-plan.md` - This plan

### New Files (GitHub Release Only - NOT in Git):
**Release**: `barqly-vault-dependencies-r2`
- `age-1.2.0-darwin-arm64` (5.5 MB)
- `age-1.2.0-darwin-x86_64` (5.5 MB)
- `age-1.2.0-linux-x86_64` (5.5 MB)
- `age-1.2.0-windows-x86_64.exe` (5.5 MB)
- `age-plugin-yubikey-0.5.0-darwin-arm64` (4.2 MB)
- `age-plugin-yubikey-0.5.0-darwin-x86_64` (4.2 MB)
- `age-plugin-yubikey-0.5.0-linux-x86_64` (4.2 MB)
- `age-plugin-yubikey-0.5.0-windows-x86_64.exe` (4.2 MB)
- `ykman-5.8.0-darwin-universal` (5.2 MB)
- `ykman-5.8.0-linux-x86_64` (5.2 MB)
- `ykman-5.8.0-windows-x86_64.exe` (5.2 MB)
- `checksums.txt` (SHA256 for all binaries)

### Documentation Updates:
- `docs/architecture/cicd/release-process.md` - Add test tag usage, GitHub Releases workflow
- `src-tauri/bin/README.md` - Update with GitHub Releases approach
- `docs/troubleshooting/` - New section for binary download/verification issues

### Deleted Files:
- `src-tauri/bin/checksums.json` - Replaced by `binary-dependencies.json`
- `src-tauri/bin/darwin/*` - Removed from git (now fetched from GitHub Release)

---

## Success Criteria

- [ ] GitHub Release `barqly-vault-dependencies-r2` created with all 12 assets
- [ ] All 3 binaries (age, age-plugin-yubikey, ykman) present in all platform packages
- [ ] Test tags work without Apple notarization
- [ ] Version pinning enforced via `binary-dependencies.json`
- [ ] CI/CD fetches binaries from GitHub Release successfully
- [ ] Binary caching works (no re-download if checksums unchanged)
- [ ] Checksum verification prevents corrupted binaries
- [ ] macOS application notarized and launches successfully
- [ ] Linux application runs from AppImage/DEB
- [ ] Windows application installs and runs
- [ ] YubiKey operations work end-to-end on actual devices
- [ ] No "binary not found" errors in production
- [ ] Documentation complete and accurate
- [ ] User download page (barqly.com/downloads/) remains clean (no dependency releases shown)

---

## Timeline

| Day | Phase | Activities |
|-----|-------|------------|
| 1 | Phase 1 | Test tag infrastructure, validate workflow |
| 2-4 | Phase 2 | Download binaries, create GitHub Release, create manifest, create fetch scripts |
| 5 | Phase 3 | Update Tauri config, local build testing (macOS) |
| 6 | Phase 4 | Create version docs, add verification logic |
| 7-8 | Phase 5 | CI/CD integration, test tag validation, beta release testing, documentation |

**Total Duration**: 8 days (one developer, full-time)

**Why 8 days vs 7?** GitHub Releases approach adds complexity:
- Day 2: Download all platform binaries
- Day 3: Create GitHub Release, upload assets, verify
- Day 4: Create fetch scripts, test locally

Trade-off: +1 day implementation for long-term benefits (clean git history, professional workflow, easier updates)

---

## Rollback Plan

If critical issues discovered during testing:

1. **Immediate**: Tag production release from last known good commit
2. **Revert Changes**:
   - Delete GitHub Release: `gh release delete barqly-vault-dependencies-r2 --yes`
   - Revert `tauri.conf.json` changes
   - Revert workflow changes
   - Revert `.gitignore` changes
   - Remove fetch scripts
   - Remove `binary-dependencies.json`
3. **Analysis**: Identify root cause in non-production environment
4. **Fix Forward**: Create patch, test thoroughly, re-release
5. **Communication**: Update users via GitHub release notes

---

## Notes

### Advantages of GitHub Releases Approach:
- ✅ **Clean Git History**: No 45 MB binary bloat in repository
- ✅ **Professional Standard**: Industry best practice for Tauri/Electron apps
- ✅ **Scalable**: Add platforms without repo growth
- ✅ **CDN-Backed**: Fast downloads worldwide via GitHub CDN
- ✅ **Versioned**: Can maintain multiple dependency versions simultaneously
- ✅ **Supply Chain Transparency**: Clear provenance and versioning
- ✅ **CI Caching**: GitHub Actions caches by SHA256 (fast builds)

### Key Metrics:
- Test tags save ~$10-20 per test in Apple notarization costs
- Binary download time: ~10 seconds for all dependencies (cached: < 1 second)
- Version pinning prevents surprise breakages from upstream updates
- CI verification catches binary corruption/tampering
- Full implementation provides foundation for R3+ dependency management

### User Experience:
- `barqly.com/downloads/` remains clean (dependency releases filtered out)
- GitHub releases page shows all releases (technical transparency)
- Release filtering happens in `generate-downloads.py` script

---

**Created**: 2025-10-29
**Last Updated**: 2025-10-29
**Status**: Ready for Implementation
