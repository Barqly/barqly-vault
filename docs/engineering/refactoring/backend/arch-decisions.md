# Vault Manifest & Recovery Architecture - R2 Design Decisions

**Document Status:** Approved
**Version:** 2.0
**Date:** October 2025
**Author:** Mohammad Nauman (with Claude/ChatGPT analysis)
**Audience:** Backend Engineers, Product, Future Maintainers

---

## Executive Summary

This document defines the architectural decisions for Barqly Vault R2's manifest management and recovery system. The design enables **deterministic recovery** from a single `.age` file while maintaining **offline-first operation** and **multi-device sync safety**.

**Key Principle:** *Manifest in non-sync storage = authoritative source. Copy in encrypted bundle = recovery snapshot.*

**Core Goals:**
- Self-contained vault recovery (20+ year future-proof)
- Simple UX ("newer wins" automatic versioning)
- Multi-key encryption (1 passphrase + up to 3 YubiKeys)
- Secure data storage (sensitive metadata never syncs)
- Clean DDD architecture boundaries

---

## 1. Core Architectural Decisions

### 1.1 Manifest as Authoritative Source

**Decision:** Vault manifests stored in non-sync location are the primary source of truth.

**Why:**
- Enables version tracking and conflict detection
- Prevents cloud sync exposure of key metadata
- Supports incremental updates without re-encrypting
- Allows fast app startup (no decryption needed)

**What:**
- Primary: `~/Library/Application Support/com.barqly.vault/vaults/<vault-label>.manifest`
- Snapshot: Included inside encrypted `.age` bundle for recovery
- Never synced to cloud storage

**How:**
- On encryption: Update non-sync manifest first, then copy into bundle
- On decryption: Compare versions, preserve newer manifest
- On recovery: Extract from bundle, restore to non-sync location

---

### 1.2 Flat Manifest Storage Structure

**Decision:** Store manifests as flat files using sanitized vault labels, not nested folders.

**Why:**
- Simpler file organization and discovery
- Easier to scan all vaults at startup
- Avoids vault-id vs vault-label confusion
- Reduces filesystem complexity

**What:**
```
~/Library/Application Support/com.barqly.vault/vaults/
├── Vault-001.manifest
├── My-Family-Photos.manifest
└── Tax-Records-2024.manifest
```

**How:**
- Sanitize user-entered vault label for filesystem safety
- Use sanitized name for filenames
- Preserve original display label in manifest JSON
- No nested directories per vault

---

### 1.3 "Newer Wins" Version Control

**Decision:** Automatic conflict resolution using version numbers and timestamps, with backup safety net.

**Why:**
- Reduces user friction during recovery (critical UX goal)
- Handles multi-device scenarios gracefully
- Prevents accidental data loss via rollback protection
- Maintains simplicity for non-technical users

**What:**
- Each encryption increments manifest version
- Compare bundle vs local manifest on decrypt
- Newer version automatically replaces older
- Backup older manifest before overwriting

**How:**
- Store `version`, `last_encrypted_at`, `last_encrypted_by` in manifest
- Compare versions first, then timestamps as tiebreaker
- Create backup in `~/Library/.../backups/manifest/` before replacement
- Keep last 5 backups for rollback safety

**Long-term Stability:** This is not a temporary R2 solution; it's robust for single-user, multi-device scenarios indefinitely.

---

### 1.4 Bundle Payload Composition

**Decision:** Always include manifest, passphrase keys, and recovery instructions in encrypted bundle.

**Why:**
- Single-file recovery (core design goal)
- Enables 20+ year future recovery
- Supports disaster scenarios (new machine, fresh install)
- Reduces user burden (one file to backup)

**What:**
```
Encrypted Bundle (.age file) contains:
├── [User files/folders - exact hierarchy preserved]
├── <vault-label>.manifest
├── *.agekey.enc (all passphrase keys)
└── RECOVERY.txt (human-readable instructions)
```

