# Vault-Agnostic YubiKey Registration API Requirement

**Status**: ⚠️ Backend Implementation Required
**Priority**: High (R2 Blocker - Oct 15 deadline)
**Created**: 2025-10-14
**Component**: Backend API - `register_yubikey()`

---

## Problem Statement

### Original Issue
The Manage Keys screen was using **vault-aware YubiKey APIs** (`YubiKeySetupDialog` component) which:
- Required `currentVault` from VaultContext
- Called `listUnifiedKeys({ type: 'AvailableForVault', value: vault_id })`
- Called `initYubikeyForVault(params)` and `registerYubikeyForVault(params)`
- Passed wrong vault_id in global key management context

### Why This Was Wrong
**Manage Keys is a GLOBAL registry view** (vault-agnostic):
- Users manage ALL keys across ALL vaults
- Keys are added to registry first, then attached to vaults separately
- No single vault context should be required
- Similar to how Vault Hub manages vaults globally

### The Change
Redesigned Manage Keys to use **vault-agnostic APIs**:
- Created `YubiKeyRegistryDialog` component (no vault context)
- Uses global YubiKey detection: `listYubikeys()`
- Uses vault-agnostic initialization: `initYubikey(serial, pin, label)`
- **MISSING**: Vault-agnostic registration for orphaned YubiKeys

---

## Backend API Status

### ✅ Currently Working

#### 1. `listYubikeys()` - List ALL YubiKeys
```rust
// src-tauri/src/commands/key_management/yubikey/device_commands.rs:40-59
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError>
```
**Status**: ✅ Implemented and working
**Returns**: All YubiKeys with state detection (new, reused, orphaned, registered)

#### 2. `initYubikey(serial, pin, label)` - Initialize New YubiKey
```rust
// src-tauri/src/commands/key_management/yubikey/device_commands.rs:65-143
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError>
```
**Status**: ✅ Implemented and working
**Use Cases**: New YubiKeys (state='new' or 'reused')
**Returns**: YubiKey details + recovery_code

---

### ❌ NOT IMPLEMENTED (BLOCKER)

#### 3. `registerYubikey(serial, label, pin)` - Register Orphaned YubiKey
```rust
// src-tauri/src/commands/key_management/yubikey/device_commands.rs:149-158
pub async fn register_yubikey(
    _serial: String,
    _label: String,
    _pin: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    Err(CommandError::operation(
        ErrorCode::YubiKeyInitializationFailed,
        "YubiKey registration functionality needs to be implemented with YubiKeyManager",
    ))
}
```

**Status**: ❌ STUB ONLY - Returns hardcoded error
**Impact**: Users cannot add orphaned YubiKeys to registry from Manage Keys
**Use Case**: YubiKeys that are already initialized (have age identity) but not in registry

---

## What Backend Needs to Implement

### API Specification: `register_yubikey()`

**Purpose**: Add an already-initialized YubiKey (orphaned state) to the global registry without attaching to any vault.

**Signature**:
```rust
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError>
```

**Parameters**:
- `serial`: YubiKey serial number (e.g., "15903715")
- `label`: User-provided label (e.g., "YubiKey-15903715")
- `pin`: YubiKey PIN for ownership verification

**Expected Behavior**:
1. Verify YubiKey is connected and matches serial
2. Verify PIN is correct (authenticate with YubiKey)
3. Read existing age identity from YubiKey
4. Add entry to key registry with:
   - Serial number
   - Label
   - Age recipient/identity_tag
   - Lifecycle status: 'active'
   - NO vault associations (global registry only)
5. Return YubiKey details (NO recovery code - already initialized)

**Return Type**:
```rust
StreamlinedYubiKeyInitResult {
    serial: String,
    slot: u8,
    recipient: String,      // Existing age recipient from YubiKey
    identity_tag: String,   // Existing identity tag
    label: String,
    recovery_code: String,  // Empty or placeholder (key already initialized)
}
```

**Error Cases**:
- YubiKey not found
- Wrong PIN (YUBI_KEY_PIN_REQUIRED / WRONG_PIN)
- YubiKey already registered (KEY_ALREADY_EXISTS)
- Communication error

---

## Reference: Vault-Aware Version (Working Model)

The vault-aware version `registerYubikeyForVault()` is **already implemented** at:
`src-tauri/src/commands/key_management/yubikey/vault_commands.rs:299-411`

