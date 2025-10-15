# Backend API Issues - Vault Attachment Feature

**Date:** 2025-10-14
**Priority:** Critical - Blocks Manage Keys UI completion
**Engineers:** Backend Engineer + Frontend Engineer

---

## Executive Summary

Three critical backend API issues are blocking the VaultAttachmentDialog checkbox popup implementation:

1. **getVaultStatistics uses ambiguous `vault_name` parameter** - Should use deterministic `vault_id`
2. **attach_key_to_vault is not idempotent** - Fails when key already attached
3. **KeyInfo vs KeyReference tech debt** - Frontend still converting types (should use KeyInfo directly)

---

## Issue 1: getVaultStatistics API Design Flaw

### Current API Signature
```typescript
// bindings.ts:294
async getVaultStatistics(request: GetVaultStatisticsRequest)

// Request type (lines 699-703)
export type GetVaultStatisticsRequest = {
  vault_name: string  // "The sanitized vault name (filesystem-safe)"
}
```

### Problem

**We have `vault.id` (deterministic) but API requires `vault_name` (ambiguous).**

From `listVaults()`, we get:
```typescript
{
  id: "7Bw3eqLGahnF5DXZyMa8Jz",        // ✅ Deterministic, unique
  name: "Sam Family Vault",            // ❌ Display name (not sanitized)
  description: "Test Sam",
  created_at: "2025-10-08T03:43:02.250357Z",
  key_count: 3
}
// MISSING: sanitized_name field!
```

**VaultSummary doesn't provide the sanitized name needed for getVaultStatistics!**

### Error Evidence

**Console log:**
```
"error": "Failed to get vault statistics: Vault 'Sam Family Vault' not found"
```

**What happened:**
1. Frontend calls: `getVaultStatistics({ vault_name: "Sam Family Vault" })`
2. Backend looks for: sanitized name (probably `"Sam-Family-Vault"`)
3. Backend fails: Vault not found

### Architectural Principle Violation

**Rule:** When you have a deterministic unique identifier (ID), ALWAYS use it. Never use names (ambiguous, changeable).

**Why vault_id is better:**
- ✅ Unique and immutable
- ✅ We already have it from listVaults()
- ✅ No ambiguity (display name vs sanitized name)
- ✅ Consistent with other APIs (createVault, deleteVault, etc.)

### Required Fix

**Change API to accept `vault_id`:**

```rust
#[derive(Debug, Deserialize, specta::Type)]
pub struct GetVaultStatisticsRequest {
    pub vault_id: String,  // Changed from vault_name
}
```

**Update implementation** to look up vault by ID instead of name.

**Frontend usage after fix:**
```typescript
const statsResult = await commands.getVaultStatistics({
  vault_id: vault.id  // ✅ Clean, deterministic
});
```

---

## Issue 2: attach_key_to_vault Not Idempotent

### Current Behavior

**Error:** `attach_key.rs:90`
```
Failed to attach key to vault
key_id=YubiKey-15903715
vault_id=7Bw3eqLGahnF5DXZyMa8Jz
error=Invalid transition from Active to Active
```

**What happened:**
1. Key is already attached to vault (registry shows `vault_associations: ["7Bw3eqLGahnF5DXZyMa8Jz"]`)
2. User checks checkbox in UI (already checked, but frontend sends attach request)
3. Backend tries to transition lifecycle_status: Active → Active
4. NIST state machine rejects: Invalid transition

### Expected Behavior (Idempotent)

**Idempotency Rule:** Calling the same operation multiple times should have the same effect as calling it once.

```rust
// Pseudo-code for idempotent attach_key_to_vault:
pub async fn attach_key_to_vault(key_id: String, vault_id: String) -> Result<AttachKeyToVaultResponse> {
    let key = registry.get_key(&key_id)?;

    // Check if already attached
    if key.vault_associations.contains(&vault_id) {
        // Already attached - return success (no-op)
        return Ok(AttachKeyToVaultResponse {
            success: true,
            message: "Key already attached to this vault".to_string(),
            key_id,
            vault_id,
        });
    }

    // Not attached - perform attachment
    // Only NOW change lifecycle_status if needed
    ...
}
```

