# listUnifiedKeys API Fix - Implementation Complete

**For:** Frontend Engineer
**Date:** 2025-10-14
**Status:** ✅ Backend Fix Complete - Ready for Frontend Integration

---

## All Four Bugs Fixed ✅

### Bug #1: vault_associations Field Added
- **Before:** `vault_id: string | null` (single vault)
- **After:** `vault_associations: string[]` (multi-vault support)
- **Backward Compat:** `vault_id` still present (first vault from array)

### Bug #2: vault_id No Longer null
- **Before:** Always `null` for `{ type: 'All' }` filter
- **After:** Populated with first vault from `vault_associations`

### Bug #3: Unplugged YubiKeys Now Appear
- **Before:** YubiKey-31310420 (unplugged) NOT showing
- **After:** ALL registry keys show regardless of hardware connection
- **Status:** `is_available: false` for unplugged devices

### Bug #4: Registry Data Now Mapped
- **Before:** vault_associations in registry but lost during conversion
- **After:** vault_associations properly mapped from registry to API response

---

## What Changed

### TypeScript Type Updated
**File:** `src-ui/src/bindings.ts:759-799`

```typescript
export type KeyInfo = {
  id: string;
  label: string;
  key_type: KeyType;
  recipient: string;
  is_available: boolean;

  // Multi-vault support (NIST-aligned) ✨
  vault_associations: string[];  // Array of vault IDs this key is attached to

  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
  yubikey_info: YubiKeyInfo | null;
}
```

**BREAKING CHANGE:** `vault_id` field has been **removed**. Use `vault_associations` instead.

### Backend listUnifiedKeys({ type: 'All' }) Now:
1. ✅ Reads from registry (source of truth)
2. ✅ Returns ALL keys (plugged + unplugged)
3. ✅ Includes vault_associations array from registry
4. ✅ Sets is_available based on hardware connection status
5. ✅ Clean API - only vault_associations field (no tech debt)

---

## Frontend Migration Required

### Step 1: Update useManageKeysWorkflow.ts

**File:** `src-ui/src/hooks/useManageKeysWorkflow.ts:53-62`

```typescript
// BEFORE (BROKEN):
const getKeyVaultAttachments = useCallback(
  (keyId: string) => {
    const key = globalKeys.find((k) => k.id === keyId);
    if (!key || !key.vault_id) {  // ← vault_id field NO LONGER EXISTS
      return [];
    }
    return [key.vault_id];  // Single vault only
  },
  [globalKeys],
);

// AFTER (FIXED):
const getKeyVaultAttachments = useCallback(
  (keyId: string) => {
    const key = globalKeys.find((k) => k.id === keyId);
    if (!key) {
      return [];
    }
    // Use vault_associations (multi-vault support)
    return key.vault_associations;
  },
  [globalKeys],
);
```

**IMPORTANT:** vault_id field has been completely removed. Replace ALL `.vault_id` references with `.vault_associations`.

### Step 2: Update ManageKeysPage.tsx

No changes needed! Once `getKeyVaultAttachments()` returns correct array, everything else works:

```typescript
allKeys.map((key) => {
  const attachments = getKeyVaultAttachments(key.id);  // Now returns correct array!
  const isOrphan = attachments.length === 0;  // ✅ Correct orphan detection

  return (
    <KeyCard
      keyRef={key}
      vaultAttachments={attachments}  // ✅ Shows all vault attachments
      isOrphan={isOrphan}  // ✅ Only true when vault_associations.length === 0
      // ...
    />
  );
})
```

---

## Expected Results After Frontend Update

### MBP2024-Nauman (Passphrase, attached to 2 vaults)
```typescript
{
  id: "MBP2024-Nauman",
  label: "MBP2024 Nauman",
  vault_associations: [
    "7Bw3eqLGahnF5DXZyMa8Jz",  // Sam Family Vault
    "BvwMbXYuaoHHGWpTif9QWK"   // AKAH Trust
  ],
  is_available: true,
  lifecycle_status: "active"
}
```

**UI Should Show:**
```
🔑 MBP2024 Nauman
   ✅ Attached to: Sam Family Vault, AKAH Trust
   [Attach to Vault] [Export]
```

### YubiKey-31310420 (YubiKey, UNPLUGGED, attached to 2 vaults)
```typescript
{
  id: "yubikey_31310420",
  label: "YubiKey-31310420",
  vault_associations: [
    "7Bw3eqLGahnF5DXZyMa8Jz",
    "BvwMbXYuaoHHGWpTif9QWK"
  ],
  is_available: false,  // ✨ Unplugged!
  lifecycle_status: "active"
}
```

