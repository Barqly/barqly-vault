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
│   ├── domain/             # Passphrase models, validation rules
│   ├── application/        # Passphrase services, workflows
│   └── infrastructure/     # Key derivation, secure storage
├── yubikey/                # ✅ Existing (move here)
│   ├── domain/             # Business logic, models, errors
│   ├── application/        # Services, manager, factory
│   └── infrastructure/     # Hardware integrations, providers
├── future_keys/            # 🆕 Placeholder for expansion
│   └── smartcard/          # Smart cards, FIDO2, etc.
│       ├── domain/         # (follows same DDD pattern)
│       ├── application/
│       └── infrastructure/
├── shared/                 # 🆕 Common device abstractions
│   ├── traits.rs          # HardwareSecurityDevice, IdentityManager
│   └── registry.rs        # DeviceRegistry for multi-device management
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

## Domain-Driven Design Principles Applied

### 1. Layer Responsibilities

**Domain Layer** (`domain/`):
- Pure business logic with zero external dependencies
- Contains domain entities, value objects, and business rules
- Examples: `YubiKeyDevice`, `Serial`, `Pin`, domain-specific errors

**Application Layer** (`application/`):
- Orchestrates domain objects and infrastructure services
- Contains use cases, workflows, and the facade (Manager)
- Examples: `YubiKeyManager`, `DeviceService`, `IdentityService`

**Infrastructure Layer** (`infrastructure/`):
- External system integrations (hardware, databases, APIs)
- Contains providers, drivers, and protocol implementations
- Examples: `YubiIdentityProvider`, PTY operations, age-plugin integration

### 2. Dependency Flow (Critical!)

```
Frontend → Tauri Commands → Application → Domain
                              ↓
                        Infrastructure
```

- **Application** depends on **Domain** ✅
- **Application** depends on **Infrastructure** ✅
- **Infrastructure** depends on **Domain** ✅
- **Domain** depends on **NOTHING** ✅

### 3. Entry Point Pattern

**Always go through Application layer**:
```rust
// ✅ CORRECT: Commands call Application
#[tauri::command]
async fn init_yubikey(...) -> Result<...> {
    let manager = YubiKeyManager::new().await?;  // Application facade
    manager.initialize_device(...).await
}

// ❌ WRONG: Never skip Application layer
#[tauri::command]
async fn init_yubikey(...) -> Result<...> {
    let provider = HardwareProvider::new()?;     // Direct Infrastructure - BAD!
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

=============

  1. 🟡 PTY Call - MOVE TO MANAGER

  impl YubiKeyManager {
      async fn initialize_device_hardware(&self, pin: &Pin) -> YubiKeyResult<String> {
          // Move initialize_yubikey_with_recovery here
          // Now testable, mockable, centralized
      }
  }

  2. 🔴 Dead Code Analysis - AGGRESSIVE CLEANUP NEEDED

  CONFIRMED DUPLICATION in lib.rs:
  - yubikey_list_devices (old) vs list_yubikeys (new)
  - yubikey_initialize (old) vs init_yubikey (new)
  - Both registered! This explains UI confusion you experienced.

  Cleanup Strategy:
  1. Remove old command files entirely: device_management.rs, initialization.rs
  2. Remove old command registrations from lib.rs
  3. Remove unused crypto/yubikey legacy components
  4. Keep only: Provider infrastructure + New streamlined API

  3. 🔵 Infrastructure Location - CONSOLIDATE

  Recommended structure:
  src/key_management/
  ├── shared/                  # Common interfaces for all devices
  │   ├── traits.rs           # DeviceService, IdentityService traits
  │   └── types.rs            # Common domain objects
  ├── passphrase/
  └── yubikey/
      ├── domain/             # Models, business logic
      │   ├── models.rs       # Serial, Pin, YubiKeyDevice
      │   └── state.rs        # YubiKeyState, events
      ├── infrastructure/     # MOVED from crypto/yubikey
      │   ├── providers/      # age-plugin integration  
      │   ├── pty/            # Hardware operations
      │   └── age_plugin.rs   # age tooling
      ├── application/        # Services, manager
      │   ├── services/       # DeviceService, IdentityService
      │   └── manager.rs      # Facade
      └── commands/           # Tauri command layer
          └── streamlined.rs  # ONLY streamlined API

  Future devices (smart cards, etc.) follow same pattern:
  src/key_management/
  ├── shared/
  ├── passphrase/  
  ├── yubikey/
  └── smartcard/              # Future
      ├── domain/
      ├── infrastructure/
      ├── application/
      └── commands/

  Benefits:

  - Cohesion: All yubikey code together
  - Consistency: Same pattern for all key devices
  - Discoverability: No more hunting across crypto/ and key_management/
  - Testing: Easy to mock entire yubikey module
  - Security: Smaller attack surface, no dead code