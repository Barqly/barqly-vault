# Local Development Binary Setup

**Purpose:** Set up unsigned binaries for local development environment
**When:** Fresh dev environment setup or after pulling binary changes
**Time:** 3-5 minutes

---

## Quick Setup (For New Developers)

```bash
# 1. Download age and age-plugin-yubikey from upstream
./scripts/cicd/download-all-binaries.sh

# 2. Build ykman locally with PyInstaller
./scripts/yubikey/build-ykman.sh 5.8.0

# 3. Verify binaries in place
ls -lh src-tauri/bin/darwin/
# Should show: age, age-plugin-yubikey, ykman, ykman-bundle/

# 4. Test
cargo tauri dev
```

**Result:** All YubiKey operations work in dev mode without signature errors.

---

## Why This is Necessary

### Production vs Development Binaries

**Production Builds (CI/CD):**
- Binaries: Downloaded from `barqly-vault-dependencies` GitHub Release
- Signatures: Signed with Team ID LTNTNNDY37 (Developer ID)
- Purpose: Notarized macOS apps for end users
- Script: `fetch-binaries.sh` (used in release.yml workflow)

**Development Builds (Local):**
- Binaries: Downloaded from upstream OR built locally
- Signatures: Unsigned or adhoc signed
- Purpose: Local testing without macOS security restrictions
- Scripts: `download-all-binaries.sh` + `build-ykman.sh`

### The Key Difference:

**Team ID signatures don't work in dev mode:**
- macOS blocks loading Team ID signed libraries in unsigned dev apps
- Result: "code signature invalid" errors during dlopen()
- Solution: Use unsigned/adhoc binaries for dev

---

## The Error (If You See This)

### Symptom:

```
ERROR | ykman command failed: [PYI-83254:ERROR] Failed to load Python shared library
'/Users/you/projects/barqly-vault/target/debug/bin/darwin/ykman-bundle/_internal/Python':
dlopen(...) (code signature invalid in <D261F03F-FE7B-34A2-A647-3139A81BCCD8>
'.../_internal/Python' (errno=1) ...)
```

### Root Cause:

**You're using production binaries (Team ID signed) in development mode.**

**How this happens:**
1. You ran `fetch-binaries.sh` manually (downloads Team ID signed binaries)
2. OR pulled signed binaries from a production build
3. OR someone committed signed binaries to `src-tauri/bin/`

**Why it fails:**
- Dev builds (cargo tauri dev) are unsigned
- macOS Library Validation blocks Team ID signed libraries in unsigned apps
- dlopen() fails with "code signature invalid"

### Quick Fix:

```bash
# Remove production binaries
rm -rf src-tauri/bin/darwin/*

# Download unsigned binaries
./scripts/cicd/download-all-binaries.sh

# Build unsigned ykman
./scripts/yubikey/build-ykman.sh 5.8.0

# Test
cargo tauri dev
```

---

## Detailed Binary Sources

### age (Encryption CLI)

**Source:** https://dl.filippo.io/age/
**Version:** v1.2.1
**Signature:** Unsigned (Go binary)
**Download:** `download-all-binaries.sh`
**Location:** `src-tauri/bin/darwin/age`

### age-plugin-yubikey (YubiKey Plugin)

**Source:** https://github.com/str4d/age-plugin-yubikey/releases
**Version:** v0.5.0
**Signature:** Upstream signature (not our Team ID)
**Notes:**
- Upstream only provides ARM64 macOS build
- `download-all-binaries.sh` copies ARM64 → x86_64 (works via Rosetta in dev)
- Production uses separately compiled x86_64 version

**Download:** `download-all-binaries.sh`
**Location:** `src-tauri/bin/darwin/age-plugin-yubikey`

### ykman (YubiKey Manager)