**How:**
- Stage all components before TAR creation
- Copy manifest from non-sync location
- Copy all `.agekey.enc` files from keys folder
- Generate `RECOVERY.txt` with vault-specific instructions
- TAR → Age multi-recipient encrypt

---

### 1.5 Registry as Disposable Cache

**Decision:** Key registry contains only key metadata, no vault associations; rebuilt from manifests.

**Why:**
- Clean separation of concerns (keys vs vaults)
- Enables deterministic recovery from manifests
- Allows unattached keys (not yet assigned to vaults)
- Simplifies "Manage Keys" UI data source

**What:**
```json
{
  "version": "2.0",
  "keys": {
    "mbp001-nauman": {
      "type": "passphrase",
      "label": "mbp001-nauman",
      "public_key": "age1zehe..."
      // NO vault references
    },
    "keyref_QNEar5cauot": {
      "type": "yubikey",
      "serial": "31310420",
      "recipient": "age1yubikey..."
      // NO vault references
    }
  }
}
```

**How:**
- Bootstrap: Load all manifests, extract recipients, merge into registry (additive only)
- Never remove keys from registry automatically (preserves unattached keys)
- Registry lost → Rebuild from manifests + detect YubiKeys
- Edge case: Unattached keys lost on crash (acceptable, documented)

---

### 1.6 Atomic Write Pattern

**Decision:** All manifest and registry updates use atomic write-then-rename pattern.

**Why:**
- Prevents corruption from interrupted writes
- Ensures crash safety during encryption/decryption
- OS-level atomicity guarantees

**What:**
- Write to `.tmp` file first
- Force fsync to disk
- Atomic rename to final filename

**How:**
- Use existing `atomic_write()` in `src-tauri/src/services/shared/infrastructure/io.rs`
- Apply to all manifest saves
- Apply to all registry saves

---

### 1.7 Label Sanitization for Filesystem Safety

**Decision:** Sanitize user-entered vault labels for filesystem compatibility while preserving display names.

**Why:**
- Prevents filesystem errors (slashes, emojis, reserved names)
- Cross-platform compatibility (Windows, macOS, Linux)
- User-friendly (allows any display name)

**What:**
```
Input:  "My Family Photos! 🎉 / Test"
Sanitized: "My-Family-Photos-Test"
Display: "My Family Photos! 🎉 / Test" (in manifest.label)
```

**How:**
1. Remove emojis and non-ASCII characters
2. Replace invalid characters (`/\:*?"<>|`) with hyphens
3. Collapse multiple hyphens
4. Trim leading/trailing hyphens
5. Limit to 200 characters
6. Check for reserved names (Windows: CON, PRN, etc.)
7. Prevent leading dot (Unix hidden files)

**Existing Code:** Enhance `validate_vault_name()` in `user_vaults.rs` to include sanitization.

---

### 1.8 Relative Paths Only

**Decision:** Store only relative paths in manifest file listings, never absolute paths.

