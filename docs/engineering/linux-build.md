# Linux Build Guide

Complete guide for building Barqly Vault on Linux distributions.

## Quick Start

### On Linux Machine (Ubuntu/PopOS/Debian)

```bash
# Clone the repository
git clone https://github.com/barqly/barqly-vault.git
cd barqly-vault

# Build Linux packages
make linux-build
```

This creates:
- **AppImage** - Universal Linux format (works on most distros)
- **.deb package** - Native Ubuntu/Debian installation

## Distribution Formats

### AppImage (Recommended for universal compatibility)
- ✅ Works on most Linux distributions  
- ✅ No installation required
- ✅ Portable and self-contained
- ✅ Perfect for testing on PopOS

**Usage:**
```bash
# Make executable
chmod +x Barqly-Vault-*.AppImage

# Run directly
./Barqly-Vault-*.AppImage
```

### .deb Package (Best for Ubuntu/Debian integration)
- ✅ Integrates with system package manager
- ✅ Proper desktop integration
- ✅ Automatic dependency resolution
- ✅ Standard for Ubuntu-based systems

**Usage:**
```bash
# Install
sudo dpkg -i barqly-vault_*.deb

# Fix dependencies if needed
sudo apt-get install -f

# Run from applications menu or
barqly-vault
```

## PopOS Compatibility

PopOS is Ubuntu-based, so both formats work perfectly:

1. **AppImage**: Works immediately after download
2. **.deb**: Native installation with full system integration

**If it works on PopOS, it will work on:**
- Ubuntu (all versions)
- Linux Mint
- Elementary OS
- Zorin OS
- Other Ubuntu derivatives

## Cross-Platform Testing

### From macOS/Windows (Development)
```bash
# Push to GitHub and use Actions
git tag v0.1.0-linux-test
git push origin v0.1.0-linux-test

# Or use local Linux VM/Container
docker run --rm -v $(pwd):/workspace ubuntu:22.04 \
  bash -c "cd /workspace && ./scripts/build-linux.sh"
```

### GitHub Actions (Automated)
The repository includes `.github/workflows/build-linux.yml` for automated Linux builds on every tag or manual trigger.

## Dependencies

### Build Dependencies (automatically installed by script)
```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  libgtk-3-dev \
  libayatana-appindicator3-dev
```

### Runtime Dependencies (minimal)
- GTK 3
- WebKit2GTK
- Standard Linux libraries (usually pre-installed)

## Troubleshooting

### "Permission denied" on AppImage
```bash
chmod +x Barqly-Vault-*.AppImage
```

### Missing dependencies on .deb install
```bash
sudo apt-get install -f
```

### Build fails on non-Ubuntu systems
- Use Ubuntu 22.04+ for building
- Or use the GitHub Actions workflow
- Consider using Docker for consistent builds

## File Locations

After successful build:
```
target/
├── release/
│   └── bundle/
│       ├── appimage/
│       │   └── Barqly-Vault-*.AppImage
│       └── deb/
│           └── barqly-vault_*.deb
```

## Advanced Options

### Custom build configuration
Edit `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "linux": {
      "deb": {
        "depends": ["libwebkit2gtk-4.1-0"]
      },
      "appimage": {
        "bundleMediaFramework": true
      }
    }
  }
}
```

### Build specific format only
```bash
# AppImage only
cargo tauri build --bundles appimage

# .deb only  
cargo tauri build --bundles deb
```

## Distribution Strategy

**For testing**: Use AppImage (no installation required)
**For production**: Provide both formats
- AppImage for universal compatibility  
- .deb for native Ubuntu/Debian experience

The AppImage format is particularly good for Bitcoin/crypto tools as users can run without system installation, maintaining security boundaries.