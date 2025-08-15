## **Barqly Vault v1 — Go/No-Go Checklist**

### 1. **Security Hardening**

* [ ] **KDF:** Argon2id (preferred) or scrypt with strong parameters (e.g., 256–512 MB memory, ≥3 iterations) for offline brute-force resistance.
* [ ] **Salt:** Unique, per-passphrase; stored with key metadata.
* [ ] **CSPRNG:** Use OS crypto-secure random for salts/nonces.
* [ ] **Memory safety:** Zeroize passphrases and derived keys after use.
* [ ] **Private key storage:** Encrypted locally, never synced; no phone-home.
* [ ] **Clipboard hygiene:** Only public data can be copied; never copy private key material.

### 2. **UI/UX Consistency**

* [ ] **No hints:** Remove “Memory Hints” field in Setup and Decrypt.
* [ ] **Success screens:** Consistent style (no trailing periods in headings).
* [ ] **Encrypt success subline:** *Encryption complete — your vault is securely protected and ready for storage or sharing.*
* [ ] **Decrypt success subline:** *Vault integrity verified — your files are authentic and unmodified.*
* [ ] **Drop zone hints:** Encrypt: *saved as a Barqly Vault (.age) file*; Decrypt: *Barqly Vault (.age) format — restored to original folder structure.*

### 3. **Error & Status Handling**

* [ ] **Generic passphrase errors:** “Incorrect passphrase for the selected key.”
* [ ] **No length/complexity clues** in error text.
* [ ] **Copy actions:** All “Copy” buttons show “Copied!” feedback.
* [ ] **Path display:** Ensure save path is fully visible; truncate only from the middle if needed.

### 4. **Documentation & Help**

* [ ] **Passphrase guidance:** UI helper encourages length over complexity (e.g., 4–5 random words).
* [ ] **Privacy notice:** State clearly that keys & vaults never leave the device.
* [ ] **Recovery expectations:** No backdoor or hint recovery; losing passphrase = data loss.

### 5. **Final Smoke Tests**

* [ ] Full keyboard-only navigation works across all flows.
* [ ] Cross-platform check (Windows/macOS/Linux) for file path handling & encryption/decryption correctness.
* [ ] Test with large files and nested folder structures.
