# listUnifiedKeys API - Vault Associations Issue

**Status**: 🔴 Backend Investigation Required
**Priority**: Critical (R2 Blocker - Oct 15 deadline)
**Created**: 2025-10-14
**Reporter**: Frontend Engineer
**Assignee**: sr-backend-engineer

---

## Problem Statement

The `listUnifiedKeys({ type: 'All' })` API is returning incomplete/incorrect vault association data, causing:
1. ✅ Keys to display but show **"Orphan - Not attached to any vault"** for ALL keys (even attached ones)
2. ✅ Missing **vault attachment information** for keys that ARE attached to vaults
3. ✅ **Unplugged YubiKeys** not appearing in ManageKeys (only showing plugged-in devices)

---

## Expected vs Actual Behavior

### Expected (from Architecture Docs)

**Per `docs/architecture/key-lifecycle-management.md` (lines 165-170)**:
```json
{
  "keys": {
    "key-id": {
      "type": "passphrase|yubikey",
      "label": "User Label",
      "vault_associations": ["vault-id-1", "vault-id-2"],  // ← Array of vaults!
      // ... other fields
    }
  }
}
```

**Key Point**: A single key can be attached to **MULTIPLE vaults** (1 passphrase + 3 YubiKeys per vault).

---

### Actual (Current API Response)

**TypeScript Type** (`src-ui/src/bindings.ts:759-799`):
```typescript
export type KeyInfo = {
  id: string;
  label: string;
  key_type: KeyType;
  recipient: string;
  is_available: boolean;
  vault_id: string | null;  // ← SINGLE vault! Should be array!
  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
  yubikey_info: YubiKeyInfo | null;
}
```

**Problems**:
1. **`vault_id: string | null`** - Should be `vault_associations: string[]`
2. **Returning `null`** for ALL keys (even attached ones)
3. **Missing multi-vault support** - Keys can be in multiple vaults

---

## Reproduction Steps

### Test Data

**Registry File**: `/Library/Application Support/com.Barqly.Vault/keys/barqly-vault-key-registry.json`

Contains these keys:
- **MBP2024-Nauman** (Passphrase) - Attached to: AKAH Trust, Sam Family Vault
- **YubiKey-31310420** (YubiKey, unplugged) - Attached to: AKAH Trust, Sam Family Vault
- **YubiKey-15903715** (YubiKey, plugged-in) - Just registered, NO vault attachments

### Steps to Reproduce

1. Open ManageKeys screen
2. Frontend calls: `commands.listUnifiedKeys({ type: 'All' })`
3. Observe returned data

### Actual Result

**ALL keys show**:
- ⚠️ "Orphan - Not attached to any vault" (incorrect for MBP2024 and YubiKey-31310420)
- ⚠️ `vault_id: null` in KeyInfo response

**Screenshot Evidence**: `/docs/ui-captures/2025-10-14-manage-keys-orphan-issue.png`
- Shows both MBP2024-Nauman and YubiKey-15903715 with "Orphan" warning
- These keys ARE attached to 2 vaults each per earlier screenshots

### Expected Result

**MBP2024-Nauman** should show:
- ✅ "Attached to: AKAH Trust, Sam Family Vault"
- ✅ `vault_associations: ["vault-id-1", "vault-id-2"]` or similar field

**YubiKey-31310420** should show:
- ✅ "Attached to: AKAH Trust, Sam Family Vault"
- ✅ Appear in list even when UNPLUGGED

**YubiKey-15903715** should show:
- ✅ "Orphan - Not attached to any vault" (correct - just registered)
- ✅ `vault_associations: []`

---

## Frontend Code Analysis

### How Frontend Uses Vault Associations

**File**: `src-ui/src/hooks/useManageKeysWorkflow.ts:53-62`

```typescript
// Get vault attachments for a key
const getKeyVaultAttachments = useCallback(
  (keyId: string) => {
    const key = globalKeys.find((k) => k.id === keyId);
    if (!key || !key.vault_id) {  // ← Checking single vault_id
      return [];
    }
    return [key.vault_id];  // ← Returning array with single vault
  },
  [globalKeys],
);
```

**Usage in ManageKeysPage** (`ManageKeysPage.tsx:286-298`):
```typescript
allKeys.map((key) => {
  const attachments = getKeyVaultAttachments(key.id);  // ← Gets vault list
  const isOrphan = attachments.length === 0;  // ← Checks if orphaned

  return (
    <KeyCard
      keyRef={key}
      vaultAttachments={attachments}  // ← Passed to KeyCard
      isOrphan={isOrphan}  // ← Determines "Orphan" warning display
      // ...
    />
  );
})
```

