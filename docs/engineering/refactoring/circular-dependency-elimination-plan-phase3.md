# Circular Dependency Elimination - Phase 3
## Services → Commands Backwards Dependencies

**Date:** 2025-10-01
**Status:** PLANNING
**Priority:** P0 - Critical architectural violation

---

## Problem Statement

Services (application layer) are importing types and utilities from Commands (presentation layer), creating backwards dependencies that violate Clean Architecture and DDD principles.

**Architectural Violation:**
```
❌ CURRENT (BACKWARDS):
Services → Commands → Manager → Services (CIRCULAR!)

✅ TARGET (CORRECT):
UI → Commands → Manager → Services
Commands can import DTOs from Services ← This is CORRECT per DDD
```

**Web Research Confirmation (2025):**
- Presentation layer CAN access Application/Domain layer DTOs
- Application/Domain layers MUST NOT know about Presentation layer
- Dependencies always point inward (Presentation → Application → Domain)

---

## Violations Found (23 Service Files)

### Infrastructure Components in Commands (Should be in services/shared/infrastructure)
```
commands/command_types/progress_manager/ → services/shared/infrastructure/progress/
commands/command_types/error_handler.rs → services/shared/infrastructure/error/
commands/crypto/mod.rs (update_global_progress) → services/shared/infrastructure/progress/
```

### Domain DTOs in Commands (Should be in services/{domain}/domain/models/)
```
commands/file/selection.rs (FileInfo, FileSelection, SelectionType) → services/file/domain/models/
commands/file/mod.rs (Manifest) → services/file/domain/models/
commands/crypto/encryption.rs (EncryptDataInput, etc.) → services/crypto/application/dtos/
commands/key_management/unified_keys.rs (KeyInfo, KeyListFilter) → services/key_management/shared/domain/models/
commands/passphrase/*.rs (PassphraseKeyInfo) → services/key_management/passphrase/domain/models/
commands/yubikey/*.rs (YubiKeyStateInfo, YubiKeyState, AvailableYubiKey) → services/key_management/yubikey/domain/models/
```

---

## Phase 1: Move Infrastructure Components (IMMEDIATE)

**Goal:** Eliminate infrastructure components from commands layer

### Milestone 1.1: Move ProgressManager & Related ✅
**Estimated:** 2 hours

#### Tasks:
- [ ] Create `services/shared/infrastructure/progress/`
- [ ] Move `commands/command_types/progress_manager/` → `services/shared/infrastructure/progress/manager/`
  - [ ] Move `mod.rs` (ProgressManager struct - 133 LOC)
  - [ ] Move `debouncer.rs` (~80 LOC)
  - [ ] Move `utils.rs` (~40 LOC)
- [ ] Move `update_global_progress()` from `commands/crypto/mod.rs` → `services/shared/infrastructure/progress/global.rs`
- [ ] Move `PROGRESS_TRACKER`, `ENCRYPTION_IN_PROGRESS` → `services/shared/infrastructure/progress/global.rs`
- [ ] Update `services/shared/infrastructure/mod.rs` to export progress module
- [ ] Backup original files to `docs/engineering/refactoring/backups/phase3/progress/`

**Files to Update:**
- Services (7 files):
  - `services/crypto/application/services/core_encryption_service.rs`
  - `services/crypto/application/services/archive_orchestration_service.rs`
  - `services/crypto/application/services/decryption_orchestration_service.rs`
  - `services/crypto/application/services/vault_encryption_service.rs`
  - `services/crypto/application/services/encryption_service.rs`
  - `services/crypto/application/manager.rs`
- Commands (3 files):
  - `commands/crypto/mod.rs` (remove global state, just re-export)
  - `commands/crypto/encryption.rs`
  - `commands/crypto/progress.rs`

**Import Pattern:**
```rust
// BEFORE (services):
use crate::commands::types::ProgressManager;
use crate::commands::crypto::update_global_progress;

// AFTER (services):
use crate::services::shared::infrastructure::progress::{ProgressManager, update_global_progress};

// BEFORE (commands):
use super::update_global_progress;

// AFTER (commands):
use crate::services::shared::infrastructure::progress::update_global_progress;
```

**Validation:**
```bash
make validate-rust
```

---

### Milestone 1.2: Move ErrorHandler ✅
**Estimated:** 1 hour

#### Tasks:
- [ ] Create `services/shared/infrastructure/error/`
- [ ] Move `commands/command_types/error_handler.rs` → `services/shared/infrastructure/error/handler.rs`
- [ ] Update `services/shared/infrastructure/mod.rs` to export error module
- [ ] Backup original to `docs/engineering/refactoring/backups/phase3/error/`

**Files to Update:**
- Services (7 files - same as above)
- Commands (keep ErrorHandler accessible for commands too via re-export)

