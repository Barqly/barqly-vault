# Product Requirements Document - Barqly Vault

## **📆 Product Overview**

### **🔍 What is Barqly Vault?**

Barqly Vault is a cross-platform desktop application that provides simple, secure file encryption specifically designed for Bitcoin custody backup and restoration. It uses the audited `age` encryption standard to protect sensitive files like output descriptors, wallet databases, and recovery information.

### **🎯 Product Vision**

To become the go-to tool for Bitcoin users who need secure, reliable file encryption without technical complexity. We aim to make military-grade encryption as easy to use as any other desktop application.

### **💡 Value Proposition**

**For Bitcoin Users:** Simple, secure backup of critical wallet information that you control completely.

**For Families:** Peace of mind knowing your Bitcoin can be recovered by loved ones if needed.

**For Professionals:** Reliable, professional-grade encryption tool for client and business needs.

## **🔍 Problem Statement**

### **❓ Why build Barqly Vault?**

The Bitcoin ecosystem lacks simple, user-friendly tools for secure file encryption. Current solutions are either:

- **Too Complex**: Command-line tools that require technical expertise
- **Too Insecure**: Cloud-based solutions that compromise user sovereignty
- **Too Limited**: Single-platform tools that don't work across devices
- **Too Generic**: Not optimized for Bitcoin-specific use cases

### **🎯 Market Gap**

**Bitcoin users need a tool that:**
- Makes encryption as simple as using any desktop app
- Provides military-grade security without complexity
- Works consistently across all platforms
- Is specifically designed for Bitcoin custody scenarios
- Maintains complete user control and sovereignty

### **💪 Our Solution**

Barqly Vault addresses this gap by providing:
- **Simple Interface**: Three-tab design (Setup, Encrypt, Decrypt)
- **Proven Security**: Built on the audited `age` encryption standard
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Bitcoin-Focused**: Optimized for wallet backup and recovery
- **Self-Sovereign**: No cloud dependencies, user-controlled

### **🤝 Who is it for?**

* Individuals practicing Bitcoin self-custody

* Families preparing inheritance plans

* Non-technical users who need high-security but simple UX

* Clients of Barqly or BarqX who need consistent backup tooling

---

## **📊 Tech Stack (MVP)**

### **🛠️ App Framework**

| Component | Stack | Why |
| ----- | ----- | ----- |
| **Frontend UI** | **Tauri** \+ HTML/JS (React/Svelte/plain)\*\* | ✅ Lightweight ✅ Uses system webview (no Chromium bloat) ✅ First-class Rust integration |
| **Backend logic** | **Rust** | ✅ Secure, performant ✅ Crypto- and file-friendly ✅ Works directly with age, tar, etc. |
| **Packaging** | Tauri bundler | ✅ Builds .exe, .dmg, .AppImage from single codebase |

### **🔐 Encryption & Archiving**

| Purpose | Tool | Why |
| ----- | ----- | ----- |
| File encryption | **`age`** | ✅ Modern, portable, secure (X25519 \+ ChaCha20) |
| Folder archiving | `tar` | ✅ Preserves folder structure ✅ Native \+ cross-platform |
| Compression | Optional `gzip` or none | ⚠️ Skip for MVP unless needed |

### **🔑 Key Management**

| Purpose | Tool | Notes |
| ----- | ----- | ----- |
| Key generation | `age-keygen` | Generates X25519 keypair for encryption |
| Passphrase protection | `age -p` | Encrypts private key file using passphrase (belt \+ suspenders model) |
| File naming | `barqly-<label>.agekey.enc` (e.g., `barqly-family.agekey.enc`) | Label is embedded in filename, avoids extra index file, improves UX & recovery |
| Storage | Local app folder or user-chosen | No cloud, user-controlled only |

### **📁 Filesystem Layout (this is not for the project structure, rather the suggested folder structure that will be created when the user install the app on their machine)**

### **🔒 Internal App Storage (Config, Keys)**

* **macOS/Linux**: `$HOME/.config/barqly-vault/`