**KeyCard Component** expects:
```typescript
vaultAttachments: string[]  // Array of vault IDs
isOrphan: boolean           // true if attachments.length === 0
```

If `attachments.length === 0`, KeyCard displays: **"⚠️ Orphan - Not attached to any vault"**

---

## Questions for sr-backend-engineer

### 1. Vault Associations Data Model

**Q**: Does `listUnifiedKeys({ type: 'All' })` return vault associations?

**Options**:
- **A**: Yes, but field name is different (not `vault_id`)?
- **B**: Yes, but it's an array field we're missing?
- **C**: No, this API doesn't include vault associations (need different API)?

**If C**, what API should ManageKeys use to get ALL keys with their vault associations?

---

### 2. Single vs Multiple Vault Attachments

**Q**: Can a key be attached to multiple vaults?

**Architecture doc says YES** (`key-lifecycle-management.md:165-170`):
```json
{
  "vault_associations": ["vault-id-1", "vault-id-2"]  // ← ARRAY
}
```

**But TypeScript bindings say NO** (`bindings.ts:783`):
```typescript
vault_id: string | null  // ← SINGLE VALUE
```

**Which is correct?**

If multi-vault is supported:
- Backend should return `vault_associations: string[]`
- TypeScript type needs updating

If single-vault only:
- Architecture doc needs correction
- This is a design limitation to document

---

### 3. Unplugged YubiKey Visibility

**Q**: Should `listUnifiedKeys({ type: 'All' })` return unplugged YubiKeys?

**Current behavior**:
- ✅ YubiKey-15903715 (plugged-in) → appears
- ❌ YubiKey-31310420 (unplugged, but in registry) → does NOT appear

**Expected**: ALL keys in registry should appear regardless of hardware connection status.

**Possible causes**:
- Backend filtering by `is_available: true` (only plugged-in devices)?
- YubiKey registry entries missing for unplugged devices?
- API returning only "connected" keys instead of "registered" keys?

---

### 4. Alternative API?

**Q**: Is there a better API for ManageKeys global view?

**Current**: `listUnifiedKeys({ type: 'All' })`

**Alternative options**:
- `listUnifiedKeys({ type: 'ConnectedOnly' })` - Too restrictive (no unplugged)
- Different API endpoint for global registry view?
- Separate call to get vault associations per key?

---

## Backend Investigation Checklist

Please investigate and provide findings for:

- [ ] **Check `list_unified_keys` implementation**
  - Location: `src-tauri/src/commands/key_management/unified_keys/...`
  - Does it populate `vault_id` field correctly?
  - Should it return `vault_associations` array instead?

- [ ] **Check KeyRegistry structure**
  - Registry file: `~/.../barqly-vault-key-registry.json`
  - Does registry track multiple vault associations per key?
  - Field name: `vault_associations`, `vaults`, or `attached_vaults`?

- [ ] **Check filtering logic**
  - Does `{ type: 'All' }` filter exclude unplugged YubiKeys?
  - Should it return ALL registered keys regardless of connection status?

- [ ] **Verify data mapping**
  - How does backend map registry data → `KeyInfo` type?
  - Is vault association data being lost in serialization?

- [ ] **Test manually**
  - Call `list_unified_keys` with `{ type: 'All' }` filter
  - Check response for keys attached to multiple vaults
  - Verify vault_id field values

---

## Expected Backend Response Format

### Option A: Fix Current vault_id Field

If keys can only be in ONE vault:
```json
{
  "id": "MBP2024-Nauman",
  "label": "MBP2024 Nauman",
  "vault_id": "7Bw3eqLGahnF5DXZyMa8Jz",  // ← Should have actual vault ID, not null
  "lifecycle_status": "active",
  "is_available": true
}
```

### Option B: Add vault_associations Array (Preferred)

If keys can be in MULTIPLE vaults (per architecture doc):
```json
{
  "id": "MBP2024-Nauman",
  "label": "MBP2024 Nauman",
  "vault_id": null,  // ← Deprecated, keep for compatibility
  "vault_associations": [  // ← NEW field (array)
    "7Bw3eqLGahnF5DXZyMa8Jz",  // Sam Family Vault
    "abc123xyz"               // AKAH Trust
  ],
  "lifecycle_status": "active",
  "is_available": true
}
```

### Option C: Different API Endpoint

If `listUnifiedKeys` is not meant for this use case, provide:
- **Recommended API** for ManageKeys global view
- **Response format** with vault associations
- **Migration path** from current implementation

