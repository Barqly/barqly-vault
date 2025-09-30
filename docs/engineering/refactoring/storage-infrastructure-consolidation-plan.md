# Storage & Infrastructure Consolidation Plan

**Objective**: Eliminate storage confusion, consolidate shared infrastructure, fix architectural violations, and achieve consistent patterns across all domains.

**Reference**: Decryption DDD transformation - systematic phase-by-phase approach

---

## Problems Identified

**Architectural Issues:**
1. ❌ Three "storage" locations causing confusion
2. ❌ Commands bypassing service layer (generation_commands.rs line 42)
3. ❌ services/storage is not a real domain (placeholder services with TODOs)
4. ❌ Duplicate StorageError types (src/storage vs services/storage/domain)
5. ❌ key_management/shared used cross-domain (should be services/shared)
6. ❌ src/storage mixed with src/ (should be organized)

**Dead Code Found:**
- services/storage/application/services/key_service.rs - Wraps key_management (duplicate)
- services/storage/application/services/config_service.rs - Placeholder with TODOs
- services/storage/infrastructure/config_repository.rs - Placeholder with TODOs

**Inconsistencies:**
- Storage infrastructure at src/ level (not with services)
- Shared infrastructure split (src/storage vs key_management/shared)

---

## Target Architecture

```
src/
├── error/                           ← Universal error system
│   ├── handler.rs
│   ├── universal.rs
│   └── storage.rs                   ← MERGE storage/errors.rs here
│
└── services/
    ├── shared/                      ← Cross-domain shared infrastructure
    │   └── infrastructure/
    │       ├── path_management/     ← FROM src/storage/path_management
    │       ├── caching/             ← FROM src/storage/cache
    │       └── key_registry/        ← FROM key_management/shared/infrastructure
    │
    ├── key_management/
    │   ├── passphrase/
    │   └── yubikey/
    │
    ├── vault/
    ├── crypto/
    └── file/

commands/
├── config/                          ← RENAME from commands/storage
└── ...
```

---

## Phase 1: Error Consolidation

### Milestone 1.1: Merge StorageError into src/error/
- [ ] Backup src/storage/errors.rs
- [ ] Create src/error/storage.rs with StorageError enum
- [ ] Update all `use crate::storage::errors::StorageError` → `use crate::error::storage::StorageError`
- [ ] Update src/error/mod.rs to export storage errors
- [ ] Delete src/storage/errors.rs
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: consolidate StorageError into error module"

---

## Phase 2: Create services/shared/infrastructure

### Milestone 2.1: Create Shared Infrastructure Structure
- [ ] Create `services/shared/infrastructure/` directory
- [ ] Create `services/shared/infrastructure/mod.rs` with re-exports
- [ ] Create `services/shared/mod.rs`
- [ ] Verify structure created

