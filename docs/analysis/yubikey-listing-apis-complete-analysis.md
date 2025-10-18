# YubiKey Listing APIs - Complete Analysis

**Date:** 2025-10-18
**Analyst:** sr-backend-engineer
**Status:** Analysis Complete - Solution Identified

---

## TL;DR

**Problem:** YubiKey registration dialog needs to show ALL connected YubiKeys (including brand new ones) with consistent NIST lifecycle badges.

**Root Cause:** Neither existing API fully meets the need:
- `listYubikeys()` - Shows ALL devices but lacks lifecycle_status
- `listUnifiedKeys({ type: "ConnectedOnly" })` - Has lifecycle_status but EXCLUDES brand new YubiKeys

**Solution:** Add lifecycle_status field to YubiKeyStateInfo (Option 2 from frontend doc)

**Why:** This is the architecturally correct fix - device discovery API should include both device state AND lifecycle status when available.

---

## Complete API Comparison

### API #1: `listUnifiedKeys(filter: KeyListFilter)`

**Returns:** `GlobalKey[]`

**What GlobalKey Has:**
```typescript
{
  id: string;  // Registry key_id
  label: string;
  lifecycle_status: KeyLifecycleStatus;  // ✅ NIST status
  vault_associations: string[];
  is_available: boolean;
  recipient: string;
  yubikey_info: YubiKeyInfo | null;
  deactivated_at: string | null;
  // ... complete registry data
}
```

**Filter: `{ type: "All" }`**
- Reads from registry
- Returns ALL keys (plugged + unplugged)
- Use case: ManageKeys page

**Filter: `{ type: "ConnectedOnly" }`**
- Reads from registry
- Filters to physically connected keys
- **YubiKey Logic:**
  ```rust
  // Line 558-567 in unified_key_list_service.rs
  for yubikey in yubikey_manager.list_yubikeys_with_state() {
      if matches!(yubikey.state, Registered | Orphaned | Reused) {
          // Convert to GlobalKey
      }
      // NOTE: Excludes YubiKeyState::New!
  }
  ```
- **Returns:** Registered, Orphaned, Reused YubiKeys
- **EXCLUDES:** Brand new YubiKeys with default PIN!

**Why Exclude New?**
Looking at code (line 562-567), it filters out `YubiKeyState::New` devices.

**Likely Reason:** New devices have no registry entry, so no vault_associations to populate. But this is a bug/oversight - should return them with empty vault_associations!

---

### API #2: `listYubikeys()`

**Returns:** `YubiKeyStateInfo[]`

**What YubiKeyStateInfo Has:**
```typescript
{
  serial: string;
  state: YubiKeyState;  // "new" | "reused" | "registered" | "orphaned"
  // ❌ NO lifecycle_status field!
  slot: number | null;
  recipient: string | null;
  identity_tag: string | null;
  label: string | null;
  pin_status: PinStatus;
  firmware_version: string | null;
  created_at: string;
  last_used: string | null;
}
```

**What It Does:**
```rust
// manager.rs:107-263
pub async fn list_yubikeys_with_state() {
    let devices = self.list_connected_devices();  // Hardware detection

    for device in devices {
        let in_registry = find_by_serial(device.serial);
        let has_identity = check_identity(device.serial);

        let state = match (in_registry, has_identity) {
            (true, true) => Registered,   // In registry, has identity
            (false, true) => Orphaned,    // NOT in registry, has identity
            (false, false) => {
                if has_default_pin() {
                    New      // NOT in registry, default PIN
                } else {
                    Reused   // NOT in registry, custom PIN, no identity
                }
            }
        };
    }
}
```

**Returns:** ALL connected YubiKeys regardless of registry status
- ✅ Brand new (default PIN, not in registry)
- ✅ Reset/Reused (custom PIN, no identity, not in registry)
- ✅ Orphaned (has identity, not in registry)
- ✅ Registered (in registry)

**Use Case:** YubiKey registration/setup - discover devices for onboarding

---

## The Gap

### What YubiKey Registration Dialog Needs:

1. ✅ **ALL connected YubiKeys** (including new ones not in registry)
2. ✅ **Device state** (to know if needs init vs register)
3. ❌ **lifecycle_status** (for consistent NIST badges)

