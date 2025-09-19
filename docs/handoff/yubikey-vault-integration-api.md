# Backend API Requirements: YubiKey Vault Integration

**Date:** 2025-09-18
**From:** Frontend Engineer
**To:** Backend Engineer
**Priority:** High

## Overview
The YubiKeySetupDialog component needs proper backend integration to initialize and register YubiKeys with vaults. Currently missing the connection between YubiKey initialization and vault key management.

## Current Implementation Gaps

### 1. YubiKey Initialization Not Connected to Vaults
The frontend needs to:
1. Initialize or register a YubiKey
2. Add it to the current vault
3. Store the slot_index (0-2) for UI positioning

Currently these are separate operations that need to be linked.

## Required Backend Changes

### 1. Enhanced init_yubikey Command
Modify to accept vault context and slot index:

```rust
pub struct YubiKeyInitParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,      // NEW: Target vault
    pub slot_index: u8,         // NEW: UI slot (0-2)
}

#[tauri::command]
pub async fn init_yubikey_for_vault(
    params: YubiKeyInitParams
) -> CommandResponse<YubiKeyInitResult> {
    // 1. Initialize the YubiKey
    let yubikey_result = init_yubikey(/* ... */).await?;

    // 2. Automatically add to vault
    let key_ref = KeyReference {
        id: generate_key_id(),
        key_type: KeyType::YubiKey {
            serial: params.serial,
            slot_index: params.slot_index,
            piv_slot: yubikey_result.slot, // Actual PIV slot (82-95)
        },
        label: params.label,
        state: KeyState::Active,
        created_at: now(),
        last_used: None,
    };

    // 3. Add to vault
    let mut vault = get_vault(params.vault_id).await?;
    vault.keys.push(key_ref);
    save_vault(&vault).await?;

    // 4. Return result with recovery code
    Ok(yubikey_result)
}
```

### 2. Register Existing YubiKey for Vault
For YubiKeys already initialized (state: REUSED):

```rust
pub struct RegisterYubiKeyParams {
    pub serial: String,
    pub pin: String,        // For verification only
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8,
}

#[tauri::command]
pub async fn register_yubikey_for_vault(
    params: RegisterYubiKeyParams
) -> CommandResponse<RegisterYubiKeyResult> {
    // 1. Verify PIN is correct
    verify_yubikey_pin(params.serial, params.pin).await?;

    // 2. Get YubiKey info
    let yubikey_info = get_yubikey_info(params.serial).await?;

    // 3. Add to vault
    let key_ref = KeyReference {
        id: generate_key_id(),
        key_type: KeyType::YubiKey {
            serial: params.serial,
            slot_index: params.slot_index,
            piv_slot: yubikey_info.slot,
        },
        label: params.label,
        state: KeyState::Registered,
        created_at: now(),
        last_used: None,
    };

    let mut vault = get_vault(params.vault_id).await?;
    vault.keys.push(key_ref);
    save_vault(&vault).await?;

    Ok(RegisterYubiKeyResult {
        success: true,
        key_reference: key_ref,
    })
}
```

### 3. List YubiKeys with Vault Context
Need to know which YubiKeys are available vs already in use:

```rust
#[tauri::command]
pub async fn list_available_yubikeys(
    vault_id: String
) -> CommandResponse<Vec<YubiKeyStateInfo>> {
    // 1. Get all connected YubiKeys
    let all_yubikeys = list_yubikeys().await?;

    // 2. Get vault's existing YubiKeys
    let vault = get_vault(vault_id).await?;
    let vault_serials: HashSet<String> = vault.keys.iter()
        .filter_map(|k| match &k.key_type {
            KeyType::YubiKey { serial, .. } => Some(serial.clone()),
            _ => None
        })
        .collect();

    // 3. Mark which are available
    let available_yubikeys = all_yubikeys.into_iter()
        .map(|mut yk| {
            if vault_serials.contains(&yk.serial) {
                yk.state = YubiKeyState::REGISTERED;
            }
            yk
        })
        .collect();

    Ok(available_yubikeys)
}
```

### 4. Validate Slot Availability
Ensure slot_index (0-2) isn't already taken:

```rust
fn validate_slot_index(vault: &Vault, slot_index: u8) -> Result<(), CommandError> {
    if slot_index > 2 {
        return Err(/* Invalid slot index */);
    }

    let slot_taken = vault.keys.iter()
        .any(|k| match &k.key_type {
            KeyType::YubiKey { slot_index: idx, .. } => *idx == slot_index,
            _ => false
        });

    if slot_taken {
        return Err(/* Slot already occupied */);
    }

    Ok(())
}
```

## Frontend Integration Points

### Files Affected:
- `/src-ui/src/components/keys/YubiKeySetupDialog.tsx` (lines 49, 105-108)
- `/src-ui/src/contexts/VaultContext.tsx` (addKeyToVault method)

### Current TODOs in Code:
```typescript
// YubiKeySetupDialog.tsx:49
// TODO: Backend engineer needs to implement list_yubikeys for vault context

// YubiKeySetupDialog.tsx:105-108
// TODO: Backend engineer needs to implement YubiKey initialization
// This should call init_yubikey or register_yubikey based on state
// And integrate with add_key_to_vault
```

## State Management
YubiKey states that need handling:
- `NEW`: Never initialized → call `init_yubikey_for_vault`
- `REUSED`: Initialized elsewhere → call `register_yubikey_for_vault`
- `REGISTERED`: Already in this vault → show as unavailable
- `ORPHANED`: Needs recovery → handle recovery flow

## Recovery Code Handling
When initializing a NEW YubiKey:
1. Generate recovery code (Base58, 16+ chars)
2. Return it ONCE to frontend for display
3. Never store or log the recovery code
4. Frontend shows warning about one-time display

## Testing Requirements
1. Initialize new YubiKey and verify slot assignment
2. Register existing YubiKey to different vault
3. Prevent duplicate YubiKeys in same vault
4. Verify slot_index constraints (0-2)
5. Test recovery code generation and display

## Security Considerations
- Never store or log PINs
- Clear PIN from memory after verification
- Recovery codes should be cryptographically secure
- Rate limit PIN attempts
- Validate YubiKey serial numbers

## Questions for Backend
1. Should we allow moving YubiKeys between vaults?
2. How to handle YubiKey removal (physically disconnected)?
3. Should we track which PIV slot (82-95) is actually used?
4. How to handle slot_index reassignment?

## Priority
This blocks YubiKey setup functionality. Users cannot add YubiKeys to vaults without this integration.