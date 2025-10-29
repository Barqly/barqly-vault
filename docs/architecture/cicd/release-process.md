# Barqly Vault Release Process

**Created**: 2025-09-02
**Updated**: 2025-10-29 (Added binary dependency management)
**Status**: Active Process Documentation
**Author**: Release Engineering

## Binary Dependency Setup (One-Time per Version Update)

Barqly Vault bundles external binaries (age, age-plugin-yubikey, ykman). These are created **once** and reused across all app releases.

### When to Create Dependency Release

- **Initial R2 setup**: First time bundling binaries
- **Version updates**: When updating age/age-plugin/ykman versions (every 3-6 months)
- **Platform additions**: When adding new platforms

### Step-by-Step Process

```bash
# 1. Download age and age-plugin-yubikey for all platforms (2 minutes)
./scripts/cicd/download-all-binaries.sh

# 2. Build ykman for all platforms using CI (8-10 minutes)
gh workflow run build-ykman-bundles.yml -f version=5.8.0
gh run watch  # Monitor build

# 3. Download ykman artifacts from CI
gh run list --workflow=build-ykman-bundles.yml --limit 1  # Get run ID
gh run download <run-id> --dir dist/binaries
mv dist/binaries/*/*.tar.gz dist/binaries/  # Flatten structure

# 4. Verify all binaries present (should have 9 files + checksums.txt)
ls -lh dist/binaries/
# Expected: 4 age, 4 age-plugin-yubikey, 3 ykman (one per platform)

# 5. Create GitHub Release with all binaries
cd dist/binaries
gh release create barqly-vault-dependencies-r2 \
  age-* age-plugin-yubikey-* ykman-* checksums.txt \
  --title "Barqly Vault Binary Dependencies R2" \
  --notes "Binary dependencies for R2 release.

**Versions:**
- age: v1.2.1
- age-plugin-yubikey: v0.5.0
- ykman: v5.8.0

**Platforms:** macOS (Intel + ARM), Linux (x86_64), Windows (x86_64)

**Verification:** See checksums.txt for SHA256 hashes.

**Note:** This release is for CI/CD use only." \
  --prerelease
```

**Result**: Release `barqly-vault-dependencies-r2` exists with all binaries. This is used by **every** app release going forward.

---

## Release Naming Convention

Barqly Vault follows semantic versioning with specific pre-release suffixes:

### Alpha Tags (Checkpoints Only)
- **Format**: `v{MAJOR}.{MINOR}.{PATCH}-alpha.{INCREMENT}`
- **Examples**: `v0.1.0-alpha.1`, `v0.1.0-alpha.2`, `v0.2.0-alpha.1`
- **Purpose**: Development checkpoints and milestones
- **Triggers**: No builds, no CI/CD pipeline execution
- **Use Case**: Internal testing, feature completion markers, commit snapshots
- **Cost**: $0 (no automation)

### Test Tags (CI/CD Validation Without Notarization)
- **Format**: `v{MAJOR}.{MINOR}.{PATCH}-test.{INCREMENT}`
- **Examples**: `v0.2.0-test.1`, `v0.2.0-test.2`
- **Purpose**: Validate CI/CD pipeline and binary bundling without expensive notarization
- **Triggers**: Full cross-platform builds (macOS, Windows, Linux)
- **Skips**: macOS DMG notarization (saves $10-20 per build)
- **Use Case**: Testing binary integration, CI/CD changes, platform-specific issues
- **Cost**: ~20-25 minutes build time (no notarization overhead)
- **Cleanup**: Delete after testing (`gh release delete v0.2.0-test.1 --yes`)

### Beta Tags (Full Build + Certification)
- **Format**: `v{MAJOR}.{MINOR}.{PATCH}-beta.{INCREMENT}`
- **Examples**: `v0.1.0-beta.1`, `v0.1.0-beta.2`, `v0.2.0-beta.1`
- **Purpose**: Testing-ready releases with full platform builds
- **Triggers**: Complete CI/CD pipeline including macOS DMG notarization
- **Use Case**: User testing, QA validation, pre-production verification
- **Cost**: ~30-35 minutes build time (includes notarization)

### Production Tags
- **Format**: `v{MAJOR}.{MINOR}.{PATCH}`
- **Examples**: `v0.1.0`, `v0.2.0`, `v0.2.5`
- **Purpose**: Public releases for end users
- **Triggers**: Manual promotion from beta releases
- **Use Case**: Official releases, public distribution
- **Cost**: $0 (reuses beta artifacts)

## Standard Release Process (Method 1: Beta → Production Promotion)

This is the primary release workflow used for Barqly Vault:

### Phase 1: Development Checkpoints (Alpha Tags)
```bash
# Create development checkpoints as needed
git tag v0.3.0-alpha.1
git push origin v0.3.0-alpha.1

# Continue development...
git tag v0.3.0-alpha.2
git push origin v0.3.0-alpha.2
```

**What happens**: Nothing automated - these are purely organizational markers.