### What Each API Provides:

| Need | `listYubikeys()` | `listUnifiedKeys(ConnectedOnly)` |
|------|------------------|----------------------------------|
| ALL connected YubiKeys | ✅ YES | ❌ NO (excludes New) |
| Device state | ✅ YES | ✅ YES (in yubikey_info) |
| lifecycle_status | ❌ NO | ✅ YES |

**Neither API fully meets the need!**

---

## Why Current Situation Exists

### Historical Context

**Phase 1:** Early development
- `listYubikeys()` created for device detection
- Returned YubiKeyStateInfo with device-level state
- No NIST lifecycle yet

**Phase 2:** NIST migration (today's session!)
- Created `listUnifiedKeys()` for unified key management
- Added GlobalKey with lifecycle_status
- Updated ManageKeys to use it

**Phase 3:** Incomplete migration
- ManageKeys migrated ✅
- YubiKey registration dialog NOT migrated ❌
- Still uses old `listYubikeys()` API

---

## Solutions Analysis

### Option 1: Use `listUnifiedKeys({ type: "ConnectedOnly" })`

**Pros:**
- ✅ Has lifecycle_status
- ✅ Returns GlobalKey (consistent with ManageKeys)
- ✅ No backend changes

**Cons:**
- ❌ **DOESN'T WORK** - Excludes brand new YubiKeys!
- ❌ Users can't register new devices

**Verdict:** ❌ Not viable

---

### Option 2: Fix `ConnectedOnly` to Include New Devices

**Change:** Remove the filter that excludes `YubiKeyState::New`

**Before:**
```rust
if matches!(yubikey.state, Registered | Orphaned | Reused) {
    // Excludes New!
}
```

**After:**
```rust
// Include ALL connected YubiKeys
connected_keys.push(convert_yubikey_to_unified(yubikey, vault_associations));
```

**Pros:**
- ✅ Frontend can use single API
- ✅ Consistent data model
- ✅ Proper lifecycle_status

**Cons:**
- ⚠️ Small backend change needed

**Verdict:** ✅ Good option!

---

### Option 3: Add lifecycle_status to YubiKeyStateInfo

**Change:** Add field to struct and populate during construction

**Implementation:**
```rust
pub struct YubiKeyStateInfo {
    pub state: YubiKeyState,
    pub lifecycle_status: KeyLifecycleStatus,  // NEW
    // ... existing fields
}

// When constructing:
let lifecycle_status = match state {
    YubiKeyState::New => KeyLifecycleStatus::PreActivation,
    YubiKeyState::Reused => KeyLifecycleStatus::PreActivation,
    YubiKeyState::Registered => KeyLifecycleStatus::Active,
    YubiKeyState::Orphaned => KeyLifecycleStatus::Suspended,
};
```

**Pros:**
- ✅ Maintains separate device discovery API
- ✅ Frontend can keep using `listYubikeys()`
- ✅ Adds missing lifecycle_status

**Cons:**
- ⚠️ Maintains two data models (GlobalKey and YubiKeyStateInfo)
- ⚠️ Potential for drift between APIs

**Verdict:** ✅ Also good, more isolated change

---

## My Recommendation

### Implement BOTH Options 2 & 3

**Why both?**

1. **Option 3 (Add lifecycle_status to YubiKeyStateInfo):**
   - **Immediate fix** for YubiKey registration dialog
   - Minimal change, low risk
   - Unblocks frontend work today

2. **Option 2 (Fix ConnectedOnly filter):**
   - **Architectural cleanup** for future
   - Makes listUnifiedKeys truly unified
   - Eliminates need for separate listYubikeys() eventually

**Implementation Order:**
1. First: Add lifecycle_status to YubiKeyStateInfo (quick, unblocks frontend)
2. Later: Fix ConnectedOnly to include New devices (cleanup, can deprecate listYubikeys)

---

## Detailed Implementation Plan

### Step 1: Add lifecycle_status to YubiKeyStateInfo

**File:** `yubikey/domain/models/yubikey_state_info.rs`

```rust
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,  // Device state
    pub lifecycle_status: KeyLifecycleStatus,  // ← ADD THIS
    // ... rest of fields
}
```

**File:** `yubikey/application/manager.rs:107-263` (list_yubikeys_with_state)

After determining `state` (line 145-163), add:
```rust
// Map device state to NIST lifecycle status
let lifecycle_status = match state {
    YubiKeyState::New => KeyLifecycleStatus::PreActivation,
    YubiKeyState::Reused => KeyLifecycleStatus::PreActivation,
    YubiKeyState::Registered => KeyLifecycleStatus::Active,
    YubiKeyState::Orphaned => KeyLifecycleStatus::Suspended,
};

// Include in YubiKeyStateInfo construction (around line 241)
YubiKeyStateInfo {
    serial,
    state,
    lifecycle_status,  // ← ADD THIS
    slot,
    // ... rest
}
```

**Estimate:** 15-20 minutes

---

### Step 2: Fix ConnectedOnly Filter (Future Cleanup)

**File:** `unified_key_list_service.rs:560-595`

**Remove the filter:**
```rust
// BEFORE:
if matches!(yubikey.state, Registered | Orphaned | Reused) {
    // Excludes New!
}

// AFTER:
// Include ALL connected YubiKeys
for yubikey in yubikey_list {
    let vault_associations = /* find from registry or empty */;
    connected_keys.push(convert_yubikey_to_unified(yubikey, vault_associations));
}
```

**Estimate:** 10 minutes

---

## Final Answer to Your Questions

### Q: "listUnifiedKeys - does it return all keys?"

**A:** YES and NO - depends on filter:
- `{ type: "All" }` → ALL keys in registry (plugged + unplugged)
- `{ type: "ConnectedOnly" }` → Only connected keys, BUT excludes brand new YubiKeys (bug/oversight)

**Name is misleading** - should be `listRegistryKeys()` because it only returns registry entries, not devices.

### Q: "listYubikeys - does it return registered AND new keys?"

**A:** YES! Returns ALL physically connected YubiKey devices:
- ✅ New (not in registry)
- ✅ Reused (not in registry)
- ✅ Orphaned (not in registry, has identity)
- ✅ Registered (in registry)

**This is device detection, not key management.**

### Q: "Are these APIs doing what their names suggest?"

**A:** Partially:
- `listUnifiedKeys` → Should be "listRegistryKeys" (only registry entries)
- `listYubikeys` → Should be "detectYubiKeyDevices" (hardware discovery)

**Both names are somewhat misleading!**

### Q: "Are there other APIs doing this work?"

**A:** NO - only these 2 exist. No duplicates found.

---

## Why We Need Both APIs

**Use Case 1: Manage Keys Page (Registry Management)**
- Need: Show all managed keys
- API: `listUnifiedKeys({ type: "All" })`
- Returns: GlobalKey[] from registry

**Use Case 2: YubiKey Registration (Device Onboarding)**
- Need: Discover new YubiKeys for registration
- API: `listYubikeys()`
- Returns: YubiKeyStateInfo[] from hardware

**These are fundamentally different operations!**

---

## Recommendation

### Implement Option 3: Add lifecycle_status to YubiKeyStateInfo

**Why:**
1. ✅ Minimal change (one field + mapping logic)
2. ✅ Preserves distinct APIs for distinct use cases
3. ✅ Unblocks frontend immediately
4. ✅ No risk to existing functionality

**Implementation:**
- Add `lifecycle_status: KeyLifecycleStatus` to YubiKeyStateInfo struct
- Map from device state when constructing
- Regenerate bindings
- Frontend uses it in badges

**Effort:** 20-30 minutes

**Alternative names to consider (future):**
- `listYubikeys()` → `detectYubiKeyDevices()` (clearer purpose)
- `listUnifiedKeys()` → `listRegistryKeys()` (clearer scope)

---

## Conclusion

**Frontend engineer's analysis is correct** - there IS an inconsistency. The fix is simple: add lifecycle_status to YubiKeyStateInfo so the registration dialog can show proper NIST badges.

**Both APIs serve valid purposes:**
- `listYubikeys()` = Device discovery (needed for registration)
- `listUnifiedKeys()` = Registry management (needed for ManageKeys)

**The gap:** Device discovery API returns devices but not lifecycle status. Simple fix: add the field and map from device state.

Ready to implement upon your approval!
