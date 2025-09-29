# Backend DDD Refactoring Plan - Phase 1

## Milestone 1: Command Structure Standardization (CRITICAL) ✅ COMPLETE
- [x] Rename `commands/vault_commands/` `commands/vault/`
- [x] Rename `commands/file_commands/`  `commands/file/`
- [x] Convert `commands/storage_commands.rs`  `commands/storage/` folder
- [x] Update command imports in lib.rs and commands/mod.rs
- [x] Update TypeScript bindings via `make generate-bindings`

## Milestone 2: Vault Service Layer Creation ✅ COMPLETE
- [x] Create `services/vault/domain/` with Vault domain models and business rules
- [x] Create `services/vault/application/manager.rs` - VaultManager facade
- [x] Create `services/vault/application/services/vault_service.rs` - CRUD operations
- [x] Create `services/vault/application/services/key_association_service.rs` - Key management
- [x] Create `services/vault/infrastructure/vault_repository.rs` - Storage abstraction
- [x] Move business logic from vault_commands into VaultManager (500+ LOC)

## Milestone 3: File Service Layer Creation ✅ COMPLETE
- [x] Create `services/file/domain/` with File domain models and validation rules
- [x] Create `services/file/application/manager.rs` - FileManager facade
- [x] Create `services/file/application/services/archive_service.rs` - Archive operations
- [x] Create `services/file/application/services/manifest_service.rs` - Manifest operations
- [x] Create `services/file/infrastructure/file_repository.rs` - File system abstraction
- [x] Move business logic from file_commands and file_ops into FileManager

## Milestone 4: Crypto Service Layer Creation ✅ COMPLETE
- [x] Create `services/crypto/domain/` with encryption domain models
- [x] Create `services/crypto/application/manager.rs` - CryptoManager facade
- [x] Create `services/crypto/application/services/encryption_service.rs` - Ready for 800+ LOC migration
- [x] Create `services/crypto/application/services/decryption_service.rs` - Ready for 400+ LOC migration
- [x] Create `services/crypto/application/services/progress_service.rs` - Ready for progress logic migration
- [x] Create `services/crypto/infrastructure/age_repository.rs` - Age crypto operations

## Milestone 5: Storage Service Layer Creation ✅ COMPLETE
- [x] Create `services/storage/domain/` with configuration domain models
- [x] Create `services/storage/application/manager.rs` - StorageManager facade
- [x] Create `services/storage/application/services/config_service.rs` - App configuration
- [x] Create `services/storage/application/services/cache_service.rs` - Cache management
- [x] Create `services/storage/infrastructure/config_repository.rs` - Config persistence

## Milestone 6: Command Layer Refactoring
- [ ] Update `commands/vault/` to delegate to VaultManager (thin wrappers)
- [ ] Update `commands/file/` to delegate to FileManager (thin wrappers)
- [ ] Update `commands/crypto/` to delegate to CryptoManager (thin wrappers)
- [ ] Update `commands/storage/` to delegate to StorageManager (thin wrappers)
- [ ] Ensure all command files are <300 LOC with minimal business logic

## Milestone 7: Import Path Migration
- [ ] Update all imports from `vault_store::` to `services::vault::`
- [ ] Update all imports from `file_ops::` to `services::file::`
- [ ] Update all imports from `crypto::` to `services::crypto::`
- [ ] Update all imports from `storage::` to `services::storage::`
- [ ] Remove direct utility layer access from commands

## Milestone 8: Testing & Validation
- [ ] Run `make validate-rust` - all tests must pass
- [ ] Verify UI integration works end-to-end
- [ ] Generate TypeScript bindings with new structure
- [ ] Manual testing of all workflows (vault, encryption, file operations)
- [ ] Ensure no regression in functionality

## Success Criteria
- All command modules follow `commands/{domain}/` pattern
- All domains have `services/{domain}/` DDD structure
- ll command files are <300 LOC (thin wrappers)
- UI -> Commands -> Services -> Domain/Infrastructure flow
- Zero direct utility layer access from commands
- All 570+ tests passing
- Complete architectural consistency with key_management pattern

## Code Impact Estimate
- **Files to create**: ~25 new service files
- **Files to refactor**: ~15 command files
- **LOC to move**: ~2,500 LOC from commands to services
- **Import updates**: ~50 files
- **Timeline**: 13 hours across 8 milestones

**Priority**: P0 - Critical for architectural integrity and maintainability