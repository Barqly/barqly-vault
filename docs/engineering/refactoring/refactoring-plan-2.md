# Refactoring Plan 2: Layer Violation Fixes

## Milestone 1: Fix Service-to-Command Dependencies (Layer Violations)

**Objective**: Eliminate inverted dependencies where services import from commands layer. Services should only depend on other services, never on commands (presentation layer).

**Strategy**: One file at a time, preserve all business logic, only change import sources and method calls.

### Task 1.1: Fix storage config_service.rs
- **File**: `src-tauri/src/services/storage/application/services/config_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.2: Fix storage key_service.rs
- **File**: `src-tauri/src/services/storage/application/services/key_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.3: Fix storage manager.rs
- **File**: `src-tauri/src/services/storage/application/manager.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.4: Fix file file_repository.rs
- **File**: `src-tauri/src/services/file/infrastructure/file_repository.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.5: Fix file archive_service.rs
- **File**: `src-tauri/src/services/file/application/services/archive_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.6: Fix file manifest_service.rs
- **File**: `src-tauri/src/services/file/application/services/manifest_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.7: Fix file manager.rs
- **File**: `src-tauri/src/services/file/application/manager.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.8: Fix crypto progress_service.rs
- **File**: `src-tauri/src/services/crypto/application/services/progress_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.9: Fix crypto encryption_service.rs
- **File**: `src-tauri/src/services/crypto/application/services/encryption_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.10: Fix crypto decryption_service.rs
- **File**: `src-tauri/src/services/crypto/application/services/decryption_service.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

### Task 1.11: Fix crypto manager.rs
- **File**: `src-tauri/src/services/crypto/application/manager.rs`
- **Current Issue**: Imports from `commands::`
- **Fix**: Change to import from `services::`
- **Test**: Run `make validate-rust` after change

## Notes
- **PRESERVE ALL BUSINESS LOGIC** - only change import sources
- **ONE FILE AT A TIME** - validate each change before proceeding
- **NO BULK CHANGES** - incremental approach only
- **MAINTAIN PARALLEL STRUCTURE** - commands and services mirror each other

## Success Criteria
- All services import only from other services
- All tests pass (`make validate-rust`)
- Business logic unchanged
- Key management centralization preserved