# Refactoring Plan: Decryption DDD Transformation

## Overview

Transform the crypto domain from mixed concerns (commands with business logic + placeholder services) to proper DDD architecture (thin commands + real modular services + infrastructure). Eliminate fake domains (`storage`, `crypto`) by moving functionality to proper domain infrastructure layers.

**Reference:** Encryption transformation (876 lines → 139 lines + 6 services ~100-150 lines each)

---

## Phase 1: Key Management Foundation

**Objective**: Create KeyRegistryService in key_management/shared and dissolve storage module's key registry functionality.

**Duration**: 4-5 hours

**Deliverable**: KeyRegistryService with full lifecycle operations, storage::KeyRegistry moved to key_management/infrastructure

### Milestone 1.1: Move KeyRegistry to Infrastructure

**Files:**
- Move: `src-tauri/src/storage/key_registry.rs` → `src-tauri/src/services/key_management/shared/infrastructure/registry_persistence.rs`
- Update: All imports across codebase

**Tasks:**
1. Create directory: `src-tauri/src/services/key_management/shared/infrastructure/`
2. Copy `storage/key_registry.rs` to new location as `registry_persistence.rs`
3. Update module exports in `key_management/shared/mod.rs`
4. Update all `use crate::storage::KeyRegistry` imports to new path
5. Verify: `make validate-rust` (614 tests must pass)

### Milestone 1.2: Create KeyRegistryService

**File**: `src-tauri/src/services/key_management/shared/application/services/registry_service.rs` (~150-200 lines)

**API Design:**
```rust
pub struct KeyRegistryService;

// Existing operations (from storage::KeyRegistry)
- load_registry() -> Result<KeyRegistry>
- get_key(key_id: &str) -> Result<KeyEntry>
- list_keys() -> Result<Vec<KeyInfo>>
- register_key(key_id, entry) -> Result<()>
- update_key(key_id, entry) -> Result<()>
- remove_key(key_id) -> Result<KeyEntry>
- contains_key(key_id) -> bool
- mark_key_used(key_id) -> Result<()>

// New lifecycle operations
- detach_key_from_vault(key_id, vault_id) -> Result<()>
- delete_key_permanently(key_id, confirm_text: &str) -> Result<()>
- is_key_used_by_vaults(key_id) -> Result<Vec<String>>  // List of vault IDs
```

