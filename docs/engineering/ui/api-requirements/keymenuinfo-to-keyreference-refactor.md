# KeyMenuInfo → KeyReference Refactor Request

**Date:** 2025-10-12
**Status:** 🔴 Backend Action Required
**Priority:** High - Tech Debt Elimination
**Requester:** Frontend Engineer

---

## Problem Statement

The `get_key_menu_data` command returns `KeyMenuInfo` type, forcing frontend to transform it to `KeyReference`. This violates DDD layering and creates duplicated transformation logic in multiple frontend locations.

### Current Architecture (BROKEN):

```
Backend Command Layer → Returns KeyMenuInfo
                        ↓
Frontend VaultContext → Transforms KeyMenuInfo → KeyReference (60 LOC)
Frontend useKeySelection → Transforms KeyMenuInfo → KeyReference (60 LOC) [DUPLICATE!]
                        ↓
UI Components → Consume KeyReference
```

**Problems:**
1. ❌ **Shotgun surgery**: Same transformation logic duplicated in 2+ places
2. ❌ **Type safety**: Requires `as any` casts (VaultContext line 260, 318, 321)
3. ❌ **Wrong layer**: Frontend (presentation consumer) doing presentation layer work
4. ❌ **Tech debt**: ~120 LOC of transformation code that shouldn't exist

---

## Root Cause

**File:** `src-tauri/src/commands/key_management/key_menu_commands.rs`

The command returns `KeyMenuInfo` instead of `KeyReference`:

```rust
// CURRENT (WRONG):
pub struct GetKeyMenuDataResponse {
    pub keys: Vec<KeyMenuInfo>,  // ❌ Frontend has to transform this
}

// SHOULD BE:
pub struct GetKeyMenuDataResponse {
    pub keys: Vec<KeyReference>,  // ✅ Frontend ready-to-use
}
```

---

## Proposed Solution

### Backend Changes Required:

**1. Update `get_key_menu_data` command response:**

```rust
// File: src-tauri/src/commands/key_management/key_menu_commands.rs

pub async fn get_key_menu_data(
    request: GetKeyMenuDataRequest,
    state: State<'_, AppState>,
) -> Result<CommandResponse<GetKeyMenuDataResponse>> {
    // ... existing logic ...

    // Transform to KeyReference in command layer (presentation)
    let key_refs: Vec<KeyReference> = menu_infos
        .into_iter()
        .map(|info| {
            // Do transformation HERE, not in frontend
            match info.key_type.as_str() {
                "passphrase" => KeyReference::Passphrase {
                    id: info.internal_id.clone(),
                    label: info.label,
                    lifecycle_status: info.state,
                    created_at: info.created_at,
                    last_used: None,
                    data: PassphraseKeyData {
                        key_id: info.internal_id,
                    },
                },
                "yubikey" => KeyReference::YubiKey {
                    id: info.internal_id,
                    label: info.label,
                    lifecycle_status: info.state,
                    created_at: info.created_at,
                    last_used: None,
                    data: YubiKeyData {
                        serial: info.metadata.serial,
                        firmware_version: info.metadata.firmware_version,
                    },
                },
                _ => // error handling
            }
        })
        .collect();

    Ok(CommandResponse::success(GetKeyMenuDataResponse { keys: key_refs }))
}
```

**2. Check if `KeyMenuInfo` is used elsewhere:**
- If ONLY used by `get_key_menu_data`, delete it entirely
- If used by other commands, keep it but don't expose to frontend

**3. Verify `KeyReference` type exists in shared models:**
- Should be in: `src-tauri/src/services/key_management/shared/domain/models/`
- Should have `#[derive(specta::Type)]` for TypeScript bindings
- Should match the discriminated union structure frontend expects

---

## Frontend Cleanup (After Backend Changes)

Once backend returns `KeyReference`, frontend will:

### Delete Transformation Code:

**VaultContext.tsx (lines 248-311):**
```typescript
// DELETE THIS ENTIRE BLOCK:
const keyRefs = menuResponse.keys.map((keyMenuInfo: KeyMenuInfo, index: number) => {
  // 60 lines of transformation logic
});

// REPLACE WITH:
const keyRefs = menuResponse.keys; // Already KeyReference[]!
```

**useKeySelection.ts (lines 69-97):**
```typescript
// DELETE THIS ENTIRE BLOCK:
const keyRefs: KeyReference[] = activeKeys.map((keyMenuInfo: KeyMenuInfo) => {
  // 30 lines of transformation logic
});

// REPLACE WITH:
const keyRefs = activeKeys; // Already KeyReference[]!
```

### Remove Type Assertions:

```typescript
// DELETE:
lifecycle_status: keyMenuInfo.state as any
setKeyCache(..., keyRefs as any)
setVaultKeys(keyRefs as any)

// REPLACE WITH:
// No casts needed - types match!
```

**Net Result:** -120 LOC frontend, proper DDD layering

---

## Implementation Checklist

### Backend Engineer Tasks:

