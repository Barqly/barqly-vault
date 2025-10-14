# listUnifiedKeys API - Root Cause Analysis

**Date:** 2025-10-14
**Analyst:** sr-backend-engineer (AI)
**Status:** Analysis Complete - Critical Issues Found

---

## Executive Summary

Frontend engineer is **100% CORRECT**. Found **FOUR CRITICAL BUGS** in the `listUnifiedKeys` API:

1. ❌ **Missing vault_associations field** in KeyInfo (has single vault_id instead of array)
2. ❌ **vault_id always null** for all keys when using `{ type: 'All' }` filter
3. ❌ **Unplugged YubiKeys not appearing** (only shows physically connected devices)
4. ❌ **Registry has vault_associations but not mapping to response**

**Impact:** ManageKeys shows all keys as "Orphan" even when attached to multiple vaults.

---

## Root Cause #1: KeyInfo Type Missing vault_associations

### Registry Data (CORRECT)
**File:** `~/Library/Application Support/com.Barqly.Vault/keys/barqly-vault-key-registry.json`

```json
{
  "MBP2024-Nauman": {
    "vault_associations": [
      "7Bw3eqLGahnF5DXZyMa8Jz",      // Sam Family Vault
      "BvwMbXYuaoHHGWpTif9QWK"       // AKAH Trust
    ]
  },
  "YubiKey-31310420": {
    "vault_associations": [
      "7Bw3eqLGahnF5DXZyMa8Jz",      // Sam Family Vault
      "BvwMbXYuaoHHGWpTif9QWK"       // AKAH Trust
    ]
  },
  "YubiKey-15903715": {
    "vault_associations": []         // ✅ Correct - just registered
  }
}
```

**✅ Registry correctly tracks multi-vault associations per key!**

### API Response Type (WRONG)
**File:** `src-tauri/src/services/key_management/shared/domain/models/key_reference.rs:70-92`

```rust
pub struct KeyInfo {
    pub id: String,
    pub label: String,
    pub key_type: KeyType,
    pub recipient: String,
    pub is_available: bool,
    pub vault_id: Option<String>,  // ← WRONG! Should be vault_associations: Vec<String>
    pub lifecycle_status: KeyLifecycleStatus,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub yubikey_info: Option<YubiKeyInfo>,
}
```

**❌ Problem:** KeyInfo has `vault_id: Option<String>` (single vault) instead of `vault_associations: Vec<String>`

---

## Root Cause #2: vault_id Always null for "All" Filter

### Code Location
**File:** `unified_key_list_service.rs:158-210`

**Method:** `list_all_keys()`

```rust
async fn list_all_keys(&self) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
    let mut all_keys = Vec::new();

    // YubiKeys
    match yubikey_manager.list_yubikeys_with_state().await {
        Ok(yubikey_list) => {
            for yubikey in yubikey_list {
                all_keys.push(convert_yubikey_to_unified(yubikey, None));
                                                                    ^^^^
                                                        vault_id = None hardcoded!
            }
        }
    }

    // Passphrase keys
    for (key_id, entry) in registry.keys {
        if let KeyEntry::Passphrase { ... } = entry {
            all_keys.push(convert_passphrase_to_unified(passphrase_info, None));
                                                                           ^^^^
                                                            vault_id = None hardcoded!
        }
    }
}
```

**❌ Problem:** Always passing `None` for vault_id when calling conversion functions.

**Why?** Because the conversion functions take a **single** vault_id parameter, but keys can be in **multiple** vaults. The current design cannot represent multi-vault associations.

---

## Root Cause #3: Unplugged YubiKeys Not Appearing

### The Issue
**Registry has:** YubiKey-31310420 with vault_associations (attached to 2 vaults)
**list_all_keys returns:** ONLY YubiKey-15903715 (currently plugged in)

### Why This Happens

**Line 164:** `yubikey_manager.list_yubikeys_with_state()`

This calls YubiKeyManager which:
```rust
// File: yubikey/application/manager.rs:107-263
pub async fn list_yubikeys_with_state(&self) -> Result<Vec<YubiKeyStateInfo>> {
    let devices = self.list_connected_devices().await?;
                      ^^^^^^^^^^^^^^^^^^^^^^^
                      Only gets PLUGGED-IN devices!

    for device in devices {
        // Process each CONNECTED device
    }
}
```

**❌ Problem:** Only lists **physically connected** YubiKeys, ignoring registry entries for unplugged devices.

**Expected:** Should return ALL YubiKeys from registry + merge with connection status:
- In registry + plugged in → is_available: true
- In registry + unplugged → is_available: false (but still show!)

