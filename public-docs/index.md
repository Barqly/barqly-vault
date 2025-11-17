# Barqly Vault

**Offline-first, open-source file encryption for desktop**

---

## What is Barqly Vault?

Barqly Vault is an **offline-first, open-source desktop application** for encrypting and decrypting sensitive documents — such as Bitcoin wallet descriptors, manifests, and configuration files — using multiple keys (**YubiKeys and/or passphrases**).

## Why Barqly Vault?

- **Offline-first:** All operations are local.
- **Multi-key model:** Use hardware keys (YubiKey), passphrases, or both.
- **Cross-platform:** Desktop app for macOS, Linux, and Windows.
- **Open source:** Transparent codebase and workflows.

## Features

### Encryption & Security
- **Age encryption standard:** Uses [age](https://github.com/FiloSottile/age) (ChaCha20-Poly1305 + X25519) for modern, auditable encryption.
- **Multi-key encryption:** Each vault supports up to 4 keys in any combination (YubiKey and/or passphrase).
- **Hardware security:** YubiKey support with multi-device detection and management.
- **No network calls:** All operations are local-only; encrypted files never leave your control.

### Key Management
- **Key export/import:** Backup and restore individual keys across machines using standard .agekey.enc format.
- **Key lifecycle tracking:** NIST-aligned states (PreActivation → Active → Suspended → Deactivated).
- **Disaster recovery mode:** Auto-detects when vault metadata is missing; restores from encrypted bundle.

### User Experience
- **Batch encryption:** Encrypt multiple files and folders in a single operation.
- **Integrity verification:** Each vault includes a manifest with file hashes for verification.
- **Portable outputs:** Store encrypted vaults anywhere (USB, cloud, offline backups).
- **Theme support:** Light, dark, or system-based themes.

## Use Cases

- **Bitcoin mainchain users** - Wallet recovery info, output descriptors
- **Lightning node operators** - Additional encryption for node backups
- **Bitcoin businesses** - Client data, configuration files, recovery kits
- **Families** - Inheritance planning with Bitcoin-related documents

---

## ⚠️ Disclaimer

Barqly Vault is **not intended for direct storage of Bitcoin private keys or seed phrases**.
It is designed to protect related files (e.g., wallet descriptors, configuration manifests, or vault backups) in a simple and auditable way.

---

## 🚀 Get Started

👉 **[Download Barqly Vault](/downloads)** - Get the latest release (v0.2.0)
👉 **[Recovery Guide](/recovery)** - Disaster recovery instructions
👉 [GitHub Repository](https://github.com/barqly/barqly-vault) - Source code and issues
👉 [Star the Repo](https://github.com/barqly/barqly-vault/stargazers) - Show your support

---

## Platform Support

| Platform | Status |
|-----------|---------|
| macOS | ✅ Tested |
| Linux | ✅ Tested |
| Windows | ✅ Tested |

## Technology Stack

- **Backend**: Rust with Tauri framework
- **Frontend**: React with TypeScript
- **Encryption**: Age encryption standard

---

## 🪐 Contact & Feedback

Barqly Vault is an open-source project maintained by **Mohammad Nauman**.  
If you discover a bug, have a question, or would like to share feedback, you can reach out through:

- **Email:** [nauman@barqly.com](mailto:nauman@barqly.com)
- **Nostr (@Barqly):** [`npub1y9y7cje0yx26aty28lmr3tr09fgwuym90uslef7e0475m36a97ysr94l54`](nostr:npub1y9y7cje0yx26aty28lmr3tr09fgwuym90uslef7e0475m36a97ysr94l54)  
  ([View on Nostr Web](https://njump.me/npub1y9y7cje0yx26aty28lmr3tr09fgwuym90uslef7e0475m36a97ysr94l54)) 
- **X (Twitter)** [@BarqlyHQ](https://x.com/BarqlyHQ)  
- **GitHub Issues:** [github.com/Barqly/barqly-vault/issues](https://github.com/Barqly/barqly-vault/issues)  

*Responses are handled personally and as time permits.*  
*Barqly Vault is provided on an open-source, best-effort basis — community collaboration and improvements are always welcome.*

---

_Open-source, offline-first file encryption for desktop._
