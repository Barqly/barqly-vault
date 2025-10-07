# Manifest Schema Reorganization Plan

**Status:** READY TO IMPLEMENT
**Created:** October 7, 2025
**Priority:** P1 - Schema Cleanup
**Estimated Effort:** 1-2 hours (careful implementation)
**Breaking Change:** YES - Schema v1 → v2

---

## Context & Motivation

### Current Problem

Manifest schema is **flat and disorganized** - fields are scattered without logical grouping:

```json
{
  "schema": "barqly.vault.manifest/1",
  "vault_id": "...",
  "label": "...",
  "encryption_revision": 2,
  "created_at": "...",
  "last_encrypted_at": "...",
  "selection_type": "folder",  ← REDUNDANT
  "base_path": "Test",         ← POOR NAME
  "encryption_method": "age",
  "recipients": [...],
  "files": [...],
  "file_count": 3,
  "total_size": 40
}
```

### Goals

1. **Organize related fields** into logical groups
2. **Remove redundancy** (selection_type can be inferred)
3. **Better naming** (base_path → source_root)
4. **Nested statistics** (file_count + total_size → stats)
5. **Preserve ALL business logic** (COPY → ADJUST, no rewrites)

---

## Target Schema Structure

### AFTER (Organized, Clean):

```json
{
  "schema": "barqly.vault.manifest/2",

  "vault": {
    "id": "6gzGTUAUk2uwmBKRwqiUV1",
    "label": "AKAH Family Vault",
    "description": "Test Vault",
    "sanitized_name": "AKAH-Family-Vault"
  },

  "versioning": {
    "revision": 2,
    "created_at": "2025-10-07T19:10:17.970055Z",
    "last_encrypted": {
      "at": "2025-10-07T19:10:17.970151Z",
      "by": {
        "machine_id": "d031d643-b1c5-4f8d-9447-fbb0377aff61",
        "machine_label": "MN---MBP16.local"
      }
    }
  },

  "encryption": {
    "method": "age",
    "recipients": [...]
  },

  "content": {
    "source_root": "Test",  // Was base_path (null for file selection)
    "files": [...],
    "stats": {
      "count": 3,
      "total_bytes": 40
    }
  }
}
```

### Key Changes:

| Old Field | New Location | Notes |
|-----------|-------------|-------|
| `vault_id` | `vault.id` | Grouped with vault info |
| `label` | `vault.label` | Same group |
| `description` | `vault.description` | Same group |
| `sanitized_name` | `vault.sanitized_name` | Same group |
| `encryption_revision` | `versioning.revision` | Clearer name |
| `created_at` | `versioning.created_at` | Grouped |
| `last_encrypted_at` | `versioning.last_encrypted.at` | Nested |
| `last_encrypted_by` | `versioning.last_encrypted.by` | Nested |
| `selection_type` | **REMOVED** | Infer from source_root |
| `base_path` | `content.source_root` | Renamed |
| `encryption_method` | `encryption.method` | Grouped |
| `recipients` | `encryption.recipients` | Grouped |
| `files` | `content.files` | Grouped |
| `file_count` | `content.stats.count` | Nested metrics |
| `total_size` | `content.stats.total_bytes` | Renamed + nested |

---

## Required Reading

**MUST READ BEFORE STARTING:**

1. **Architecture Decisions:**
   - `docs/engineering/refactoring/backend/arch-decisions.md`
   - Understand: Manifest = authoritative source
   - Version conflict resolution using encryption_revision

2. **Refactoring Guidelines:**
   - `docs/engineering/refactoring/refactoring-guidelines.md`
   - **CRITICAL:** COPY → ADJUST, never rewrite
   - Backup before changes
   - Validate after each file

3. **Centralized Architecture:**
   - `docs/engineering/refactoring/centralized-architecture-design.md`
   - Understand DDD layer separation

4. **Implementation Summary:**
   - `docs/engineering/refactoring/backend/implementation-summary.md`
   - Context on VaultMetadata usage across services

5. **Current Session Context:**
   - Session achieved: Manifest schema v1 complete
   - Fixed: label preservation, removed protection_mode, sanitized key IDs
   - All 656 tests passing before this refactor

---

## Implementation Plan

### Phase 1: Update Schema Definition

**File:** `src-tauri/src/services/vault/infrastructure/persistence/metadata.rs`

**Action:** Create nested structs, update VaultMetadata

