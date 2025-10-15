# Backend Issue: Key Label Validation Too Restrictive

**Date:** 2025-10-15
**Reporter:** Frontend Engineer
**Priority:** Medium
**Type:** Consistency Issue

---

## Problem Statement

Key label validation is inconsistent with vault label validation:

- **Vault labels:** Allow spaces (e.g., `"My Vault"`, `"Sam Family Vault"`)
- **Key labels:** Reject spaces (only alphanumeric + `-` + `_`)

**User Impact:** Users trying to create keys with labels like `"Hello World123"` get rejected with error: *"Validation failed for input: Key label contains invalid characters:"*

---

## Current Implementation

### Vault Label Validation
**File:** `src-tauri/src/services/vault/domain/models/vault_rules.rs:17-40`

```rust
pub fn validate_vault_name(name: &str) -> VaultResult<()> {
    let trimmed = name.trim();

    if trimmed.is_empty() {
        return Err(VaultError::InvalidName(
            "Vault name cannot be empty".to_string(),
        ));
    }

    if trimmed.len() > 100 {
        return Err(VaultError::InvalidName(
            "Vault name must be less than 100 characters".to_string(),
        ));
    }

    // Check for invalid characters that might cause file system issues
    if trimmed.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        return Err(VaultError::InvalidName(
            "Vault name contains invalid characters".to_string(),
        ));
    }

    Ok(())
}
```

**Test (line 91):** `assert!(VaultRules::validate_vault_name("My Vault").is_ok());` ✅ **PASSES**

**Allowed:** Letters, numbers, spaces, dashes, underscores, and most punctuation
**Forbidden:** Filesystem-unsafe chars (`/\:*?"<>|`)

---

### Key Label Validation
**File:** `src-tauri/src/types/validation.rs:146-166`

```rust
pub fn validate_key_label(label: &str) -> Result<(), Box<CommandError>> {
    // Key labels should only contain letters, numbers, dashes, and underscores
    if !label
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        let invalid_chars: Vec<char> = label
            .chars()
            .filter(|c| !c.is_alphanumeric() && *c != '-' && *c != '_')
            .collect();
        let invalid_chars_str = invalid_chars.iter().collect::<String>();
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidKeyLabel,
                format!("Key label contains invalid characters: {invalid_chars_str}"),
            )
            .with_recovery_guidance("Remove special characters and spaces. Valid: letters (a-z, A-Z), numbers (0-9), dashes (-), and underscores (_). Example: 'my-bitcoin-keys' or 'bitcoin_wallet_2024'"),
        ));
    }
    Ok(())
}
```

**Test:** `"Hello World123"` ❌ **FAILS** (space is invalid)

**Allowed:** Letters, numbers, dashes, underscores ONLY
**Forbidden:** Spaces, punctuation, special chars

---

## Requested Change

**Align key label validation with vault label validation** to allow spaces and provide consistent UX.

### Proposed Implementation

```rust
pub fn validate_key_label(label: &str) -> Result<(), Box<CommandError>> {
    let trimmed = label.trim();

    // 1. Check not empty
    if trimmed.is_empty() {
        return Err(Box::new(
            CommandError::validation("Key label cannot be empty".to_string())
                .with_recovery_guidance("Enter a descriptive name for your encryption key (e.g., 'personal backup', 'family keys')"),
        ));
    }

    // 2. Check length (match vault max of 100, but use 24 for keys as per UI constraint)
    if trimmed.len() > 24 {
        return Err(Box::new(
            CommandError::validation(format!(
                "Key label is too long ({} characters, maximum 24)",
                trimmed.len()
            ))
            .with_recovery_guidance("Use a shorter label (up to 24 characters)"),
        ));
    }

    // 3. Check for filesystem-unsafe characters (same as vault validation)
    if trimmed.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        let invalid_chars: Vec<char> = trimmed
            .chars()
            .filter(|c| ['/', '\\', ':', '*', '?', '"', '<', '>', '|'].contains(c))
            .collect();
        let invalid_chars_str = invalid_chars.iter().collect::<String>();
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidKeyLabel,
                format!("Key label contains invalid characters: {invalid_chars_str}"),
            )
            .with_recovery_guidance("Remove filesystem-unsafe characters. Avoid: / \\ : * ? \" < > | Example: 'My Bitcoin Keys' or 'bitcoin-wallet-2024'"),
        ));
    }

    Ok(())
}
```

