# Archived Universal Build Scripts

These scripts were archived when we moved from universal macOS builds to separate Intel and ARM builds, matching Sparrow wallet's distribution model.

## Why These Were Archived

1. **User Confusion**: Universal binaries are larger and users don't know which to download
2. **Industry Standard**: Sparrow and other Bitcoin wallets use separate builds
3. **CI/CD Complexity**: Universal builds required complex post-processing
4. **File Size**: Universal binaries are ~2x larger than single-architecture builds

## New Approach

We now build separate DMGs:
- `Barqly-Vault-{version}-x86_64.dmg` for Intel Macs
- `Barqly-Vault-{version}-aarch64.dmg` for Apple Silicon Macs

Use the new scripts:
- `/scripts/build-macos-separate.sh` - Build separate DMGs
- `make dmg-intel` - Build Intel DMG only
- `make dmg-arm` - Build Apple Silicon DMG only
- `make dmg-all` - Build both DMGs

## Archived Files

- `build-universal-dmg.sh` - Created universal binaries using lipo
- `verify-universal-setup.sh` - Checked universal build prerequisites

These scripts are preserved for reference but should not be used.