**New Structs to Add:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub sanitized_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Versioning {
    pub revision: u32,  // Was encryption_revision
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_encrypted: Option<EncryptionInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionInfo {
    pub at: DateTime<Utc>,
    pub by: LastEncryptedBy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionConfig {
    pub method: String,
    pub recipients: Vec<RecipientInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_root: Option<String>,  // Was base_path
    pub files: Vec<VaultFileEntry>,
    pub stats: ContentStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentStats {
    pub count: usize,       // Was file_count
    pub total_bytes: u64,   // Was total_size
}
```

**Update VaultMetadata:**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMetadata {
    pub schema: String, // "barqly.vault.manifest/2"
    pub vault: VaultInfo,
    pub versioning: Versioning,
    pub encryption: EncryptionConfig,
    pub content: ContentInfo,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrity: Option<IntegrityInfo>,
}
```

**Add Helper Methods (for easier migration):**

```rust
impl VaultMetadata {
    // Convenience accessors
    pub fn vault_id(&self) -> &str { &self.vault.id }
    pub fn label(&self) -> &str { &self.vault.label }
    pub fn encryption_revision(&self) -> u32 { self.versioning.revision }
    pub fn source_root(&self) -> Option<&str> { self.content.source_root.as_deref() }
    pub fn file_count(&self) -> usize { self.content.stats.count }
    pub fn total_size(&self) -> u64 { self.content.stats.total_bytes }

    // Update increment_version to work with new structure
    pub fn increment_version(&mut self, device_info: &DeviceInfo) {
        self.versioning.revision += 1;
        self.versioning.last_encrypted = Some(EncryptionInfo {
            at: Utc::now(),
            by: LastEncryptedBy {
                machine_id: device_info.machine_id.clone(),
                machine_label: device_info.machine_label.clone(),
            },
        });
    }
}
```

**Update schema constant:**
```rust
schema: "barqly.vault.manifest/2".to_string(),  // Bump version
```

**Validation:** After this change, run `cargo build` - expect MANY compilation errors (expected).

---

### Phase 2: Remove selection_type Field

**Rationale:** Can be inferred from `source_root`:
- `source_root` present → was folder selection
- `source_root` null → was file selection

**Files to Update:**

**1. Remove from VaultMetadata constructor:**
- No longer pass selection_type parameter
- Delete SelectionType enum if only used here

**2. `services/file/infrastructure/file_operations/utils.rs`**
- Function: `collect_files_with_metadata()`
- BEFORE: Takes `selection_type: SelectionType` parameter
- AFTER: Infer from logic:
  ```rust
  pub fn collect_files_with_metadata(
      file_paths: &[String],
      source_root: Option<&str>,  // Renamed from base_path
  ) -> Result<Vec<CollectedFile>> {
      // Detect type: single dir vs files
      let is_folder = file_paths.len() == 1
          && Path::new(&file_paths[0]).is_dir();

      if is_folder {
          // Walk folder
      } else {
          // Process individual files
      }
  }
  ```

**3. `services/crypto/application/manager.rs`**
- Delete `detect_selection_type()` function
- Just detect source_root (folder name or None)

**4. `services/vault/application/services/vault_bundle_encryption_service.rs`**
- Remove selection_type from VaultBundleEncryptionInput
- Pass only source_root to build_file_entries()

**Validation:** `cargo test` after each file change.

---

### Phase 3: Update Field Access Patterns

**Strategy:** Use helper methods or update to nested access.

**Pattern 1: Direct field access**
```rust
// BEFORE:
manifest.vault_id
manifest.label
manifest.encryption_revision

// AFTER (Option A - helper methods):
manifest.vault_id()
manifest.label()
manifest.encryption_revision()

// AFTER (Option B - direct nested):
manifest.vault.id
manifest.vault.label
manifest.versioning.revision
```

**Recommendation:** Use Option A (helper methods) - less invasive, easier rollback.

**Files to Update (Field Access):**

1. `services/vault/application/services/vault_bundle_encryption_service.rs`
   - Access: vault_id, label, encryption_revision
   - Change: Use helper methods

2. `services/vault/application/services/vault_metadata_service.rs`
   - Creates VaultMetadata
   - Update constructor calls to create nested structs

3. `services/vault/application/services/version_service.rs`
   - Access: encryption_revision, last_encrypted_at, last_encrypted_by
   - Change: Use versioning.revision, versioning.last_encrypted

4. `services/vault/application/services/recovery_txt_service.rs`
   - Access: label, last_encrypted_at, last_encrypted_by, recipients
   - Change: Use helper methods

5. `services/vault/application/services/payload_staging_service.rs`
   - Access: sanitized_name, files
   - Change: vault.sanitized_name, content.files

6. `services/vault/infrastructure/persistence/vault_persistence.rs`
   - Access: vault_id, label
   - Change: Use helper methods

7. `services/crypto/application/services/decryption_orchestration_service.rs`
   - Access: label, encryption_revision
   - Change: Use helper methods

8. `services/vault/application/services/bootstrap_service.rs`
   - Access: label, recipients
   - Change: Use helper methods

**Approach:** Update one file at a time, run `cargo test` after each.

---

### Phase 4: Update Test Files

**Files with VaultMetadata::new() calls in tests:**

1. `metadata.rs` - Own tests
2. `vault_persistence.rs` - Persistence tests
3. `recovery_txt_service.rs` - Recovery text tests
4. `version_service.rs` - Version comparison tests
5. `payload_staging_service.rs` - Payload tests
6. `multi_recipient_encryption.rs` - Encryption tests

**Change:** Update test helper functions to create nested structs:

```rust
// BEFORE:
VaultMetadata::new(
    "vault-id".to_string(),
    "Test Vault".to_string(),
    None,
    "Test-Vault".to_string(),
    &device_info,
    None,
    None,
    vec![],
    vec![],
    0,
    0,
)

// AFTER:
VaultMetadata::new(
    VaultInfo {
        id: "vault-id".to_string(),
        label: "Test Vault".to_string(),
        description: None,
        sanitized_name: "Test-Vault".to_string(),
    },
    Versioning {
        revision: 1,
        created_at: Utc::now(),
        last_encrypted: None,
    },
    EncryptionConfig {
        method: "age".to_string(),
        recipients: vec![],
    },
    ContentInfo {
        source_root: None,
        files: vec![],
        stats: ContentStats {
            count: 0,
            total_bytes: 0,
        },
    },
)
```

---

## Files to Modify (Complete List)

### Core Schema (1 file):
- ✅ `services/vault/infrastructure/persistence/metadata.rs` (PRIMARY)
  - Add nested structs
  - Update VaultMetadata
  - Add helper methods
  - Update schema to "barqly.vault.manifest/2"

### Business Logic (8 files):
- ✅ `services/vault/application/services/vault_metadata_service.rs`
  - Update build_from_vault_and_registry()
  - Update create_new_manifest()
  - Create nested structs

- ✅ `services/vault/application/services/vault_bundle_encryption_service.rs`
  - Remove selection_type parameter
  - Update field access to use helpers
  - Update build_file_entries() signature

- ✅ `services/vault/application/services/version_service.rs`
  - Update compare_manifests()
  - Access versioning.revision instead of encryption_revision
  - Update backup/restore logic

- ✅ `services/vault/application/services/recovery_txt_service.rs`
  - Update generate() method
  - Access nested fields via helpers

- ✅ `services/vault/application/services/payload_staging_service.rs`
  - Update create_vault_payload()
  - Access content.files, vault.sanitized_name

- ✅ `services/vault/infrastructure/persistence/vault_persistence.rs`
  - Update save/load logic
  - Field access via helpers

- ✅ `services/crypto/application/services/decryption_orchestration_service.rs`
  - Update decrypt() method
  - Field access via helpers

- ✅ `services/vault/application/services/bootstrap_service.rs`
  - Update scan_vault_manifests()
  - Field access via helpers

### File Operations (3 files):
- ✅ `services/file/infrastructure/file_operations/utils.rs`
  - Update collect_files_with_metadata() signature
  - Remove SelectionType parameter, infer from paths
  - Rename base_path → source_root

- ✅ `services/crypto/application/manager.rs`
  - Remove detect_selection_type() function
  - Just detect source_root (folder name or None)

- ✅ `services/vault/application/services/vault_bundle_encryption_service.rs`
  - Remove selection_type from VaultBundleEncryptionInput struct
  - Update orchestrate_vault_encryption() logic

### Test Files (6 files):
- ✅ `metadata.rs` - Test helper updates
- ✅ `vault_persistence.rs` - Test updates
- ✅ `recovery_txt_service.rs` - Test updates
- ✅ `version_service.rs` - Test updates
- ✅ `payload_staging_service.rs` - Test updates
- ✅ `multi_recipient_encryption.rs` - Test updates

**Total:** 18 files to modify

---

## Detailed Change Specifications

### 1. VaultInfo Struct
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub sanitized_name: String,
}
```

**Why:** Groups vault identification and naming fields together.

### 2. Versioning Struct
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Versioning {
    pub revision: u32,  // Renamed from encryption_revision for clarity
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_encrypted: Option<EncryptionInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionInfo {
    pub at: DateTime<Utc>,
    pub by: LastEncryptedBy,
}
```

**Why:**
- Groups all version tracking together
- Nests last_encrypted fields (only exist after encryption)
- Clearer that `at` and `by` are related

### 3. EncryptionConfig Struct
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionConfig {
    pub method: String,
    pub recipients: Vec<RecipientInfo>,
}
```

**Why:** Groups encryption-related configuration.

### 4. ContentInfo Struct
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentInfo {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_root: Option<String>,  // Was base_path
    pub files: Vec<VaultFileEntry>,
    pub stats: ContentStats,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentStats {
    pub count: usize,       // Was file_count
    pub total_bytes: u64,   // Was total_size
}
```

**Why:**
- Groups payload/content information
- Nests statistics for clarity
- Better naming: source_root (what folder was selected)

---

## Step-by-Step Execution

### Step 1: Backup
```bash
cp src-tauri/src/services/vault/infrastructure/persistence/metadata.rs \
   docs/engineering/refactoring/backups/phase2/metadata.rs.backup
```

### Step 2: Update metadata.rs
1. Add new nested structs (VaultInfo, Versioning, etc.)
2. Update VaultMetadata to use nested structs
3. Add helper methods
4. Update schema to v2
5. Run: `cargo build` (expect errors - OK)

### Step 3: Fix VaultMetadata::new() Constructor
Update signature to accept nested structs instead of flat parameters.

OR create builder pattern:
```rust
impl VaultMetadata {
    pub fn builder() -> VaultMetadataBuilder { ... }
}
```

### Step 4: Update Field Access (One File at a Time)
For each of the 8 business logic files:
1. Read entire file
2. Find all `manifest.field` access
3. Replace with `manifest.vault.field` or helper method
4. Run `cargo test`
5. If pass, commit
6. If fail, rollback and fix

### Step 5: Remove selection_type Logic
1. Update `collect_files_with_metadata()` to infer from paths
2. Remove SelectionType parameter
3. Update all call sites
4. Run `cargo test`

### Step 6: Update Tests
Update test helper functions to create nested structs.

### Step 7: Final Validation
```bash
cargo test          # All tests must pass
make validate       # Full validation
```

### Step 8: Test Migration
1. Keep an old v1 manifest
2. Add migration logic to auto-convert v1 → v2
3. Test loading old manifest converts correctly

---

## Rollback Strategy

**If anything breaks:**
```bash
git reset --hard HEAD
cp docs/engineering/refactoring/backups/phase2/metadata.rs.backup \
   src-tauri/src/services/vault/infrastructure/persistence/metadata.rs
```

**Validation before proceeding:**
- Every file change must pass `cargo test`
- Never batch multiple file changes without testing

---

## Migration Logic (Add Later)

```rust
impl VaultMetadata {
    pub fn from_v1(old: serde_json::Value) -> Result<Self> {
        // Detect v1 by checking for flat vault_id field
        // Convert to v2 nested structure
        // Save as v2 going forward
    }
}
```

---

## Success Criteria

**After completion:**
- ✅ All 656+ tests passing
- ✅ New vaults create v2 manifest
- ✅ Old v1 manifests auto-migrate on load
- ✅ Encryption/decryption works unchanged
- ✅ No business logic altered
- ✅ Cleaner, more organized schema

---

## Critical Reminders

**From refactoring-guidelines.md:**

1. **COPY → ADJUST** - Don't rewrite logic
2. **One file at a time** - Validate after each
3. **Backup first** - Always have rollback path
4. **No shortcuts** - Test every change
5. **Preserve all logic** - Only reorganize, don't "improve"

**From previous session mistakes:**
- Don't mark complete when broken
- Don't skip validation
- Don't hardcode values
- Check ALL call sites before claiming done

---

## Context for Next Session

**What was accomplished in this session:**
1. ✅ Fixed vault creation (VaultMetadata schema)
2. ✅ Fixed orphaned YubiKey registration
3. ✅ Secure folder encryption with temp file cleanup
4. ✅ System file exclusion (.DS_Store, etc.)
5. ✅ Manifest cleanup (optional fields, schema naming)
6. ✅ Label sanitization (backend + frontend)
7. ✅ Sanitized key IDs (no more random keyref_xxx)

**What's pending:**
- Manifest schema reorganization (this document)
- Frontend TypeScript sanitization testing
- Integration test improvements

**Current state:** Clean, working, all 656 tests passing.

---

## Estimation

**Time:** 1-2 hours with careful validation
**Complexity:** MODERATE (schema change, many files)
**Risk:** MEDIUM (breaking change, but with migration path)
**Context needed:** ~150k tokens (plenty in fresh session)

---

**DO NOT START WITHOUT:**
1. Reading arch-decisions.md
2. Reading refactoring-guidelines.md
3. Backing up metadata.rs
4. Fresh session with full context
