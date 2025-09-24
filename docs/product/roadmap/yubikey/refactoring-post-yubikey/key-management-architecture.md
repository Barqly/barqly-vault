# 🏗️ Higher-Level Key Management Architecture

Your architectural insight is absolutely correct! We're thinking too narrow. Let me propose a better structure:

## Current Problem

- `yubikey/` module only handles YubiKeys
- Passphrase logic is scattered across the codebase
- No unified key management abstraction
- Future hardware keys (FIDO2, smart cards, etc.) would create more scattered code

## Proposed Solution: Unified Key Management Architecture

```
src/key_management/           # 🆕 Top-level key management
├── mod.rs                   # Public API for all key types
├── manager.rs               # KeyManager (facade for ALL keys)
├── factory.rs               # KeyFactory (creates any key type)
├── errors.rs                # Unified errors for all keys
├── models/                  # 🆕 Shared key concepts
│   ├── key_type.rs         # Enum: Passphrase | YubiKey | Future
│   ├── key_reference.rs    # Unified key reference
│   └── vault_protection.rs # How vaults use multiple keys
├── passphrase/             # 🆕 Passphrase-specific
│   ├── models/
│   ├── services/
│   ├── state/
│   └── events/
├── yubikey/                # ✅ Existing (move here)
│   ├── models/
│   ├── services/
│   ├── state/
│   └── events/
├── future_keys/            # 🆕 Placeholder for expansion
│   └── fido2/              # FIDO2, smart cards, etc.
└── services/               # 🆕 Cross-key services
    ├── key_discovery.rs    # Find all available keys
    ├── key_validation.rs   # Validate any key type
    └── vault_protection.rs # Combine keys for vault protection
```

## Benefits of This Architecture

1. **🎯 Single Responsibility**: Each key type owns its domain
2. **🔄 Extensibility**: Easy to add FIDO2, smart cards, hardware tokens
3. **🏗️ Consistency**: Same patterns (models/services/state/events) for all key types
4. **🔒 Security**: Unified validation and protection logic
5. **🧩 Modularity**: Keys can be developed independently
6. **📱 Future-Proof**: Mobile hardware keys, biometrics, etc.

## Key Architectural Decisions

### 1. Vault Protection Strategy

```rust
// Instead of scattered logic
pub enum VaultProtection {
    PassphraseOnly(PassphraseKey),
    YubiKeyOnly(YubiKey),
    MultiKey {
        passphrase: Option<PassphraseKey>,
        yubikeys: Vec<YubiKey>,
        policy: RequirementPolicy, // Any1, Any2, All, etc.
    }
}
```

### 2. Unified Key Operations

```rust
pub trait KeyProvider {
    fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>>;
    fn decrypt(&self, encrypted: &[u8]) -> Result<Vec<u8>>;
    fn validate(&self) -> Result<KeyStatus>;
}
```

### 3. Cross-Key Services

```rust
pub struct VaultKeyManager {
    passphrase_service: PassphraseService,
    yubikey_service: YubiKeyService,
    // future: fido2_service, etc.
}
```

## 🤔 My Recommendation

**YES, we should absolutely build this higher-level abstraction!** Here's why:

1. **Current Pain**: Passphrase logic is as scattered as YubiKey logic was
2. **Future Growth**: Hardware security keys are becoming standard
3. **Security Best Practice**: Defense in depth requires multiple key types
4. **User Experience**: Users expect flexible authentication options

## 🚀 Implementation Strategy

1. **Phase 1**: Complete current YubiKey refactoring (don't break momentum)
2. **Phase 2**: Create key_management/ structure and move YubiKey module there
3. **Phase 3**: Extract and organize passphrase logic using same patterns
4. **Phase 4**: Build unified KeyManager facade
5. **Phase 5**: Future key types (FIDO2, etc.)

## Decision Point

What do you think? Should we:
- **A)** Finish YubiKey refactoring first, then reorganize into key_management
- **B)** Pause and restructure now to avoid double work
- **C)** Different approach?

This is a critical architectural decision that will shape the entire security foundation of the app.