**Source:** Built from https://github.com/Yubico/yubikey-manager
**Version:** v5.8.0
**Signature:** Adhoc (locally built with PyInstaller)
**Structure:**
```
src-tauri/bin/darwin/
  ykman                    ← Shell wrapper
  ykman-bundle/
    ykman                  ← PyInstaller executable (adhoc signed)
    _internal/
      Python               ← Python runtime (adhoc signed)
      *.so files          ← Python extensions (adhoc signed)
      *.dylib files       ← Dependencies (adhoc signed)
```

**Build:** `build-ykman.sh 5.8.0`
**Location:** `src-tauri/bin/darwin/ykman-bundle/`

---

## Verification

### Check Signatures (Should Be Unsigned/Adhoc for Dev):

```bash
# age (should be unsigned Go binary)
codesign -dv src-tauri/bin/darwin/age 2>&1 | grep Signature
# Expected: "code object is not signed at all"

# ykman Python (should be adhoc)
codesign -dv src-tauri/bin/darwin/ykman-bundle/_internal/Python 2>&1 | grep Signature
# Expected: "Signature=adhoc"

# age-plugin (might have upstream signature)
codesign -dv src-tauri/bin/darwin/age-plugin-yubikey 2>&1 | grep Signature
# Expected: "Signature=adhoc" or upstream signature
```

**If you see:**
```
TeamIdentifier=LTNTNNDY37
```

**You have production binaries!** Re-run the setup scripts above.

---

## Common Issues

### Issue: "No such file: src-tauri/bin/darwin/age"

**Cause:** Binaries not downloaded yet
**Fix:** Run `./scripts/cicd/download-all-binaries.sh`

### Issue: "ykman command failed: command not found"

**Cause:** ykman not built yet
**Fix:** Run `./scripts/yubikey/build-ykman.sh 5.8.0`

### Issue: "code signature invalid" error persists

**Cause:** Old signed binaries still present
**Fix:**
```bash
# Nuclear option - completely clean and rebuild
rm -rf src-tauri/bin/darwin/*
./scripts/cicd/download-all-binaries.sh
./scripts/yubikey/build-ykman.sh 5.8.0
```

### Issue: "Python.framework not found"

**Cause:** Incomplete PyInstaller build
**Fix:** Delete `src-tauri/bin/darwin/ykman-bundle` and rebuild:
```bash
rm -rf src-tauri/bin/darwin/ykman-bundle src-tauri/bin/darwin/ykman
./scripts/yubikey/build-ykman.sh 5.8.0
```

---

## DO NOT Commit These Binaries

**Important:** `src-tauri/bin/` is in `.gitignore`

**Why:**
- Binaries are platform-specific
- Dev uses unsigned, production uses signed
- CI/CD fetches correct binaries during builds
- Committing causes confusion and bloat

**What TO commit:**
- Scripts in `scripts/cicd/` and `scripts/yubikey/`
- Configuration in `binary-dependencies.json`
- Documentation

---

## Production vs Development Summary

| Aspect | Development (Local) | Production (CI/CD) |
|--------|-------------------|-------------------|
| **Script** | `download-all-binaries.sh` + `build-ykman.sh` | `fetch-binaries.sh` (in release.yml) |
| **Source** | Upstream (age, age-plugin) + Local build (ykman) | barqly-vault-dependencies release |
| **Signatures** | Unsigned / Adhoc | Team ID LTNTNNDY37 |
| **age** | FiloSottile CDN | barqly-vault-dependencies |
| **age-plugin** | str4d GitHub Release | barqly-vault-dependencies |
| **ykman** | PyInstaller local build | Pre-built, fully signed |
| **Location** | `src-tauri/bin/darwin/` | Downloaded during CI, bundled into app |

---

## Related Documentation

- [release-process.md](./release-process.md) - Production release workflow
- [README.md](./README.md) - CI/CD quick reference
- [Binary dependency management](../../../src-tauri/bin/README.md) - Binary architecture

---

**Last Updated:** 2025-11-15
**Issue:** macOS development blocked by Team ID signatures (resolved)
