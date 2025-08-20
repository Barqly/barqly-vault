# Separate macOS Builds Architecture

**Created**: 2025-08-20  
**Status**: Implemented  
**Model**: Sparrow Wallet Distribution Approach

## Overview

Barqly Vault follows the industry-standard approach pioneered by Sparrow wallet and other Bitcoin applications by providing separate DMG files for Intel and Apple Silicon Macs. This ensures optimal performance, smaller download sizes, and better compatibility.

## Distribution Model

### macOS Files (2 separate DMGs)
- `Barqly-Vault-{version}-x86_64.dmg` - Intel Macs
- `Barqly-Vault-{version}-aarch64.dmg` - Apple Silicon (M1/M2/M3)

### Why Separate Builds?

1. **Performance**: Native code runs faster than Rosetta 2 translation
2. **Size**: Each DMG is ~40% smaller than a universal binary
3. **Industry Standard**: Matches Sparrow, Electrum, and other Bitcoin wallets
4. **User Clarity**: Users know exactly what they're downloading
5. **Simpler Testing**: Each architecture can be tested independently

## Build Process

### Local Development

```bash
# Build for Intel Macs
make dmg-intel

# Build for Apple Silicon Macs  
make dmg-arm

# Build both architectures
make dmg-all
```

### CI/CD Pipeline

The GitHub Actions workflow builds each architecture in a separate matrix job:

```yaml
matrix:
  include:
    - platform: 'macos-latest'
      args: '--target x86_64-apple-darwin'
      arch: 'intel'
      
    - platform: 'macos-latest'
      args: '--target aarch64-apple-darwin'
      arch: 'apple-silicon'
```

## File Naming Convention

Following Sparrow's model:
- Version in filename: `2.2.3`
- Architecture suffix: `x86_64` or `aarch64`
- Example: `Barqly-Vault-2.2.3-x86_64.dmg`

## Complete Distribution Files

Total of 10 distribution files matching Sparrow's approach:

### macOS (2 files)
- Intel DMG (x86_64)
- Apple Silicon DMG (aarch64)

### Windows (2 files)
- MSI installer
- Standalone ZIP

### Linux (6 files)
- x86_64: .deb, .rpm, .tar.gz
- aarch64: .deb, .rpm, .tar.gz

## Technical Implementation

### Rust Targets

Each build explicitly targets one architecture:

```rust
// Intel build
cargo tauri build --target x86_64-apple-darwin

// Apple Silicon build
cargo tauri build --target aarch64-apple-darwin
```

### No Universal Binary

We explicitly do NOT create universal binaries because:
- Doubles the file size unnecessarily
- Most users only need one architecture
- Complicates code signing and notarization
- Harder to debug architecture-specific issues

## Migration from Universal Builds

Previous universal build artifacts have been archived:
- Scripts moved to `scripts/archive-universal/`
- Documentation archived with `.archived` extension
- Makefile targets updated to separate builds

## Testing Strategy

Each architecture should be tested on native hardware:
- Intel: Test on Intel Mac or GitHub Actions macos-13
- Apple Silicon: Test on M1/M2/M3 Mac or GitHub Actions macos-14

## User Download Experience

Users see clear options on the download page:
- "Download for Intel Mac" → x86_64 DMG
- "Download for Apple Silicon Mac" → aarch64 DMG

With auto-detection:
```javascript
// Detect user's architecture
const isAppleSilicon = navigator.userAgent.includes('ARM64');
const downloadUrl = isAppleSilicon 
  ? 'Barqly-Vault-2.2.3-aarch64.dmg'
  : 'Barqly-Vault-2.2.3-x86_64.dmg';
```

## References

- [Sparrow Wallet Releases](https://github.com/sparrowwallet/sparrow/releases)
- [Tauri Cross-Platform Builds](https://v2.tauri.app/distribute/)
- [Apple Silicon Transition](https://developer.apple.com/documentation/apple-silicon)