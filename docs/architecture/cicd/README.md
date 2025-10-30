# CI/CD Master Reference

**Quick Navigation** for all release and binary management processes.

---

## 📋 Common Release Tasks

### App Release (Most Common)

```bash
# Test build (skips notarization, saves $)
git tag v0.2.0-test.1 && git push origin v0.2.0-test.1

# Beta build (full notarization)
git tag v0.2.0-beta.1 && git push origin v0.2.0-beta.1

# Promote to production
make promote-beta FROM=0.2.0-beta.1 TO=0.2.0

# Publish production
make publish-prod VERSION=0.2.0
```

**Full details:** [release-process.md](./release-process.md)

---

### Binary Dependency Update (Rare - Every 3-6 Months)

```bash
# 1. Download age/age-plugin binaries
./scripts/cicd/download-all-binaries.sh

# 2. Build ykman for all platforms
gh workflow run build-ykman-bundles.yml -f version=5.8.0
gh run watch

# 3. Download and organize
gh run download <run-id> --dir dist/ykman-temp
mv dist/ykman-temp/*/*.tar.gz dist/binaries/

# 4. Update GitHub Release
cd dist/binaries
gh release delete barqly-vault-dependencies --yes  # If updating
gh release create barqly-vault-dependencies \
  age-* age-plugin-yubikey-* ykman-* checksums.txt \
  --title "Barqly Vault Binary Dependencies" \
  --prerelease

# 5. Update binary-dependencies.json with new versions/checksums
```

**Full details:** [release-process.md#binary-dependency-setup](./release-process.md#binary-dependency-setup-one-time-per-version-update)

---

## 📚 Documentation Index

### Core Documents

| Document | Purpose | When to Read |
|----------|---------|--------------|
| **[release-process.md](./release-process.md)** | Complete release workflow | Before every release |
| **[cicd-pipeline-architecture.md](./cicd-pipeline-architecture.md)** | Pipeline design and architecture | Understanding system design |
| **[cicd-implementation-guide.md](./cicd-implementation-guide.md)** | Implementation details | Modifying CI/CD |

### Binary Management

| Document | Purpose |
|----------|---------|
| **[src-tauri/bin/README.md](../../../src-tauri/bin/README.md)** | Binary architecture and GitHub Releases |
| **[dependency-versions.md](../dependency-versions.md)** | ⭐ **Current versions, SHA256 checksums, update process** |
| **[R2 Implementation Plan](../../engineering/R2/r2-binary-dependency-integration-plan.md)** | Complete R2 binary integration |

---

## 🏗️ System Architecture

### Release Types

```
Alpha Tags    → Checkpoints only (no builds)
  ↓
Test Tags     → Full build, no notarization (testing)
  ↓
Beta Tags     → Full build + notarization (user testing)
  ↓
Production    → Promoted from beta (manual gate)
```

### Binary Flow

```
GitHub Release: barqly-vault-dependencies
  ↓
fetch-binaries.sh (downloads to src-tauri/bin/)
  ↓
Tauri bundles into app packages
  ↓
DMG/MSI/AppImage with embedded binaries
```

---

## 🔧 Key Scripts

| Script | Purpose | Location |
|--------|---------|----------|
| `download-all-binaries.sh` | Download age/age-plugin for all platforms | `scripts/cicd/` |
| `build-ykman-bundles.yml` | Build ykman for macOS/Linux/Windows | `.github/workflows/` |
| `fetch-binaries.sh` | Fetch binaries from GitHub Release | `scripts/cicd/` (Phase 2.7) |
| `promote-beta.sh` | Promote beta → production | `scripts/cicd/` |
| `publish-production.sh` | Publish release + update docs | `scripts/cicd/` |

---

## 📦 Current Versions

**Binary Dependencies:**
- age: v1.2.1
- age-plugin-yubikey: v0.5.0
- ykman: v5.8.0

**Release:** [barqly-vault-dependencies](https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies)

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on test tag | Check `.github/workflows/release.yml` logs |
| Binary not found in app | Verify `fetch-binaries.sh` ran in CI |
| Notarization fails | Check Apple Developer secrets in GitHub |
| ykman build fails | Check platform dependencies in `build-ykman-bundles.yml` |
| Checksums mismatch | Regenerate: `shasum -a 256 * > checksums.txt` |

---

## 📝 Release Frequency

- **Alpha tags**: As needed (daily during development)
- **Test tags**: Before each beta (1-2 per release)
- **Beta tags**: 1-3 per release cycle
- **Production**: ~1 per week
- **Binary updates**: Every 3-6 months

---

**Last Updated:** 2025-10-29 (R2 Release)
**Questions?** See [release-process.md](./release-process.md) for complete details.
