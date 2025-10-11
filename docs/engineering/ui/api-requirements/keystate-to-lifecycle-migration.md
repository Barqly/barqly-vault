# KeyState → KeyLifecycleStatus Migration Guide

**Date**: 2025-01-11
**Status**: ✅ Backend Complete - Frontend Action Required
**Priority**: High - Breaking API Change

---

## What Changed

The old `KeyState` enum has been **completely removed** and replaced with NIST-aligned `KeyLifecycleStatus` across all APIs.

### Before (OLD - Removed)
```typescript
type KeyState = "active" | "registered" | "orphaned"

interface KeyReference {
  state: KeyState  // REMOVED
  ...
}
```

### After (NEW - Current)
```typescript
type KeyLifecycleStatus =
  | "pre_activation"  // Key generated but never used
  | "active"          // Currently in use
  | "suspended"       // Temporarily disabled
  | "deactivated"     // Permanently disabled
  | "destroyed"       // Cryptographically destroyed
  | "compromised"     // Security breach detected

interface KeyReference {
  lifecycle_status: KeyLifecycleStatus  // NEW
  ...
}
```

---

## Why This Change

### Problems with Old System:
- ❌ **Confusion**: "Registered" didn't clearly mean "available for use"
- ❌ **Incomplete**: No way to represent suspended or deactivated keys
- ❌ **Two systems**: `KeyState` for APIs, `KeyLifecycleStatus` for storage
- ❌ **Not standards-aligned**: Didn't follow NIST key lifecycle guidelines

### Benefits of New System:
- ✅ **Single source of truth**: One state system everywhere
- ✅ **Clear semantics**: States have precise, unambiguous meanings
- ✅ **NIST-aligned**: Follows industry-standard key management lifecycle
- ✅ **Future-proof**: Supports full key lifecycle (suspension, deactivation, destruction)
- ✅ **No confusion**: Same terminology in storage, APIs, and UI

---

## API Changes

### KeyReference Type

**CHANGED FIELD:**
```typescript
// OLD (removed):
interface KeyReference {
  state: KeyState  // "active" | "registered" | "orphaned"
}

// NEW:
interface KeyReference {
  lifecycle_status: KeyLifecycleStatus  // "pre_activation" | "active" | "suspended" | ...
}
```

**Example Response:**
```typescript
{
  id: "MBP2024-Nauman",
  label: "MBP2024 Nauman",
  lifecycle_status: "active",  // Changed from "state"
  created_at: "2025-01-11T...",
  last_used: null,
  type: "Passphrase",
  data: { key_id: "..." }
}
```

### KeyInfo Type

**CHANGED FIELD:**
```typescript
// OLD (removed):
interface KeyInfo {
  state: KeyState
}

// NEW:
interface KeyInfo {
  lifecycle_status: KeyLifecycleStatus
}
```

---

## State Mapping

### How Old States Map to New States

| Old KeyState | New KeyLifecycleStatus | When Used |
|--------------|------------------------|-----------|
| `active` | `active` | Key is attached to vault(s) and ready |
| `registered` | `active` | ⚠️ Confusing name - meant "active" all along |
| `orphaned` (never used) | `pre_activation` | Key exists but never attached |
| `orphaned` (was used) | `suspended` | Key was active, now detached |

### YubiKey State Mappings

| YubiKeyState | KeyLifecycleStatus | Meaning |
|--------------|-------------------|---------|
| `new` | `pre_activation` | Brand new, never initialized |
| `reused` | `pre_activation` | Has PIN, needs age identity |
| `registered` | `active` | Fully configured, ready to use |
| `orphaned` | `suspended` | Was active, now detached |

---

## Frontend Migration Checklist

### Phase 1: Update Imports (5 minutes)

**File**: All component files using keys

```typescript
// REMOVE old imports (if any):
import { KeyState } from '../bindings';  // DELETE

// KeyLifecycleStatus is already available:
import { KeyLifecycleStatus, KeyReference } from '../bindings';
```

### Phase 2: Update Field Access (15 minutes)

**Find and replace across codebase:**

```typescript
// FIND:    key.state
// REPLACE: key.lifecycle_status

// FIND:    keyRef.state
// REPLACE: keyRef.lifecycle_status

// FIND:    keyInfo.state
// REPLACE: keyInfo.lifecycle_status
```

**Example Changes:**

```typescript
// BEFORE:
const isActive = key.state === 'active';
const badge = getStatusBadge(key.state);

// AFTER:
const isActive = key.lifecycle_status === 'active';
const badge = getStatusBadge(key.lifecycle_status);
```

