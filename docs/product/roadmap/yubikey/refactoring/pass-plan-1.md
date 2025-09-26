# Passphrase Module Refactoring Plan

## Overview
Apply the proven YubiKey DDD architecture pattern to consolidate ~850 LOC of scattered passphrase logic into a cohesive module structure following Domain-Driven Design principles.

**Pattern**: `commands/passphrase/` (thin layer) → `key_management/passphrase/` (DDD business logic)

## Current State Analysis

**Scattered Passphrase Code** (~850 LOC across 5+ files):
- `commands/crypto/key_generation.rs` - Basic key generation with passphrase
- `commands/crypto/key_generation_multi.rs` - Multi-key generation (passphrase + YubiKey)
- `commands/crypto/passphrase_validation.rs` - Strength validation (283 LOC)
- `commands/crypto/validation.rs` - Passphrase verification
- `commands/vault_commands/passphrase_integration.rs` - Vault integration (256 LOC)
- `crypto/key_mgmt.rs` - encrypt_private_key, decrypt_private_key (169 LOC)

**Target State**: Consolidated DDD architecture
```
key_management/passphrase/           # DDD business logic
    domain/                          # Pure business logic
        models/                      # PassphraseKey, PassphraseStrength
        errors.rs                    # PassphraseError enum
    application/                     # Use cases & orchestration
        manager.rs                   # PassphraseManager facade
        services/                    # Generation, Validation, Vault services
    infrastructure/                  # External integrations
        key_derivation.rs            # Encryption/decryption
        storage.rs                   # Persistence layer

commands/passphrase/                 # Thin command layer
    mod.rs                           # Public API exports
    generation_commands.rs           # Key generation commands
    validation_commands.rs           # Validation commands
    vault_commands.rs                # Vault integration commands
```

## Milestone 1: Code Analysis & Mapping ✅ COMPLETE
**Goal**: Understand current passphrase code distribution and dependencies

- [x] Map all passphrase-related functions across the codebase
  - [x] Document functions in `commands/crypto/key_generation.rs`
  - [x] Document functions in `commands/crypto/key_generation_multi.rs`
  - [x] Document functions in `commands/crypto/passphrase_validation.rs`
  - [x] Document functions in `commands/crypto/validation.rs`
  - [x] Document functions in `commands/vault_commands/passphrase_integration.rs`
  - [x] Document functions in `crypto/key_mgmt.rs`
- [x] Identify import chains and dependencies
- [x] Create detailed migration checklist with file-by-file breakdown
- [x] Document backward compatibility requirements

**Success Criteria**: Complete documentation of all passphrase code locations with dependency graph

**Deliverables**:
- ✅ `passphrase-code-analysis.md` - Comprehensive analysis of 849 LOC across 6 files
- ✅ `passphrase-migration-checklist.md` - File-by-file migration plan with 35+ files to update

## Milestone 2: Domain Layer Implementation ✅ COMPLETE
**Goal**: Create pure business logic with zero external dependencies

- [x] Create domain models
  - [x] `domain/models/passphrase_strength.rs` - PassphraseStrength value object
  - [x] `domain/models/validation_rules.rs` - Validation business rules (284 LOC of pure logic)
  - [x] `domain/models/mod.rs` - Module exports
- [x] Create domain errors
  - [x] `domain/errors.rs` - PassphraseError enum
  - [x] Validation-specific error types
  - [x] Recovery guidance methods
- [x] Unit tests for domain layer (pure logic tests)

**Success Criteria**: Domain layer compiles independently with zero external dependencies

**Results**:
- ✅ Zero external dependencies (pure Rust only)
- ✅ 18 unit tests passing (all domain logic tested)
- ✅ Clean compilation with no warnings
- ✅ Extracted 284 LOC from commands/crypto/passphrase_validation.rs

## Milestone 3: Infrastructure Layer Implementation ✅ COMPLETE
**Goal**: External system integrations (encryption, storage)

- [x] Create key derivation infrastructure
  - [x] `infrastructure/key_derivation.rs` - Moved from `crypto/key_mgmt.rs` (120 LOC)
  - [x] Move `encrypt_private_key` function
  - [x] Move `decrypt_private_key` function
  - [x] Move `generate_keypair` function
  - [x] Secure passphrase handling using SecretString
