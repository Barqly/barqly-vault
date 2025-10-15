# Critical Bug: Key ID Transformation in list_unified_keys

**Date:** 2025-10-14
**Severity:** Critical - Blocks attach/detach functionality
**Component:** Backend Command Layer - `list_unified_keys()`

---

## Problem Statement

The `list_unified_keys()` command is transforming registry key IDs, causing mismatch between what the frontend displays and what the backend expects in subsequent API calls.

**Expected Behavior:** Key IDs should be returned EXACTLY as stored in the registry (immutable identifiers).

**Actual Behavior:** Key IDs are being transformed (case change + separator change).

---

## Evidence

### Registry Storage (Source of Truth)
**File:** `~/Library/Application Support/com.barqly.vault/keys/barqly-vault-key-registry.json`

```json
{
  "keys": {
    "YubiKey-35230900": {  // ← Registry key ID (correct)
      "type": "yubikey",
      "label": "YubiKey-35230900",
      "serial": "35230900",
      ...
    }
  }
}
```

### Frontend Receives (from list_unified_keys)
**Source:** Console logs from `ManageKeysPage.tsx`

```json
{
  "id": "yubikey_35230900",  // ← Transformed ID (WRONG!)
  "label": "YubiKey-35230900",
  "key_type": { "type": "YubiKey", ... }
}
```

### Backend Rejects (in attach_key_to_vault)
**Error:** `attach_key.rs:90`

```
Failed to attach key to vault
key_id=yubikey_35230900
vault_id=7Bw3eqLGahnF5DXZyMa8Jz
error=Key 'yubikey_35230900' not found in registry
```

**Why it fails:** Backend looks for `"yubikey_35230900"` but registry has `"YubiKey-35230900"`.

---

## ID Transformation Pattern

| Registry ID (Correct) | Frontend Receives (Bug) | Pattern |
|----------------------|-------------------------|---------|
| `YubiKey-35230900` | `yubikey_35230900` | Lowercase + hyphen→underscore |
| `YubiKey-31310420` | `yubikey_31310420` | Lowercase + hyphen→underscore |
| `YubiKey-15903715` | `yubikey_15903715` | Lowercase + hyphen→underscore |
| `MBP2024-Nauman` | ??? (not tested) | Unknown |

---

## Root Cause Analysis

### Suspected Location
**File:** `src-tauri/src/commands/key_management/unified_keys.rs:140-148`

```rust
pub async fn list_unified_keys(filter: KeyListFilter) -> Result<Vec<KeyInfo>, CommandError> {
    let manager = KeyManager::new();
    manager
        .list_keys(filter)  // ← Likely transforms IDs here
        .await
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))
}
```

**Hypothesis:** The `KeyManager::list_keys()` or the `KeyInfo` struct construction is applying some transformation logic that shouldn't exist.

---

## Impact

### Broken Functionality
- ✅ **list_unified_keys()** - Works (returns data)
- ❌ **attachKeyToVault()** - FAILS (key ID not found)
- ❌ **removeKeyFromVault()** - FAILS (key ID not found)
- ❌ **Any command using key_id parameter** - FAILS

### User Impact
- Users can SEE keys in Manage Keys page
- Users CANNOT attach/detach keys to vaults
- Error: "Verify the key ID and vault ID are correct"

---

## Expected Fix

### Backend Engineer Tasks

1. **Find ID transformation logic** in:
   - `KeyManager::list_keys()`
   - `KeyInfo` struct construction
   - Any sanitization/formatting functions

2. **Remove transformation** - IDs must be returned as-is from registry

3. **Verify registry key lookup** uses exact match (case-sensitive)

4. **Test cases:**
   ```rust
   #[test]
   fn test_key_id_immutability() {
       let registry_id = "YubiKey-35230900";
       let key_info = list_unified_keys(...);
       assert_eq!(key_info.id, registry_id); // Must match exactly!
   }
   ```

---

## Frontend Context Issue

### Current Code Problem
**File:** `src-ui/src/hooks/useManageKeysWorkflow.ts:24-50`

```typescript
// Converting KeyInfo → KeyReference-like structure
const allKeys = useMemo(() => {
  return globalKeys.map((keyInfo) => {
    const keyRef: any = {
      id: keyInfo.id,  // ← Using backend's (wrong) ID
      label: keyInfo.label,
      type: keyInfo.key_type.type,
      // ... STRIPS vault_associations!
    };
    return keyRef;
  });
}, [globalKeys]);
```

**Problems:**
1. ❌ Strips `vault_associations` field (needed for VaultAttachmentDialog)
2. ❌ Converts `KeyInfo` → custom `KeyReference` structure
3. ❌ This conversion shouldn't exist in frontend!

### Frontend Engineer Tasks

**After backend fix:**

1. **Research:** Verify if `KeyInfo` type from backend is meant to be used DIRECTLY in frontend
   - Check if previous sessions discussed this
   - Look for any docs about KeyInfo vs KeyReference distinction
   - Confirm: Should frontend use KeyInfo directly without conversion?

2. **If KeyInfo should be used directly:**
   - Remove lines 24-50 conversion logic in `useManageKeysWorkflow.ts`
   - Update components to use `KeyInfo` instead of custom structure
   - Verify all fields are present (including `vault_associations`)

3. **If conversion is needed:**
   - Update conversion to preserve `vault_associations`
   - Document WHY conversion exists
   - Ensure ID is never transformed

---

## Architecture Question

**For Discussion:**

The Command layer (presentation layer) should provide the correct data structure for UI. Frontend shouldn't need to convert `KeyInfo` → `KeyReference`.

**Question for Backend Engineer:**
- Is `KeyInfo` the intended frontend type?
- Why does frontend code convert `KeyInfo` → `KeyReference`?
- Should Command layer return `KeyReference` directly instead?

**Question for Frontend Engineer:**
- Was there a previous decision to use KeyInfo directly?
- Why does the conversion code exist?
- Can we use KeyInfo everywhere and remove conversion?

---

## Temporary Workaround (NOT IMPLEMENTED)

We are **NOT** implementing a workaround. Frontend will wait for:
1. Backend fix for ID transformation
2. Clarification on KeyInfo vs KeyReference usage
3. Frontend refactor if needed

---

## Test Checklist (After Fix)

- [ ] listUnifiedKeys returns `id: "YubiKey-35230900"` (exact match with registry)
- [ ] attachKeyToVault works with returned key ID
- [ ] removeKeyFromVault works with returned key ID
- [ ] VaultAttachmentDialog shows checkboxes correctly
- [ ] Attach/detach operations succeed
- [ ] No ID transformation anywhere in the pipeline

---

## Related Files

### Backend
- `src-tauri/src/commands/key_management/unified_keys.rs:140-148`
- `src-tauri/src/key_management/*/application/manager.rs` (KeyManager)
- `src-tauri/src/commands/key_management/attach_key.rs:90` (error location)
- Registry: `~/Library/Application Support/com.barqly.vault/keys/barqly-vault-key-registry.json`

### Frontend
- `src-ui/src/hooks/useManageKeysWorkflow.ts:24-50` (conversion logic)
- `src-ui/src/pages/ManageKeysPage.tsx:67-99` (KeyInfo reconstruction workaround)
- `src-ui/src/components/keys/VaultAttachmentDialog.tsx` (expects KeyInfo with vault_associations)

---

**Status:** ⏸️ **UI work paused** - waiting for backend fix + architecture clarification