### Phase 3: Update UI Display Logic (30 minutes)

**File**: `src/lib/format-utils.ts` (or wherever you have status formatting)

```typescript
// REMOVE old function:
export function formatKeyState(state: KeyState): string {
  // DELETE THIS
}

// ADD new function:
export function formatKeyLifecycleStatus(status: KeyLifecycleStatus): string {
  const statusMap = {
    pre_activation: 'New',
    active: 'Active',
    suspended: 'Suspended',
    deactivated: 'Deactivated',
    destroyed: 'Destroyed',
    compromised: 'Compromised'
  };
  return statusMap[status] || 'Unknown';
}

// Badge configuration:
export function getLifecycleStatusBadge(status: KeyLifecycleStatus) {
  const badges = {
    pre_activation: {
      label: 'New',
      color: 'gray',
      icon: '○',
      description: 'Ready to use - attach to a vault'
    },
    active: {
      label: 'Active',
      color: 'green',
      icon: '●',
      description: 'Available for encryption'
    },
    suspended: {
      label: 'Suspended',
      color: 'yellow',
      icon: '⏸',
      description: 'Temporarily disabled'
    },
    deactivated: {
      label: 'Deactivated',
      color: 'red',
      icon: '⊘',
      description: 'Permanently disabled'
    },
    destroyed: {
      label: 'Destroyed',
      color: 'gray',
      icon: '✕',
      description: 'Key material deleted'
    },
    compromised: {
      label: 'Compromised',
      color: 'red',
      icon: '⚠',
      description: 'Security issue - do not use'
    }
  };
  return badges[status] || { label: 'Unknown', color: 'gray', icon: '?' };
}
```

### Phase 4: Update Components (45 minutes)

#### ManageKeysPage.tsx
```typescript
// BEFORE:
const statusDisplay = key.state === 'active' ? 'Active' : 'Inactive';

// AFTER:
const { label, color, icon, description } = getLifecycleStatusBadge(key.lifecycle_status);
const statusDisplay = label;
```

#### VaultCard.tsx
```typescript
// BEFORE:
const canEncrypt = keys.some(k => k.state === 'active');

// AFTER:
const canEncrypt = keys.some(k => k.lifecycle_status === 'active');
```

#### KeyListItem.tsx
```typescript
// BEFORE:
<Badge color={key.state === 'active' ? 'green' : 'gray'}>
  {key.state}
</Badge>

// AFTER:
const badge = getLifecycleStatusBadge(key.lifecycle_status);
<Badge color={badge.color} title={badge.description}>
  {badge.icon} {badge.label}
</Badge>
```

### Phase 5: Update Filters/Conditionals (15 minutes)

**Search for state-based logic:**

```typescript
// BEFORE:
if (key.state === 'orphaned') {
  showAttachButton();
}

// AFTER:
if (key.lifecycle_status === 'pre_activation' ||
    key.lifecycle_status === 'suspended') {
  showAttachButton();
}
```

```typescript
// BEFORE:
const activeKeys = keys.filter(k => k.state === 'active');

// AFTER:
const activeKeys = keys.filter(k => k.lifecycle_status === 'active');
```

### Phase 6: Remove Old Code (10 minutes)

**Delete any KeyState-related code:**

```bash
# Search for references to old enum:
grep -r "KeyState" src/

# Remove any:
# - Type imports of KeyState
# - Functions using KeyState
# - Comments mentioning old states
```

---

## Testing Checklist

### Visual Testing
- [ ] Key badges display correct labels ("New", "Active", "Suspended")
- [ ] Colors match NIST states (green for active, yellow for suspended, etc.)
- [ ] Icons render properly
- [ ] Hover tooltips show descriptions

### Functional Testing
- [ ] Can attach `pre_activation` keys to vaults
- [ ] Can attach `suspended` keys to vaults
- [ ] Cannot use `deactivated` or `destroyed` keys
- [ ] Filter/search works with new lifecycle status
- [ ] Sorting by status works correctly

### API Testing
- [ ] `listUnifiedKeys` returns `lifecycle_status` field
- [ ] `getVaultKeys` returns `lifecycle_status` field
- [ ] `attachKeyToVault` updates `lifecycle_status` correctly
- [ ] `importKeyFile` sets correct initial status

---

## State Transition Logic

### Valid Transitions (for UI logic)

