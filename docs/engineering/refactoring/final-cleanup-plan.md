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

## Phase 2: Move Domain Models to Domains

### Milestone 2.1: Move Vault Model
- [ ] Backup src/models/vault.rs
- [ ] Move `src/models/vault.rs` → `services/vault/domain/models/vault.rs`
- [ ] Update services/vault/domain/models/mod.rs to export Vault
- [ ] Update all imports (~15 files across commands and services)
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move Vault model to vault domain"

### Milestone 2.2: Move KeyReference to Key Management
- [ ] Create `services/key_management/shared/domain/` directory
- [ ] Create `services/key_management/shared/domain/models/` directory
- [ ] Move `src/models/key_reference.rs` → `key_management/shared/domain/models/key_reference.rs`
- [ ] Create `key_management/shared/domain/models/mod.rs`
- [ ] Create `key_management/shared/domain/mod.rs`
- [ ] Update key_management/shared/mod.rs to export domain models
- [ ] Update all imports (~8 files)
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move KeyReference to key_management shared domain"

### Milestone 2.3: Delete src/models
- [ ] Verify src/models/ is empty
- [ ] Delete `src/models/` directory
- [ ] Remove `pub mod models` from src/lib.rs
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: eliminate src/models - moved to domain layers"

---

## Phase 3: Organize key_management/shared

### Milestone 3.1: Create Domain Structure
- [ ] Move `key_management/shared/traits.rs` → `key_management/shared/domain/traits.rs`
- [ ] Move `key_management/shared/registry.rs` → `key_management/shared/domain/registry.rs`
- [ ] Update `key_management/shared/domain/mod.rs` exports
- [ ] Update key_management/shared/mod.rs exports
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: organize key_management/shared into proper DDD structure"

---

## Success Criteria

- [x] src/file_ops/ moved to services/file/infrastructure ✅
- [ ] src/models/ deleted - all models in their domains
- [x] services/file/infrastructure/file_repository.rs deleted (wrapper) ✅
- [ ] key_management/shared properly organized (application/domain/infrastructure)
- [x] All 619 tests passing ✅
- [x] Zero duplication ✅
- [ ] Clean DDD structure throughout (Phase 1 complete, Phases 2-3 remaining)

---

## Code Impact

- **Files to move**: 3 (file_ops, vault.rs, key_reference.rs)
- **Files to delete**: 1 (file_repository.rs wrapper)
- **Directories to reorganize**: 1 (key_management/shared)
- **Import updates**: ~30 files
- **LOC to delete**: ~50 (wrapper code)

**Timeline**: 30-45 minutes
