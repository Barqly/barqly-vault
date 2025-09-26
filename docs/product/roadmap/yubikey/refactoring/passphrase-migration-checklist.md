# Passphrase Migration Checklist - Milestone 1

**Generated**: 2025-09-26
**Status**: Complete

## Import Dependency Graph

### `crypto::encrypt_private_key` Usage
**Total References**: 10 files

1. ✅ **src/crypto/key_mgmt.rs:50** - Definition (MOVE)
2. ✅ **src/crypto/mod.rs:113** - Re-export (UPDATE)
3. ⚠️  **src/commands/crypto/key_generation.rs:9** - Import (UPDATE)
4. ⚠️  **src/commands/crypto/key_generation.rs:86** - Usage (REFACTOR)
5. ⚠️  **src/commands/crypto/key_generation_multi.rs:11** - Import (UPDATE)
6. ⚠️  **src/commands/crypto/key_generation_multi.rs:238** - Usage (REFACTOR)
7. ⚠️  **src/commands/crypto/key_generation_multi.rs:495** - Usage (REFACTOR)
8. ⚠️  **examples/generate_dev_keys.rs:8** - Import (UPDATE)
9. ⚠️  **examples/generate_dev_keys.rs:57** - Usage (UPDATE)
10. ⚠️  **tests/integration/crypto_integration_tests.rs:14** - Import (UPDATE)
11. ⚠️  **tests/integration/crypto_integration_tests.rs:110** - Usage (UPDATE)
12. ⚠️  **tests/integration/crypto_integration_tests.rs:134** - Usage (UPDATE)
13. ⚠️  **tests/unit/crypto/key_mgmt_tests.rs:15** - Import (UPDATE)
14. ⚠️  **tests/unit/crypto/key_mgmt_tests.rs:159** - Usage (UPDATE)

### `crypto::decrypt_private_key` Usage
**Total References**: 9 files

1. ✅ **src/crypto/key_mgmt.rs:82** - Definition (MOVE)
2. ✅ **src/crypto/mod.rs:116** - Re-export (UPDATE)
3. ⚠️  **src/crypto/multi_recipient.rs:289** - Usage (UPDATE)
4. ⚠️  **src/commands/crypto/validation.rs:10** - Import (UPDATE)
5. ⚠️  **src/commands/crypto/validation.rs:280** - Usage (REFACTOR)
6. ⚠️  **src/commands/crypto/decryption.rs:178** - Usage (UPDATE)
7. ⚠️  **tests/integration/crypto_integration_tests.rs:14** - Import (UPDATE)
8. ⚠️  **tests/integration/crypto_integration_tests.rs:114** - Usage (UPDATE)
9. ⚠️  **tests/integration/crypto_integration_tests.rs:140** - Usage (UPDATE)
10. ⚠️  **tests/unit/crypto/key_mgmt_tests.rs:15** - Import (UPDATE)

### `crypto::generate_keypair` Usage
**Total References**: 8 files

1. ✅ **src/crypto/key_mgmt.rs:21** - Definition (MOVE)
2. ✅ **src/crypto/mod.rs:95** - Re-export (UPDATE)
3. ⚠️  **src/commands/crypto/key_generation.rs:9** - Import (UPDATE)
4. ⚠️  **src/commands/crypto/key_generation.rs:79** - Usage (REFACTOR)
5. ⚠️  **src/commands/crypto/key_generation_multi.rs:11** - Import (UPDATE)
6. ⚠️  **src/commands/crypto/key_generation_multi.rs:230** - Usage (REFACTOR)
7. ⚠️  **src/commands/crypto/key_generation_multi.rs:448** - Usage (REFACTOR)
8. ⚠️  **examples/generate_dev_keys.rs:8** - Import (UPDATE)
9. ⚠️  **tests/common/fixtures.rs:9** - Import (UPDATE)
10. ⚠️  **tests/unit/crypto/age_ops_tests_old.rs:10** - Import (UPDATE)