**Why:**
- Portability across machines and operating systems
- Privacy (doesn't expose user directory structure)
- Simplifies recovery (reconstruct from relative base)

**What:**
```json
{
  "selection_type": "folder",
  "base_path": "tax",
  "files": [
    {"path": "personal/2024-return.pdf", "size": 12034, "sha256": "..."},
    {"path": "companyA/invoice.pdf", "size": 53421, "sha256": "..."}
  ]
}
```

**How:**
- When user selects folder, record as `base_path`
- All file entries use paths relative to base
- On decrypt, reconstruct exact structure in recovery folder
- For files-only selection, `base_path` is null

---

## 2. Data Flow Specifications

### 2.1 Encryption Flow (Normal Operation)

**Sequence:**
1. **Input**: User selects files/folder + enters vault label
2. **Sanitization**: Convert label to filesystem-safe name
3. **Manifest Loading**:
   - Check `~/Library/.../vaults/<sanitized-name>.manifest`
   - If exists: Load, increment version
   - If new: Create with version = 1
4. **Machine Tracking**: Load/generate device UUID, add to `last_encrypted_by`
5. **Manifest Update**:
   - Refresh recipients from registry
   - Update file list with relative paths
   - Calculate SHA256 hashes
6. **Payload Staging**:
   - Copy user files (preserve hierarchy)
   - Copy manifest from non-sync
   - Copy all `.agekey.enc` files
   - Generate `RECOVERY.txt`
7. **Encryption**: TAR → Age multi-recipient encrypt
8. **Output**: Save to `~/Documents/Barqly-Vaults/<sanitized-name>.age`
9. **Manifest Save**: Atomically write updated manifest to non-sync

---

### 2.2 Decryption Flow (Smart Version Handling)

**Sequence:**
1. **Input**: User selects `.age` file
2. **Decryption**: Decrypt → Extract TAR to temp
3. **Manifest Read**: Load manifest from extracted files
4. **Version Comparison**:

   **If local manifest EXISTS:**
   - Compare `bundle.version` vs `local.version`
   - Compare `bundle.last_encrypted_at` vs `local.last_encrypted_at`

   **Bundle NEWER (version > local):**
   - Backup local manifest to `backups/manifest/`
   - Replace local with bundle manifest
   - Log: "Updated from [machine_label]"

   **Bundle OLDER (version < local):**
   - Keep local manifest (no overwrite)
   - Warn user: "Decrypting old version (v1 vs v3)"
   - Continue file extraction normally

   **Same version, different timestamp:**
   - Use timestamp as tiebreaker
   - Follow newer/older logic above

   **If local manifest MISSING (true recovery):**
   - Restore manifest to non-sync location
   - Restore `.agekey.enc` files to keys folder
   - Trigger bootstrap merge (rebuild registry)
   - Log: "Recovered from [machine_label]"

5. **File Extraction**:
   - Extract to `~/Documents/Barqly-Recovery/<timestamp>/`
   - Preserve exact folder hierarchy from manifest
6. **Verification** (optional):
   - Verify file hashes against manifest
   - Confirm all files present

---

### 2.3 Bootstrap Flow (App Startup)

**Sequence:**
1. **Device ID**: Load or generate `device.json` with UUID
2. **Manifest Scan**: Load all manifests from `~/Library/.../vaults/`
3. **Registry Load**: Load or create key registry
4. **Additive Merge**:
   - For each `manifest.recipients`: Add to registry if missing
   - Detect connected YubiKeys: Add to registry if missing
   - Never remove keys (preserves unattached keys)
5. **Registry Save**: Atomically write updated registry
6. **Ready**: App initialized for UI

**Edge Case Handling:**
- Unattached keys (in registry, not in any manifest): Preserved
- Lost on crash: Acceptable, can be re-added manually
- YubiKeys: Auto-rediscovered on device insert

---

## 3. File Structure & Storage

### 3.1 Non-Sync Storage (Private)

**Location:** `~/Library/Application Support/com.barqly.vault/`

```
com.barqly.vault/
├── device.json                          # Machine UUID (new)
├── keys/
│   ├── barqly-vault-key-registry.json  # Key cache
│   ├── mbp001-nauman.agekey.enc        # Passphrase keys
│   └── ...
├── vaults/                              # Manifest storage (new)
│   ├── Vault-001.manifest
│   ├── My-Family-Photos.manifest
│   └── Tax-Records-2024.manifest
├── backups/                             # Version backups (new)
│   └── manifest/
│       ├── Vault-001.manifest.2025-10-05_163000
│       └── Vault-001.manifest.2025-10-04_120000
└── logs/                                # Application logs
```

### 3.2 Syncable Storage (User-Visible)

**Location:** `~/Documents/`

```
Barqly-Vaults/
├── Vault-001.age                 # Encrypted bundles (sync-safe)
├── My-Family-Photos.age
└── Tax-Records-2024.age

Barqly-Recovery/
├── 2025-10-05_163515/            # Timestamped recoveries
│   └── [extracted files with preserved structure]
└── 2025-10-04_120000/
```

---

## 4. Schema Specifications

### 4.1 Enhanced Manifest Schema

```json
{
  "schema": "barqly.vault.manifest/1",
  "vault_id": "vault-001",
  "label": "My Family Photos! 🎉",
  "sanitized_name": "My-Family-Photos",

  "version": 3,
  "created_at": "2025-10-04T12:00:00Z",
  "last_encrypted_at": "2025-10-05T16:35:00Z",
  "last_encrypted_by": {
    "machine_id": "7c3e7f16-6de1-4c1f-a9ac-2ebf4da93e6f",
    "machine_label": "nauman"
  },

  "selection_type": "folder",
  "base_path": "tax",

  "recipients": [
    {
      "type": "passphrase",
      "label": "mbp001-nauman",
      "public_key": "age1zehe...",
      "key_filename": "mbp001-nauman",
      "created_at": "2025-10-04T02:21:33Z"
    },
    {
      "type": "yubikey",
      "label": "YubiKey-31310420",
      "serial": "31310420",
      "slot": 1,
      "piv_slot": 82,
      "recipient": "age1yubikey...",
      "identity_tag": "AGE-PLUGIN-YUBIKEY-12NPD6QVR22HVTMSHMSHZG",
      "firmware_version": "5.7.1",
      "created_at": "2025-10-04T02:21:46Z"
    }
  ],

  "files": [
    {
      "path": "personal/2024-return.pdf",
      "size": 12034,
      "sha256": "abc123..."
    }
  ],

  "total_size": 65455,
  "file_count": 2,

  "integrity": {
    "files_hash": "sha256:...",
    "manifest_hash": "sha256:..."
  }
}
```

**Key Additions from R1:**
- `version`, `last_encrypted_at`, `last_encrypted_by` - Version control
- `sanitized_name` - Filesystem-safe name
- `selection_type`, `base_path` - Folder hierarchy preservation
- Complete YubiKey metadata (piv_slot, identity_tag, firmware_version)
- Integrity hashes (optional but recommended)

---

### 4.2 Device JSON Schema

```json
{
  "machine_id": "7c3e7f16-6de1-4c1f-a9ac-2ebf4da93e6f",
  "machine_label": "nauman",
  "created_at": "2025-10-04T12:00:00Z",
  "app_version": "2.0.0"
}
```

**Purpose:**
- Unique identifier per app installation
- Not hardware-dependent (survives reinstalls if non-sync preserved)
- Used for conflict traceability and logging

**Generation:**
- First app launch: Generate UUID v4
- Read system hostname for `machine_label`
- Store in `~/Library/.../device.json`
- Load on every encryption operation

---

### 4.3 Key Registry Schema (Existing)

**No changes needed** - Current structure already correct:

```json
{
  "version": "2.0",
  "keys": {
    "mbp001-nauman": {
      "type": "passphrase",
      "label": "mbp001-nauman",
      "public_key": "age1zehe...",
      "key_filename": "mbp001-nauman"
    },
    "keyref_QNEar5cauot": {
      "type": "yubikey",
      "serial": "31310420",
      "slot": 1,
      "piv_slot": 82,
      "recipient": "age1yubikey...",
      "identity_tag": "AGE-PLUGIN-YUBIKEY-...",
      "firmware_version": "5.7.1"
    }
  }
}
```

**Manifest recipient structure matches registry** - Denormalization done right.

---

## 5. Version Conflict Resolution

### 5.1 Conflict Scenarios

| Scenario | Bundle Ver | Local Ver | Action | Backup? |
|----------|-----------|-----------|--------|---------|
| First decrypt (no local) | 1 | - | Create local from bundle | No |
| Normal re-encrypt | 2 | 1 | Update local (expected) | Yes |
| Decrypt newer (multi-device) | 3 | 2 | Update local, warn user | Yes |
| Decrypt older (accidental) | 1 | 3 | Keep local, warn user | No |
| Same version, diff time | 2 | 2 | Use timestamp tiebreaker | Yes |

### 5.2 Backup Strategy

**Location:** `~/Library/Application Support/com.barqly.vault/backups/manifest/`

**Naming:** `<vault-name>.manifest.<timestamp>`

**Retention:** Keep last 5 versions per vault (configurable)

**Cleanup:** Delete backups older than 5 versions automatically

---

## 6. RECOVERY.txt Template

Generated during encryption with vault-specific details:

```
═══════════════════════════════════════════════
BARQLY VAULT RECOVERY INSTRUCTIONS
═══════════════════════════════════════════════

Vault: My Family Photos
Encrypted: 2025-10-05 16:35:00 UTC
Version: 3
Machine: nauman (7c3e7f16-6de1...)

───────────────────────────────────────────────
REQUIRED: You need at least ONE of these keys
───────────────────────────────────────────────

✓ YubiKey Serial: 31310420 (Slot 1)
  Label: YubiKey-31310420
  Firmware: 5.7.1

✓ Passphrase-Protected Key
  Label: mbp001-nauman
  File: mbp001-nauman.agekey.enc (included in this bundle)

───────────────────────────────────────────────
RECOVERY STEPS
───────────────────────────────────────────────

1. Install Barqly Vault
   Download: https://barqly.com/vault

2. OPTION A - YubiKey Recovery:
   - Connect YubiKey (Serial: 31310420)
   - Open Barqly Vault
   - Import this .age file
   - Enter YubiKey PIN when prompted

3. OPTION B - Passphrase Recovery:
   - Open Barqly Vault
   - Import mbp001-nauman.agekey.enc from this bundle
   - Enter passphrase
   - Import this .age file
   - Decrypt

4. Your files will appear in ~/Documents/Barqly-Recovery/

═══════════════════════════════════════════════
CONTENTS (45 files, 2.3 MB total)
═══════════════════════════════════════════════

[List of files from manifest]

Support: support@barqly.com
```

---

## 7. Implementation Priorities

### Phase 1: Foundation (P0 - Must Have for R2)

**Critical Path Items:**

1. **Device UUID Generation**
   - Create `device.json` on first launch
   - Load for all encryption operations
   - Add to manifest `last_encrypted_by`

2. **Label Sanitization**
   - Enhance `validate_vault_name()` in `user_vaults.rs`
   - Return both sanitized and display versions
   - Apply to all manifest filename operations

3. **Manifest Schema Updates**
   - Add version tracking fields
   - Add machine tracking fields
   - Update RecipientInfo to match registry structure
   - Add selection_type and base_path

4. **Manifest Location Move**
   - Change path from `~/Documents/Barqly-Vaults/`
   - To `~/Library/.../vaults/`
   - Update all manifest read/write operations

5. **Version Comparison Logic**
   - Implement version + timestamp comparison
   - Add "newer wins" automatic resolution
   - Create backup before overwriting

6. **Payload Staging Enhancement**
   - Include manifest in TAR before encryption
   - Include all `.agekey.enc` files
   - Generate `RECOVERY.txt` from template

7. **Bootstrap Service**
   - Create new service for app startup
   - Scan vaults folder for manifests
   - Additive merge to registry
   - Atomic registry save

8. **Atomic Write Verification**
   - Confirm `atomic_write()` used for all manifest saves
   - Confirm `atomic_write()` used for all registry saves
   - Add error handling for write failures

### Phase 2: Polish (P1 - Nice to Have)

9. **Manifest Backup System**
   - Create `backups/manifest/` folder
   - Implement backup before overwrite
   - Add retention policy (keep last 5)
   - Cleanup old backups

10. **Integrity Hashes**
    - Add manifest.integrity section
    - Compute on encryption
    - Verify on decryption (optional)

11. **Recovery Test Suite**
    - End-to-end recovery simulation
    - Multi-device conflict scenarios
    - Version rollback protection tests

---

## 8. Quality Assurance

### 8.1 Testing Requirements

**Unit Tests:**
- Label sanitization edge cases
- Version comparison logic
- Manifest merge operations
- Atomic write failures

**Integration Tests:**
- Full encryption → decryption cycle
- Bootstrap merge from multiple manifests
- Version conflict scenarios
- Device UUID generation and persistence

**End-to-End Tests:**
- New machine recovery (no local state)
- Multi-device sync scenarios
- Accidental old version decrypt
- Registry rebuild from manifests

### 8.2 Success Criteria

- ✅ Single `.age` file enables full recovery
- ✅ No data loss in version conflicts
- ✅ Manifest version tracking prevents rollback
- ✅ Folder hierarchy preserved exactly
- ✅ Registry rebuilds deterministically from manifests
- ✅ All 384+ existing tests pass
- ✅ No regression in R1 functionality
- ✅ Label sanitization handles all edge cases
- ✅ Atomic writes prevent corruption

---

## 9. Security Considerations

**Manifest Privacy:**
- Stored in non-sync location (never exposed to cloud)
- Contains only public key metadata (no secrets)
- Encrypted when inside `.age` bundle

**Key Security:**
- Passphrase `.agekey.enc` files always encrypted
- YubiKey private keys never leave hardware
- Recovery codes hashed, never stored plaintext

**Filesystem Safety:**
- Label sanitization prevents path traversal
- Atomic writes prevent partial updates
- Backups protect against accidental overwrites

---

## 10. Migration from R1

**R1 Structure:**
```
~/Documents/Barqly-Vaults/
├── Vault-001.age
└── Vault-001.manifest (external, not in bundle)
```

**R2 Migration:**
1. Detect R1 manifests (external, missing version field)
2. Convert to R2 schema (add version, machine_id, etc.)
3. Move to non-sync location
4. Re-encrypt to include manifest in bundle
5. Mark as migrated to prevent re-processing

**Migration Trigger:** First app startup after R2 upgrade

---

## 11. Related Documentation

- **Implementation Plan:** `docs/engineering/refactoring/backend/refactoring-plan-manifest-recovery.md`
- **ChatGPT Design Discussion:** `tbd/chatgpt_vault_manifest_design-Detail.md`
- **User Journey:** `docs/product/user-journey.md`
- **API Reference:** `docs/engineering/api-reference.md`
- **DDD Architecture:** `docs/engineering/refactoring/centralized-architecture-design.md`

---

## 12. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-10-05 | Manifest in non-sync = authoritative | Enables versioning, prevents cloud exposure |
| 2025-10-05 | Flat manifest storage (no subfolders) | Simpler organization, easier discovery |
| 2025-10-05 | "Newer wins" with backup | Balances UX simplicity with safety |
| 2025-10-05 | Always include .enc in bundle | Enables complete disaster recovery |
| 2025-10-05 | Skip "Export Registry" for R2 | Edge case, defer to R3+ |
| 2025-10-05 | Relative paths only | Portability and privacy |
| 2025-10-05 | Label sanitization required | Filesystem compatibility |

---

## Appendix A: Design Review Confirmation

**Review Sources:**
- ChatGPT architectural analysis
- Claude technical assessment
- Product requirements (Mohammad Nauman)

**Validation Checklist:**
- ✅ All decisions aligned and consistent
- ✅ No architectural contradictions
- ✅ DDD boundaries remain clean
- ✅ Edge cases handled appropriately
- ✅ UX remains simple (automation over prompts)
- ✅ Security maintained (sensitive data in non-sync)
- ✅ Recovery robust (version tracking prevents data loss)
- ✅ Long-term stable (not temporary R2 workaround)

**Conclusion:** Design is ready for implementation. No gaps or glaring issues identified.