**Key differences**:
```rust
// Vault-aware (EXISTS):
pub async fn register_yubikey_for_vault(
    input: RegisterYubiKeyForVaultParams, // Contains vault_id
) -> CommandResponse<YubiKeyVaultResult>

// Vault-agnostic (NEEDED):
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: String,  // No vault_id parameter
) -> Result<StreamlinedYubiKeyInitResult, CommandError>
```

The vault-agnostic version should:
1. **Reuse** YubiKeyManager logic from `registerYubikeyForVault()`
2. **Skip** vault attachment (don't update vault manifest)
3. **Add** to registry only (KeyRegistry entry)
4. **Return** same result structure

---

## User Journey Impact

### Current Behavior (BROKEN)
1. User opens Manage Keys
2. Clicks YubiKey card
3. Sees "YubiKey Ready" for orphaned YubiKey (Serial: 15903715)
4. Enters label + PIN
5. Clicks "Add to Registry"
6. **ERROR**: "YubiKey registration functionality needs to be implemented with YubiKeyManager"

### Expected Behavior (AFTER FIX)
1. User opens Manage Keys
2. Clicks YubiKey card
3. Sees "YubiKey Ready" for orphaned YubiKey
4. Enters label + PIN
5. Clicks "Add to Registry"
6. **SUCCESS**: YubiKey added to registry, appears in key list
7. User can then use "Attach to Vault" button to attach to specific vaults

---

## Frontend Implementation Status

### ✅ Frontend Ready
- `YubiKeyRegistryDialog.tsx` component created (564 LOC)
- Properly calls `commands.registerYubikey(serial, label, pin)` for orphaned state
- Handles all YubiKey states (new, reused, orphaned)
- No vault context dependencies
- Integrated into ManageKeysPage

**Location**: `src-ui/src/components/keys/YubiKeyRegistryDialog.tsx:139-157`

---

## Backend Implementation Checklist

For sr-backend-engineer:

- [ ] Review existing `registerYubikeyForVault()` implementation as reference
- [ ] Implement `register_yubikey()` in `device_commands.rs:149-158`
- [ ] Use YubiKeyManager for YubiKey operations
- [ ] Verify YubiKey ownership with PIN
- [ ] Read existing age identity from YubiKey
- [ ] Add entry to KeyRegistry (NO vault manifest update)
- [ ] Return StreamlinedYubiKeyInitResult
- [ ] Handle error cases (not found, wrong PIN, already registered)
- [ ] Test with orphaned YubiKey (has age identity, not in registry)
- [ ] Update TypeScript bindings (`npm run update-types`)

---

## Technical Context

**File Locations**:
- Backend stub: `src-tauri/src/commands/key_management/yubikey/device_commands.rs:149-158`
- Working reference: `src-tauri/src/commands/key_management/yubikey/vault_commands.rs:299-411`
- Frontend caller: `src-ui/src/components/keys/YubiKeyRegistryDialog.tsx:145-149`
- TypeScript bindings: `src-ui/src/bindings.ts:420-426`

**Related Commands**:
- `list_yubikeys()` - List YubiKeys globally (working)
- `init_yubikey()` - Initialize new YubiKey (working)
- `register_yubikey()` - Register orphaned YubiKey (STUB - needs implementation)
- `register_yubikey_for_vault()` - Vault-specific version (working, use as reference)

---

## Acceptance Criteria

- [ ] `register_yubikey(serial, label, pin)` successfully adds orphaned YubiKey to registry
- [ ] PIN verification works (prevents unauthorized registration)
- [ ] Registry entry created with correct lifecycle status
- [ ] NO vault associations created (global registry only)
- [ ] Error handling for all failure cases
- [ ] Frontend YubiKeyRegistryDialog completes successfully
- [ ] YubiKey appears in Manage Keys list after registration
- [ ] User can attach registered YubiKey to vaults using "Attach to Vault" button

---

## Timeline

**Deadline**: Before Oct 15 (R2 release)
**Priority**: High - Blocks orphaned YubiKey workflow in Manage Keys

---

## Related Documentation

- `docs/architecture/key-lifecycle-management.md` - Key lifecycle states
- `docs/engineering/ui/refactoring-guidelines.md` - UI architecture patterns
- `context.md` - Project overview and R2 requirements