- [x] Create storage infrastructure
  - [x] `infrastructure/storage.rs` - PassphraseKeyRepository wrapper (90 LOC)
  - [x] Integration with existing KeyRegistry
  - [x] Error handling with StorageError enum
- [x] Integration tests for infrastructure layer (3 tests)

**Success Criteria**: Infrastructure layer compiles and integrates with domain models

**Results**:
- ✅ All 3 infrastructure tests passing (keypair generation, encrypt/decrypt, wrong passphrase)
- ✅ Clean integration with domain layer
- ✅ Secure memory handling via age library
- ✅ Storage abstraction created for KeyRegistry operations

## Milestone 4: Application Layer Implementation ✅ COMPLETE
**Goal**: Orchestrate domain objects and infrastructure services

- [x] Create PassphraseManager facade
  - [x] `application/manager.rs` - Single entry point (80 LOC)
  - [x] Initialize services
  - [x] Coordinate domain + infrastructure
  - [x] Delegate to specialized services
- [x] Create core services
  - [x] `application/services/generation_service.rs` (120 LOC)
    - Single key generation
    - Generation with metadata support
  - [x] `application/services/validation_service.rs` (80 LOC)
    - Strength validation
    - Passphrase verification
  - [x] `application/services/vault_integration_service.rs` (100 LOC)
    - Add passphrase key to vault
    - Validate vault passphrase key
- [x] Service-level tests (6 tests)

**Success Criteria**: PassphraseManager facade provides complete passphrase functionality

**Results**:
- ✅ 6 application layer tests passing
- ✅ PassphraseManager facade orchestrates all services
- ✅ Clean separation between services (generation, validation, vault)
- ✅ Total: 27 tests passing (domain + infrastructure + application)

## Milestone 5: Command Layer Consolidation ✅ COMPLETE
**Goal**: Create thin command layer calling PassphraseManager

- [x] Create `commands/passphrase/` module structure
  - [x] `commands/passphrase/mod.rs` - Module definition and exports
  - [x] `commands/passphrase/generation_commands.rs` (80 LOC)
    - New `generate_key` calling PassphraseManager
    - Thin wrapper with validation
  - [x] `commands/passphrase/validation_commands.rs` (60 LOC)
    - New `validate_passphrase_strength`
    - New `verify_key_passphrase`
    - Thin wrappers calling PassphraseManager
  - [x] `commands/passphrase/vault_commands.rs` (70 LOC)
    - New `add_passphrase_key_to_vault`
    - New `validate_vault_passphrase_key`
    - Thin wrappers calling PassphraseManager
- [x] Update `commands/mod.rs`
  - [x] Add `pub mod passphrase;`
  - [x] New commands available alongside old ones

**Success Criteria**: All passphrase commands accessible through `commands::passphrase::*`

**Results**:
- ✅ New command layer created with thin wrappers
- ✅ All commands delegate to PassphraseManager
- ✅ Commands module structure complete
- ⚠️  Duplicate command names exist (expected - old commands still present)
- 📝 Next: Milestone 6 will remove old commands and resolve duplicates

## Milestone 6: Import Path Migration ✅ COMPLETE
**Goal**: Update all files importing old passphrase paths

- [x] Identify all files importing from old locations
  - [x] Files importing from `commands/crypto/key_generation.rs`
  - [x] Files importing from `commands/crypto/key_generation_multi.rs`
  - [x] Files importing from `commands/crypto/passphrase_validation.rs`
  - [x] Files importing from `commands/crypto/validation.rs`
  - [x] Files importing from `commands/vault_commands/passphrase_integration.rs`
  - [x] Files importing from `crypto/key_mgmt.rs` (encrypt/decrypt functions)
- [x] Update import paths systematically
- [x] Establish backward compatibility via re-exports
- [x] Fix compilation errors iteratively

**Success Criteria**: Zero compilation errors, all imports point to new locations

**Results**:
- ✅ Removed 5 old command files (1,269 LOC deleted)
- ✅ Updated crypto/mod.rs and commands/crypto/mod.rs with backward compat re-exports
- ✅ Updated key_generation_multi.rs to use new passphrase imports
- ✅ Zero duplicate command names (resolved)

## Milestone 7: Dead Code Cleanup ✅ COMPLETE
**Goal**: Remove old scattered passphrase code

