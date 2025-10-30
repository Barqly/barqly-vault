# Frontend: Fix TypeScript Errors Blocking DMG Build

**Date:** 2025-10-29
**Priority:** High - Blocking R2 binary bundling verification
**Estimated Time:** 1-2 hours
**Agent:** sr-frontend-engineer

## Context

We're completing R2 binary dependency integration (age, age-plugin-yubikey, ykman for all platforms). The binary infrastructure is complete:

- ✅ GitHub Release `barqly-vault-dependencies` created with all 11 binaries
- ✅ Automated fetch script downloads binaries from GitHub Release
- ✅ Tauri configured to bundle binaries in application packages
- ✅ `fetch-binaries.sh` successfully downloads to `src-tauri/bin/darwin/`

**Blocker:** Cannot build DMG to verify binaries are bundled correctly due to TypeScript compilation errors.

## Current State

**What Works:**
- Development mode: `make app` works fine
- Binary fetching: `./scripts/cicd/fetch-binaries.sh` downloads all binaries
- Binaries present: `src-tauri/bin/darwin/{age, age-plugin-yubikey, ykman, ykman-bundle/}`

**What's Broken:**
- Production build: `cargo tauri build --target aarch64-apple-darwin` fails
- TypeScript compilation errors during `npm run build --prefix src-ui`
- These are pre-existing errors, not related to our binary work

## Your Task

Fix all TypeScript compilation errors so we can complete Phase 3: Tauri Bundle Verification.

## Replication Steps

```bash
# 1. Ensure you have latest code
git pull origin main

# 2. Fetch binaries
./scripts/cicd/fetch-binaries.sh

# 3. Attempt production build (will fail with TS errors)
cd src-tauri
cargo tauri build --target aarch64-apple-darwin

# 4. Review TypeScript errors in output
# Errors will be in beforeBuildCommand output
```

## Expected Errors

You'll see TypeScript compilation errors in:
- Type imports/exports from bindings
- Component prop types
- Hook type definitions
- Union type narrowing
- Unused variables/imports

**Note:** The error list is in the build output - no need to list them here.

## Success Criteria

```bash
# After your fixes, this should succeed:
cd src-tauri
cargo tauri build --target aarch64-apple-darwin

# Expected output:
#   Running beforeBuildCommand... ✅
#   Compiling barqly-vault... ✅
#   Finished release build
#   Bundling Barqly Vault.app
#   Creating DMG...
#   DMG created at: target/aarch64-apple-darwin/release/bundle/dmg/*.dmg
```

## Verification After Fix

Once build succeeds, verify binaries are bundled:

```bash
# Find the DMG
DMG_PATH=$(find target/aarch64-apple-darwin/release/bundle/dmg -name "*.dmg")

# Mount and inspect
hdiutil attach "$DMG_PATH"

# Verify binaries present
ls -lah "/Volumes/Barqly Vault/Barqly Vault.app/Contents/Resources/bin/darwin/"

# Expected:
# age (5.0 MB)
# age-plugin-yubikey (3.9 MB)
# ykman (wrapper script)
# ykman-bundle/ (directory ~40 MB)

# Test binary
"/Volumes/Barqly Vault/Barqly Vault.app/Contents/Resources/bin/darwin/age" --version
# Expected: v1.2.1

# Unmount
hdiutil detach "/Volumes/Barqly Vault"
```

If all 3 binaries are present and executable in the .app bundle, **Phase 3 is complete**.

## Related Files

**Configuration:**
- `src-tauri/tauri.conf.json` - Bundle config (lines 43-45: `"resources": ["bin"]`)
- `src-tauri/bin/binary-dependencies.json` - URLs and checksums

**Scripts:**
- `scripts/cicd/fetch-binaries.sh` - Downloads binaries from GitHub Release
- `scripts/cicd/download-all-binaries.sh` - One-time setup to download all platform binaries

**Documentation:**
- `docs/architecture/cicd/README.md` - Master CI/CD reference
- `docs/engineering/R2/r2-binary-dependency-integration-plan.md` - Complete plan

## What Not to Change

- Do NOT modify `src-tauri/tauri.conf.json` bundle config
- Do NOT modify binary download/fetch scripts
- Do NOT modify `src-tauri/bin/` structure
- Focus ONLY on TypeScript compilation errors

## Notes

- These errors are pre-existing (not caused by binary work)
- Likely from recent backend API changes or type definition updates
- Fix should be straightforward type alignment

## After Completion

Commit your fixes with:
```bash
git add src-ui/
git commit -m "fix(ui): resolve TypeScript compilation errors

- Fix type import issues
- Align with updated backend type definitions
- Remove unused variables

Unblocks R2 binary bundling verification.

Refs: R2 binary dependency integration - Phase 3.2"
```

Then notify the system architect that TypeScript errors are resolved and Phase 3 verification can proceed.

---

**Created:** 2025-10-29
**Status:** Ready for sr-frontend-engineer