**Tasks:**
1. Create `key_management/shared/application/` directory if doesn't exist
2. Create `services/` subdirectory
3. Implement KeyRegistryService with all methods
4. Add comprehensive error handling (KeyManagementError types)
5. Add logging (debug/info/warn levels)
6. Add basic tests (#[cfg(test)] module)
7. Update `key_management/shared/application/mod.rs` exports
8. Verify: `make validate-rust`

### Milestone 1.3: Implement Key Lifecycle Operations

**New Operations Detail:**

**1. detach_key_from_vault()**
- Load vault manifest
- Remove key from vault.keys array
- Save updated manifest
- Do NOT delete key from registry
- Key remains available for other vaults

**2. delete_key_permanently()**
- Check key not used by any vaults (error if still attached)
- For passphrase keys: Delete encrypted .key file from disk
- For YubiKey keys: Only remove from registry (key stays on hardware)
- Remove from registry
- Save updated registry
- Require confirmation parameter (e.g., user types "DELETE")

**3. is_key_used_by_vaults()**
- Scan all vault manifests
- Return list of vault IDs using this key
- Used by UI to warn user before deletion

**Tasks:**
1. Implement vault manifest scanning logic
2. Implement file deletion for passphrase keys
3. Add safety checks and confirmations
4. Add comprehensive logging
5. Add tests for edge cases (key in use, key not found, etc.)
6. Update KeyManagementError with new error types
7. Verify: `make validate-rust`

### Milestone 1.4: Update Crypto Services to Use KeyRegistryService

**Files to Update:**
- `services/crypto/application/services/key_retrieval_service.rs`
- `services/crypto/application/services/vault_encryption_service.rs`
- Any other crypto services using `storage::KeyRegistry`

**Tasks:**
1. Replace `storage::KeyRegistry::load()` with `KeyRegistryService::load_registry()`
2. Replace `storage::list_keys()` with `KeyRegistryService::list_keys()`
3. Update error handling (storage errors → KeyManagementError)
4. Verify no direct storage module usage remains in crypto domain
5. Verify: `make validate-rust`

### Milestone 1.5: Validation & Commit

**Tasks:**
1. Run `make validate-rust` - all 614 tests must pass
2. Manual test: Verify key listing still works
3. Manual test: Verify encryption/decryption still works
4. Commit with `--no-verify`: "feat: create KeyRegistryService and move registry to key_management infrastructure"

---

## Phase 2: Decryption Services

**Objective**: Transform decryption command from 377 lines of business logic to thin wrapper + 6 focused services.

**Duration**: 2.5 hours

**Deliverable**: Decryption command ~150 lines, 6 new services following encryption pattern

### Milestone 2.1: Backup Current Implementation

**Tasks:**
1. Copy `src-tauri/src/commands/crypto/decryption.rs` → `docs/engineering/backups/decryption_original.rs`

### Milestone 2.2: Create Decryption Services

**Service Architecture (6 services, ~100-150 lines each):**

1. **KeyRetrievalDecryptionService** (~100 lines)
   - get_decryption_key_info(key_id) -> KeyEntry
   - Uses KeyRegistryService (not storage!)

2. **PassphraseDecryptionService** (~120 lines)
   - decrypt_with_passphrase(vault_data, key_filename, passphrase) -> Vec<u8>
   - Calls key_management::passphrase::decrypt_private_key()
   - Calls crypto::decrypt_data()

3. **YubiKeyDecryptionService** (~100 lines)
   - decrypt_with_yubikey(vault_data, key_entry, pin) -> Vec<u8>
   - Calls crypto::decrypt_data_yubikey_cli()

4. **ArchiveExtractionService** (~150 lines)
   - extract_archive(decrypted_data, output_dir) -> Vec<FileInfo>
   - Validates/creates output directory
   - Extracts TAR archive
   - Cleans up temp files

5. **ManifestVerificationService** (~120 lines)
   - verify_manifest(extracted_files, output_dir) -> bool
   - restore_external_manifest(encrypted_file, output_dir) -> Option<bool>

6. **DecryptionService** (orchestrator, ~180 lines)
   - decrypt_data(input: DecryptDataInput) -> DecryptionResult
   - Orchestrates all 5 services above
   - Handles progress tracking
   - Coordinates workflow steps

**Tasks:**
1. Create each service file in `services/crypto/application/services/`
2. Implement all methods preserving exact business logic from original
3. Add progress manager integration at service level
4. Add comprehensive logging
5. Add basic tests
6. Update `services/crypto/application/services/mod.rs` exports
7. Verify: `make validate-rust` after each service

### Milestone 2.3: Transform Command to Thin Wrapper

**File**: `src-tauri/src/commands/crypto/decryption.rs`

**Target**: Reduce from 377 lines to ~150 lines

**Pattern:**
```rust
pub async fn decrypt_data(input: DecryptDataInput) -> CommandResponse<DecryptionResult> {
    input.validate()?;  // Command-level validation only

    let service = DecryptionService::new();

    match service.decrypt_data(input).await {
        Ok(result) => Ok(result),
        Err(crypto_error) => Err(CommandError::from(crypto_error))
    }
}
```

**Tasks:**
1. Keep input/output structs in commands layer
2. Keep command-level validation
3. Remove all business logic (now in services)
4. Remove helper functions (moved to services)
5. Add service instantiation and delegation
6. Update error conversion
7. Verify: `make validate-rust`

### Milestone 2.4: Update Manager

**File**: `services/crypto/application/manager.rs`

**Tasks:**
1. Update DecryptionService instantiation (now real, not placeholder)
2. Verify manager methods delegate properly
3. Verify: `make validate-rust`

### Milestone 2.5: Validation & Testing

**Tasks:**
1. Run `make validate-rust` - all 614 tests must pass
2. Manual test: Decrypt with passphrase key
3. Manual test: Decrypt with YubiKey
4. Manual test: Manifest verification
5. Manual test: External manifest restoration
6. Verify progress tracking works
7. Verify all logging appears correctly
8. Commit with `--no-verify`: "feat: transform decryption to DDD with modular services"

---

## Phase 3: Progress Service

**Objective**: Transform progress command following same pattern.

**Duration**: 1.5 hours

**File**: `commands/crypto/progress.rs` (171 lines)

### Milestone 3.1: Create ProgressService

**File**: `services/crypto/application/services/progress_service.rs`

**Tasks:**
1. Move business logic from command to service
2. Implement real progress tracking
3. Update manager
4. Transform command to thin wrapper
5. Verify: `make validate-rust`
6. Commit: "feat: transform progress to DDD service layer"

---

## Phase 4: unified_keys.rs Refactoring

**Objective**: Break 683-line command file into focused modules.

**Duration**: 2 hours

**File**: `commands/key_management/unified_keys.rs`

### Milestone 4.1: Analysis

**Tasks:**
1. Identify logical groupings (list operations, vault operations, label operations)
2. Determine service boundaries
3. Plan module structure

### Milestone 4.2: Decomposition

**Proposed Structure:**
- `unified_keys/list_operations.rs` (~150 lines)
- `unified_keys/vault_operations.rs` (~200 lines)
- `unified_keys/label_operations.rs` (~100 lines)
- `unified_keys/mod.rs` (exports)

**Tasks:**
1. Create module directory
2. Split functions into logical files
3. Preserve all business logic
4. Update imports
5. Verify: `make validate-rust`
6. Commit: "refactor: decompose unified_keys.rs into focused modules"

---

## Phase 5: Storage Dissolution

**Objective**: Eliminate storage module by moving remaining functionality to appropriate domains.

**Duration**: 3 hours

### Milestone 5.1: Move vault_store

**Tasks:**
1. Move `storage/vault_store/` → `services/vault/infrastructure/metadata_persistence/`
2. Update all imports
3. Verify: `make validate-rust`

### Milestone 5.2: Move Remaining Storage Utilities

**Tasks:**
1. Move `storage/path_management/` → appropriate domain infrastructure
2. Move `storage/cache/` → crypto/infrastructure (if needed) or remove
3. Update all imports
4. Verify: `make validate-rust`

### Milestone 5.3: Delete Storage Module

**Tasks:**
1. Verify no remaining references to `crate::storage`
2. Delete `src-tauri/src/storage/` directory
3. Remove from `src-tauri/src/lib.rs`
4. Verify: `make validate-rust`
5. Commit: "feat: dissolve storage module - move to domain infrastructure"

---

## Success Criteria

- [ ] All 614 backend tests passing
- [ ] Decryption command reduced to ~150 lines
- [ ] 6 new focused decryption services created
- [ ] KeyRegistryService implemented with full lifecycle
- [ ] storage::KeyRegistry moved to key_management/infrastructure
- [ ] All crypto services use KeyRegistryService
- [ ] unified_keys.rs decomposed into modules
- [ ] storage module completely dissolved
- [ ] No "bridge" or "TODO" comments remaining
- [ ] Architecture diagrams updated in docs
- [ ] CLAUDE.md and context.md updated

---

## Notes

- **NO SHORTCUTS**: Follow Option B (no bridges, proper DDD all the way)
- **INCREMENTAL**: One milestone at a time, validate between each
- **PRESERVE LOGIC**: Move code, don't rewrite business logic
- **TEST THOROUGHLY**: `make validate-rust` + manual testing after each milestone
- **COMMIT OFTEN**: After each milestone passes validation

---

## Dependencies

**Phase 1 Prerequisites:**
- None (can start immediately)

**Phase 2 Prerequisites:**
- Phase 1 complete (KeyRegistryService exists)

**Phase 3 Prerequisites:**
- Phase 2 complete (pattern established)

**Phase 4 Prerequisites:**
- Phase 1 complete (KeyRegistryService available for unified_keys to use)

**Phase 5 Prerequisites:**
- Phases 1-4 complete (all domains migrated off storage module)