### Why This Matters

**Checkbox UI pattern:**
- User sees 3 vaults
- Vault A: checked (already attached)
- Vault B: unchecked
- Vault C: unchecked

**User workflow:**
1. User checks Vault B → Frontend calls `attachKeyToVault(key, B)` ✅ Should succeed
2. User checks Vault C → Frontend calls `attachKeyToVault(key, C)` ✅ Should succeed
3. User accidentally clicks Vault A again → Frontend calls `attachKeyToVault(key, A)` ❌ Currently fails, should be no-op

**Frontend shouldn't need to track "what changed"** - backend should handle idempotency.

### Required Fix

**Make `attach_key_to_vault` idempotent:**
1. Check if `vault_id` already in `vault_associations`
2. If yes → return success, don't change lifecycle_status
3. If no → add to vault_associations, update lifecycle_status if needed

**Same for `remove_key_from_vault`:**
1. Check if `vault_id` in `vault_associations`
2. If no → return success (already not attached)
3. If yes → remove from vault_associations

---

## Issue 3: KeyInfo vs KeyReference Tech Debt

### Current Frontend Code

**File:** `src-ui/src/hooks/useManageKeysWorkflow.ts:24-50`

```typescript
// Converting KeyInfo → custom KeyReference structure
const allKeys = useMemo(() => {
  return globalKeys.map((keyInfo) => {
    // Create a KeyReference-like object from KeyInfo
    const keyRef: any = {
      id: keyInfo.id,
      label: keyInfo.label,
      type: keyInfo.key_type.type,  // Extracting nested type
      created_at: keyInfo.created_at,
      lifecycle_status: keyInfo.lifecycle_status,
      is_available: keyInfo.is_available,
      // STRIPS vault_associations! ← BUG
    };

    // Add type-specific data
    if (keyInfo.key_type.type === 'YubiKey') {
      keyRef.data = {
        serial: keyInfo.key_type.data.serial,
        firmware_version: keyInfo.key_type.data.firmware_version || null,
      };
    } else if (keyInfo.key_type.type === 'Passphrase') {
      keyRef.data = {
        key_id: keyInfo.key_type.data.key_id,
      };
    }

    return keyRef;
  });
}, [globalKeys]);
```

**Problems:**
1. ❌ Strips `vault_associations` field (causes VaultAttachmentDialog bug)
2. ❌ Strips `recipient` field
3. ❌ Strips `yubikey_info` field
4. ❌ Custom conversion logic (tech debt)
5. ❌ Uses `any` type (unsafe)

### Why This Conversion Exists

**Hypothesis:** Early in development, backend returned `KeyReference` type. Later, backend created `KeyInfo` as unified type. Frontend conversion code became tech debt.

**Vague memory from user:** Backend engineer created `KeyInfo` to be used DIRECTLY by frontend. Frontend should NOT convert types - that's the Command layer's job.

### Current Workaround (Technical Debt)

**File:** `src-ui/src/pages/ManageKeysPage.tsx:82-92`

```typescript
// Reconstruct KeyInfo from stripped KeyReference
const vault_associations = getKeyVaultAttachments(keyId);
const fullKeyInfo: KeyInfo = {
  ...keyInfo as any,
  vault_associations,
  key_type: keyInfo.type === 'YubiKey'
    ? { type: 'YubiKey', data: (keyInfo as any).data }
    : { type: 'Passphrase', data: (keyInfo as any).data },
  recipient: '',  // Missing!
  yubikey_info: null,  // Missing!
};
```

**This is wrong!** We're reconstructing data that should never have been stripped.

### Architecture Question

**Command Layer Responsibility:**
> UI → Commands (Presentation Layer) → DDD (Manager → Service → Infrastructure)

**Commands should provide UI-ready types.** Frontend shouldn't convert backend types.

**Questions for Backend Engineer:**

1. **Is `KeyInfo` the intended frontend type?**
   - Should frontend use `KeyInfo` directly everywhere?
   - Should we delete frontend conversion code?

2. **What is `KeyReference` for?**
   - Is this an internal domain type?
   - Should frontend ever see `KeyReference`?
   - Or should Commands always return `KeyInfo`?

