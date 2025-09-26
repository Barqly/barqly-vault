# Key Management Architecture

## What This Is

Unified key management system supporting YubiKey, passphrase keys, and future hardware devices. Single source of truth for all cryptographic operations. Originally focused on YubiKey refactoring, this has evolved into a centralized architecture supporting multiple key types (YubiKey, passphrase, and future hardware keys).

**Location**: `src-tauri/src/key_management/`

## Architecture Pattern

```
UI → Tauri Command → Manager (Facade) → Services → Domain/Infrastructure
```
```mermaid
graph TB
    %% Presentation Layer
    UI[Frontend UI] --> CMD[Command Layer]

    %% Command Layer
    CMD --> FACADE[YubiKeyManager<br/>Facade]

    %% Service Layer
    FACADE --> DEV[Device Service]
    FACADE --> STATE[State Service]
    FACADE --> IDENT[Identity Service]
    FACADE --> REG[Registry Service]
    FACADE --> FILE[File Service]

    %% Domain Layer
    DEV --> DOMAIN[Domain Models]
    STATE --> DOMAIN
    IDENT --> DOMAIN
    REG --> DOMAIN
    FILE --> DOMAIN

    %% Infrastructure Layer
    DEV --> PTY[PTY Operations]
    IDENT --> AGE[Age Plugin]
    REG --> STORAGE[Storage Layer]
    FILE --> FS[File System]

    %% External Systems
    PTY --> YKMAN[YKMan Binary]
    AGE --> AGEPLUGIN[age-plugin-yubikey]
    STORAGE --> DB[(Registry DB)]
    FS --> TEMP[Temp Files]
```

**Two locations per key type:**
- Commands: `src-tauri/src/commands/{keytype}/` - thin command layer
- DDD: `src-tauri/src/key_management/{keytype}/` - business logic

**Implemented Key Types**:
- ✅ **YubiKey** - Complete DDD implementation (domain, application, infrastructure)
- ✅ **Passphrase** - Complete DDD implementation (domain, application, infrastructure)
- 🔮 **Future**: Smart cards, FIDO2, hardware tokens (follow same pattern)

## Key Principles

1. **No layer mixing** - upper layers never imported by lower layers
2. **Domain-driven** - business logic stays in domain layer
3. **Small files** - backend classes < 300 LOC
4. **Operation scoping** 
    - YubiKey operations always pass `--serial` for logical boundaries
    - One a vault is selelected for operations pass the vault as param
5. **Incremental changes** - small scope, small batch, related items only

## Design Patterns Used

- **Facade**: Manager as single entry point
- **State Machine**: YubiKey state transitions
- **Strategy**: State-specific operations
- **Repository**: Data access abstraction
- **Factory**: Object creation
- **Observer**: Event system

Always look for other relevant patterns to solve the problem more effectively.

## Data Storage (MAC example but Linux/Win would be different)

**Syncable** (`~/Documents/`):
- `Barqly-Vaults/`: Encrypted `.age` files + vault manifests
- `Barqly-Recovery/`: Decrypted output

**Non-Syncable** (`~/Library/Application Support/com.barqly.vault/`):
- `keys/`: Passphrase-encrypted keys + registry JSON
- `logs/`: Application logs

## Development

Read `docs/common/api-types.md` for API workflow.

## Passphrase Module Structure (Reference Implementation)

```
key_management/passphrase/           # DDD business logic
  domain/                            # Pure business logic
    models/
      passphrase_strength.rs         # PassphraseStrength enum
      validation_rules.rs            # Validation scoring logic (284 LOC)
    errors.rs                        # PassphraseError enum
  application/                       # Use cases & orchestration
    manager.rs                       # PassphraseManager facade
    services/
      generation_service.rs          # Key generation workflows
      validation_service.rs          # Passphrase validation
      vault_integration_service.rs   # Vault operations
  infrastructure/                    # External integrations
    key_derivation.rs                # Encryption/decryption (age library)
    storage.rs                       # PassphraseKeyRepository

commands/passphrase/                 # Thin command layer
  generation_commands.rs             # generate_key
  validation_commands.rs             # validate_passphrase*, verify_key_passphrase
  vault_commands.rs                  # add_passphrase_key_to_vault, validate_vault_passphrase_key
```

**Test Coverage**: 27 tests (18 domain + 3 infrastructure + 6 application)

**Code Metrics**:
- Deleted: 1,269 LOC (scattered old code)
- Added: ~900 LOC (organized DDD structure)
- Net: -369 LOC (29% reduction)

## Quality Standards

- Quality test cases (unit + integration). Follow pyramid model.
- No ui content or implementation testing, focus on behavior!
- Proper sensitive data and secret handling.
- Files under 300 LOC