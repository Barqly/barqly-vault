# Terminology Cleanup Research - Old Key States Deprecation

**Date:** 2025-10-14
**Analyst:** sr-backend-engineer (AI)
**Status:** Research Complete - Ready for Implementation Plan

---

## Executive Summary

Comprehensive analysis of ALL deprecated terminology in the backend codebase per `/docs/architecture/key-lifecycle-management.md`. Found **195+ occurrences** across **15 active files**. All identified files are part of active code paths (no dead code detected).

---

## Deprecated Terms Inventory

### According to key-lifecycle-management.md

**Old KeyState Enum (DEPRECATED):**
```rust
enum KeyState {
    Active,      // → KeyLifecycleStatus::Active
    Registered,  // → KeyLifecycleStatus::Active (confusing, was same as active)
    Orphaned,    // → KeyLifecycleStatus::Suspended (if has history) OR PreActivation (if never used)
}
```

**Old YubiKeyState Enum (STILL IN USE, needs terminology cleanup):**
```rust
enum YubiKeyState {
    New,         // → Should map to KeyLifecycleStatus::PreActivation
    Reused,      // → Should map to KeyLifecycleStatus::PreActivation
    Registered,  // → Should map to KeyLifecycleStatus::Active
    Orphaned,    // → Should map to KeyLifecycleStatus::Suspended
}
```

**Target NIST-Aligned States:**
```rust
pub enum KeyLifecycleStatus {
    PreActivation,  // ✅ Correct terminology
    Active,         // ✅ Correct terminology
    Suspended,      // ✅ Correct terminology
    Deactivated,    // ✅ Correct terminology
    Destroyed,      // ✅ Correct terminology
    Compromised,    // ✅ Correct terminology
}
```

---

## Search Results

### Pattern 1: YubiKeyState Enum Usage
**Search:** `YubiKeyState::Orphaned|YubiKeyState::Registered|YubiKeyState::New|YubiKeyState::Reused`
**Results:** 107 occurrences across 5 files

**Files:**
1. `src/services/key_management/yubikey/domain/models/state.rs` - **73 occurrences**
2. `src/services/key_management/shared/application/services/unified_key_list_service.rs` - 14 occurrences
3. `src/commands/key_management/unified_keys.rs` - 11 occurrences
4. `src/services/key_management/yubikey/application/manager.rs` - 5 occurrences
5. `src/commands/key_management/key_menu_commands.rs` - 4 occurrences

### Pattern 2: String Literals ("orphaned", "registered", etc.)
**Search:** `"orphaned"|"registered"|Orphaned|Registered`
**Results:** 88 occurrences across 10 files

**Additional Files Found:**
6. `src/services/key_management/yubikey/domain/models/available_yubikey.rs`
7. `src/services/key_management/shared/domain/models/key_lifecycle.rs` (migration helpers)
8. `src/services/vault/application/services/vault_statistics_service.rs`
9. `src/commands/vault/statistics.rs`
10. `src/commands/key_management/yubikey/vault_commands.rs`

### Pattern 3: KeyLifecycleStatus Usage (CORRECT - already using NIST terms)
**Search:** `KeyLifecycleStatus`
**Results:** 227 occurrences across 17 files (✅ These are CORRECT)

---

## File-by-File Analysis

### TIER 1: Core Domain Models (Must Change)

#### 1. `services/key_management/yubikey/domain/models/state.rs` (73 occurrences)
**Status:** ✅ ACTIVE - Core YubiKey state machine
**Purpose:** Defines YubiKeyState enum and state transitions
**Impact:** HIGH - Used by all YubiKey operations

**Current Code:**
```rust
pub enum YubiKeyState {
    New,         // Brand new with default PIN
    Reused,      // Custom PIN but no age identity
    Registered,  // Fully configured and ready
    Orphaned,    // Has identity but no manifest entry  ← DEPRECATED TERM
}
```

**Required Changes:**
- Keep enum variants AS-IS (internal consistency)
- Update comments to reference NIST mapping
- Update Display/Debug implementations to show mapping
- Update `description()` method to clarify mapping
- Add deprecation warnings in docstrings