---

## Root Cause #4: Registry Data Not Mapped to Response

### Registry Entry Structure (Has Data)
```rust
pub enum KeyEntry {
    Passphrase {
        vault_associations: Vec<String>,  // ✅ HAS THIS!
        ...
    },
    Yubikey {
        vault_associations: Vec<String>,  // ✅ HAS THIS!
        ...
    },
}
```

### Conversion Functions (Ignores Data)
**File:** `unified_key_list_service.rs:27-84`

```rust
fn convert_passphrase_to_unified(
    passphrase_key: PassphraseKeyInfo,
    vault_id: Option<String>,  // ← Accepts SINGLE vault
) -> KeyInfo {
    KeyInfo {
        vault_id,  // ← Only sets SINGLE vault_id
        // Does NOT read vault_associations from registry!
    }
}

fn convert_yubikey_to_unified(
    yubikey_key: YubiKeyStateInfo,
    vault_id: Option<String>,  // ← Accepts SINGLE vault
) -> KeyInfo {
    KeyInfo {
        vault_id,  // ← Only sets SINGLE vault_id
        // Does NOT read vault_associations from registry!
    }
}
```

**❌ Problem:** Conversion functions:
- Accept only single vault_id parameter
- Don't access vault_associations from registry entry
- Don't have vault_associations field to populate

---

## Detailed Problem Breakdown

### Problem 1: Data Model Mismatch

**Registry Schema (v2):**
```
✅ KeyEntry has vault_associations: Vec<String>
```

**API Response:**
```
❌ KeyInfo has vault_id: Option<String>
```

**Frontend Needs:**
```
✅ vault_associations: string[] (matches registry)
```

### Problem 2: Conversion Logic Flow

**Current Flow:**
```
1. Load registry (has vault_associations)
2. Create PassphraseKeyInfo/YubiKeyStateInfo (loses vault_associations)
3. Convert to KeyInfo with vault_id parameter (single vault)
4. Return KeyInfo with vault_id = None or single value
```

**Missing:** Step to extract vault_associations from registry and include in response

### Problem 3: YubiKey Listing Logic

**Current:**
```rust
list_all_keys() {
    // YubiKeys
    let devices = yubikey_manager.list_yubikeys_with_state();
                                   ^^^^^^^^^^^^^^^^^^^^^^^^
                          Only returns CONNECTED YubiKeys

    // Passphrase keys
    for (key_id, entry) in registry.keys {  // ← Reads ALL from registry
        if entry.is_passphrase() { ... }
    }
}
```

**Problem:** Inconsistent logic:
- Passphrase keys: Reads from registry (gets all)
- YubiKeys: Calls manager that only returns connected devices

**Should be:**
```rust
list_all_keys() {
    // Get ALL keys from registry first
    for (key_id, entry) in registry.keys {
        match entry {
            KeyEntry::Passphrase { vault_associations, ... } => {
                // Create KeyInfo with vault_associations
            }
            KeyEntry::Yubikey { serial, vault_associations, ... } => {
                // Check if currently connected
                let is_available = yubikey_manager.is_device_connected(serial);
                // Create KeyInfo with vault_associations
            }
        }
    }
}
```

---

## Solution Design

### Add vault_associations to KeyInfo

**Modification:**
```rust
pub struct KeyInfo {
    pub id: String,
    pub label: String,
    pub key_type: KeyType,
    pub recipient: String,
    pub is_available: bool,

    // Deprecated: Use vault_associations for multi-vault support
    pub vault_id: Option<String>,

    // NEW: Multi-vault support (NIST standard per key-lifecycle-management.md)
    pub vault_associations: Vec<String>,

    pub lifecycle_status: KeyLifecycleStatus,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub yubikey_info: Option<YubiKeyInfo>,
}
```

### Fix list_all_keys() to Return ALL Registry Keys