---

## Changes Summary

| Aspect | Old Behavior | New Behavior |
|--------|-------------|--------------|
| **Spaces** | ❌ Rejected | ✅ Allowed |
| **Punctuation** | ❌ Rejected (except `-` `_`) | ✅ Allowed (except filesystem-unsafe) |
| **Forbidden chars** | All except alphanumeric + `-` + `_` | Only: `/ \\ : * ? " < > \|` |
| **Max length** | None enforced | 24 characters (UI constraint) |
| **Example valid labels** | `bitcoin-wallet_2024` | `My Bitcoin Keys`, `Sam's Backup 2024`, `bitcoin-wallet_2024` |

---

## Test Cases

### Should Pass ✅
```rust
assert!(ValidationHelper::validate_key_label("My Bitcoin Keys").is_ok());
assert!(ValidationHelper::validate_key_label("Hello World123").is_ok());
assert!(ValidationHelper::validate_key_label("Sam's Backup").is_ok());
assert!(ValidationHelper::validate_key_label("bitcoin-wallet_2024").is_ok());
assert!(ValidationHelper::validate_key_label("test key 1").is_ok());
```

### Should Fail ❌
```rust
// Empty
assert!(ValidationHelper::validate_key_label("").is_err());
assert!(ValidationHelper::validate_key_label("   ").is_err());

// Too long (> 24 chars)
assert!(ValidationHelper::validate_key_label("This is a very long key label name").is_err());

// Filesystem-unsafe characters
assert!(ValidationHelper::validate_key_label("My/Key").is_err());
assert!(ValidationHelper::validate_key_label("Key*Name").is_err());
assert!(ValidationHelper::validate_key_label("Key:Label").is_err());
assert!(ValidationHelper::validate_key_label("Key?Name").is_err());
```

---

## Impact Analysis

### Affected Commands
- `add_passphrase_key_to_vault` - Validates label via `validate_key_label`
- `init_yubikey_for_vault` - Validates label via `validate_key_label`
- `register_yubikey_for_vault` - Validates label via `validate_key_label`

### Migration Considerations
**No data migration needed** - This is a validation relaxation, not a tightening. Existing keys with labels like `"bitcoin-wallet_2024"` will continue to work. New keys can now use friendlier labels like `"My Bitcoin Keys"`.

### Frontend Impact
**No frontend changes required** - Frontend already supports spaces in input fields. Once backend validation is updated, spaces will work immediately.

---

## Additional Notes

### Why Spaces Should Be Allowed
1. **User-friendliness:** Natural language labels like `"My Family Vault"` are more memorable
2. **Consistency:** Vaults allow spaces, keys should too
3. **No technical blocker:** Key labels are stored in JSON registry, not directly as filenames

### Why Filesystem-Unsafe Chars Should Still Be Forbidden
Even though labels aren't used directly as filenames, rejecting these chars provides:
1. **Future-proofing:** If we ever export keys with label-based filenames
2. **Cross-platform safety:** Ensures labels work on Windows/Mac/Linux
3. **Consistency:** Matches vault validation rules

---

## Request

Please update `validate_key_label` in `src-tauri/src/types/validation.rs` to:
1. Allow spaces and punctuation (except filesystem-unsafe chars)
2. Enforce 24-character max length
3. Match validation rules used for vault labels
4. Add test cases listed above

**Priority:** Medium - Not blocking, but creates inconsistent UX

---

_Document created by: Frontend Engineer_
_Date: 2025-10-15_