---

## Impact on Frontend

### Current Broken Behavior
```
🔑 MBP2024 Nauman
   ⚠️ Orphan - Not attached to any vault  ← WRONG! Is attached to 2 vaults
   [Attach to Vault] [Export] [Delete]

🔐 YubiKey-15903715
   ⚠️ Orphan - Not attached to any vault  ← CORRECT! Just registered
   [Attach to Vault] [Export] [Delete]
```

### Expected Correct Behavior
```
🔑 MBP2024 Nauman
   ✅ Attached to: AKAH Trust, Sam Family Vault  ← Correct
   [Attach to Vault] [Export]

🔐 YubiKey-31310420 (unplugged)
   ✅ Attached to: AKAH Trust, Sam Family Vault  ← Should show even unplugged
   [Attach to Vault] [Export]

🔐 YubiKey-15903715 (plugged-in)
   ⚠️ Not attached to any vault  ← Correct
   [Attach to Vault] [Export] [Delete]
```

---

## Frontend Adaptation Needed

Once backend provides correct data, frontend needs to update:

### If vault_associations Array Added (Option B):

**File**: `src-ui/src/hooks/useManageKeysWorkflow.ts:53-62`

```typescript
// CURRENT (WRONG):
const getKeyVaultAttachments = useCallback(
  (keyId: string) => {
    const key = globalKeys.find((k) => k.id === keyId);
    if (!key || !key.vault_id) {
      return [];
    }
    return [key.vault_id];  // Single vault
  },
  [globalKeys],
);

// UPDATED (CORRECT):
const getKeyVaultAttachments = useCallback(
  (keyId: string) => {
    const key = globalKeys.find((k) => k.id === keyId);
    if (!key) {
      return [];
    }
    // Use vault_associations if available, fallback to vault_id for compatibility
    return key.vault_associations || (key.vault_id ? [key.vault_id] : []);
  },
  [globalKeys],
);
```

---

## Test Cases for Backend Fix

### Test 1: Key in Multiple Vaults
**Setup**: Attach MBP2024-Nauman to both "Sam Family Vault" and "AKAH Trust"
**Call**: `listUnifiedKeys({ type: 'All' })`
**Expected**:
```json
{
  "id": "MBP2024-Nauman",
  "vault_associations": ["vault-id-1", "vault-id-2"]  // Both vaults
}
```

### Test 2: Orphaned Key (No Vaults)
**Setup**: YubiKey-15903715 just registered, not attached
**Call**: `listUnifiedKeys({ type: 'All' })`
**Expected**:
```json
{
  "id": "YubiKey-15903715",
  "vault_associations": []  // Empty array
}
```

### Test 3: Unplugged YubiKey
**Setup**: YubiKey-31310420 in registry, attached to vaults, but hardware disconnected
**Call**: `listUnifiedKeys({ type: 'All' })`
**Expected**:
```json
{
  "id": "YubiKey-31310420",
  "is_available": false,  // ← Not plugged in
  "vault_associations": ["vault-id-1", "vault-id-2"],  // ← Still shows attachments
  "lifecycle_status": "active"  // ← Still active in registry
}
```

**Current Bug**: This key does NOT appear in response at all

---

## Backend Code Locations to Check

### 1. API Implementation
**File**: `src-tauri/src/commands/key_management/unified_keys/...`

Find where `listUnifiedKeys` with `{ type: 'All' }` filter is implemented.

**Questions**:
- How does it fetch keys from registry?
- Where does `vault_id` field get populated?
- Is there a `vault_associations` field being read from registry?

---

### 2. KeyInfo Construction
**Search for**: Where `KeyInfo` struct is built from registry data

**Questions**:
- Is vault association data available in registry but not mapped to KeyInfo?
- Is only the "first" vault being returned in `vault_id`?
- Should we add `vault_associations` field to KeyInfo type?

---

### 3. Registry Schema
**File**: `~/.../barqly-vault-key-registry.json` (runtime)
**Code**: Registry persistence layer

**Check**:
- Does registry actually store `vault_associations: []` array?
- Or does it only track single `vault_id`?
- Open actual registry file and inspect structure

---

### 4. Filtering for "All" Keys
**Question**: Does `{ type: 'All' }` filter exclude unavailable (unplugged) keys?

**Expected**:
```rust
match filter {
    KeyListFilter::All => {
        // Should return ALL registered keys
        // Include: Available (plugged-in) AND Unavailable (unplugged)
        // Exclude: Only destroyed/deleted keys
        registry.get_all_keys()  // Don't filter by is_available
    }
}
```

