# KeyMenu Refactor - Frontend Cleanup Guide

**Date:** 2025-10-12
**Status:** ✅ Backend Changes Complete
**Backend Engineer:** sr-backend-engineer
**Purpose:** Document frontend cleanup tasks after KeyMenuInfo → KeyReference backend refactor

---

## Summary of Backend Changes

The `get_key_menu_data` command has been refactored to return `KeyReference[]` directly instead of `KeyMenuInfo[]`. This eliminates the need for frontend transformation logic.

### What Changed

**BEFORE:**
```rust
pub struct GetKeyMenuDataResponse {
    pub vault_id: String,
    pub keys: Vec<KeyMenuInfo>,  // Required frontend transformation
}
```

**AFTER:**
```rust
pub struct GetKeyMenuDataResponse {
    pub vault_id: String,
    pub keys: Vec<KeyReference>,  // Ready to use!
}
```

### TypeScript Bindings Updated

- ❌ `KeyMenuInfo` type has been **DELETED** from bindings
- ❌ `KeyMenuMetadata` type has been **DELETED** from bindings
- ✅ `GetKeyMenuDataResponse.keys` is now `KeyReference[]`
- ✅ `KeyReference` includes proper `KeyLifecycleStatus` enum values

---

## Frontend Files to Update

### 1. VaultContext.tsx (~60 LOC to delete)

**Location:** `src-ui/src/contexts/VaultContext.tsx`

**BEFORE (lines ~254-311):**
```typescript
// Complex transformation logic
const keyRefs = menuResponse.keys.map((keyMenuInfo: KeyMenuInfo, index: number) => {
  const keyReference: KeyReference = {
    id: keyMenuInfo.internal_id,
    label: keyMenuInfo.label,
    lifecycle_status: keyMenuInfo.state as any, // Type assertion needed
    created_at: keyMenuInfo.created_at,
    last_used: null,
    type: keyMenuInfo.key_type === "passphrase" ? "Passphrase" : "YubiKey",
    data: keyMenuInfo.key_type === "passphrase"
      ? { key_id: keyMenuInfo.internal_id }
      : {
          serial: (keyMenuInfo.metadata as any).serial,
          firmware_version: (keyMenuInfo.metadata as any).firmware_version || null,
        },
  };
  return keyReference;
});
```

**AFTER:**
```typescript
// Direct assignment - no transformation needed!
const keyRefs = menuResponse.keys; // Already KeyReference[]
```

**Actions:**
- [ ] Delete the entire transformation logic block
- [ ] Remove `KeyMenuInfo` import
- [ ] Remove all `as any` type assertions (lines ~260, 318, 321)
- [ ] Update `setKeyCache` and `setVaultKeys` calls to use `keyRefs` directly

---

### 2. useKeySelection.ts (~30 LOC to delete)

**Location:** `src-ui/src/hooks/useKeySelection.ts`

**BEFORE (lines ~69-97):**
```typescript
// Duplicate transformation logic
const keyRefs: KeyReference[] = activeKeys.map((keyMenuInfo: KeyMenuInfo) => {
  // 30 lines of transformation logic (same as VaultContext)
  return {
    id: keyMenuInfo.internal_id,
    // ... etc
  } as KeyReference;
});
```

**AFTER:**
```typescript
// Direct use - no transformation needed!
const keyRefs = activeKeys; // Already KeyReference[]
```

**Actions:**
- [ ] Delete the entire transformation logic
- [ ] Remove `KeyMenuInfo` type import
- [ ] Update any references to use `activeKeys` directly

---

### 3. Remove Type Imports

**Files to check:**
- `src-ui/src/contexts/VaultContext.tsx`
- `src-ui/src/hooks/useKeySelection.ts`
- Any other files importing `KeyMenuInfo`

**DELETE these imports:**
```typescript
import { KeyMenuInfo, KeyMenuMetadata } from '../bindings';
```

These types no longer exist in the bindings!

---

## Testing Checklist

After cleanup, verify:

### Visual Testing
- [ ] Key menu bar displays all keys correctly
- [ ] Passphrase key shows with proper label
- [ ] YubiKey keys show with proper labels
- [ ] Lifecycle status badges display correctly:
  - `Active` → green badge
  - `Suspended` → yellow badge
  - `PreActivation` → blue badge

### TypeScript Compilation
- [ ] No TypeScript errors after removing `KeyMenuInfo`
- [ ] No `as any` type assertions needed
- [ ] Type safety maintained throughout

### Functional Testing
- [ ] Key selection works properly
- [ ] Decrypt screen shows correct keys
- [ ] Encrypt screen shows correct keys
- [ ] Key caching works correctly

---

## Net Result

### Code Reduction
- **-120 LOC** total frontend code removed
- **-2** duplicate transformation implementations
- **-4** `as any` type assertions removed

### Architecture Improvements
- ✅ Proper DDD layering (backend does presentation work)
- ✅ No duplicate transformation logic
- ✅ Full type safety (no type assertions)
- ✅ Single source of truth for key structure

---

## Migration Notes

### If You Find Issues

1. **TypeScript Error about `KeyMenuInfo`:**
   - Remove the import
   - Use `KeyReference` directly from response

2. **Missing `internal_id` property:**
   - Use `id` instead (it's the same value)

3. **Missing `metadata` property:**
   - Access via `data` property in `KeyReference`
   - For YubiKey: `keyRef.data.serial` instead of `keyMenuInfo.metadata.serial`

4. **Missing `display_index` property:**
   - Not needed anymore - UI can determine display order

5. **Missing `state` property:**
   - Use `lifecycle_status` instead
   - It's now a proper enum, not a string

---

## Example: Updated VaultContext Usage

```typescript
// BEFORE (with transformation)
const response = await commands.getKeyMenuData({ vault_id: vaultId });
const keyRefs = response.keys.map(transformKeyMenuInfoToKeyReference);
setVaultKeys(keyRefs as any);

// AFTER (direct use)
const response = await commands.getKeyMenuData({ vault_id: vaultId });
setVaultKeys(response.keys); // Already KeyReference[] - no transformation!
```

---

## Questions?

If you encounter any issues during cleanup, check:
1. The TypeScript bindings at `src-ui/src/bindings.ts`
2. The `KeyReference` type definition
3. This documentation

The backend refactor is complete and tested. Frontend should now have cleaner, type-safe code!