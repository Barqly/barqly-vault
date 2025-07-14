**Barqly Vault App – Design Canvas (v0.1)**

---

## **📆 Context**

### **🔍 What is it?**

A cross-platform, standalone desktop app that allows users to securely encrypt and decrypt sensitive folders/files (e.g., Bitcoin Output Descriptors, recovery kits) using the `age` encryption tool under the hood.

### **❓ Why build it?**

To provide a human-friendly, trust-minimized, and self-sovereign way for individuals and families to:

* Back up Bitcoin multisig metadata and sensitive personal files

* Ensure secure, consistent, and user-controlled recovery across macOS, Windows, and Linux

* Eliminate dependency on proprietary tools or cloud storage

* Keep the experience as intuitive and minimal as tools like Sparrow Wallet

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

* Tip box: “Never upload your key to cloud storage. Use a password manager or USB.”

* ✅ Checkbox: “I have backed up this key in 2 safe locations.”

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

* “Clear List” button to reset selection

**3\. Output Configuration**

* Destination Directory (with "Change" button)

* Bundle name: text field to customize output `.age` filename

**4\. Status and Feedback**

* Text field showing success/failure status

* “View Manifest” button to inspect what was encrypted

**Encryption Behavior:**

* Internally, files are staged before encryption for safety — this is abstracted from the user in this version

* Encryption outputs to default `~/BarqlyVault/Encrypted/` unless overridden

* Output filename: user-defined or fallback to `vault-YYYYMMDD-HHMM.age`

### **🔎 Features:**

* `vault_bundle.age`: encrypted output file containing a `.tar` archive of the selected folder/files

* `manifest.txt`: generated at encryption time; includes SHA-256 hashes of original (pre-encryption) files for later integrity check

  * This file is saved **both inside the `.tar` archive** (so it’s encrypted) and optionally placed alongside the `.age` file for preview/debugging

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

---

Ready to refine the first screen (Setup) or continue adding layers to the Encrypt tab.

