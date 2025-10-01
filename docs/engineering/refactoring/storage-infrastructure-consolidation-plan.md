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

## Phase 1: Error Consolidation ✅ COMPLETE

### Milestone 1.1: Merge StorageError into src/error/ ✅ COMPLETE
- [x] Backup src/storage/errors.rs
- [x] Create src/error/storage.rs with StorageError enum
- [x] Update all `use crate::storage::errors::StorageError` → `use crate::error::StorageError` (6 files)
- [x] Update src/error/mod.rs to export storage errors
- [x] Delete src/storage/errors.rs
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: consolidate shared infrastructure into services/shared"

---

## Phase 2: Create services/shared/infrastructure

### Milestone 2.1: Create Shared Infrastructure Structure ✅ COMPLETE
- [x] Create `services/shared/infrastructure/` directory
- [x] Create `services/shared/infrastructure/mod.rs` with exports
- [x] Create `services/shared/mod.rs`
- [x] Verify structure created

### Milestone 2.2: Move path_management ✅ COMPLETE
- [x] Copy `src/storage/path_management/` → `services/shared/infrastructure/path_management/`
- [x] Update `services/shared/infrastructure/mod.rs` exports
- [x] Update all imports (5 service files)
- [x] Delete `src/storage/path_management/`
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: consolidate shared infrastructure into services/shared"

### Milestone 2.3: Move caching ✅ COMPLETE
- [x] Copy `src/storage/cache/` → `services/shared/infrastructure/caching/`
- [x] Update `services/shared/infrastructure/mod.rs` exports
- [x] Update all imports (2 key_storage files)
- [x] Delete `src/storage/cache/`
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: consolidate shared infrastructure into services/shared"

### Milestone 2.4: Move key_registry from key_management/shared ⚠️ PENDING
- [ ] Move `key_management/shared/infrastructure/key_storage/` → `services/shared/infrastructure/key_storage/`
- [ ] Move `key_management/shared/infrastructure/registry_persistence.rs` → `services/shared/infrastructure/registry_persistence.rs`
- [ ] Update `services/shared/infrastructure/mod.rs` exports
- [ ] Update key_management/shared/infrastructure/mod.rs to re-export from services/shared
- [ ] Update all cross-domain imports (7 crypto domain files)
- [ ] Update key_management/shared/mod.rs exports
- [ ] Verify: `make validate-rust` passes
- [ ] Commit: "refactor: move key registry to services/shared/infrastructure"

---

## Phase 3: Delete services/storage Fake Domain ✅ COMPLETE

### Milestone 3.1: Delete services/storage & commands/storage ✅ COMPLETE
- [x] Verified commands/storage commands NOT used by UI (dead code)
- [x] Delete `services/storage/` directory entirely (809 lines)
- [x] Delete `commands/storage/` directory (5 unused commands)
- [x] Remove from services/mod.rs and commands/mod.rs
- [x] Unregister commands from lib.rs
- [x] Regenerate TypeScript bindings (dead commands removed)
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: delete services/storage fake domain and unused commands"

---

## Phase 4: Fix Architectural Violations ✅ COMPLETE

### Milestone 4.1: Fix generation_commands.rs ✅ COMPLETE
- [x] Added `label_exists()` method to PassphraseManager
- [x] Updated passphrase/generation_commands.rs to use manager.label_exists()
- [x] Removed direct `storage::list_keys()` call
- [x] Verified: Commands never call infrastructure directly
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: eliminate src/storage completely - NO re-exports!"

---

## Phase 5: Delete src/storage ✅ COMPLETE

### Milestone 5.1: Complete Elimination ✅ COMPLETE
- [x] Updated ALL callers to use proper paths (29 files)
- [x] Deleted `src/storage/` directory entirely
- [x] Removed `pub mod storage` from src/lib.rs
- [x] NO backward compatibility re-exports (proper migration)
- [x] Verify: `make validate-rust` passes (619 tests)
- [x] Commit: "feat: eliminate src/storage completely - NO re-exports!"

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