```typescript
function canTransitionTo(
  from: KeyLifecycleStatus,
  to: KeyLifecycleStatus
): boolean {
  const validTransitions: Record<KeyLifecycleStatus, KeyLifecycleStatus[]> = {
    pre_activation: ['active', 'destroyed'],
    active: ['suspended', 'deactivated', 'compromised'],
    suspended: ['active', 'deactivated', 'compromised'],
    deactivated: ['destroyed'],
    destroyed: [],
    compromised: ['destroyed']
  };

  return validTransitions[from]?.includes(to) || false;
}
```

### User Actions per State

```typescript
function getAvailableActions(status: KeyLifecycleStatus): string[] {
  const actions: Record<KeyLifecycleStatus, string[]> = {
    pre_activation: ['attach_to_vault', 'delete'],
    active: ['use_for_encryption', 'detach_from_vault', 'suspend'],
    suspended: ['reactivate', 'deactivate'],
    deactivated: ['view_history', 'export'],
    destroyed: ['view_history'],
    compromised: ['view_incident_details']
  };

  return actions[status] || [];
}
```

---

## Common Patterns

### Status Badge Component

```tsx
interface StatusBadgeProps {
  status: KeyLifecycleStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const badge = getLifecycleStatusBadge(status);

  return (
    <Badge
      color={badge.color}
      size={size}
      title={badge.description}
    >
      <span className="mr-1">{badge.icon}</span>
      {badge.label}
    </Badge>
  );
}

// Usage:
<StatusBadge status={key.lifecycle_status} />
```

### Filter Keys by Status

```typescript
function filterKeysByStatus(
  keys: KeyReference[],
  ...statuses: KeyLifecycleStatus[]
): KeyReference[] {
  return keys.filter(k => statuses.includes(k.lifecycle_status));
}

// Usage:
const usableKeys = filterKeysByStatus(allKeys, 'active');
const attachableKeys = filterKeysByStatus(allKeys, 'pre_activation', 'suspended');
```

### Group Keys by Status

```typescript
function groupKeysByStatus(keys: KeyReference[]) {
  return keys.reduce((groups, key) => {
    const status = key.lifecycle_status;
    if (!groups[status]) groups[status] = [];
    groups[status].push(key);
    return groups;
  }, {} as Record<KeyLifecycleStatus, KeyReference[]>);
}

// Usage:
const grouped = groupKeysByStatus(allKeys);
// { active: [...], pre_activation: [...], suspended: [...] }
```

---

## Troubleshooting

### TypeScript Errors

**Error**: `Property 'state' does not exist on type 'KeyReference'`
**Fix**: Change `key.state` to `key.lifecycle_status`

**Error**: `Type 'KeyState' is not assignable to type 'KeyLifecycleStatus'`
**Fix**: Update the variable type annotation

**Error**: `Cannot find name 'KeyState'`
**Fix**: Remove import or reference to `KeyState`, use `KeyLifecycleStatus`

### Runtime Errors

**Error**: Status badge shows "Unknown"
**Fix**: Update badge mapping to handle all `KeyLifecycleStatus` values

**Error**: Filter returns no results
**Fix**: Update filter logic from old states to new states

---

## Migration Timeline

| Phase | Duration | Task |
|-------|----------|------|
| 1 | 5 min | Update imports |
| 2 | 15 min | Replace field access |
| 3 | 30 min | Update UI display logic |
| 4 | 45 min | Update components |
| 5 | 15 min | Update filters/conditionals |
| 6 | 10 min | Remove old code |
| **Total** | **~2 hours** | Complete migration |

---

## Summary

### What You Need to Do

1. **Replace** all `key.state` with `key.lifecycle_status`
2. **Update** badge/display functions to use new states
3. **Handle** additional states: `pre_activation`, `suspended`, `deactivated`, `destroyed`, `compromised`
4. **Test** that all key-related UI works correctly

### What's Already Done (Backend)

✅ Old `KeyState` enum completely removed
✅ All APIs updated to use `KeyLifecycleStatus`
✅ TypeScript bindings regenerated
✅ State conversion logic updated
✅ Tests passing

---

## Questions?

If you encounter any issues during migration:

1. Check the TypeScript bindings: `src-ui/src/bindings.ts` (lines 744-768)
2. Verify field name: `lifecycle_status` (not `state`)
3. Review NIST state values: `pre_activation`, `active`, `suspended`, `deactivated`, `destroyed`, `compromised`

---

*This is a clean break from old terminology. No backward compatibility code needed - we have no users yet!*