### `commands::crypto::generate_key` Usage
**Total References**: 2 files

1. ✅ **src/commands/crypto/key_generation.rs:48** - Definition (MOVE)
2. ✅ **src/commands/crypto/mod.rs:22** - Re-export (UPDATE)
3. ⚠️  **src/commands/vault_commands/passphrase_integration.rs:6** - Import (UPDATE)
4. ⚠️  **src/commands/vault_commands/passphrase_integration.rs:70** - Usage (REFACTOR)

### Tauri Command Registrations
**File**: `src/lib.rs` (Invoke Context)

Commands that will need re-registration:
1. ⚠️  `generate_key` - From commands::crypto → commands::passphrase
2. ⚠️  `generate_key_multi` - Update import path
3. ⚠️  `validate_passphrase_strength` - From commands::crypto → commands::passphrase
4. ⚠️  `validate_passphrase` - From commands::crypto → commands::passphrase
5. ⚠️  `verify_key_passphrase` - From commands::crypto → commands::passphrase
6. ⚠️  `add_passphrase_key_to_vault` - From commands::vault_commands → commands::passphrase
7. ⚠️  `validate_vault_passphrase_key` - From commands::vault_commands → commands::passphrase

---

## File-by-File Migration Checklist

### Phase 1: Domain Layer (Zero Dependencies)

#### File: key_management/passphrase/domain/models/passphrase_strength.rs
- [ ] Create enum PassphraseStrength {Weak, Fair, Good, Strong}
- [ ] Add derives and specta::Type
- [ ] No dependencies

#### File: key_management/passphrase/domain/models/validation_rules.rs
- [ ] Move validation logic from commands/crypto/passphrase_validation.rs
- [ ] `calculate_strength_score()` - Returns (score, strength, feedback)
- [ ] Helper functions:
  - [ ] `contains_sequential_chars()`
  - [ ] `contains_repeated_chars()`
  - [ ] `contains_keyboard_pattern()`
  - [ ] `is_common_word()`
  - [ ] `calculate_entropy()`
- [ ] Add comprehensive unit tests

#### File: key_management/passphrase/domain/models/passphrase_key.rs
- [ ] PassphraseKey entity
- [ ] Fields: label, public_key, encrypted_private_key_path, created_at
- [ ] Validation methods

#### File: key_management/passphrase/domain/models/mod.rs
- [ ] Public exports for all domain models

#### File: key_management/passphrase/domain/errors.rs
- [ ] PassphraseError enum
- [ ] Variants:
  - [ ] WeakPassphrase { feedback: Vec<String> }
  - [ ] InvalidKeyFormat(String)
  - [ ] EncryptionFailed(String)
  - [ ] DecryptionFailed(String)
  - [ ] WrongPassphrase
  - [ ] StorageFailed(String)
- [ ] Conversion: From<PassphraseError> for CommandError

#### File: key_management/passphrase/domain/mod.rs
- [ ] Re-export models and errors

**Validation**: `cargo check --package barqly-vault-lib --lib key_management::passphrase::domain`

---

### Phase 2: Infrastructure Layer

#### File: key_management/passphrase/infrastructure/key_derivation.rs
- [ ] Move `generate_keypair()` from crypto/key_mgmt.rs (36 LOC)
- [ ] Move `encrypt_private_key()` from crypto/key_mgmt.rs (25 LOC)
- [ ] Move `decrypt_private_key()` from crypto/key_mgmt.rs (88 LOC)
- [ ] Add integration tests
- [ ] Dependencies: age, age::secrecy

#### File: key_management/passphrase/infrastructure/storage.rs
- [ ] PassphraseKeyRepository struct
- [ ] Methods:
  - [ ] `save_encrypted_key()` - Wrapper for storage::save_encrypted_key
  - [ ] `load_encrypted_key()` - Wrapper for storage::load_encrypted_key
  - [ ] `register_key()` - KeyRegistry integration
  - [ ] `get_key()` - KeyRegistry lookup