* **Windows**: `%APPDATA%barqly-vault\`

Contents:

barqly-vault/  
├── keys/  
│   └── barqly-family.agekey.enc  
│   └── barqly-business.agekey.enc  
├── logs/  
│   └── setup.log  
├── config.json (optional)

* Stores encrypted private keys, config, and logs

* Always hidden from users (used internally by the app)

---

### **📦 User-Facing Vault Data (Visible, Exportable): (this is not for the project structure, rather the suggested folder structure that will be created when the user install the app on their machine)**

### 

* **All OS**: `$HOME/BarqlyVault/`

Contents:

BarqlyVault/  
├── Encrypted/  
│   └── vault-20250711-1152.age  
│   └── vault-20250711-1152.manifest.txt (optional preview)  
├── Decrypted/  
│   └── \<output files restored after decryption\>  
├── Staging/  
│   └── vault-20250711-1152/  
│       └── \<copied user files for encryption\>

* `Encrypted/`: Final `.age` bundles and optional manifest

* `Decrypted/`: User-selected (or default) output folder for restored files

* `Staging/`: Internal scratchpad for temporary file prep during encryption

---

### **✅ Naming Consistency Summary**

| Component | Naming | Notes |
| ----- | ----- | ----- |
| Internal folders | `barqly-vault/` (lowercase, dash) | For config/keys/logs |
| User-facing folder | `BarqlyVault/` (CamelCase) | Clarity and brand-aligned UX |
| Key files | `barqly-<label>.agekey.enc` | Embedded label, tracked in dropdown |
| Bundle output | `vault-YYYYMMDD-HHMM.age` | Time-stamped, human-readable |
| Manifest | `vault-YYYYMMDD-HHMM.manifest.txt` | Optional preview, auto-extracted if encrypted |

## **📂 Dev Tooling**

| Use | Tool |
| ----- | ----- |
| Dependency mgmt | `cargo` \+ Tauri CLI |
| Build targets | Windows, macOS, Linux |
| Open source repo | GitHub (planned) |

---

## **🌐 App Structure**

### **Top Navigation Tabs:**

* **\[Setup\]** – Generate encryption key \+ passphrase; confirm backup

* **\[Encrypt\]** – Select files/folders to encrypt using a consistent `.age` bundle format

* **\[Decrypt\]** – Decrypt `.age` bundle and restore original contents

Status bar (optional): Key loaded / Decryption error / File saved, etc.

---

## 

## **\=== TAB 1: SETUP \===**

### **📝 Function:**

Generate new encryption key (age key pair), assign passphrase, encrypt private key file, and walk user through secure backup.

### **🖼️ UI Layout (per hand-drawn mockup):**

* **Key Label**: Text input used to label the key file (e.g., `barqly-family.agekey.enc`)

* **Passphrase**: Secure text input for protecting the private key

* **Confirm Passphrase**: Second text input field with visual cue (✓ / ✕) if it matches

* **Generate Key** button:

  * 🔒 Disabled unless all 3 fields are filled correctly

  * 🧠 When clicked: runs `age-keygen | age -p` with provided passphrase

  * Saves file to: `~/.barqly-vault/keys/barqly-<label>.agekey.enc`

### **📋 Below Key Generation:**

* **Public Key**: Read-only display of generated public key (with 📋 copy button)

* **Show Key Folder Location**: Button to open the directory where the `.agekey.enc` file was saved

### **🔐 Backup Reminder:**

* Tip box: "Never upload your key to cloud storage. Use a password manager or USB."

* ✅ Checkbox: "I have backed up this key in 2 safe locations."

* Navigation to Encrypt/Decrypt is **locked** until this checkbox is ticked.

### **🔎 Features:**

* `barqly-label.agekey.enc` (encrypted private key file)

* Public key (shown inline or extracted from file)

---

## **\=== TAB 2: ENCRYPT \===**

### **📝 Function:**

Encrypt files or folders using the public key derived from the encrypted private key file.

### **🖼️ UI Layout (based on hand-drawn mockup):**

**1\. Key Selection**

* Dropdown menu listing all `.agekey.enc` files in `~/.barqly-vault/keys/`

* Label shown (parsed from filename)

* Below dropdown: display of selected key file name (e.g., `barqly-family.agekey.enc`)

**2\. Select Contents to Encrypt**

* Button to **Add Folder** or **Add File(s)**

* Display of selected items (with remove option)

* "Clear List" button to reset selection

**3\. Output Configuration**

* Destination Directory (with "Change" button)

* Bundle name: text field to customize output `.age` filename

**4\. Status and Feedback**

* Text field showing success/failure status

* "View Manifest" button to inspect what was encrypted

**Encryption Behavior:**

* Internally, files are staged before encryption for safety — this is abstracted from the user in this version

* Encryption outputs to default `~/BarqlyVault/Encrypted/` unless overridden

* Output filename: user-defined or fallback to `vault-YYYYMMDD-HHMM.age`

### **🔎 Features:**

* `vault_bundle.age`: encrypted output file containing a `.tar` archive of the selected folder/files

* `manifest.txt`: generated at encryption time; includes SHA-256 hashes of original (pre-encryption) files for later integrity check

  * This file is saved **both inside the `.tar` archive** (so it's encrypted) and optionally placed alongside the `.age` file for preview/debugging

* Output file is saved to default location `~/BarqlyVault/Encrypted/` unless overridden

* Output name: user-defined or defaults to `vault-YYYYMMDD-HHMM.age`

* In future, the `manifest.txt` can be cryptographically **signed** using the private key to provide tamper evidence and author verification  
   (encrypted TAR including parent folder name)

* `manifest.txt` (optional list of encrypted contents)

---

## 

## **\=== TAB 3: DECRYPT \===**

### **📂 Function:**

Decrypt an `.age` file using the encrypted private key file and user-provided passphrase

### **🔎 Features:**

**Step 1**: Select `.age` file to decrypt  
 **Step 2**: Select encrypted `.agekey.enc` file  
 **Step 3**: Enter passphrase (to unlock private key)  
 **Step 4**: Select output folder for extracted files  
 **Step 5**: Decrypt and extract

Optional (future tabs or inline tools):

* **Test Restore**: run dry decryption to temp folder and auto-verify

* **Integrity Check**: verify file hashes against stored checksum

---

## **📊 Open Decisions (Refined)**

* ✅ **Passphrase is defined at Setup and used to encrypt the private key file** (not used directly in file encryption)

* ✅ **Files/folders are copied to a staging folder before encryption to prevent data loss**

* ✅ **`.age` bundle includes the selected parent folder and preserves folder structure**

* ✅ **Staging folder can be opened, reviewed, and manually cleaned post-encryption**

* ✅ **Manifest file provides visibility into what was encrypted for recovery confidence**

* ✅ **Key label is included in the key filename (e.g., `barqly-family.agekey.enc`) to simplify tracking and usage**

---

## **✨ Future Enhancements**

### **🔑 Multi-key support:**

* Let users import or generate multiple labeled keys (e.g., `barqly-family.agekey.enc`, `client-alice.agekey.enc`) and select from a dropdown

* App will parse labels from filenames in key directory (no index file)

* Maintain opinionated default: single key usage unless user explicitly expands

### **💬 Nostr and Multisig Messaging:**

* Future integration with [Munstr](https://github.com/0xBEEFCAF3/munstr) or Nostr Wallet Connect (NWC) to enable PSBT coordination via Nostr relays

* Allow users to associate Nostr pubkeys with signers for messaging and out-of-band collaboration

* Build a whitelisted communication layer to support cosigner messaging, PSBT delivery, and response workflows securely over Nostr

* Messaging identity stays separate from Bitcoin signing key

### **⛔ Keep `age` encryption keys separate from Nostr keys:**

* Although technically possible to derive X25519 encryption keys from Ed25519 (Nostr) keys, Barqly will avoid doing so by default

* Using the same origin key for both identity/messaging and encryption increases risk and violates key separation principles

* Instead, users will generate/import a dedicated encryption key for use with age

* Optionally, an advanced user may manually derive an `age` key from a Nostr key for recovery purposes (not recommended as default)

### **🛠️ DID (Decentralized Identity) Consideration:**

* Long-term vision includes integrating a decentralized identity model to:

  * Tie multiple user keys together by function: signing, encryption, messaging, recovery

  * Enable inheritance workflows where a designated recovery agent or heir can verify identity and access vault

* DID approach emphasizes role-specific keys rather than deriving all keys from a master seed

* No immediate need for DID in MVP, but directionally important for Barqly's identity, messaging, and recovery architecture

## **📊 Success Metrics**

### **User Adoption Metrics**
- **Setup Completion Rate**: >90% of users complete initial setup
- **First Backup Success**: >95% success rate for first backup
- **Cross-Platform Usage**: Consistent adoption across macOS, Windows, Linux
- **User Retention**: >80% of users create second backup within 30 days

### **Security Metrics**
- **Zero Security Incidents**: No reported security vulnerabilities
- **Encryption Reliability**: 100% successful encryption/decryption rate
- **Key Management**: Zero reported key loss incidents
- **Integrity Verification**: 100% manifest verification success rate

### **User Experience Metrics**
- **Setup Time**: <5 minutes for complete initial setup
- **Backup Time**: <2 minutes for typical Bitcoin custody files
- **Error Rate**: <5% user-reported errors
- **Support Requests**: <10% of users require support

### **Business Metrics**
- **Community Growth**: Active GitHub community and contributions
- **Professional Adoption**: Adoption by Bitcoin companies and professionals
- **Documentation Quality**: Comprehensive, up-to-date documentation
- **Open Source Health**: Regular updates and community engagement

## **🎯 Feature Requirements**

### **Core Features (MVP)**
- [x] **Key Generation**: Create and manage encryption keys
- [x] **File Encryption**: Encrypt files and folders with age
- [x] **File Decryption**: Decrypt and restore files
- [x] **Cross-Platform**: macOS, Windows, Linux support
- [x] **Simple UI**: Three-tab interface (Setup, Encrypt, Decrypt)

### **Security Requirements**
- [x] **age Encryption**: Military-grade encryption standard
- [x] **Passphrase Protection**: Secure private key storage
- [x] **Local-Only**: No cloud dependencies
- [x] **Integrity Verification**: Manifest-based file verification
- [x] **Memory Safety**: Secure handling of sensitive data

### **User Experience Requirements**
- [x] **Intuitive Interface**: Simple, guided workflows
- [x] **Error Handling**: Clear, actionable error messages
- [x] **Progress Indication**: Visual feedback for operations
- [x] **Documentation**: Comprehensive user guides
- [x] **Accessibility**: Keyboard navigation and screen reader support

### **Technical Requirements**
- [x] **Performance**: <2 second startup time
- [x] **Reliability**: 99.9% uptime and operation success
- [x] **Compatibility**: Support for files up to 100MB
- [x] **Updates**: Secure update mechanism
- [x] **Logging**: Comprehensive error and security logging

## **📋 Acceptance Criteria**

### **Setup Flow**
- User can create encryption key in <2 minutes
- Passphrase validation prevents weak passwords
- Key backup reminder is enforced
- Public key is clearly displayed and copyable

### **Encryption Flow**
- User can select files/folders easily
- Progress is clearly indicated
- Output files are properly named and organized
- Manifest is generated and accessible

### **Decryption Flow**
- User can select encrypted files easily
- Passphrase entry is secure and clear
- Recovery location is user-selectable
- Integrity verification is automatic

### **Cross-Platform**
- Identical functionality across all platforms
- Platform-specific security features are utilized
- File paths are handled correctly
- UI is consistent and native-feeling

---

*This document defines the core product requirements for Barqly Vault MVP. Additional features and enhancements are outlined in the [Product Roadmap](../Product/Roadmap.md).* 