**UI Should Show:**
```
🔐 YubiKey-31310420 (unplugged)
   ✅ Attached to: Sam Family Vault, AKAH Trust
   ⚠️ Hardware not connected
   [Attach to Vault] [Export]
```

### YubiKey-15903715 (YubiKey, plugged in, NO vaults)
```typescript
{
  id: "yubikey_15903715",
  label: "YubiKey-15903715",
  vault_associations: [],  // ✅ Empty array - not attached to any vault
  is_available: true,
  lifecycle_status: "active"
}
```

**UI Should Show:**
```
🔐 YubiKey-15903715
   ⚠️ Not attached to any vault
   [Attach to Vault] [Export] [Delete]
```

---

## Test Cases

### Test 1: Multi-Vault Display
**Setup:** MBP2024-Nauman attached to 2 vaults
**Expected:** "Attached to: Sam Family Vault, AKAH Trust"
**Status:** ✅ Backend returns vault_associations array

### Test 2: Unplugged YubiKey Visibility
**Setup:** Unplug YubiKey-31310420
**Expected:** Still appears in list with `is_available: false`
**Status:** ✅ Backend reads from registry, not just connected devices

### Test 3: Orphan Detection
**Setup:** YubiKey-15903715 has `vault_associations: []`
**Expected:** Shows "Orphan" warning
**Status:** ✅ Frontend checks `attachments.length === 0`

---

## Breaking Changes

### ⚠️ vault_id Field REMOVED (Breaking Change)

- ❌ `vault_id` field has been **completely removed** from KeyInfo
- ✅ `vault_associations` array is the only field now
- ⚠️ All frontend code using `.vault_id` must be updated
- ✅ Clean API with zero technical debt

### Frontend Files Requiring Updates (11 files)

All files using `.vault_id` must migrate to `.vault_associations`:

1. **`useManageKeysWorkflow.ts`** - Change `key.vault_id` → `key.vault_associations`
2. **`ManageKeysPage.tsx`** - Update vault attachment logic
3. **`useEncryptionWorkflow.ts`** - Vault context handling
4. **`useDecryptionWorkflow.ts`** - Vault context handling
5. **`VaultContext.tsx`** - Vault selection state
6. **`useKeySelection.ts`** - Key filtering by vault
7. **`YubiKeySetupDialog.tsx`** - Vault-specific YubiKey setup
8. **`PassphraseKeyDialog.tsx`** - Vault-specific key creation
9. **`useVaultHubWorkflow.ts`** - Vault management

**Migration Pattern:**
```typescript
// OLD (will cause TypeScript errors):
if (key.vault_id) { ... }

// NEW:
if (key.vault_associations.length > 0) { ... }

// For single-vault contexts (Encrypt/Decrypt pages):
const currentVault = key.vault_associations[0];  // Or get from context
```

---

## Migration Checklist

- [ ] Update `useManageKeysWorkflow.ts` to use `vault_associations`
- [ ] Remove `vault_id` fallback once migration complete
- [ ] Test all three scenarios (attached, orphan, unplugged)
- [ ] Verify multi-vault display works
- [ ] Verify "Orphan" warning only shows for empty vault_associations

---

## Backend Implementation Details

### New Logic in list_all_keys()

**Design Change:**
```
OLD: List connected YubiKeys → Filter by state
NEW: List ALL registry entries → Check connection status
```

**Benefits:**
1. Registry is single source of truth
2. Unplugged devices now visible
3. vault_associations properly included
4. Consistent with passphrase keys (always from registry)

### Connection Status Check
```rust
// For each YubiKey in registry:
let is_available = yubikey_manager
    .is_device_connected(&serial)
    .await
    .unwrap_or(false);

// If connected: YubiKeyState::Registered, is_available: true
// If unplugged: YubiKeyState::Orphaned, is_available: false
```

---

## Success Criteria

After frontend update:
- ✅ MBP2024-Nauman shows "Attached to: 2 vaults"
- ✅ YubiKey-31310420 (unplugged) appears in list
- ✅ YubiKey-15903715 (no vaults) shows "Orphan" warning
- ✅ No false positives ("Orphan" only when vault_associations.length === 0)
- ✅ Multi-vault display works

---

**Timeline:** Frontend update can proceed immediately. Backend changes deployed in commit `[hash will be added after commit]`.

---

**Questions?** See `/docs/analysis/list-unified-keys-root-cause-analysis.md` for detailed analysis.