**Import Pattern:**
```rust
// BEFORE (services):
use crate::commands::types::ErrorHandler;

// AFTER (services):
use crate::services::shared::infrastructure::error::ErrorHandler;

// Commands can still access via:
use crate::services::shared::infrastructure::error::ErrorHandler;
// OR keep re-export in commands/types for convenience
```

**Validation:**
```bash
make validate-rust
```

---

## Phase 2: Move Domain DTOs (ARCHITECTURAL CORRECTNESS)

**Goal:** Move DTOs to their proper domain locations. Commands will import from services (correct DDD pattern).

### Milestone 2.1: Move File Domain DTOs ✅ COMPLETE
**Estimated:** 2 hours | **Actual:** 1 hour

#### Tasks:
- [x] Create `services/file/domain/models/` if not exists
- [x] Move DTOs to domain:
  - [x] `FileInfo` struct (from `commands/file/selection.rs:29`) → `services/file/domain/models/file_info.rs`
  - [x] `FileSelection` struct (from `commands/file/selection.rs:20`) → `services/file/domain/models/file_selection.rs`
  - [x] `SelectionType` enum (from `commands/file/selection.rs`) → `services/file/domain/models/selection_type.rs`
  - [x] `Manifest` struct (from `commands/file/mod.rs:27`) → `services/file/domain/models/manifest.rs`
- [x] Update `services/file/domain/models/mod.rs` to export all models
- [x] Update `services/file/domain/mod.rs` (already had models re-export)
- [x] Backup originals to `docs/engineering/refactoring/backups/phase3/file/`

**Files Updated:**
- Services (3 files): ✅
  - `services/file/application/services/archive_service.rs`
  - `services/file/application/services/manifest_service.rs`
  - `services/file/application/manager.rs`
- Commands (2 files): ✅
  - `commands/file/selection.rs` (re-exports from services)
  - `commands/file/mod.rs` (re-exports Manifest)

**Import Pattern:**
```rust
// Services:
use crate::services::file::domain::models::{FileInfo, FileSelection, SelectionType, Manifest};

// Commands (re-export for Tauri bindings):
pub use crate::services::file::domain::models::{FileInfo, FileSelection, SelectionType, Manifest};
```

**Validation:**
```bash
make validate-rust
make generate-bindings  # Ensure TypeScript bindings still work
```

---

### Milestone 2.2: Move Crypto Domain DTOs ✅
**Estimated:** 2 hours

#### Tasks:
- [ ] Create `services/crypto/application/dtos/` (DTOs for use case inputs/outputs)
- [ ] Move DTOs:
  - [ ] `EncryptDataInput` (from `commands/crypto/encryption.rs:16`) → `services/crypto/application/dtos/encrypt_input.rs`
  - [ ] `EncryptFilesMultiInput` → `services/crypto/application/dtos/encrypt_multi_input.rs`
  - [ ] `EncryptFilesMultiResponse` → `services/crypto/application/dtos/encrypt_multi_response.rs`
- [ ] Update `services/crypto/application/mod.rs` to export dtos
- [ ] Backup originals to `docs/engineering/refactoring/backups/phase3/crypto/`

**Files to Update:**
- Services (6 files):
  - `services/crypto/application/services/core_encryption_service.rs`
  - `services/crypto/application/services/archive_orchestration_service.rs`
  - `services/crypto/application/services/vault_encryption_service.rs`
  - `services/crypto/application/services/file_validation_service.rs`
  - `services/crypto/application/services/encryption_service.rs`
  - `services/crypto/application/manager.rs`
- Commands (1 file):
  - `commands/crypto/encryption.rs` (re-export)

**Import Pattern:**
```rust
// Services:
use crate::services::crypto::application::dtos::{EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse};

// Commands:
pub use crate::services::crypto::application::dtos::{EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse};
```

**Validation:**
```bash
make validate-rust
make generate-bindings
```

---

### Milestone 2.3: Move Key Management DTOs ✅
**Estimated:** 3 hours

#### Tasks:
- [ ] Create domain models directories:
  - [ ] `services/key_management/shared/domain/models/`
  - [ ] `services/key_management/passphrase/domain/models/`
  - [ ] `services/key_management/yubikey/domain/models/`

- [ ] Move Shared Key DTOs:
  - [ ] `KeyInfo` (from `commands/key_management/unified_keys.rs:51`) → `services/key_management/shared/domain/models/key_info.rs`
  - [ ] `KeyListFilter` → `services/key_management/shared/domain/models/key_list_filter.rs`

- [ ] Move Passphrase DTOs:
  - [ ] `PassphraseKeyInfo` → `services/key_management/passphrase/domain/models/key_info.rs`

- [ ] Move YubiKey DTOs:
  - [ ] `YubiKeyStateInfo` → `services/key_management/yubikey/domain/models/state_info.rs`
  - [ ] `YubiKeyState` → `services/key_management/yubikey/domain/models/state.rs` (might already exist?)
  - [ ] `AvailableYubiKey` → `services/key_management/yubikey/domain/models/available.rs`