- [ ] Error handling with PassphraseError

#### File: key_management/passphrase/infrastructure/mod.rs
- [ ] Re-export key_derivation and storage

**Validation**: `cargo check --package barqly-vault-lib --lib key_management::passphrase::infrastructure`

---

### Phase 3: Application Layer

#### File: key_management/passphrase/application/manager.rs
- [ ] PassphraseManager struct (Facade pattern)
- [ ] Fields: generation_service, validation_service, vault_service
- [ ] Constructor: `new() -> Self`
- [ ] High-level methods delegating to services

#### File: key_management/passphrase/application/services/generation_service.rs
- [ ] GenerationService struct
- [ ] Methods:
  - [ ] `generate_passphrase_key(label, passphrase) -> Result<PassphraseKey>`
  - [ ] `generate_with_metadata(label, passphrase, metadata) -> Result<(PassphraseKey, VaultMetadataV2)>`
- [ ] Uses infrastructure::key_derivation and domain::models
- [ ] Integration tests

#### File: key_management/passphrase/application/services/validation_service.rs
- [ ] ValidationService struct
- [ ] Methods:
  - [ ] `validate_strength(passphrase) -> ValidationResult`
  - [ ] `verify_key_passphrase(key_id, passphrase) -> Result<bool>`
- [ ] Uses domain::validation_rules and infrastructure
- [ ] Unit + integration tests

#### File: key_management/passphrase/application/services/vault_integration_service.rs
- [ ] VaultIntegrationService struct
- [ ] Methods:
  - [ ] `add_key_to_vault(vault_id, label, passphrase) -> Result<KeyReference>`
  - [ ] `validate_vault_has_passphrase_key(vault_id) -> Result<bool>`
- [ ] Orchestrates generation + storage + vault updates
- [ ] Integration tests

#### File: key_management/passphrase/application/services/mod.rs
- [ ] Re-export all services

#### File: key_management/passphrase/application/mod.rs
- [ ] Re-export manager and services

**Validation**: `cargo check --package barqly-vault-lib --lib key_management::passphrase::application`

---

### Phase 4: Command Layer

#### File: commands/passphrase/generation_commands.rs
- [ ] Tauri command: `generate_key(GenerateKeyInput) -> GenerateKeyResponse`
  - [ ] Calls PassphraseManager::generate_key()
  - [ ] Error handling with ErrorHandler
  - [ ] Input validation
- [ ] Tauri command: `generate_passphrase_only_key()` helper for multi-recipient
- [ ] Move GenerateKeyInput, GenerateKeyResponse structs
- [ ] specta::Type annotations

#### File: commands/passphrase/validation_commands.rs
- [ ] Tauri command: `validate_passphrase_strength(String) -> PassphraseValidationResult`
  - [ ] Calls PassphraseManager::validate_strength()
- [ ] Tauri command: `validate_passphrase(ValidatePassphraseInput) -> ValidatePassphraseResponse`
  - [ ] Calls PassphraseManager::validate_passphrase()
- [ ] Tauri command: `verify_key_passphrase(VerifyKeyPassphraseInput) -> VerifyKeyPassphraseResponse`
  - [ ] Calls PassphraseManager::verify_key_passphrase()
- [ ] Move all input/output structs
- [ ] specta::Type annotations

#### File: commands/passphrase/vault_commands.rs
- [ ] Tauri command: `add_passphrase_key_to_vault(AddPassphraseKeyRequest) -> AddPassphraseKeyResponse`
  - [ ] Calls PassphraseManager::add_key_to_vault()
- [ ] Tauri command: `validate_vault_passphrase_key(String) -> bool`
  - [ ] Calls PassphraseManager::validate_vault_passphrase_key()
- [ ] Move all input/output structs

#### File: commands/passphrase/mod.rs
- [ ] Re-export all commands
- [ ] Re-export input/output types