**Reasoning:** YubiKeyState is a **device-level** state (hardware initialization status), separate from KeyLifecycleStatus which is **registry-level** state. Both should coexist but with clear mapping documentation.

#### 2. `services/key_management/yubikey/domain/models/available_yubikey.rs` (1 occurrence)
**Status:** ✅ ACTIVE - Used in vault commands
**Purpose:** DTO for available YubiKeys (frontend-facing)

**Current Code:**
```rust
pub struct AvailableYubiKey {
    pub serial: String,
    pub state: String, // "new", "orphaned", "registered", "reused"  ← DEPRECATED TERMS
    ...
}
```

**Required Changes:**
- Change `state` field type from `String` to proper enum or keep but add lifecycle_status field
- OR: Add lifecycle_status field alongside state for dual representation
- Update all usages to populate both fields

---

### TIER 2: Service Layer (Mapping & Conversion)

#### 3. `services/key_management/yubikey/application/manager.rs` (5 occurrences)
**Status:** ✅ ACTIVE - YubiKeyManager facade
**Purpose:** Orchestrates YubiKey operations
**Impact:** MEDIUM - Used by all YubiKey commands

**Current Usage:**
```rust
let state = match (in_registry, has_identity) {
    (true, true) => YubiKeyState::Registered,
    (false, true) => YubiKeyState::Orphaned,  ← Uses deprecated term
    ...
}
```

**Required Changes:**
- Keep YubiKeyState usage (device-level state)
- Add KeyLifecycleStatus mapping when creating registry entries
- Ensure state history includes lifecycle_status transitions

#### 4. `services/key_management/shared/application/services/unified_key_list_service.rs` (14 occurrences)
**Status:** ✅ ACTIVE - Unified key listing service
**Purpose:** Lists keys across all types with state detection
**Impact:** MEDIUM - Used by unified key APIs

**Required Changes:**
- Add lifecycle_status field to returned key info
- Map YubiKeyState → KeyLifecycleStatus when building response
- Use migration helper from key_lifecycle.rs

#### 5. `services/key_management/shared/domain/models/key_lifecycle.rs` (migration helpers)
**Status:** ✅ ACTIVE - NIST lifecycle implementation
**Purpose:** Defines KeyLifecycleStatus and migration logic
**Impact:** LOW - Already correct, just has migration helpers

**Current Code:**
```rust
pub fn migrate_yubikey_state(state: &str) -> KeyLifecycleStatus {
    match state {
        "new" => KeyLifecycleStatus::PreActivation,
        "reused" => KeyLifecycleStatus::PreActivation,
        "registered" => KeyLifecycleStatus::Active,
        "orphaned" => KeyLifecycleStatus::Suspended,  ← Correct mapping!
        _ => KeyLifecycleStatus::PreActivation,
    }
}
```

**Required Changes:**
- ✅ Already correct! This IS the solution.
- Make this migration helper more prominent/used
- Ensure all services call this when converting states

---

### TIER 3: Command Layer (API Interface)

#### 6. `commands/key_management/unified_keys.rs` (11 occurrences)
**Status:** ✅ ACTIVE - Unified key management commands
**Purpose:** Frontend-facing API for listing/managing keys
**Impact:** HIGH - Frontend depends on this

**Required Changes:**
- Ensure KeyInfo includes lifecycle_status field (already does)
- When converting YubiKeyStateInfo → KeyInfo, map state → lifecycle_status
- Update conversion functions to use migration helper

#### 7. `commands/key_management/key_menu_commands.rs` (4 occurrences)
**Status:** ✅ ACTIVE - Key menu data provider
**Purpose:** Provides key data for UI key menu
**Impact:** MEDIUM - Used by UI KeyMenuBar component

**Required Changes:**
- Add lifecycle_status to returned data
- Map YubiKeyState → KeyLifecycleStatus using migration helper

#### 8. `commands/key_management/yubikey/vault_commands.rs` (1 occurrence)
**Status:** ✅ ACTIVE - Vault-specific YubiKey commands
**Purpose:** Init/register YubiKey for specific vault
**Impact:** MEDIUM - Used by vault YubiKey dialogs

