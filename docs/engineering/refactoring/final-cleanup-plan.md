# Final Architecture Cleanup Plan

**Objective**: Eliminate remaining scattered code - move domain models to domains, consolidate file_ops infrastructure.

**Remaining Issues:**
1. `src/file_ops/` at root level (should be in file domain infrastructure)
2. `src/models/` scattered domain models (should be in respective domains)
3. `services/file/infrastructure/file_repository.rs` is a wrapper (duplication)

---

## Phase 1: Consolidate File Operations ✅ COMPLETE

### Milestone 1.1: Move file_ops to File Domain ✅
- [x] Backup src/file_ops/ (existed in both locations)
- [x] Move `src/file_ops/` → `services/file/infrastructure/file_operations/` (already done by previous session)
- [x] Delete `services/file/infrastructure/file_repository.rs` (wrapper - duplication)
- [x] Update services/file/infrastructure/mod.rs exports
- [x] Update all imports (2 commands, 9 services, 12 tests - 18 total):
  - commands/crypto/file_helpers.rs
  - commands/crypto/manifest.rs
  - services/file/* (3 files)
  - services/crypto/* (6 files)
  - tests/* (12 files)
- [x] Remove `pub mod file_ops` from src/lib.rs
- [x] Verify: `make validate-rust` passes (All 619 tests passing)
- [x] Commit: "refactor: complete file_ops migration to file domain infrastructure" (commit 3367a004)

---

## Phase 2: Move Domain Models to Domains ✅ COMPLETE

### Milestone 2.1: Move Vault Model ✅
- [x] Backup src/models/vault.rs (git has it)
- [x] Move `src/models/vault.rs` → `services/vault/domain/models/vault.rs`
- [x] Update services/vault/domain/models/mod.rs to export Vault
- [x] Update all imports (1 command, 7 services, 0 tests)
- [x] Verify: `make validate-rust` passes (All 619 tests passing)
- [x] Commit: "refactor: move Vault model to vault domain" (commit 36478b46)

### Milestone 2.2: Move KeyReference to Key Management ✅
- [x] Create `services/key_management/shared/domain/` directory
- [x] Create `services/key_management/shared/domain/models/` directory
- [x] Move `src/models/key_reference.rs` → `key_management/shared/domain/models/key_reference.rs`
- [x] Create `key_management/shared/domain/models/mod.rs`
- [x] Create `key_management/shared/domain/mod.rs`
- [x] Update key_management/shared/mod.rs to export domain models
- [x] Update all imports (3 commands, 3 services, 1 test)
- [x] Verify: `make validate-rust` passes (All 619 tests passing)
- [x] Commit: "refactor: move KeyReference to key_management shared domain" (commit 6ff2beaf)

### Milestone 2.3: Delete src/models ✅
- [x] Verify src/models/ is empty (only mod.rs with comment)
- [x] Delete `src/models/` directory
- [x] Remove `pub mod models` from src/lib.rs
- [x] Verify: `make validate-rust` passes (All 619 tests passing)
- [x] Commit: "refactor: eliminate src/models - moved to domain layers" (commit 9071866a)

---

## Phase 3: Organize key_management/shared ✅ COMPLETE

### Milestone 3.1: Create Domain Structure ✅
- [x] Move `key_management/shared/traits.rs` → `key_management/shared/domain/traits.rs`
- [x] Move `key_management/shared/registry.rs` → `key_management/shared/domain/registry.rs`
- [x] Update `key_management/shared/domain/mod.rs` exports (handle DeviceRegistry name collision)
- [x] Update key_management/shared/mod.rs exports (import from domain::)
- [x] Add FUTURE USE documentation comments
- [x] Verify: `make validate-rust` passes (All 619 tests passing)
- [x] Commit: "refactor: organize key_management/shared into proper DDD structure" (commit 5d1d717b)

---

## Success Criteria

- [x] src/file_ops/ moved to services/file/infrastructure ✅
- [x] src/models/ deleted - all models in their domains ✅
- [x] services/file/infrastructure/file_repository.rs deleted (wrapper) ✅
- [x] key_management/shared properly organized (application/domain/infrastructure) ✅
- [x] All 619 tests passing ✅
- [x] Zero duplication ✅
- [x] Clean DDD structure throughout ✅

## 🎉 ALL PHASES COMPLETE!

---

## Code Impact

- **Files to move**: 3 (file_ops, vault.rs, key_reference.rs)
- **Files to delete**: 1 (file_repository.rs wrapper)
- **Directories to reorganize**: 1 (key_management/shared)
- **Import updates**: ~30 files
- **LOC to delete**: ~50 (wrapper code)

**Timeline**: 30-45 minutes