#### File: commands/mod.rs
- [ ] Add: `pub mod passphrase;`
- [ ] Re-export passphrase commands for Tauri registration

**Validation**: `cargo check --bin barqly-vault`

---

### Phase 5: Import Path Updates

#### Update crypto/mod.rs
- [ ] Add deprecation notice for encrypt_private_key
- [ ] Add deprecation notice for decrypt_private_key
- [ ] Add deprecation notice for generate_keypair
- [ ] Re-export from key_management::passphrase::infrastructure::key_derivation

#### Update commands/crypto/mod.rs
- [ ] Remove exports: GenerateKeyInput, GenerateKeyResponse, generate_key
- [ ] Remove exports: GenerateKeyMultiInput, GenerateKeyMultiResponse, generate_key_multi (if only passphrase)
- [ ] Add deprecation notice

#### Update commands/vault_commands/mod.rs
- [ ] Remove exports: add_passphrase_key_to_vault, validate_vault_passphrase_key
- [ ] Add deprecation notice

#### Update lib.rs (Tauri command registration)
- [ ] Change imports from commands::crypto to commands::passphrase
- [ ] Change imports from commands::vault_commands to commands::passphrase
- [ ] Update invoke_handler! macro with new paths

#### Update Files Importing encrypt/decrypt Functions

**Files requiring updates**:
1. ⚠️  src/commands/crypto/key_generation.rs - USE NEW PassphraseManager
2. ⚠️  src/commands/crypto/key_generation_multi.rs - USE NEW PassphraseManager
3. ⚠️  src/commands/crypto/validation.rs - USE NEW PassphraseManager
4. ⚠️  src/commands/crypto/decryption.rs - UPDATE import path
5. ⚠️  src/crypto/multi_recipient.rs - UPDATE import path
6. ⚠️  examples/generate_dev_keys.rs - UPDATE import path
7. ⚠️  tests/common/fixtures.rs - UPDATE import path
8. ⚠️  tests/integration/crypto_integration_tests.rs - UPDATE import path
9. ⚠️  tests/unit/crypto/key_mgmt_tests.rs - UPDATE import path (or move tests)
10. ⚠️  tests/unit/crypto/age_ops_tests_old.rs - UPDATE import path

**Strategy**:
- For commands: Refactor to use PassphraseManager instead of direct crypto calls
- For tests: Update import paths or move to passphrase module
- For examples: Update import paths with comment about new location

**Validation**: `cargo check --all-targets`

---

### Phase 6: Dead Code Cleanup

#### Remove from commands/crypto/
- [ ] Delete key_generation.rs (115 LOC) - Functionality moved to commands/passphrase
- [ ] Delete passphrase-only logic from key_generation_multi.rs (52 LOC)
- [ ] Delete passphrase_validation.rs (284 LOC)
- [ ] Delete passphrase validation from validation.rs (~200 LOC)
- [ ] Update crypto/mod.rs to remove passphrase-related exports

#### Remove from commands/vault_commands/
- [ ] Delete passphrase_integration.rs (257 LOC)
- [ ] Delete passphrase_integration_tests.rs
- [ ] Update vault_commands/mod.rs to remove passphrase exports

#### Update crypto/key_mgmt.rs
- [ ] Remove generate_keypair() (moved to infrastructure)
- [ ] Remove encrypt_private_key() (moved to infrastructure)
- [ ] Remove decrypt_private_key() (moved to infrastructure)
- [ ] If file becomes empty or nearly empty, delete entirely
- [ ] Update crypto/mod.rs accordingly

#### Cleanup Hybrid Mode (commands/crypto/key_generation_multi.rs)
- [ ] Keep generate_key_multi command
- [ ] Refactor to use PassphraseManager for passphrase parts
- [ ] Coordinate between passphrase and yubikey modules
- [ ] Consider creating a unified key generation coordinator

**Validation**: `cargo check --all-targets && cargo clippy -- -D warnings`