3. **Why do we have both types?**
   - What's the distinction?
   - When to use which?

### Required Clarification

**If KeyInfo is the frontend type:**
1. All commands should return `KeyInfo` (not `KeyReference`)
2. Frontend should use `KeyInfo` directly (no conversion)
3. Remove conversion logic in `useManageKeysWorkflow.ts`

**If KeyReference is the frontend type:**
1. Ensure it has ALL fields frontend needs (vault_associations, etc.)
2. Commands should convert domain types → `KeyReference`
3. Document the distinction clearly

---

## Testing After Fixes

### Test Case 1: getVaultStatistics with vault_id
```typescript
const vaults = await commands.listVaults();
const vault = vaults.data.vaults[0];

// Should work with vault.id
const stats = await commands.getVaultStatistics({
  vault_id: vault.id  // ✅ Deterministic
});

// Should NOT require:
// vault_name: "Sam-Family-Vault" (sanitized) ❌
```

### Test Case 2: Idempotent attach_key_to_vault
```typescript
const key_id = "YubiKey-15903715";
const vault_id = "7Bw3eqLGahnF5DXZyMa8Jz";

// First attach
const result1 = await commands.attachKeyToVault({ key_id, vault_id });
// result1.success === true ✅

// Second attach (idempotent - should not error)
const result2 = await commands.attachKeyToVault({ key_id, vault_id });
// result2.success === true ✅
// result2.message === "Key already attached to this vault" ✅
// NO state transition error! ✅
```

### Test Case 3: KeyInfo used directly
```typescript
const result = await commands.listUnifiedKeys({ type: 'All' });
const keyInfo = result.data[0];

// Should have ALL fields:
keyInfo.id                    // ✅
keyInfo.label                 // ✅
keyInfo.key_type              // ✅
keyInfo.vault_associations    // ✅ Must be present!
keyInfo.lifecycle_status      // ✅
keyInfo.recipient             // ✅
keyInfo.is_available          // ✅
keyInfo.yubikey_info          // ✅ (or null)
```

---

## Impact on UI Development

**Blocked UI Tasks:**
- VaultAttachmentDialog checkbox functionality (partially working)
- Vault badge display in KeyCard (needs vault_associations)
- Any multi-vault key operations

**Can Continue:**
- KeyCard visual polish (flip animation, styling)
- Other non-attachment UI work

---

## Action Items

### Backend Engineer - Priority 1 (Critical)
- [ ] Change `getVaultStatistics` to accept `vault_id` instead of `vault_name`
- [ ] Make `attach_key_to_vault` idempotent (check if already attached)
- [ ] Make `remove_key_from_vault` idempotent (check if already not attached)
- [ ] Update bindings: `make generate-bindings`
- [ ] Commit backend changes + updated bindings.ts

### Backend Engineer - Priority 2 (Architecture)
- [ ] Clarify: Should frontend use `KeyInfo` directly?
- [ ] Clarify: What is `KeyReference` for? (domain type only?)
- [ ] Document: When to use KeyInfo vs KeyReference
- [ ] Update docs if Commands should return KeyInfo everywhere

### Frontend Engineer - After Backend Fix
- [ ] Research previous sessions about KeyInfo decision
- [ ] Remove KeyInfo→KeyReference conversion in `useManageKeysWorkflow.ts:24-50` if confirmed tech debt
- [ ] Update components to use KeyInfo directly
- [ ] Remove reconstruction workaround in `ManageKeysPage.tsx:82-92`
- [ ] Test VaultAttachmentDialog with fixed APIs
- [ ] Complete vault badge implementation in KeyCard

---

## Related Documents

- `/docs/engineering/ui/api-requirements/key-id-transformation-bug.md` - ID transformation issue (FIXED)
- `/docs/architecture/cache-first-architecture.md` - VaultContext patterns
- `/docs/engineering/ui/refactoring-guidelines.md` - UI architecture rules
- `/tbd/ssd1410.1.md` - Previous session context

---

**Status:** ⏸️ **UI work blocked** - waiting for backend engineer to address all 3 issues

**Next Steps:** After backend fixes committed, frontend engineer will remove conversion tech debt and complete VaultAttachmentDialog.