- [ ] Verify `KeyReference` type exists with proper structure
- [ ] Add `specta::Type` derive if missing
- [ ] Update `get_key_menu_data` to return `Vec<KeyReference>`
- [ ] Move transformation logic to command layer
- [ ] Check if `KeyMenuInfo` is used elsewhere
- [ ] Delete `KeyMenuInfo` if unused
- [ ] Run `make validate-rust` (all tests pass)
- [ ] Regenerate TypeScript bindings: `make generate-bindings`
- [ ] Verify bindings.ts no longer has `KeyMenuInfo` export

### Frontend Engineer Tasks (After Backend Complete):

- [ ] Delete transformation code from VaultContext.tsx
- [ ] Delete transformation code from useKeySelection.ts
- [ ] Remove all `as any` type assertions
- [ ] Update cache to use KeyReference directly
- [ ] Run `make validate-ui` (all tests pass)
- [ ] Test manually: key menu displays correctly

---

## Expected Timeline

- Backend work: ~30 minutes (straightforward transformation move)
- Frontend cleanup: ~15 minutes (delete code)
- Testing: ~15 minutes
- **Total: ~1 hour**

---

## Design Rationale

### Why This Matters:

**From DDD Perspective:**
- **Presentation Layer** (Backend Commands) should package data for UI consumption
- **UI Layer** (Frontend) should render pre-packaged data, not transform it
- Current architecture violates separation of concerns

**From Maintainability Perspective:**
- Transformation logic in 2+ places = shotgun surgery when changing key structure
- Type assertions = bypassing type safety = future bugs
- 120 LOC of unnecessary frontend code

**From Clean Architecture Perspective:**
```
✅ CORRECT:
Backend Domain → Backend Application → Backend Command (transform) → Frontend (render)

❌ CURRENT:
Backend Domain → Backend Application → Backend Command → Frontend (transform) → Frontend (render)
```

The transformation is presentation logic, belongs in the command layer.

---

## Alternative Considered: Keep Current Architecture

**Pros:**
- No backend changes needed
- Frontend works as-is

**Cons:**
- ❌ Violates DDD principles
- ❌ Duplicated transformation logic
- ❌ Type safety issues (`as any`)
- ❌ 120 LOC of unnecessary frontend code
- ❌ Frontend knows about backend internals (KeyMenuInfo)

**Verdict:** Alternative rejected. Clean architecture > short-term convenience.

---

## Context for sr-backend-engineer Agent

**Task:** Refactor `get_key_menu_data` command to return `KeyReference` directly instead of `KeyMenuInfo`.

**Current Implementation:**
- File: `src-tauri/src/commands/key_management/key_menu_commands.rs`
- Function: `pub async fn get_key_menu_data()`
- Returns: `Vec<KeyMenuInfo>`
- Frontend then transforms to `Vec<KeyReference>` (duplicated in 2 places)

**Required Changes:**
1. Move transformation logic FROM frontend TO command layer
2. Return `Vec<KeyReference>` instead of `Vec<KeyMenuInfo>`
3. Delete `KeyMenuInfo` struct if only used by this command
4. Ensure `KeyReference` has `#[derive(specta::Type)]` for bindings
5. Regenerate TypeScript bindings

**Key Architectural Principle:**
Commands (presentation layer) should package data in UI-ready format. UI should render, not transform.

**DDD Pattern:**
```
Domain Layer (KeyEntry)
  → Application Layer (KeyManager)
  → Command Layer (get_key_menu_data) [← TRANSFORMATION BELONGS HERE]
  → Frontend (VaultContext) [← SHOULD JUST USE DATA]
```

**Files to Check:**
- `src-tauri/src/commands/key_management/key_menu_commands.rs` - Command to refactor
- `src-tauri/src/services/key_management/shared/domain/models/key_reference.rs` - Target type
- `src-ui/src/contexts/VaultContext.tsx` - Frontend transformation to remove (lines 254-311)
- `src-ui/src/hooks/useKeySelection.ts` - Frontend transformation to remove (lines 70-97)

**Expected Behavior After Fix:**
```rust
// Backend returns KeyReference directly
let response = GetKeyMenuDataResponse {
    keys: vec![
        KeyReference::Passphrase { ... },
        KeyReference::YubiKey { ... },
    ]
};
```

```typescript
// Frontend uses directly
const keyRefs = menuResponse.keys; // Already KeyReference[], no transformation!
```

**Testing:**
- Backend tests should verify KeyReference structure
- Frontend should verify no type assertions needed
- Manual test: Key menu displays correctly in UI

---

## Questions for Backend Engineer

1. Is `KeyMenuInfo` used by any other commands besides `get_key_menu_data`?
2. Does `KeyReference` type already exist in the domain models?
3. Are there any constraints preventing commands from returning domain types directly?
4. Is there a reason we need a separate DTO (KeyMenuInfo) instead of using KeyReference?

If answers are: No, Yes, No, No → Then this refactor is straightforward.

---

**Bottom Line:** This is legitimate tech debt. The command layer should do presentation work, not the UI layer. Moving transformation to backend eliminates 120 LOC of duplicated frontend code and follows proper DDD layering.