---

### Phase 7: Testing

#### Unit Tests
- [ ] Domain layer validation rules tests
- [ ] Infrastructure key derivation tests
- [ ] Service layer tests (generation, validation, vault)

#### Integration Tests
- [ ] End-to-end key generation workflow
- [ ] Passphrase strength validation
- [ ] Key-passphrase verification
- [ ] Vault passphrase key integration
- [ ] Encryption/decryption with passphrase keys

#### Regression Tests
- [ ] Run existing crypto_integration_tests
- [ ] Run existing key_mgmt_tests
- [ ] Verify all Tauri commands work via frontend
- [ ] Test hybrid mode (passphrase + YubiKey)

**Validation**: `make validate-rust` (all 551+ tests passing)

---

### Phase 8: TypeScript Bindings

#### Generate New Bindings
- [ ] Run: `cd src-tauri && cargo build --features generate-types`
- [ ] Verify bindings generated in correct location
- [ ] Check no breaking changes to frontend API

#### Frontend Integration
- [ ] Verify TypeScript can import new types
- [ ] Test Tauri command invocations from frontend
- [ ] Verify error handling works correctly

**Validation**: Frontend builds without TypeScript errors

---

## Backward Compatibility Matrix

| Item | Must Preserve | Can Change | Notes |
|------|---------------|------------|-------|
| Tauri command names | ✅ | ❌ | Frontend depends on exact names |
| Input/output types | ✅ | ⚠️  | Can add fields, cannot remove |
| Storage format | ✅ | ❌ | Must read existing encrypted keys |
| Error codes | ⚠️  | ✅ | Improve messages, keep codes |
| Internal imports | ❌ | ✅ | Implementation detail |
| crypto module | ⚠️  | ✅ | Keep for transition, add deprecation |

---

## Rollback Plan

If critical issues discovered:

### Step 1: Feature Flag
- [ ] Add feature flag `passphrase_refactor`
- [ ] Guard new code behind feature flag
- [ ] Default to OFF for safety

### Step 2: Parallel Implementation
- [ ] Keep old commands temporarily
- [ ] Route to old or new based on feature flag
- [ ] Gradual migration once validated

### Step 3: Full Rollback (if needed)
- [ ] Revert all commits from this milestone
- [ ] Restore old command structure
- [ ] Document learnings for next attempt

---

## Success Criteria Checklist

### Code Quality
- [ ] Zero compilation errors
- [ ] Zero clippy warnings
- [ ] All tests passing (551+ tests)
- [ ] Code coverage maintained or improved

### Architecture
- [ ] Clear DDD layer separation
- [ ] Domain layer has zero external dependencies
- [ ] Application layer orchestrates correctly
- [ ] Commands layer is thin presentation only

### Functionality
- [ ] All Tauri commands work identically to before
- [ ] TypeScript bindings compatible
- [ ] Storage format unchanged
- [ ] Performance maintained or improved

### Documentation
- [ ] Code documented with rustdoc comments
- [ ] Architecture decisions recorded
- [ ] Migration notes updated
- [ ] Lessons learned captured

---

## Estimated LOC Changes

**Deletions**: ~849 LOC (scattered code removed)
**Additions**: ~1000 LOC (organized DDD structure)
**Net Change**: +151 LOC (acceptable for better organization)

**Files Modified**: ~35 files
**Files Created**: ~15 files
**Files Deleted**: ~6 files

---

## Timeline Estimate

- Phase 1 (Domain): 2-3 hours
- Phase 2 (Infrastructure): 2-3 hours
- Phase 3 (Application): 4-5 hours
- Phase 4 (Commands): 3-4 hours
- Phase 5 (Import Updates): 2-3 hours
- Phase 6 (Cleanup): 1-2 hours
- Phase 7 (Testing): 3-4 hours
- Phase 8 (Bindings): 1 hour

**Total**: 18-25 hours (2-3 working days)