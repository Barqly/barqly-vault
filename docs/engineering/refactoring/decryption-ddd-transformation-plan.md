# Decryption DDD Transformation Plan

**Objective**: Transform crypto domain from mixed concerns to proper DDD architecture. Eliminate fake domains (storage, crypto) by moving to proper infrastructure.

**Reference**: Encryption transformation (876 lines → 139 lines + 6 services)

---

## Phase 1: Key Management Foundation ✅ COMPLETE

### Milestone 1.1: Move KeyRegistry to Infrastructure ✅ COMPLETE
- [x] Create `key_management/shared/infrastructure/` directory
- [x] Move `storage/key_registry.rs` → `key_management/shared/infrastructure/registry_persistence.rs`
- [x] Create `infrastructure/mod.rs` with re-exports
- [x] Update `key_management/shared/mod.rs` to include infrastructure
- [x] Add backward compatibility re-exports in `storage/mod.rs`
- [x] Verify: All 384 tests passing
- [x] Commit: "feat: move KeyRegistry to key_management infrastructure layer"

### Milestone 1.2: Create KeyRegistryService ✅ COMPLETE
- [x] Create directory: `key_management/shared/application/services/`
- [x] Create `registry_service.rs` (~330 lines - larger due to lifecycle ops)
- [x] Implement existing operations wrapper (load, get_key, list_keys, register, update, remove, etc.)
- [x] Add comprehensive error handling with KeyManagementError
- [x] Add debug/info/warn logging throughout
- [x] Add basic tests (#[cfg(test)] module)
- [x] Update `key_management/shared/application/mod.rs` exports
- [x] Verify: `make validate-rust` passes
- [x] Commit: "feat: create KeyRegistryService with lifecycle operations"

### Milestone 1.3: Add Key Lifecycle Operations ✅ COMPLETE (merged with 1.2)
- [x] Implement `detach_key_from_vault(key_id, vault_id)` - removes from vault.keys, keeps in registry
- [x] Implement `delete_key_permanently(key_id, confirm)` - checks vault usage, deletes .key file for passphrase
- [x] Implement `is_key_used_by_vaults(key_id)` - scans manifests, returns vault IDs
- [x] Add safety checks and confirmation requirements
- [x] Add comprehensive error types in KeyManagementError
- [x] Verify: `make validate-rust` passes
- [x] Note: Integrated into Milestone 1.2 for cohesion

### Milestone 1.4: Update Crypto Services ✅ COMPLETE
- [x] Update `crypto/services/vault_encryption_service.rs` to use KeyRegistryService
- [x] Replace `storage::KeyRegistry` with `KeyRegistryService` calls
- [x] Update collect_vault_public_keys() to use service layer
- [x] Verify no direct KeyRegistry usage in crypto services layer
- [x] Verify: `make validate-rust` passes (614 tests)
- [x] Commit: "feat: update VaultEncryptionService to use KeyRegistryService"

### Milestone 1.5: Phase 1 Validation ✅ COMPLETE
- [x] Run `make validate-rust` - all 614 tests passing
- [x] Manual test: encryption/decryption verified by user
- [x] Phase 1 complete - KeyRegistryService fully integrated

---

## Phase 2: Decryption Services ✅ COMPLETE

### Milestone 2.1: Backup & Setup ✅ COMPLETE
- [x] Copy `commands/crypto/decryption.rs` → `docs/engineering/backups/decryption_original.rs`

### Milestone 2.2: Create Decryption Services ✅ COMPLETE
- [x] Create `KeyRetrievalDecryptionService` (~50 lines) - get_decryption_key_info() using KeyRegistryService
- [x] Create `PassphraseDecryptionService` (~100 lines) - decrypt_with_passphrase() calls key_management + crypto
- [x] Create `YubiKeyDecryptionService` (~65 lines) - decrypt_with_yubikey() calls crypto::decrypt_yubikey_cli
- [x] Create `ArchiveExtractionService` (~110 lines) - extract_archive(), validates dirs, extracts TAR
- [x] Create `ManifestVerificationService` (~125 lines) - verify_manifest(), restore_external_manifest()
- [x] Create `DecryptionOrchestrationService` (~180 lines) - coordinates all services with progress
- [x] All services: preserved exact logic, added logging, added instrumentation, added tests
- [x] Update `crypto/services/mod.rs` exports
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: create 5 modular decryption services + orchestrator"

### Milestone 2.3: Transform Command to Thin Wrapper ✅ COMPLETE
- [x] Keep input/output structs in commands layer
- [x] Keep command-level validation only
- [x] Remove all business logic (now in DecryptionOrchestrationService)
- [x] Remove helper functions (moved to services)
- [x] Add service instantiation and delegation pattern
- [x] Reduced from 377 lines → 127 lines (250 lines removed, 66% reduction)
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: transform decryption command to thin DDD wrapper"

### Milestone 2.4: Validation ✅ COMPLETE
- [x] Run `make validate-rust` - all 619 tests passing
- [x] Manual test ready: user will test passphrase/YubiKey decryption
- [x] Progress tracking preserved through orchestration service
- [x] Comprehensive logging at all layers
- [x] Phase 2 complete

---

## Phase 3: Progress Service

### Milestone 3.1: Progress Service Transformation
- [ ] Backup `commands/crypto/progress.rs` (171 lines)
- [ ] Create `ProgressService` in `crypto/services/`
- [ ] Move business logic from command to service
- [ ] Transform command to thin wrapper
- [ ] Update manager
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "feat: transform progress to DDD service layer"

---

## Phase 4: unified_keys.rs Refactoring ✅ COMPLETE

**Goal:** Transform 683-line monolithic command file using Service-First approach. Eliminate tech debt: architectural violations, code duplication, missing service delegation.

### Milestone 4.1: Complete UnifiedKeyListService ✅ COMPLETE
- [x] Backup original file to `docs/engineering/backups/unified_keys_original.rs`
- [x] Analyze 683-line file: 6 types, 3 converters, 5 list functions, 2 operations
- [x] Identify architectural violations:
  - Direct `KeyRegistry::load()` calls (3 occurrences)
  - `remove_key_from_vault` duplicates `KeyRegistryService.detach_key_from_vault()`
  - `update_key_label` should use `KeyRegistryService.update_key()`
- [x] Create `UnifiedKeyListService` (~270 lines) in `services/key_management/shared/application/services/`
- [x] Implement 4 filtering strategies (All, ForVault, AvailableForVault, ConnectedOnly)
- [x] Move all list_* helper functions to service (4 functions, ~200 lines)
- [x] Replace all `KeyRegistry::load()` with `KeyRegistryService` calls in service
- [x] Add comprehensive logging and instrumentation
- [x] Add tests for UnifiedKeyListService
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: create UnifiedKeyListService for cross-subsystem key aggregation"

### Milestone 4.2: Transform Commands to Thin Wrappers ✅ COMPLETE
- [x] Update `list_unified_keys()` → delegate to `UnifiedKeyListService.list_keys()` (12 lines → 8 lines)
- [x] Update `remove_key_from_vault()` → delegate to `KeyRegistryService.detach_key_from_vault()` (46 → 30 lines)
- [x] Update `update_key_label()` → delegate to `KeyRegistryService.update_key()` (110 → 90 lines)
- [x] Removed 4 helper functions (203 lines total)
- [x] Keep only: validation, service delegation, response formatting in commands
- [x] Achieved: Reduced from 683 lines → 442 lines (241 lines removed, 35% reduction)
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: transform unified_keys commands to use service layer"

### Milestone 4.3: Final Validation ✅ COMPLETE
- [x] Run `make validate-rust` - all 619 tests passing
- [x] Verified: No code duplication remains
- [x] Verified: No direct `KeyRegistry::load()` calls in unified_keys commands
- [x] Verified: All commands now use proper service layer
- [x] Final size: 442 lines (from 683 - still has conversion functions + types)
- [x] All architectural violations eliminated
- [x] Phase 4 complete - tech debt eliminated

---

## Phase 5: Storage Dissolution

### Milestone 5.1: Move vault_store
- [ ] Move `storage/vault_store/` → `vault/infrastructure/metadata_persistence/`
- [ ] Update all vault_store imports
- [ ] Verify: `make validate-rust` passes

### Milestone 5.2: Move Remaining Storage Utilities
- [ ] Assess `storage/path_management/` - keep as shared infrastructure or move
- [ ] Assess `storage/cache/` - move to crypto/infrastructure or remove
- [ ] Update imports as needed
- [ ] Verify: `make validate-rust` passes

### Milestone 5.3: Delete Storage Module
- [ ] Verify NO remaining `use crate::storage::KeyRegistry` references
- [ ] Verify NO remaining `use crate::storage::vault_store` references
- [ ] Delete `src-tauri/src/storage/` directory (except path_management if keeping)
- [ ] Remove storage from `src-tauri/src/lib.rs`
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "feat: dissolve storage module into domain infrastructure"

---

## Phase 6: Documentation & Final Validation

### Milestone 6.1: Update Documentation
- [ ] Update `CLAUDE.md` with KeyRegistryService interfaces
- [ ] Update `context.md` with refined architecture
- [ ] Update architecture diagrams (already done in centralized-architecture-design.md)
- [ ] Mark plan milestones complete

### Milestone 6.2: Final Validation
- [ ] Run `make validate-rust` - all tests passing
- [ ] Manual test: full encryption workflow
- [ ] Manual test: full decryption workflow (passphrase + YubiKey)
- [ ] Manual test: key lifecycle operations (create, attach, detach, delete)
- [ ] Manual test: vault operations
- [ ] Verify no "TODO" or "bridge" comments remain
- [ ] Commit: "docs: update architecture documentation for DDD transformation"

---

## Success Criteria

- [ ] All 614+ backend tests passing
- [ ] Decryption command reduced to ~150 lines
- [ ] 6 new focused decryption services created (~100-150 lines each)
- [ ] KeyRegistryService implemented with full lifecycle
- [ ] storage::KeyRegistry moved to key_management/infrastructure
- [ ] All crypto services use KeyRegistryService (no storage module calls)
- [ ] unified_keys.rs decomposed into focused modules
- [ ] storage module dissolved (or minimal shared utils only)
- [ ] No architectural shortcuts or bridges remaining
- [ ] Architecture diagrams updated
- [ ] Documentation updated

---

## Code Impact Estimate

- **Files to create**: ~15 new service files
- **Files to refactor**: ~8 command files
- **Files to move**: ~5 infrastructure files
- **LOC to move**: ~1,500 LOC from commands to services
- **LOC to delete**: ~800 LOC (storage module dissolution)
- **Import updates**: ~30 files
- **Timeline**: 12-15 hours across 6 phases

**Priority**: P0 - Complete crypto domain DDD transformation
