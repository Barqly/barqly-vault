# Passphrase Code Analysis - Milestone 1

**Generated**: 2025-09-26
**Status**: Complete

## Executive Summary

**Total Code Distribution**: ~849 LOC across 6 files
- Commands Layer: 729 LOC (86%)
- Infrastructure Layer: 120 LOC (14%)
- No Domain Layer currently exists

## Detailed File Analysis

### 1. commands/crypto/key_generation.rs (115 LOC)

**Purpose**: Basic single-key generation with passphrase protection

**Tauri Commands**:
- `generate_key(GenerateKeyInput) -> GenerateKeyResponse`

**Key Structures**:
```rust
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}

pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}
```

**Operations**:
1. Input validation (label + passphrase strength)
2. Check label uniqueness
3. Generate keypair (calls `crypto::generate_keypair()`)
4. Encrypt private key (calls `crypto::encrypt_private_key()`)
5. Save to storage

**Dependencies**:
- `crypto::{encrypt_private_key, generate_keypair}` - Core crypto operations
- `storage::save_encrypted_key()` - Persistence
- `commands::types::*` - Error handling & validation
- `age::secrecy::SecretString` - Secure string handling

**Migration Target**: `commands/passphrase/generation_commands.rs`

---

### 2. commands/crypto/key_generation_multi.rs (538 LOC)

**Purpose**: Multi-recipient key generation supporting 3 protection modes

**Tauri Commands**:
- `generate_key_multi(GenerateKeyMultiInput) -> GenerateKeyMultiResponse`

**Key Structures**:
```rust
pub struct GenerateKeyMultiInput {
    pub label: String,
    pub passphrase: Option<String>,
    pub protection_mode: Option<ProtectionMode>,
    pub yubikey_device_id: Option<String>,
    pub yubikey_info: Option<InitializationResult>,
    pub yubikey_pin: Option<String>,
}

pub enum ProtectionMode {
    PassphraseOnly,
    YubiKeyOnly { serial: String },
    Hybrid { yubikey_serial: String },
}
```

**Passphrase-Specific Functions**:
1. `generate_passphrase_only_key()` (52 LOC)
   - Generates keypair
   - Encrypts with passphrase
   - Creates metadata with RecipientInfo
   - Saves with `storage::save_encrypted_key_with_metadata()`

2. `generate_hybrid_key()` (92 LOC)
   - Generates keypair
   - Creates passphrase recipient
   - Creates YubiKey recipient
   - Encrypts with passphrase
   - Saves with metadata for both recipients

**Dependencies**:
- `crypto::{encrypt_private_key, generate_keypair}` - Core operations
- `key_management::yubikey::YubiIdentityProviderFactory` - YubiKey integration
- `storage::{RecipientInfo, VaultMetadataV2}` - Multi-recipient metadata
- `sha2::Sha256` - Checksum calculation

**Migration Target**:
- PassphraseOnly logic → `commands/passphrase/generation_commands.rs`
- Hybrid logic → May need coordination layer between passphrase & yubikey modules

---

### 3. commands/crypto/passphrase_validation.rs (284 LOC)

**Purpose**: Detailed passphrase strength validation with scoring system

**Tauri Commands**:
- `validate_passphrase_strength(String) -> PassphraseValidationResult`

**Key Structures**:
```rust
pub enum PassphraseStrength {
    Weak,
    Fair,
    Good,
    Strong,
}

pub struct PassphraseValidationResult {
    pub is_valid: bool,
    pub strength: PassphraseStrength,
    pub feedback: Vec<String>,
    pub score: u8, // 0-100
}
```

**Validation Logic** (Pure Domain Logic):
1. **Length Scoring** (0-40 points)
   - < 8: Invalid
   - 8-11: 10 points
   - 12-15: 20 points
   - 16-19: 30 points
   - 20+: 40 points

2. **Character Variety** (0-30 points)
   - Checks: lowercase, uppercase, digits, special chars
   - 2 types: 10 points
   - 3 types: 20 points
   - 4 types: 30 points

3. **Pattern Detection** (0-20 points)
   - Sequential chars (abc, 123): -5
   - Repeated chars (aaa, 111): -5
   - Keyboard patterns (qwerty): -5
   - Common words (password): -5

4. **Entropy Bonus** (0-10 points)
   - > 50 bits: 10 points
   - > 40 bits: 7 points
   - > 30 bits: 5 points

**Helper Functions** (Pure Logic):
- `contains_sequential_chars()` - Pattern detection
- `contains_repeated_chars()` - Pattern detection
- `contains_keyboard_pattern()` - Dictionary check
- `is_common_word()` - Dictionary check
- `calculate_entropy()` - Math calculation