### Milestone 2.2: Move path_management
- [ ] Copy `src/storage/path_management/` → `services/shared/infrastructure/path_management/`
- [ ] Update `services/shared/infrastructure/mod.rs` exports
- [ ] Update all imports (6 service files):
  - vault/infrastructure/persistence/vault_persistence.rs
  - key_management/shared/infrastructure/key_storage/* (3 files)
  - key_management/shared/infrastructure/registry_persistence.rs
  - crypto/application/services/vault_encryption_service.rs
- [ ] Delete `src/storage/path_management/`
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move path_management to services/shared/infrastructure"

### Milestone 2.3: Move caching
- [ ] Copy `src/storage/cache/` → `services/shared/infrastructure/caching/`
- [ ] Update `services/shared/infrastructure/mod.rs` exports
- [ ] Update all imports (3 files):
  - key_management/shared/infrastructure/key_storage/metadata.rs
  - key_management/shared/infrastructure/key_storage/operations.rs
  - services/storage/application/services/cache_service.rs
- [ ] Delete `src/storage/cache/`
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move caching to services/shared/infrastructure"

### Milestone 2.4: Move key_registry from key_management/shared
- [ ] Move `key_management/shared/infrastructure/key_storage/` → `services/shared/infrastructure/key_storage/`
- [ ] Move `key_management/shared/infrastructure/registry_persistence.rs` → `services/shared/infrastructure/registry_persistence.rs`
- [ ] Update `services/shared/infrastructure/mod.rs` exports
- [ ] Update key_management/shared/infrastructure/mod.rs to re-export
- [ ] Update all cross-domain imports (crypto domain files)
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move key registry to services/shared/infrastructure"

---

## Phase 3: Delete services/storage Fake Domain

### Milestone 3.1: Move Config Models to Commands
- [ ] Copy `services/storage/domain/models/config.rs` → `commands/config/models.rs`
- [ ] Update commands/config (rename from commands/storage)
- [ ] Remove dependency on services/storage domain

### Milestone 3.2: Delete services/storage Entirely
- [ ] Verify NO remaining usage of services/storage (except its own commands)
- [ ] Delete `services/storage/` directory (application, domain, infrastructure)
- [ ] Remove from services/mod.rs
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: delete services/storage fake domain"

---

## Phase 4: Fix Architectural Violations

### Milestone 4.1: Fix generation_commands.rs
- [ ] Update passphrase/generation_commands.rs line 42
- [ ] Replace `storage::list_keys()` with PassphraseManager method
- [ ] Add `list_existing_keys()` method to PassphraseManager if needed
- [ ] Verify: Commands never call infrastructure directly
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "fix: remove command layer infrastructure bypass"

### Milestone 4.2: Rename commands/storage → commands/config
- [ ] Rename directory: commands/storage → commands/config
- [ ] Update module declarations
- [ ] Update command registration in lib.rs
- [ ] Regenerate TypeScript bindings
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: rename commands/storage to commands/config"

---

## Phase 5: Delete src/storage

### Milestone 5.1: Final Cleanup
- [ ] Verify src/storage is now empty (path_management, cache, errors all moved)
- [ ] Delete `src/storage/` directory
- [ ] Remove `pub mod storage` from src/lib.rs
- [ ] Update any remaining backward compatibility re-exports
- [ ] Verify: `make validate-rust` passes
- [ ] Manual test: Full encryption/decryption workflow
- [ ] Commit: "refactor: eliminate src/storage - consolidated into services/shared"

---

## Phase 6: Final Validation

### Milestone 6.1: Architecture Verification
- [ ] Verify: NO commands access infrastructure directly
- [ ] Verify: All domains follow Command → Manager → Service pattern
- [ ] Verify: Shared infrastructure in ONE location (services/shared/infrastructure)
- [ ] Verify: Errors consolidated in src/error/
- [ ] Verify: NO duplicate modules
- [ ] Verify: NO placeholder services with TODOs
- [ ] All 619 tests passing

### Milestone 6.2: Documentation
- [ ] Update architecture diagrams
- [ ] Document services/shared/infrastructure/ purpose
- [ ] Mark plan complete

---

## Success Criteria

- [ ] src/storage/ deleted - consolidated into services/shared/infrastructure
- [ ] services/storage/ deleted - not a real domain
- [ ] src/error/storage.rs created - errors consolidated
- [ ] commands/config/ renamed from commands/storage
- [ ] All shared infrastructure in services/shared/infrastructure/
- [ ] Zero architectural violations (commands → manager → service)
- [ ] All 619 tests passing
- [ ] Manual testing complete

---

## Code Impact Estimate

- **Directories to create**: 1 (services/shared)
- **Directories to move**: 3 (path_management, cache, key_registry)
- **Directories to delete**: 2 (src/storage, services/storage)
- **Files to update**: ~20 import updates
- **LOC to delete**: ~300 (placeholder services + duplicates)
- **Timeline**: 1-2 hours

**Priority**: Complete infrastructure consolidation for solid foundation
