# Backend API Requirements: Passphrase Key Creation

**Date:** 2025-09-18
**From:** Frontend Engineer
**To:** Backend Engineer
**Priority:** High

## Overview
The frontend PassphraseKeyDialog component needs backend integration to create actual passphrase keys. Currently, `add_key_to_vault` creates placeholder entries but doesn't generate real encryption keys.

## Current Implementation Gap
The frontend calls:
```typescript
await addKeyToVault('passphrase', label, { passphrase });
```

But the backend `add_key_to_vault` command needs to:
1. Generate an actual encryption key using the passphrase
2. Store the key securely
3. Link it to the vault

## Required Backend Changes

### 1. Integrate with generate_key Command
The existing `generate_key` command should be called internally when adding a passphrase key:

```rust
// In add_key_to_vault command
if key_type == "passphrase" {
    // Generate the actual key
    let key_result = generate_key(GenerateKeyInput {
        label: label.clone(),
        passphrase: passphrase.unwrap(), // From request
    }).await?;

    // Create KeyReference with actual key_id
    let key_ref = KeyReference {
        id: generate_key_id(),
        key_type: KeyType::Passphrase {
            key_id: key_result.key_id
        },
        label,
        state: KeyState::Active,
        created_at: now(),
        last_used: None,
    };

    // Add to vault
    vault.keys.push(key_ref);
}
```

### 2. Passphrase Validation API
Need a new command for frontend validation:

```rust
#[tauri::command]
pub async fn validate_passphrase_strength(
    passphrase: String
) -> CommandResponse<PassphraseValidationResult> {
    // Check length (min 12 chars)
    // Check complexity (mix of characters)
    // Check against common passwords
    // Return strength score and feedback
}
```

Response type:
```rust
pub struct PassphraseValidationResult {
    pub is_valid: bool,
    pub strength: PassphraseStrength, // Weak, Fair, Good, Strong
    pub feedback: Vec<String>,
    pub score: u8, // 0-100
}
```

### 3. Prevent Duplicate Passphrase Keys
Each vault should only have one passphrase key:

```rust
// In add_key_to_vault
if key_type == "passphrase" {
    // Check if vault already has a passphrase key
    let has_passphrase = vault.keys.iter()
        .any(|k| matches!(k.key_type, KeyType::Passphrase { .. }));

    if has_passphrase {
        return Err(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Vault already has a passphrase key".to_string(),
            // ...
        });
    }
}
```

## Frontend Integration Points

### Files Affected:
- `/src-ui/src/components/keys/PassphraseKeyDialog.tsx` (line 39, 61)
- `/src-ui/src/contexts/VaultContext.tsx` (addKeyToVault method)

### Current TODOs in Code:
```typescript
// PassphraseKeyDialog.tsx:39
// TODO: Backend engineer needs to implement validate_passphrase API

// PassphraseKeyDialog.tsx:61
// TODO: Backend engineer needs to integrate with generate_key command
// Currently addKeyToVault creates placeholder, needs actual key generation
```

## Testing Requirements
1. Create a passphrase key and verify it can encrypt/decrypt files
2. Ensure duplicate passphrase keys are rejected
3. Verify passphrase validation works correctly
4. Test that the generated key_id links properly to the vault

## Security Considerations
- Never log or store the raw passphrase
- Ensure passphrase is cleared from memory after key generation
- Use secure key derivation (PBKDF2 or similar)
- Consider adding rate limiting for passphrase attempts

## Migration Notes
Existing vaults may already have passphrase keys from the old ProtectionMode system. Ensure these are properly linked when migrating.

## Questions for Backend
1. Should we enforce a maximum number of passphrase change operations?
2. How should we handle passphrase recovery/reset?
3. Should we add passphrase history to prevent reuse?

## Priority
This is blocking the Key Registration Flows (Milestone 2.2) completion. Users cannot add passphrase keys to vaults without this integration.