- [ ] Update domain mod.rs files to export
- [ ] Backup originals to `docs/engineering/refactoring/backups/phase3/key_management/`

**Files to Update:**
- Services (3 files):
  - `services/key_management/shared/application/manager.rs`
  - `services/key_management/shared/application/services/unified_key_list_service.rs`
  - `services/key_management/yubikey/application/manager.rs`
- Commands (3 files):
  - `commands/key_management/unified_keys.rs`
  - `commands/passphrase/*`
  - `commands/yubikey/*`

**Import Pattern:**
```rust
// Services:
use crate::services::key_management::shared::domain::models::{KeyInfo, KeyListFilter};
use crate::services::key_management::passphrase::domain::models::PassphraseKeyInfo;
use crate::services::key_management::yubikey::domain::models::{YubiKeyStateInfo, YubiKeyState, AvailableYubiKey};

// Commands (re-export):
pub use crate::services::key_management::shared::domain::models::{KeyInfo, KeyListFilter};
// etc.
```

**Validation:**
```bash
make validate-rust
make generate-bindings
```

---

## Phase 3: Cleanup & Verification (QUALITY ASSURANCE)

### Milestone 3.1: Remove Backwards Imports ✅
**Estimated:** 1 hour

#### Tasks:
- [ ] Search and verify NO `use crate::commands::*` in services:
```bash
rg "use crate::commands" src-tauri/src/services
```
- [ ] Should return ZERO results
- [ ] Update `commands/command_types/mod.rs` to re-export from services if needed for commands
- [ ] Mark TODO items for any temporary workarounds

**Validation:**
```bash
# Verify no backwards dependencies
rg "use crate::commands" src-tauri/src/services/ && echo "FAIL: Found backwards imports" || echo "PASS: No backwards imports"
make validate-rust
```

---

### Milestone 3.2: Verify Architecture Compliance ✅
**Estimated:** 1 hour

#### Tasks:
- [ ] Create architecture validation script in `scripts/validate-architecture.sh`:
```bash
#!/bin/bash
# Check for backwards dependencies
if rg "use crate::commands" src-tauri/src/services/; then
    echo "❌ FAIL: Services importing from Commands (backwards dependency)"
    exit 1
fi
echo "✅ PASS: No backwards dependencies found"
```
- [ ] Run full validation suite:
```bash
make validate-rust
make generate-bindings
make validate-ui
```
- [ ] Manual testing of all workflows:
  - [ ] Create vault
  - [ ] Add keys (passphrase + YubiKey)
  - [ ] Encrypt files
  - [ ] Decrypt files
  - [ ] Progress reporting works
  - [ ] Error handling works

---

### Milestone 3.3: Update Documentation ✅
**Estimated:** 30 minutes

#### Tasks:
- [ ] Update `docs/engineering/refactoring/circular-dependency-elimination-plan.md`:
  - [ ] Mark Phase 3 complete
  - [ ] Document final architecture
- [ ] Update `docs/engineering/context.md` with new import patterns
- [ ] Update `CLAUDE.md` if needed
- [ ] Create commit with comprehensive notes

---

## Success Criteria

- [ ] **Zero backwards dependencies:** `rg "use crate::commands" src-tauri/src/services/` returns nothing
- [ ] **All tests passing:** 619 tests ✅
- [ ] **TypeScript bindings work:** Commands still export DTOs for Tauri
- [ ] **UI functional:** All 4 screens working perfectly
- [ ] **Clean architecture:** Presentation → Application → Domain (one direction)
- [ ] **LOC:** All moved files < 300 LOC
- [ ] **No exceptions:** No re-exports/wrappers hiding violations

---

## Code Impact Estimate

**Files to Create:** ~12 new files (domain models + infrastructure)
**Files to Move:** ~8 files (ProgressManager modules, ErrorHandler, DTOs)
**Files to Update:** ~23 service files + ~15 command files
**LOC to Move:** ~800 LOC (mostly DTOs and infrastructure)
**Net LOC Change:** +200 LOC (proper structure vs convenience imports)
**Timeline:** 12 hours across 3 phases (9 milestones)

---

## Rollback Plan

Each milestone:
1. Backup originals to `docs/engineering/refactoring/backups/phase3/{milestone}/`
2. If validation fails, restore from backup
3. Commit after each successful milestone

---

## Notes

- **DDD Confirmation:** Presentation layer CAN import from Application/Domain (web research 2025)
- **TypeScript Bindings:** Commands re-export DTOs from services for Tauri
- **No Exceptions:** Following user requirement - no wrappers/bridges
- **Incremental:** Test after every milestone with `make validate-rust`
- **Context:** Working app, refactoring for architectural correctness only

---

**Ready for execution after user approval** ✅
