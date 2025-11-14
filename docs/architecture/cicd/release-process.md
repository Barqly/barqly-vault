# Barqly Vault Release Process

**Created**: 2025-09-02
**Updated**: 2025-11-11 (R2 release: Added manual steps, troubleshooting, incremental releases)
**Status**: Active Process Documentation
**Author**: Release Engineering

## Version Strategy (Critical for Caching!)

**Version field** (in Cargo.toml and tauri.conf.json) represents the **release line**, not individual builds.

### Version Field Locations (Keep Stable)

```toml
# Cargo.toml (workspace root)
[workspace.package]
version = "0.2.0"  # Set once per release cycle

# src-tauri/Cargo.toml
version = "0.2.0"  # Same as workspace

# src-tauri/tauri.conf.json
"version": "0.2.0"  # Same as workspace
```

### Tag Strategy (Identifies Variants)

```bash
# All these use version = "0.2.0" in source files:
v0.2.0-alpha.1   # Development checkpoint - no dmg attestation
v0.2.0-alpha.2   # Development checkpoint
v0.2.0-test.1    # CI/CD testing - no dmg attestation
v0.2.0-beta.1    # User testing - apple dmg attestation
v0.2.0-beta.2    # Bug fixes
v0.2.0           # Production release

# Only update version when moving to 0.3.0:
v0.3.0-alpha.1   # Now version = "0.3.0" in files
```

### Why This Matters for Caching

**Stable version (0.2.0):**
- ✅ Cargo.lock stays consistent
- ✅ Cache hits on dependencies (686 crates)
- ✅ Builds: 3-5 minutes (cached)
- ✅ All v0.2.x builds share cache

**Changing version (0.2.0 → 0.2.1):**
- ❌ Cargo re-locks dependencies
- ❌ Cache invalidated
- ❌ Builds: 15-20 minutes (full download + compile)

**Best Practice:**
- Set version **once** at start of release cycle
- Use **tags** for all variants
- Update version **only** for next major/minor release

---

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
gh release create barqly-vault-dependencies \
  age-* age-plugin-yubikey-* ykman-* checksums.txt \
  --title "Barqly Vault Binary Dependencies" \
  --notes "Binary dependencies for Barqly Vault.

**Versions:**
- age: v1.2.1
- age-plugin-yubikey: v0.5.0
- ykman: v5.8.0

**Platforms:** macOS (Intel + ARM), Linux (x86_64), Windows (x86_64)

**Verification:** See checksums.txt for SHA256 hashes.

**Note:** This release is for CI/CD use only." \
  --prerelease
```

**Result**: Release `barqly-vault-dependencies` exists with all binaries. This is used by **every** app release going forward. Updated only when dependency versions change.

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
4. Fetches asset sizes and checksums from GitHub API automatically
5. Commits and pushes documentation changes to main branch
6. Triggers automatic documentation deployment

### Phase 5.5: Manual Steps Required (Human)

**Critical:** These steps MUST be done by a human, cannot be automated.

**Before Promotion - Edit Beta Release Notes:**
1. Navigate to: https://github.com/Barqly/barqly-vault/releases
2. Find `v0.3.0-beta.1` draft release
3. Click "Edit"
4. Copy content from `tbd/r3/RELEASE_NOTES_0.3.0.md` (prepare in advance)
5. Paste into release description
6. Add beta-specific notes if needed
7. Save as draft (or publish for beta testing)

**After Promotion - Edit Production Release Notes:**
1. Promotion creates `v0.3.0` draft automatically
2. Find `v0.3.0` draft on releases page
3. Verify release notes (usually copied from beta)
4. Remove any "(Beta)" references
5. Verify release date is correct
6. Save as draft (publish-prod command will publish it)

**Why Manual:**
- Release notes require human judgment and context
- Security notices need careful wording
- Breaking changes need clear explanation
- `generate-release-notes.sh` intentionally removed (was just placeholder)

## Post-Release Cleanup

Recommended cleanup after successful production release:

### Clean Up Test Releases
```bash
# List all test releases
gh release list | grep test

# Delete old test releases (used for CI/CD debugging)
gh release delete v0.2.0-test.1 --yes
gh release delete v0.2.0-test.2 --yes

# Delete associated tags
git push --delete origin v0.2.0-test.1
git push --delete origin v0.2.0-test.2
```

### Clean Up Beta Releases (Optional)
```bash
# Strategy: Keep latest beta for reference, delete earlier iterations

# If you promoted beta.2 to production:
# - Keep v0.3.0-beta.2 (shows what went to production)
# - Delete v0.3.0-beta.1 (superseded)

gh release delete v0.3.0-beta.1 --yes
git push --delete origin v0.3.0-beta.1
```

**Note:** Some teams keep all betas for historical reference. Your choice.

### Archive Working Documents
```bash
# Archive release working documents
mkdir -p tbd/archive/
mv tbd/r3 tbd/archive/r3-release-$(date +%Y%m%d)