**Suspect**:
```rust
// Might be doing this (WRONG):
KeyListFilter::All => {
    registry.get_all_keys()
        .filter(|k| k.is_available)  // ← Excludes unplugged YubiKeys!
}
```

---

## Proposed Solutions

### Solution 1: Add vault_associations Field to KeyInfo

**Backend Change**:
```rust
pub struct KeyInfo {
    pub id: String,
    pub label: String,
    pub key_type: KeyType,
    pub recipient: String,
    pub is_available: bool,

    #[deprecated(note = "Use vault_associations for multi-vault support")]
    pub vault_id: Option<String>,  // Keep for backward compatibility

    pub vault_associations: Vec<String>,  // ← NEW: Array of vault IDs

    pub lifecycle_status: KeyLifecycleStatus,
    pub created_at: String,
    pub last_used: Option<String>,
    pub yubikey_info: Option<YubiKeyInfo>,
}
```

**TypeScript Binding Update** (auto-generated):
```typescript
export type KeyInfo = {
  vault_id: string | null;  // Deprecated
  vault_associations: string[];  // ← NEW
  // ... other fields
}
```

**Frontend Adaptation**:
```typescript
const vaults = key.vault_associations || (key.vault_id ? [key.vault_id] : []);
```

---

### Solution 2: Fix vault_id to Return First Vault

If multi-vault not needed in ManageKeys context:

**Backend Change**:
```rust
// Populate vault_id with the FIRST vault from associations
let vault_id = if let Some(first_vault) = vault_associations.first() {
    Some(first_vault.clone())
} else {
    None
};
```

**Problem**: Doesn't solve multi-vault display in KeyCard ("Attached to: Vault1, Vault2")

---

### Solution 3: Use Different API

**Provide alternative API** that explicitly returns vault associations:

```rust
#[tauri::command]
pub async fn list_all_keys_with_vaults() -> Result<Vec<KeyInfoWithVaults>, CommandError> {
    // Returns extended KeyInfo with vault_associations array
}
```

---

## Additional Issue: Unplugged YubiKeys

### Current Problem

**YubiKey-31310420**:
- ✅ Exists in registry
- ✅ Attached to 2 vaults
- ❌ NOT appearing in `listUnifiedKeys({ type: 'All' })` response
- ❌ Only showing when hardware is plugged in

### Expected Behavior

`{ type: 'All' }` should return ALL registered keys:
- Passphrase keys (always available - file-based)
- YubiKey keys (both plugged AND unplugged)

### Investigation Needed

Check if backend is:
1. Filtering out `is_available: false` keys
2. Only listing physically connected YubiKeys
3. Missing registry entries for unplugged YubiKeys

**The registry is the source of truth** - if a YubiKey is in the registry, it should appear in `list_all_keys` regardless of hardware connection status.

---

## Acceptance Criteria

After backend fix, frontend should be able to:

- [ ] Display ALL keys from registry (plugged + unplugged)
- [ ] Show correct vault attachments for each key
- [ ] Display "Orphan" warning ONLY for keys with zero vault attachments
- [ ] Support multi-vault display (e.g., "Attached to: Vault1, Vault2, Vault3")
- [ ] Filter "Orphan Keys" correctly (no false positives)

---

## Timeline

**Deadline**: Oct 14-15 (before R2 release)
**Impact**: High - Affects core key management UX

---

## Related Files

**Frontend**:
- `src-ui/src/hooks/useManageKeysWorkflow.ts:53-62` (getKeyVaultAttachments)
- `src-ui/src/pages/ManageKeysPage.tsx:286-298` (KeyCard usage)
- `src-ui/src/bindings.ts:759-799` (KeyInfo type)

**Backend** (for sr-backend-engineer to locate):
- `list_unified_keys` command implementation
- KeyInfo struct definition
- KeyRegistry vault association tracking

**Documentation**:
- `docs/architecture/key-lifecycle-management.md:165-170` (vault_associations spec)
- `docs/engineering/ui/yubikey-registration-api-ready.md` (related context)

---

## Response Template

Please respond with:

1. **Root Cause**: Why are vault associations missing/null?
2. **Data Model**: Does registry support multi-vault per key?
3. **API Clarification**: What should `listUnifiedKeys({ type: 'All' })` return?
4. **Proposed Fix**: Add field, fix mapping, or use different API?
5. **Timeline**: Can this be fixed before Oct 15?
6. **Frontend Changes Needed**: What should frontend expect after fix?

---

**Priority**: 🔴 CRITICAL - Blocks ManageKeys functionality for R2 release
