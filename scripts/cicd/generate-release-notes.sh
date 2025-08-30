#!/bin/bash
# Generate standardized release notes for Barqly Vault releases

set -e

VERSION="${1:-unknown}"

cat <<EOF
# Barqly Vault v${VERSION}

## 📦 Installation

Download the appropriate installer for your platform below.

### macOS
- **Apple Silicon (M1/M2/M3)**: \`barqly-vault-${VERSION}-macos-arm64.dmg\`
- **Intel**: \`barqly-vault-${VERSION}-macos-x86_64.dmg\`

### Windows
- **Installer**: \`barqly-vault-${VERSION}-x64-setup.exe\`
- **MSI**: \`barqly-vault-${VERSION}-x64.msi\`

### Linux
- **Debian/Ubuntu**: \`barqly-vault-${VERSION}-amd64.deb\`
- **RedHat/Fedora**: \`barqly-vault-${VERSION}-1.x86_64.rpm\`
- **AppImage**: \`barqly-vault-${VERSION}-amd64.AppImage\`

## 🔒 Security

All macOS builds are signed and notarized by Apple.

Verify your download using the checksums in \`checksums.txt\`.
EOF