#!/bin/bash
# Generate standardized release notes for Barqly Vault releases

set -e

VERSION="${1:-unknown}"

cat <<EOF
# Barqly Vault ${VERSION} – Offline-First Multi-Key Encryption

## 🚀 What's New in ${VERSION}

- **Full cross-platform encryption & decryption (macOS + Linux)**
- **Multi-key vaults (2-4 hardware or passphrase keys)** – Hardware keys recommended for enhanced security
- **Complete YubiKey integration** with PIN & recovery flow
- **Vault manifest + recovery bundle** for seamless restoration
- **Refined dark theme UI** and brand-aligned visuals
- **Offline-First Design:** all encryption, decryption, and key ops happen locally — no network calls required
- **Local-Only Storage:** no data ever leaves your device

---

## 🖥️ Platform Support

| Platform | Status |
|----------|---------|
| macOS (Intel) | ✅ Tested & Notarized |
| macOS (Apple Silicon) | ✅ Tested & Notarized |
| Linux (DEB/RPM/AppImage) | ✅ Tested |
| Windows (MSI/ZIP) | 🟡 Testing in progress |

**Linux users:** YubiKey support requires PC/SC libraries. See installation instructions below.

---

## 📦 Installation

Download the appropriate installer for your platform below.

### macOS
- **Apple Silicon (M1/M2/M3)**: \`barqly-vault-${VERSION}-macos-arm64.dmg\`
- **Intel**: \`barqly-vault-${VERSION}-macos-x86_64.dmg\`

### Windows
- **Installer**: \`barqly-vault-${VERSION}-x64-setup.exe\`
- **MSI**: \`barqly-vault-${VERSION}-x64.msi\`

### Linux

**Prerequisites for YubiKey Support:**

Debian/Ubuntu/PopOS:
\`\`\`bash
sudo apt-get install libpcsclite1 pcscd libccid libu2f-udev
\`\`\`

RedHat/Fedora/CentOS:
\`\`\`bash
sudo dnf install pcsc-lite pcsc-lite-ccid libu2f-host
\`\`\`

**Packages:**
- **Debian/Ubuntu**: \`barqly-vault-${VERSION}-amd64.deb\`
- **RedHat/Fedora**: \`barqly-vault-${VERSION}-1.x86_64.rpm\`
- **AppImage** (no dependencies): \`barqly-vault-${VERSION}-amd64.AppImage\`
- **TAR.GZ**: \`barqly-vault-${VERSION}-amd64.tar.gz\`

---

## 🔒 Security

All macOS builds are signed and notarized by Apple.

Verify your download using the checksums in \`checksums.txt\`.

---

## 📖 Documentation

- **Download Page**: https://barqly.com/downloads
- **Recovery Guide**: https://barqly.com/recovery
- **GitHub Repository**: https://github.com/barqly/barqly-vault
- **Issue Tracker**: https://github.com/barqly/barqly-vault/issues

---

## ⚠️ Disclaimer

Barqly Vault is not intended for direct storage of Bitcoin private keys or seed phrases. It is designed to protect related files (wallet descriptors, configuration manifests, vault backups).

---

_Open-source, offline-first file encryption for desktop._
EOF