**Required Changes:**
- When setting lifecycle_status on registry entry, use KeyLifecycleStatus::Active
- Add status_history entry with proper lifecycle state

#### 9. `commands/vault/statistics.rs` (3 occurrences)
**Status:** ✅ ACTIVE - Vault statistics commands
**Purpose:** Get vault statistics
**Impact:** LOW - Stats display only

**Required Changes:**
- May use old terminology in comments/strings
- Update to use lifecycle_status

#### 10. `services/vault/application/services/vault_statistics_service.rs` (6 occurrences)
**Status:** ✅ ACTIVE - Vault statistics service
**Purpose:** Calculate vault statistics
**Impact:** LOW - Stats calculation

**Required Changes:**
- Similar to statistics.rs
- Update terminology in comments/calculations

---

## Dead Code Analysis

**Result:** ❌ NO DEAD CODE FOUND

All 15 files identified are:
- ✅ Registered in module hierarchy (checked mod.rs files)
- ✅ Used in command registration (checked lib.rs)
- ✅ Part of active code paths (traced from lib.rs → commands → services)
- ✅ No orphaned files or unused modules detected

---

## Migration Strategy Decision Points

### Decision 1: YubiKeyState Enum - Keep or Remove?

**Option A: Keep YubiKeyState, Document Mapping (RECOMMENDED)**
- ✅ Less breaking changes
- ✅ Dual-state system is intentional per architecture doc
- ✅ YubiKeyState = device-level, KeyLifecycleStatus = registry-level
- ⚠️ Need clear documentation of mapping
- ⚠️ Need to ensure all APIs expose lifecycle_status, not just YubiKeyState

**Option B: Remove YubiKeyState, Use Only KeyLifecycleStatus**
- ❌ Large refactoring (107 occurrences)
- ❌ Loses device-specific state information
- ❌ Doesn't match architecture doc's dual-system design
- ✅ Cleaner, single source of truth

**RECOMMENDATION:** Option A - The architecture doc explicitly shows both systems coexisting with mapping.

### Decision 2: String Representations - Keep or Convert?

**Issue:** AvailableYubiKey uses `state: String` with values like "orphaned"

**Option A: Keep Strings, Add lifecycle_status Field**
```rust
pub struct AvailableYubiKey {
    pub state: String,  // Device state: "new", "reused", "registered", "orphaned"
    pub lifecycle_status: KeyLifecycleStatus,  // NIST state: PreActivation, Active, Suspended
    ...
}
```

**Option B: Convert Strings to Enums**
```rust
pub struct AvailableYubiKey {
    pub device_state: YubiKeyState,  // Enum instead of string
    pub lifecycle_status: KeyLifecycleStatus,
    ...
}
```

**RECOMMENDATION:** Option A - Less breaking change, frontend can migrate gradually.

---

## Specific Changes Required

### Category 1: Enum Variant Comments (NO code change, just comments)

**Files:** `state.rs`
**Changes:** Update docstrings to show NIST mapping

```rust
/// YubiKey with age identity already registered and ready to use
/// - PIN: Custom
/// - Age identity: Present and valid
/// - Manifest entry: Present and valid
/// - **NIST Lifecycle Mapping:** KeyLifecycleStatus::Active
/// - Action needed: None (ready for operations)
Registered,

/// YubiKey has age identity but no manifest entry (needs recovery)
/// - PIN: Custom
/// - Age identity: Present
/// - Manifest entry: Missing or invalid
/// - **NIST Lifecycle Mapping:** KeyLifecycleStatus::Suspended
/// - Action needed: Recover manifest entry or re-register
Orphaned,
```

### Category 2: Add lifecycle_status Fields

**Files:** All services that return key information

**Add to responses:**
```rust
pub struct KeyInfo {
    pub id: String,
    pub label: String,
    pub key_type: KeyType,
    pub lifecycle_status: KeyLifecycleStatus,  // ← ADD THIS
    ...
}
```

### Category 3: Use Migration Helpers

**Files:** All conversion points between YubiKeyState and KeyLifecycleStatus

