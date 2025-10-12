# KeyMenu NIST State Fix - Backend Update Complete

## What Was Fixed

### Backend Changes (COMPLETED)
File: `/src-tauri/src/commands/key_management/key_menu_commands.rs`

1. **Fixed YubiKeyState to NIST lifecycle status mappings:**
   ```rust
   // OLD (INCORRECT):
   YubiKeyState::Orphaned => "registered"    // ❌
   YubiKeyState::Reused => "registered"      // ❌
   YubiKeyState::New => "registered"         // ❌

   // NEW (CORRECT):
   YubiKeyState::Orphaned => "suspended"     // ✅
   YubiKeyState::Reused => "pre_activation"  // ✅
   YubiKeyState::New => "pre_activation"     // ✅
   YubiKeyState::Registered => "active"      // ✅ (unchanged)
   ```

2. **Fixed default state for unknown YubiKeys:**
   ```rust
   // OLD: .unwrap_or(&"registered".to_string())
   // NEW: .unwrap_or(&"pre_activation".to_string())
   ```

3. **TypeScript bindings regenerated** - `src-ui/src/bindings.ts` updated

## Frontend Changes Required

### 1. Remove ALL Conversion/Adapter Code

The backend now returns proper NIST-aligned states directly. Remove any code that:
- Converts "registered" to other states
- Converts "orphaned" to other states
- Has version suffixes like `_v2` or `_fixed`
- Has comments about "backend compatibility"

### 2. KeyMenuInfo Structure

The backend `KeyMenuInfo` structure returns:
```typescript
interface KeyMenuInfo {
  display_index: number;      // 0=passphrase, 1-3=yubikeys
  key_type: string;           // "passphrase" | "yubikey"
  label: string;              // User-friendly display label
  internal_id: string;        // Registry key ID
  state: string;              // NIST lifecycle status (see below)
  created_at: string;         // ISO timestamp
  metadata: KeyMenuMetadata;  // Type-specific metadata
}
```

### 3. Expected State Values

The `state` field now returns ONLY these NIST-aligned values:

| Key Type | State Value | Meaning |
|----------|------------|---------|
| Passphrase | "active" | Always active when in vault |
| YubiKey | "active" | Registered and ready to use |
| YubiKey | "suspended" | Was active, now detached/orphaned |
| YubiKey | "pre_activation" | New or reused, needs setup |

### 4. State-Based UI Logic

Use these states directly for UI decisions:

```typescript
// Example: Determine if key is ready for encryption
const isKeyReady = (key: KeyMenuInfo): boolean => {
  return key.state === "active";
};

// Example: Show setup required indicator
const needsSetup = (key: KeyMenuInfo): boolean => {
  return key.state === "pre_activation";
};

// Example: Show reattachment option
const canReattach = (key: KeyMenuInfo): boolean => {
  return key.state === "suspended";
};
```

### 5. Remove Dead Code

Search for and remove:
- Any functions with "migrate", "convert", or "adapter" in the name
- Any mappings from old state names to new ones
- Any versioned function names (e.g., `getKeyState_v2`)
- Any comments about "backward compatibility" for states

### 6. Testing Checklist

After removing conversion code, verify:
- [ ] KeyMenuBar displays correct icons for each state
- [ ] Active keys show as available for encryption
- [ ] Pre-activation keys show setup required
- [ ] Suspended keys show reattachment option
- [ ] No console errors about unexpected state values
- [ ] State transitions work correctly (setup, detach, reattach)

## Migration Guide

### Step 1: Find Conversion Code
```bash
# Search for old state references
grep -r "registered\|orphaned" src-ui/ --include="*.ts" --include="*.tsx"
```

### Step 2: Remove Adapters
Look for patterns like:
```typescript
// DELETE THIS TYPE OF CODE:
const convertLegacyState = (state: string): string => {
  if (state === "registered") return "active";
  if (state === "orphaned") return "suspended";
  return state;
};

// DELETE THIS TYPE OF CODE:
const normalizeKeyState = (key: KeyMenuInfo): KeyMenuInfo => {
  return {
    ...key,
    state: mapOldStateToNew(key.state)
  };
};
```

### Step 3: Use States Directly
```typescript
// CORRECT: Use state directly from backend
const getKeyStatusIcon = (state: string): string => {
  switch (state) {
    case "active": return "✅";
    case "suspended": return "⚠️";
    case "pre_activation": return "🔧";
    default: return "❓";
  }
};
```

## Notes

- The backend is now the single source of truth for NIST lifecycle states
- No backward compatibility code is needed - we're establishing a clean foundation
- The unified_keys.rs file still contains migration functions for backwards compatibility with stored data, but this doesn't affect the KeyMenuBar API
- All backend tests pass with the new state mappings

## Verification

Run these commands to verify the fix:
```bash
# Backend tests all pass
make validate-rust

# TypeScript bindings updated
make generate-bindings

# Check KeyMenuInfo type in bindings
grep -A 20 "export interface KeyMenuInfo" src-ui/src/bindings.ts
```

---

**Backend work completed by**: Backend Engineer
**Date**: 2025-10-12
**Status**: ✅ Ready for frontend implementation