git add tbd/
git commit -m "chore: archive R3 release documentation"
git push origin main
```

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

## Incremental Releases (Patch Versions)

### When to Use Patch Releases

**Patch versions (0.2.0 → 0.2.1 → 0.2.2):**
- Bug fixes only (no new features)
- Security patches
- Minor improvements
- No breaking changes

**Examples from R2:**
- Fix Windows-specific UI issue
- Update bundled binary with security fix
- Improve error message clarity
- Fix Intel Mac compatibility issue

### Process for Incremental Release

**⚠️ Important:** Changing version field **invalidates Cargo cache**

**Impact:**
- First build: ~15-20 minutes (cache invalidated)
- Subsequent builds: ~3-5 minutes (cache restored)

**Complete Process:**

**Step 1: Update Version**
```bash
# Update in all 3 files:
# Cargo.toml, src-tauri/Cargo.toml, src-tauri/tauri.conf.json
version = "0.2.1"

git add Cargo.toml src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.2.1"
git push origin main
```

**Step 2: Follow Beta → Production Flow**
```bash
# Create beta (expect 15-20 min due to cache invalidation)
git tag v0.2.1-beta.1
git push origin v0.2.1-beta.1

# Wait for build
gh run watch

# Test artifacts

# Edit beta release notes

# Promote when ready
make promote-beta FROM=0.2.1-beta.1 TO=0.2.1

# Edit production release notes

# Publish
make publish-prod VERSION=0.2.1
```

**Subsequent patches (0.2.1 → 0.2.2):**
- Same process
- First build slow (cache invalidated)
- All 0.2.x builds can't share cache (different version in Cargo.lock)

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

## Troubleshooting Common Issues

### Architecture Mismatch (Intel Mac)

**Symptom:** "Bad CPU type in executable" errors on Intel Macs

**Cause:** Binary dependencies are ARM64 instead of x86_64

**Diagnosis:**
```bash
# On affected Intel Mac:
file /Applications/Barqly\ Vault.app/Contents/Resources/bin/darwin/age
# Should show: x86_64
# If shows: arm64 ← WRONG
```

**Fix:**
- Verify `TARGET_ARCH` environment variable in workflow
- Check architecture verification step catches mismatch
- Rebuild if binaries wrong architecture

### Notarization Failure

**Symptom:** Build succeeds but "Status = Invalid" from Apple

**Diagnosis:**
```bash
# Check notarization logs in CI output
gh run view <run-id> --log | grep "Status = Invalid" -A50

# Look for specific file paths in "issues" array
# Common: Python.framework/Python, _cffi_backend.so
```

**Common Causes:**
1. **Unsigned files in ykman-bundle** - All 60+ Mach-O files must be signed
2. **Python.framework symlinks broken** - Tauri bug #13219 dereferences symlinks
3. **ykman missing entitlements** - PyInstaller needs specific entitlements

**Fix:**
- Verify symlink restoration step ran
- Check all files signed (build logs show "Signed X files")
- Verify entitlements present: `codesign -d --entitlements - ykman`

### ykman Silent Hang (Intel Mac, macOS 15.6)

**Symptom:** ykman commands hang, no error in app logs

**Diagnosis:**
```bash
# On Intel Mac, check Console.app for:
# "Library Validation failed... mapped file has no cdhash"
```

**Cause:** macOS 15.6 Library Validation blocks PyInstaller temp files

**Fix:** Verify ykman signed with entitlements:
```bash
codesign -d --entitlements - ykman-bundle/ykman
# Must show:
# - com.apple.security.cs.allow-unsigned-executable-memory
# - com.apple.security.cs.disable-library-validation
```

**Note:** macOS 15.7+ is more lenient, issue specific to 15.6

### Binary Download Checksum Mismatch

**Symptom:** fetch-binaries.sh fails with checksum mismatch

**Cause:** Old binaries cached, new checksums in binary-dependencies.json

**Fix:**
```bash
# Clear GitHub Actions cache
gh api repos/Barqly/barqly-vault/actions/caches \
  --jq '.actions_caches[] | select(.key | startswith("binaries-")) | .id' | \
  while read cache_id; do
    gh api -X DELETE repos/Barqly/barqly-vault/actions/caches/$cache_id
  done

# Or: workflow will fail fast and retry with fresh download
```

### Emergency Procedures

**Rollback Production Release:**
```bash
# If critical bug found after publishing
# Option A: Unpublish, fix, republish
gh release edit v0.3.0 --draft=true
# Fix issues, create new beta, test thoroughly, republish

# Option B: Emergency patch release
# Jump directly to v0.3.1 with fix
# Document issue in release notes
```

**Manual Notarization (If CI Repeatedly Fails):**
```bash
# As last resort, notarize locally:
# 1. Download .app from CI artifacts
# 2. Sign locally with proper tools
# 3. Submit to Apple manually
# 4. Staple ticket
# 5. Create DMG
# 6. Upload to release

# Note: Rarely needed, CI should handle this
```

## Security & Compliance Notes

- **Branch Protection**: Main branch requires PR reviews and status checks
- **Manual Gates**: Production publication requires human approval
- **Code Signing**: All macOS builds are notarized via Apple Developer Program
- **Checksums**: SHA256 verification for all release artifacts
- **Documentation**: Automatic updates maintain consistency across all platforms
- **Entitlements**: PyInstaller binaries include required macOS entitlements
- **Architecture Verification**: Automated checks prevent platform mismatches

---

*This process balances automation efficiency with security compliance, ensuring reliable releases while maintaining development velocity.*