```rust
use crate::services::key_management::shared::domain::models::key_lifecycle::migration::migrate_yubikey_state;

let lifecycle_status = migrate_yubikey_state(match yubikey_state {
    YubiKeyState::New => "new",
    YubiKeyState::Reused => "reused",
    YubiKeyState::Registered => "registered",
    YubiKeyState::Orphaned => "orphaned",
});
```

### Category 4: Registry Entries

**Files:** registry_persistence.rs, registry services

**Ensure all registry entries have:**
```json
{
  "lifecycle_status": "active",  // NOT "registered"
  "status_history": [
    {
      "status": "pre_activation",
      "timestamp": "...",
      "reason": "Key created",
      "changed_by": "system"
    },
    {
      "status": "active",
      "timestamp": "...",
      "reason": "Registered from orphaned state",
      "changed_by": "user"
    }
  ]
}
```

---

## Testing Strategy

### Unit Tests to Update/Add
1. State transition tests in `state.rs`
2. Migration helper tests in `key_lifecycle.rs` (already exist!)
3. Conversion tests in unified_key_list_service.rs

### Integration Tests to Add
1. Full flow: Orphaned YubiKey → Register → Verify lifecycle_status = Active
2. List keys: Verify lifecycle_status present in all responses
3. Vault statistics: Verify uses lifecycle_status not old state

### Manual Testing
1. Insert orphaned YubiKey → Should show lifecycle_status = Suspended
2. Register orphaned YubiKey → Should transition to Active
3. Check ManageKeys UI → Should display correct NIST states

---

## Estimated Effort

**Low Risk Changes (Comments/Docs):** 2-3 hours
- Update docstrings in state.rs
- Update architecture doc examples

**Medium Risk Changes (Add Fields):** 4-6 hours
- Add lifecycle_status to response DTOs
- Update all services to populate lifecycle_status
- Ensure migration helpers are called everywhere

**High Risk Changes (If we remove YubiKeyState):** 15-20 hours
- ❌ NOT RECOMMENDED - Architecture doc shows dual system is intentional

**TOTAL ESTIMATED:** 6-9 hours for recommended approach

---

## Implementation Order

### Phase 1: Foundation (2 hours)
1. ✅ Document mapping in state.rs docstrings
2. ✅ Verify migration helpers in key_lifecycle.rs
3. ✅ Add lifecycle_status to all DTOs (non-breaking, additive only)

### Phase 2: Service Layer (3 hours)
4. ✅ Update YubiKeyManager to set lifecycle_status on registry entries
5. ✅ Update unified_key_list_service to populate lifecycle_status
6. ✅ Update key_menu_commands to include lifecycle_status

### Phase 3: Commands (2 hours)
7. ✅ Update vault_commands to use lifecycle_status
8. ✅ Update statistics services to use lifecycle_status
9. ✅ Regenerate TypeScript bindings

### Phase 4: Testing (2 hours)
10. ✅ Run all unit tests
11. ✅ Run cargo clippy
12. ✅ Manual testing with real YubiKey

---

## Open Questions for User

### Q1: YubiKeyState Enum - Keep or Remove?
**Recommendation:** Keep (matches architecture doc design)

### Q2: Breaking Changes Acceptable?
- Adding lifecycle_status field to responses is non-breaking
- Removing old fields would be breaking
- **Recommendation:** Add only, don't remove (frontend can migrate gradually)

### Q3: Timeline
- Can complete in one session (6-9 hours)
- OR break into multiple PRs (safer)
- **Recommendation:** Single PR, thorough testing

### Q4: Documentation Updates
- Update key-lifecycle-management.md to clarify dual-state system
- Add migration guide for frontend
- **Recommendation:** Yes, include in same PR

---

## Success Criteria

After implementation:
- ✅ All registry entries have `lifecycle_status` field
- ✅ All API responses include both device state (YubiKeyState) and lifecycle state (KeyLifecycleStatus)
- ✅ Migration helpers used consistently
- ✅ Status history tracks lifecycle_status transitions
- ✅ All tests pass (297+ tests)
- ✅ No clippy warnings
- ✅ TypeScript bindings updated
- ✅ Manual testing with YubiKey confirms correct states

---

_Research complete. Ready for implementation plan._