**Dependencies**: None (pure logic!)

**Migration Target**:
- Domain logic → `key_management/passphrase/domain/models/validation_rules.rs`
- Command wrapper → `commands/passphrase/validation_commands.rs`

---

### 4. commands/crypto/validation.rs (429 LOC)

**Purpose**: Passphrase verification and key-passphrase validation

**Tauri Commands**:
1. `validate_passphrase(ValidatePassphraseInput) -> ValidatePassphraseResponse`
   - Checks minimum length (12 chars)
   - Requires 3 of 4 character types
   - Blocks common patterns
   - Detects sequential patterns

2. `verify_key_passphrase(VerifyKeyPassphraseInput) -> VerifyKeyPassphraseResponse`
   - Loads KeyRegistry
   - Gets key entry by ID
   - For Passphrase keys: Loads encrypted key file, attempts decrypt
   - For YubiKey keys: Verifies PIN via PTY operations

**Key Structures**:
```rust
pub struct ValidatePassphraseInput {
    pub passphrase: String,
}

pub struct VerifyKeyPassphraseInput {
    pub key_id: String,
    pub passphrase: String,
}
```

**Dependencies**:
- `crypto::key_mgmt::decrypt_private_key()` - Core decryption
- `storage::KeyRegistry` - Key lookup
- `storage::key_store::load_encrypted_key()` - File operations
- `key_management::yubikey::infrastructure::pty::verify_yubikey_pin()` - YubiKey verification

**Migration Target**:
- `validate_passphrase` → `commands/passphrase/validation_commands.rs`
- `verify_key_passphrase` (passphrase part) → `commands/passphrase/validation_commands.rs`
- YubiKey PIN verification stays in yubikey module

---

### 5. commands/vault_commands/passphrase_integration.rs (257 LOC)

**Purpose**: Vault-level passphrase key management

**Tauri Commands**:
1. `add_passphrase_key_to_vault(AddPassphraseKeyRequest) -> AddPassphraseKeyResponse`
   - Validates vault exists
   - Checks no duplicate passphrase key exists
   - Calls `generate_key()` to create actual key
   - Registers key in KeyRegistry
   - Adds key ID to vault
   - Saves vault

2. `validate_vault_passphrase_key(String) -> bool`
   - Checks if vault has active passphrase key

**Helper Functions**:
- `enhanced_add_key_to_vault()` - Legacy wrapper
- `generate_key_reference_id()` - Unique ID generation

**Dependencies**:
- `commands::crypto::{GenerateKeyInput, generate_key}` - Key generation
- `storage::{KeyRegistry, vault_store}` - Storage operations
- `models::{KeyReference, KeyState, KeyType}` - Domain models

**Migration Target**:
- `commands/passphrase/vault_commands.rs`
- Service logic → `key_management/passphrase/application/services/vault_integration_service.rs`

---

### 6. crypto/key_mgmt.rs (170 LOC total, ~120 LOC passphrase-related)

**Purpose**: Core cryptographic operations

**Functions**:
1. `generate_keypair() -> KeyPair` (36 LOC)
   - Uses age X25519 key generation
   - Wraps private key in SecretString
   - Returns public/private keypair

2. `encrypt_private_key(PrivateKey, SecretString) -> Vec<u8>` (25 LOC)
   - Uses age passphrase encryption
   - Creates scrypt-based encryptor
   - Returns encrypted bytes

3. `decrypt_private_key(&[u8], SecretString) -> PrivateKey` (88 LOC)
   - Validates encrypted key format
   - Creates age decryptor
   - Uses scrypt::Identity for passphrase
   - Validates decrypted key format (AGE-SECRET-KEY prefix)
   - Parses as age Identity
   - Returns PrivateKey wrapped in SecretString

**Dependencies**:
- `age::{Identity, Encryptor, Decryptor}` - Core age library
- `age::x25519::Identity` - Key generation
- `age::scrypt::Identity` - Passphrase-based identity
- `age::secrecy::{SecretString, ExposeSecret}` - Secure memory handling

**Migration Target**: `key_management/passphrase/infrastructure/key_derivation.rs`

---

## Import Dependency Analysis

### Files Importing Passphrase Functions

**`crypto::encrypt_private_key`** imported by:
1. `commands/crypto/key_generation.rs:9`
2. `commands/crypto/key_generation_multi.rs:11`
3. (Likely more - need comprehensive grep)

**`crypto::decrypt_private_key`** imported by:
1. `commands/crypto/validation.rs:10`
2. (Likely encryption/decryption commands)

**`crypto::generate_keypair`** imported by:
1. `commands/crypto/key_generation.rs:9`
2. `commands/crypto/key_generation_multi.rs:11`
3. (Likely other generation commands)