**New Logic:**
```rust
async fn list_all_keys(&self) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
    let mut all_keys = Vec::new();

    // Initialize YubiKeyManager for connection status checks
    let yubikey_manager = YubiKeyManager::new().await.ok();

    // Load registry (source of truth)
    let registry = self.registry_service.load_registry()?;

    // Iterate through ALL registry entries
    for (key_id, entry) in registry.keys {
        match entry {
            KeyEntry::Passphrase { vault_associations, ... } => {
                let key_info = KeyInfo {
                    vault_id: vault_associations.first().cloned(),  // First for backward compat
                    vault_associations: vault_associations.clone(),  // NEW
                    is_available: true,  // Files are always available
                    ...
                };
                all_keys.push(key_info);
            }
            KeyEntry::Yubikey { serial, vault_associations, ... } => {
                // Check if YubiKey is currently connected
                let is_available = if let Some(manager) = &yubikey_manager {
                    manager.is_device_connected(&Serial::new(serial)?).await.unwrap_or(false)
                } else {
                    false
                };

                let key_info = KeyInfo {
                    vault_id: vault_associations.first().cloned(),  // First for backward compat
                    vault_associations: vault_associations.clone(),  // NEW
                    is_available,  // Based on hardware connection
                    ...
                };
                all_keys.push(key_info);
            }
        }
    }

    Ok(all_keys)
}
```

**Benefits:**
- ✅ Returns ALL keys from registry (plugged + unplugged)
- ✅ Includes vault_associations array
- ✅ Sets is_available based on actual hardware connection
- ✅ No more vault_id = None issue

---

## Impact Analysis

### Current Bugs Confirmed

1. **MBP2024-Nauman** (Passphrase):
   - Registry: `vault_associations: ["7Bw3eq...", "Bvw..."]` (2 vaults)
   - API Response: `vault_id: null`
   - UI Shows: "Orphan" ❌ WRONG

2. **YubiKey-31310420** (Unplugged):
   - Registry: `vault_associations: ["7Bw3eq...", "Bvw..."]` (2 vaults)
   - API Response: NOT RETURNED AT ALL ❌ WRONG
   - UI Shows: MISSING

3. **YubiKey-15903715** (Plugged-in):
   - Registry: `vault_associations: []` (no vaults)
   - API Response: `vault_id: null`
   - UI Shows: "Orphan" ✅ CORRECT

### After Fix

1. **MBP2024-Nauman**:
   - API Response: `vault_associations: ["7Bw3eq...", "Bvw..."]`
   - UI Shows: "Attached to: AKAH Trust, Sam Family Vault" ✅

2. **YubiKey-31310420** (Unplugged):
   - API Response: `vault_associations: ["7Bw3eq...", "Bvw..."]`, `is_available: false`
   - UI Shows: "Attached to: AKAH Trust, Sam Family Vault" + unplugged indicator ✅

3. **YubiKey-15903715** (Plugged-in):
   - API Response: `vault_associations: []`, `is_available: true`
   - UI Shows: "Orphan - Not attached to any vault" ✅

---

## Required Changes

### 1. Add vault_associations to KeyInfo Struct

**File:** `services/key_management/shared/domain/models/key_reference.rs`

```rust
pub struct KeyInfo {
    pub id: String,
    pub label: String,
    pub key_type: KeyType,
    pub recipient: String,
    pub is_available: bool,

    /// Single vault ID (deprecated - use vault_associations)
    pub vault_id: Option<String>,

    /// Array of vault IDs this key is attached to (supports multi-vault)
    pub vault_associations: Vec<String>,  // ← ADD THIS

    pub lifecycle_status: KeyLifecycleStatus,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub yubikey_info: Option<YubiKeyInfo>,
}
```

### 2. Refactor list_all_keys() to Use Registry as Source

**File:** `services/key_management/shared/application/services/unified_key_list_service.rs:158-210`

**Current Logic (WRONG):**
- Passphrase: Reads from registry ✅
- YubiKey: Only lists connected devices via YubiKeyManager ❌

**New Logic (CORRECT):**
- ALL keys: Read from registry (single source of truth)
- YubiKey connection status: Check hardware availability separately
- Populate vault_associations from registry entry

### 3. Update Conversion Functions

**File:** Same as #2

Need to either:
- **Option A:** Read vault_associations from registry inside conversion functions
- **Option B:** Pass vault_associations as parameter to conversion functions
- **Option C:** Build KeyInfo directly from registry entry (skip intermediate types)

**Recommendation:** Option C - Most direct, avoids data loss

### 4. Update TypeScript Bindings

**Auto-generated after Rust changes**

**Before:**
```typescript
export type KeyInfo = {
  vault_id: string | null;
  // ...
}
```

**After:**
```typescript
export type KeyInfo = {
  vault_id: string | null;  // Deprecated
  vault_associations: string[];  // NEW
  // ...
}
```

---

## Architectural Mismatch

### Current System Design

**Registry (Data Layer):**
```
✅ vault_associations: string[]  (Multi-vault support)
```

**Vault Manifest:**
```
✅ recipients: RecipientInfo[]  (Denormalized - each vault has copy)
```

