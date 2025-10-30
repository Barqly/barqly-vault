# Barqly Vault Dependency Versions

**Last Updated:** 2025-10-30
**Status:** Active - R2 Release

## Binary Dependencies

| Binary | Version | Platforms | GitHub Release | Last Updated |
|--------|---------|-----------|----------------|--------------|
| age | 1.2.1 | macOS (ARM/Intel), Linux, Windows | [barqly-vault-dependencies](https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies) | 2025-10-29 |
| age-plugin-yubikey | 0.5.0 | macOS (ARM/Intel), Linux, Windows | [barqly-vault-dependencies](https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies) | 2025-10-29 |
| ykman | 5.8.0 | macOS (universal), Linux, Windows | [barqly-vault-dependencies](https://github.com/Barqly/barqly-vault/releases/tag/barqly-vault-dependencies) | 2025-10-29 |

## Upstream Sources

- **age**: https://github.com/FiloSottile/age
- **age-plugin-yubikey**: https://github.com/str4d/age-plugin-yubikey
- **ykman**: https://github.com/Yubico/yubikey-manager

## Version Update Process

### When to Update

- **Security updates**: Immediately upon notification
- **Bug fixes**: Within 1-2 weeks of upstream release
- **Feature updates**: Evaluate quarterly (every 3-6 months)
- **Breaking changes**: Plan carefully, test thoroughly

### Update Checklist

```bash
# 1. Check for new versions
gh release list --repo FiloSottile/age --limit 5
gh release list --repo str4d/age-plugin-yubikey --limit 5
gh release list --repo Yubico/yubikey-manager --limit 5

# 2. Test new versions locally
./scripts/cicd/download-all-binaries.sh  # Update version in script
./scripts/cicd/fetch-binaries.sh
make app  # Test in development mode

# 3. Build ykman for all platforms
gh workflow run build-ykman-bundles.yml -f version=<NEW_VERSION>
gh run watch

# 4. Download and organize
gh run download <run-id> --dir dist/ykman-temp
mv dist/ykman-temp/*/*.tar.gz dist/binaries/

# 5. Update GitHub Release
cd dist/binaries
gh release delete barqly-vault-dependencies --yes
gh release create barqly-vault-dependencies \
  age-* age-plugin-yubikey-* ykman-* checksums.txt \
  --title "Barqly Vault Binary Dependencies" \
  --notes "Updated: age vX.Y.Z, ..." \
  --prerelease

# 6. Update manifest
# Edit src-tauri/bin/binary-dependencies.json with new:
#   - version numbers
#   - SHA256 checksums (from checksums.txt)
#   - last_updated timestamp

# 7. Test full build
cargo tauri build --target aarch64-apple-darwin
# Verify binaries in DMG

# 8. Update this document
# Update version table above with new versions and date

# 9. Commit changes
git add src-tauri/bin/binary-dependencies.json docs/architecture/dependency-versions.md
git commit -m "chore(deps): update binaries to age vX.Y.Z, ykman vX.Y.Z"
git push

# 10. Test with CI
git tag v0.X.0-test.1 && git push origin v0.X.0-test.1
# Verify all platforms build successfully
```

## Rollback Procedure

If new version causes issues:

```bash
# 1. Revert binary-dependencies.json
git revert <commit-hash>

# 2. Recreate GitHub Release with old versions
# (Old binaries should still be in dist/binaries/ or re-download)

# 3. Test rollback
./scripts/cicd/fetch-binaries.sh
cargo tauri build
```

## Current SHA256 Checksums

**age v1.2.1:**
- darwin-arm64: `d2b0d4211fd9e364ea8dd1cb150653a7f21dfc08e96632de444aa209db5fc0d0`
- darwin-x86_64: `f6b013850e8ec05da811300034d36da116333d49ea40c22f808298fb0cbb9588`
- linux-x86_64: `aaec874ed903da4b02a9d503778ae05ee5005b2acc0f4a4cf10e5d0f17fd4384`
- windows-x86_64: `5729bd8f90d5cdf0a69ccd10408f000877ad4ab4bec8e49f80fbd8bd15539cc7`

**age-plugin-yubikey v0.5.0:**
- darwin (universal): `006396d1524b9ef9ad96d084684ab81fe7893b1a0a179aea96829c7bbc95d903`
- linux-x86_64: `03efa118cbd2842a971abb03958e45d67789afd3d69bf66b28483c89ce195d56`
- windows-x86_64: `34bdcddaec82174c3288859fd10284a0d92fa1151a7fc18f89ff58873e69d7e7`

**ykman v5.8.0:**
- darwin-universal: `523ffd1f6f3923abe57ac100537306ce647784df8f91a9c67cb2d97f1ad7ee7c`
- linux-x86_64: `1b590d22ec43bf50dc6cfb838f2a3dd7a5ea6d6166723cb1729a42210d95b6ac`
- windows-x86_64: `4e7f5c489a59b8662be0cae270bfed6d8ce5ff263b715eb9fc34bb2cf9d8894d`

## Compatibility Notes

- **age 1.2.1**: Adds multi-recipient encryption improvements
- **age-plugin-yubikey 0.5.0**: Stable release, no known issues
- **ykman 5.8.0**: Supports YubiKey 5 series, requires libpcsclite on Linux

## Security Updates

Subscribe to security advisories:
- https://github.com/FiloSottile/age/security/advisories
- https://github.com/str4d/age-plugin-yubikey/security/advisories
- https://github.com/Yubico/yubikey-manager/security/advisories

**Response Time for Security Updates:**
- Critical (RCE, key compromise): < 24 hours
- High (data leakage): < 48 hours
- Medium: < 1 week
- Low: Next regular update cycle

---

**Related Documentation:**
- [Binary Management](../../src-tauri/bin/README.md)
- [Release Process](./cicd/release-process.md)
- [R2 Implementation Plan](../engineering/R2/r2-binary-dependency-integration-plan.md)