### Phase 2: Beta Release (Full Build)
```bash
# Create beta when ready for testing
git tag v0.3.0-beta.1
git push origin v0.3.0-beta.1
```

**What happens automatically**:
1. GitHub Actions `release.yml` workflow triggers
2. Full cross-platform builds (macOS, Windows, Linux)
3. macOS DMG notarization and code signing
4. Creates beta draft release with all artifacts
5. Auto-creates corresponding production draft release (`v0.3.0`)

### Phase 3: Beta Testing & Iteration
```bash
# If issues found, create new beta
git tag v0.3.0-beta.2
git push origin v0.3.0-beta.2

# Repeat until beta is stable
```

### Phase 4: Production Promotion
```bash
# Promote stable beta to production
make promote-beta FROM=0.3.0-beta.2 TO=0.3.0
# OR: ./scripts/cicd/promote-beta.sh --from 0.3.0-beta.2 --to 0.3.0
```

**What happens**:
1. Downloads all artifacts from beta release
2. Renames files to remove "-beta" suffix (standardized naming)
3. Creates/updates production tag (`v0.3.0`)
4. Creates production draft release with renamed artifacts

### Phase 5: Publication (Manual Security Compliance)
```bash
# Publish production release and update documentation
make publish-prod VERSION=0.3.0
# OR: ./scripts/cicd/publish-production.sh 0.3.0
```

**What happens**:
1. Converts GitHub draft release to published release
2. Updates download documentation (`public-docs/downloads/index.html`)
3. Updates version data (`scripts/cicd/downloads/data.json`)
4. Commits and pushes documentation changes to main branch
5. Triggers automatic documentation deployment

## Why This Process Design

### Alpha Tags
- **No CI overhead**: Pure checkpoints without expensive builds
- **Flexible iteration**: Same base version for multiple development cycles
- **Clear milestones**: Track feature completion and development phases

### Beta Tags  
- **Full validation**: Complete build and certification process
- **Real testing**: Actual artifacts users will download
- **Early feedback**: Issues caught before production

### Manual Publication
- **Security compliance**: Maintains branch protection on main
- **No GitHub exceptions**: Avoids complex bot permissions
- **Controlled releases**: Manual gate for production deployment
- **Low frequency**: ~1 production release per week makes manual feasible

## File Standardization During Promotion

The promotion process renames all downloadable files to match our standard naming convention:

### Beta Files (Generated)
```
barqly-vault-0.3.0-beta.2-macos-arm64.dmg
barqly-vault-0.3.0-beta.2-macos-x86_64.dmg
barqly-vault-0.3.0-beta.2-x64.msi
barqly-vault-0.3.0-beta.2-windows-x64.zip
barqly-vault-0.3.0-beta.2-1_amd64.deb
barqly-vault-0.3.0-beta.2-1.x86_64.rpm
barqly-vault-0.3.0-beta.2-1_amd64.AppImage
barqly-vault-0.3.0-beta.2-x86_64.tar.gz
```

### Production Files (After Promotion)
```
barqly-vault-0.3.0-macos-arm64.dmg
barqly-vault-0.3.0-macos-x86_64.dmg
barqly-vault-0.3.0-x64.msi
barqly-vault-0.3.0-windows-x64.zip
barqly-vault-0.3.0-1_amd64.deb
barqly-vault-0.3.0-1.x86_64.rpm
barqly-vault-0.3.0-1_amd64.AppImage
barqly-vault-0.3.0-x86_64.tar.gz
checksums.txt (regenerated)
```

## Documentation Updates

The `make publish-prod` command automatically updates:

1. **`public-docs/downloads/index.html`** - Main download page with new version
2. **`public-docs/downloads.md`** - Markdown version for GitHub
3. **`scripts/cicd/downloads/data.json`** - Version data source
4. **Version history** - Adds new release to historical listing

## Quick Reference Commands

```bash
# Development checkpoint (no build)
git tag v0.3.0-alpha.1 && git push origin v0.3.0-alpha.1

# Test build (full build, skip notarization, saves costs)
git tag v0.3.0-test.1 && git push origin v0.3.0-test.1
gh run watch  # Monitor build
gh release delete v0.3.0-test.1 --yes  # Cleanup after testing
git push --delete origin v0.3.0-test.1

# Beta build (full build with notarization)
git tag v0.3.0-beta.1 && git push origin v0.3.0-beta.1

# List available betas for promotion
./scripts/cicd/promote-beta.sh --list

# Promote beta to production
make promote-beta FROM=0.3.0-beta.2 TO=0.3.0

# Publish production release
make publish-prod VERSION=0.3.0

# Check release status
gh release list --limit 10
```

## Security & Compliance Notes

- **Branch Protection**: Main branch requires PR reviews and status checks
- **Manual Gates**: Production publication requires human approval
- **Code Signing**: All macOS builds are notarized via Apple Developer Program
- **Checksums**: SHA256 verification for all release artifacts
- **Documentation**: Automatic updates maintain consistency across all platforms

---

*This process balances automation efficiency with security compliance, ensuring reliable releases while maintaining development velocity.*