**API (Interface Layer):**
```
❌ vault_id: string | null  (Single vault only)
```

**Frontend (Presentation Layer):**
```
✅ Expects array: vault_associations: string[]
```

**Conclusion:** The middle layer (API response type) is the broken link. Registry and Frontend are both correct!

---

## Why This Wasn't Caught Earlier

1. **ForVault filter works** - When listing keys for a specific vault, vault_id is passed correctly
2. **ManageKeys is new** - First time using `{ type: 'All' }` filter at global level
3. **YubiKey testing was vault-specific** - Always tested with plugged-in YubiKey in vault context
4. **PassphraseKeyInfo intermediate type** - Loses vault_associations from registry

---

## Recommended Implementation Plan

### Phase 1: Add vault_associations Field (1-2 hours)
1. Add `vault_associations: Vec<String>` to KeyInfo struct
2. Keep `vault_id: Option<String>` for backward compatibility
3. Populate vault_id with first vault from array (compatibility)

### Phase 2: Fix list_all_keys() (2-3 hours)
1. Load registry as primary source
2. Iterate through ALL registry entries
3. For YubiKeys: Check connection status separately
4. Populate vault_associations from registry entry
5. Set is_available based on hardware (passphrase: always true, yubikey: check connection)

### Phase 3: Update Conversion Logic (1-2 hours)
1. Pass vault_associations to conversion functions OR
2. Build KeyInfo directly from registry entries
3. Ensure no data loss

### Phase 4: Testing (2 hours)
1. Unit tests for multi-vault support
2. Integration test: Key attached to 2 vaults returns both
3. Manual test: Unplug YubiKey, verify still appears with is_available: false

### Phase 5: Frontend Validation (30 min)
1. Verify vault_associations populated correctly
2. Verify unplugged YubiKey appears
3. Verify "Orphan" only shows for keys with empty vault_associations

**Total Estimate:** 6-9 hours

---

## Breaking Changes

### Non-Breaking Approach (RECOMMENDED)

```rust
pub struct KeyInfo {
    // OLD (keep for compatibility)
    pub vault_id: Option<String>,  // Populated with first vault

    // NEW (add without removing old)
    pub vault_associations: Vec<String>,  // Full array
}
```

**Frontend can:**
- Immediately use vault_associations
- Fallback to vault_id if needed
- Migrate gradually

---

## Answers to Frontend Engineer's Questions

### Q1: Does listUnifiedKeys({ type: 'All' }) return vault associations?
**A:** No - the data is in the registry but NOT being mapped to the API response.

### Q2: Can a key be attached to multiple vaults?
**A:** YES! Registry has `vault_associations: []` array. Architecture doc is correct.

### Q3: Should listUnifiedKeys({ type: 'All' }) return unplugged YubiKeys?
**A:** YES! Registry is source of truth. All registered keys should appear regardless of hardware status.

### Q4: Is there a better API for ManageKeys?
**A:** No need for new API. Fix `listUnifiedKeys({ type: 'All' })` to work correctly.

---

## Test Data Verification

From registry file:

| Key | Vaults Attached | Currently Available | Should Show in ManageKeys |
|-----|----------------|---------------------|---------------------------|
| MBP2024-Nauman | 2 vaults | ✅ Yes (file) | ✅ Yes, with "Attached to: 2 vaults" |
| YubiKey-31310420 | 2 vaults | ❌ No (unplugged) | ✅ YES (in registry), mark unavailable |
| YubiKey-15903715 | 0 vaults | ✅ Yes (plugged) | ✅ Yes, with "Orphan" warning |

**Current Bug:** Only showing YubiKey-15903715. Missing the other two's vault associations.

---

## Priority & Timeline

**Priority:** 🔴 CRITICAL
**Impact:** Breaks ManageKeys functionality completely
**Deadline:** Oct 15, 2025 (R2 release)
**Estimated Fix:** 6-9 hours
**Complexity:** Medium (data model + logic refactoring)

---

## Success Criteria

After fix:
- ✅ KeyInfo includes vault_associations array
- ✅ Passphrase keys show all vault attachments
- ✅ Unplugged YubiKeys appear in list with is_available: false
- ✅ Plugged YubiKeys show all vault attachments
- ✅ "Orphan" warning only for vault_associations.length === 0
- ✅ All 297+ tests still pass
- ✅ TypeScript bindings updated
- ✅ Frontend can display "Attached to: Vault1, Vault2, Vault3"

---

**Recommendation:** Fix immediately - this is a critical data integrity issue affecting core UX.