**`commands::crypto::generate_key`** imported by:
1. `commands/vault_commands/passphrase_integration.rs:6`

**Tauri Command Registrations** (in `lib.rs`):
- `generate_key`
- `generate_key_multi`
- `validate_passphrase_strength`
- `validate_passphrase`
- `verify_key_passphrase`
- `add_passphrase_key_to_vault`
- `validate_vault_passphrase_key`

---

## Function Classification by DDD Layer

### Domain Layer (Pure Business Logic)
**Source**: `commands/crypto/passphrase_validation.rs` (284 LOC)
- `PassphraseStrength` enum
- `PassphraseValidationResult` struct
- Validation scoring logic (length, variety, patterns, entropy)
- Helper functions (pure logic, no dependencies)

**Target**: `key_management/passphrase/domain/models/`

### Infrastructure Layer (External Integrations)
**Source**: `crypto/key_mgmt.rs` (120 LOC)
- `generate_keypair()` - age library integration
- `encrypt_private_key()` - age encryption
- `decrypt_private_key()` - age decryption

**Target**: `key_management/passphrase/infrastructure/key_derivation.rs`

### Application Layer (Orchestration)
**Source**: Multiple files
- Key generation workflows (single, multi-recipient, hybrid)
- Vault integration workflows
- Validation orchestration

**Target**: `key_management/passphrase/application/services/`

### Command Layer (Presentation)
**Source**: All command files
- Tauri command handlers
- Input/output DTOs
- Error handling wrappers

**Target**: `commands/passphrase/`

---

## Migration Strategy

### Phase 1: Domain Layer (Lowest Risk)
Move pure validation logic first - zero dependencies
- 284 LOC from `passphrase_validation.rs`
- No breaking changes to existing code

### Phase 2: Infrastructure Layer
Move crypto operations - minimal dependencies
- 120 LOC from `crypto/key_mgmt.rs`
- Update 2-3 import paths

### Phase 3: Application Layer
Build service layer using domain + infrastructure
- New code, orchestrating existing pieces
- No deletions yet

### Phase 4: Command Layer
Create new command wrappers calling application services
- Parallel implementation alongside old commands
- Allows gradual migration

### Phase 5: Import Migration
Update all import paths to new locations
- Estimate 20-30 files to update

### Phase 6: Cleanup
Remove old scattered code
- Delete old command files
- Clean up exports

---

## Backward Compatibility Requirements

### Tauri Command Names (MUST NOT CHANGE)
- `generate_key` - Keep name, move implementation
- `generate_key_multi` - Keep name, refactor internals
- `validate_passphrase_strength` - Keep name
- `validate_passphrase` - Keep name
- `verify_key_passphrase` - Keep name
- `add_passphrase_key_to_vault` - Keep name
- `validate_vault_passphrase_key` - Keep name

### TypeScript Bindings
- Generated from Rust signatures using specta
- As long as command names and types stay same, bindings compatible
- Need to run `cargo build --features generate-types` after changes

### Storage Format
- KeyRegistry format must remain compatible
- Encrypted key file format unchanged (age standard)
- Vault metadata format unchanged

### API Contracts
- Input/output structures must remain compatible
- Error codes and messages should stay consistent
- Recovery guidance strings can be improved

---

## Risk Assessment

### High Risk Areas
1. **Multi-recipient generation** - Complex hybrid mode logic
2. **Storage integration** - KeyRegistry, vault_store interactions
3. **YubiKey coordination** - Hybrid mode requires both modules

### Medium Risk Areas
1. **Command registration** - lib.rs updates
2. **Import path updates** - Scattered across codebase
3. **TypeScript bindings** - Must regenerate correctly

### Low Risk Areas
1. **Validation logic** - Pure functions, easy to move
2. **Crypto operations** - Well-isolated, clear boundaries
3. **Tests** - Can be moved with code

---

## Success Metrics

### Code Organization
- ✅ All passphrase code in 2 locations (key_management/, commands/)
- ✅ Clear DDD layer separation
- ✅ No duplicate code

### Quality
- ✅ All 551+ tests passing
- ✅ Zero compilation errors
- ✅ Zero clippy warnings
- ✅ TypeScript bindings generate successfully

### Functionality
- ✅ Generate passphrase-protected key works
- ✅ Validate passphrase strength works
- ✅ Verify key-passphrase works
- ✅ Add passphrase key to vault works
- ✅ Encrypt/decrypt with passphrase works

---

## Next Steps for Milestone 2

1. Create `key_management/passphrase/domain/models/` structure
2. Move validation logic from `passphrase_validation.rs`
3. Create domain error types
4. Write domain layer tests
5. Validate compilation with zero external dependencies