- [x] Remove old command files (completed in Milestone 6)
  - [x] Delete `commands/crypto/key_generation.rs` (115 LOC)
  - [x] Delete `commands/crypto/passphrase_validation.rs` (284 LOC)
  - [x] Delete `commands/crypto/validation.rs` (429 LOC)
  - [x] Delete `commands/vault_commands/passphrase_integration.rs` (257 LOC)
  - [x] Delete `commands/vault_commands/passphrase_integration_tests.rs` (184 LOC)
- [x] Move crypto functions to infrastructure
  - [x] Replace `crypto/key_mgmt.rs` implementation with re-exports (170 LOC → 6 LOC)
  - [x] All functions delegate to `key_management::passphrase::infrastructure`
- [x] Clean up unused imports and exports
  - [x] Update `commands/crypto/mod.rs` - Backward compat re-exports added
  - [x] Update `commands/vault_commands/mod.rs` - Backward compat re-exports added
  - [x] Update `key_generation_multi.rs` - Direct imports to new passphrase module
  - [x] Fix all clippy warnings (unused imports, redundant closures)

**Success Criteria**: No duplicate passphrase code, clean module structure

**Results**:
- ✅ **Total: 1,269 LOC deleted** from scattered old code
- ✅ **crypto/key_mgmt.rs reduced from 170 LOC to 6 LOC** (97% reduction)
- ✅ All 384 tests passing (183 unit + 201 integration)
- ✅ Zero compilation errors
- ✅ Zero clippy warnings
- ✅ Clean module structure with backward compatibility

## Milestone 8: Testing & Validation
**Goal**: Ensure complete passphrase workflow works end-to-end

- [ ] Unit tests
  - [ ] Domain layer tests (validation rules, models)
  - [ ] Infrastructure layer tests (encryption/decryption)
  - [ ] Service layer tests (generation, validation, vault integration)
- [ ] Integration tests
  - [ ] Key generation workflow
  - [ ] Passphrase strength validation
  - [ ] Vault passphrase key integration
  - [ ] Encryption/decryption with passphrase keys
- [ ] End-to-end workflow tests
  - [ ] Generate passphrase-protected key
  - [ ] Add key to vault
  - [ ] Encrypt file with passphrase key
  - [ ] Decrypt file with passphrase key
- [ ] Run full validation suite
  - [ ] `make validate-rust` passes
  - [ ] All 551+ tests passing
  - [ ] Zero compilation errors
  - [ ] Zero clippy warnings
  - [ ] TypeScript bindings generate successfully

**Success Criteria**: All tests pass, complete passphrase workflow functional

## Milestone 9: Documentation & Completion
**Goal**: Document the new architecture and mark completion

- [ ] Update documentation
  - [ ] Update `docs/architecture/context.md` with passphrase module structure
  - [ ] Document PassphraseManager API in code comments
  - [ ] Update migration notes for future reference
- [ ] Create follow-up tasks
  - [ ] List any tech debt identified during refactoring
  - [ ] Document lessons learned for future key type implementations
- [ ] Final validation
  - [ ] Run complete test suite one final time
  - [ ] Verify UI passphrase workflows still work
  - [ ] Check for any remaining TODOs or FIXMEs
- [ ] Create commit with comprehensive commit message

**Success Criteria**: Passphrase module fully documented and operational

---

## Architecture Principles (Reference)

**DDD Layer Responsibilities**:
- **Domain**: Pure business logic, zero external dependencies (models, value objects, business rules)
- **Application**: Orchestrates domain + infrastructure (Manager facade, services, use cases)
- **Infrastructure**: External integrations (encryption libraries, storage, hardware)
- **Commands**: Thin presentation layer (Tauri command handlers calling Application layer)

**Dependency Flow**:
```
Frontend → Commands → Application → Domain
                         ↓
                   Infrastructure
```

**Key Rules**:
- Domain depends on NOTHING
- Application depends on Domain + Infrastructure
- Infrastructure depends on Domain
- Commands depend on Application (never skip to Infrastructure or Domain directly)

**File Size Guidelines**: Backend files < 300 LOC for maintainability

---

## Progress Tracking

**Status**: 🟡 IN PROGRESS
- Current Milestone: Milestone 8 - Testing & Validation
- Completion: 7/9 milestones (78%)
- Next Action: Validate end-to-end workflows and document completion

**Timeline**: Follow incremental approach, validate at each milestone with `make validate-rust`