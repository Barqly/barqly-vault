# Backend API Requirements: Key Deactivation & Restore

**Date:** 2025-10-15
**Reporter:** Frontend Engineer
**Priority:** Medium
**Related Feature:** KeyCard Redesign - Manage Keys Page

---

## Problem Statement

The KeyCard component needs to support key deactivation and restoration workflows with a 30-day grace period before permanent deletion. Currently, there are no backend APIs to:

1. Deactivate a key (transition to `deactivated` lifecycle state)
2. Restore a deactivated key (revert to previous state)
3. Track deactivation timestamp for countdown UI

**User Story:**
- As a user, I want to deactivate keys I no longer use so they don't clutter my key list
- As a user, I want a 30-day grace period to restore accidentally deactivated keys
- As a user, I want to see how many days remain before permanent deletion

---

## Current State

### Existing Lifecycle States (from `bindings.ts`)

```typescript
export type KeyLifecycleStatus =
  | "pre_activation"  // Key generated but never used
  | "active"          // Currently attached to vault(s)
  | "suspended"       // Temporarily disabled (not attached to any vault)
  | "deactivated"     // Permanently disabled (30-day grace period)
  | "destroyed"       // Cryptographically destroyed
  | "compromised"     // Security breach detected
```

### Missing APIs

No commands exist for:
- Transitioning key to `deactivated` state
- Restoring key from `deactivated` state
- Retrieving deactivation timestamp for countdown

---

## Proposed Solution

### API 1: Deactivate Key

**Command:** `deactivate_key`

**Purpose:** Transition a key from `active` or `suspended` state to `deactivated` state, starting the 30-day countdown to permanent deletion.

**Request:**
```typescript
export type DeactivateKeyRequest = {
  /** The key ID to deactivate */
  key_id: string;

  /** Reason for deactivation (audit trail) */
  reason?: string;
};
```

**Response:**
```typescript
export type DeactivateKeyResponse = {
  success: boolean;
  key_id: string;
  new_status: KeyLifecycleStatus; // Should be "deactivated"
  deactivated_at: string; // ISO 8601 timestamp
  deletion_scheduled_at: string; // deactivated_at + 30 days
};
```

**Business Rules:**
1. Only keys in `active` or `suspended` state can be deactivated
2. If key is attached to vaults, show confirmation warning (UI handles this)
3. Record state transition in `status_history` with:
   - `status: "deactivated"`
   - `timestamp: <current_time>`
   - `reason: <user_provided_or_default>`
   - `changed_by: "user"`
4. Set `deactivated_at` timestamp in registry
5. Schedule automatic deletion after 30 days (system process)

**Error Cases:**
- Key not found → `KEY_NOT_FOUND`
- Key already deactivated → `INVALID_KEY_STATE`
- Key in `compromised` state → `INVALID_KEY_STATE` (cannot deactivate compromised keys)
- Key in `destroyed` state → `KEY_NOT_FOUND` (already gone)

**Example:**
```typescript
const result = await commands.deactivateKey({
  key_id: "testkey-2025",
  reason: "No longer needed"
});

// Result:
{
  success: true,
  key_id: "testkey-2025",
  new_status: "deactivated",
  deactivated_at: "2025-10-15T10:30:00Z",
  deletion_scheduled_at: "2025-11-14T10:30:00Z"
}
```

---

### API 2: Restore Key

**Command:** `restore_key`

**Purpose:** Restore a deactivated key back to its previous state before the 30-day window expires.

**Request:**
```typescript
export type RestoreKeyRequest = {
  /** The key ID to restore */
  key_id: string;
};
```

**Response:**
```typescript
export type RestoreKeyResponse = {
  success: boolean;
  key_id: string;
  new_status: KeyLifecycleStatus; // Previous state before deactivation
  restored_at: string; // ISO 8601 timestamp
};
```

**Business Rules:**
1. Only keys in `deactivated` state can be restored
2. Restore to previous state before deactivation:
   - If key has `vault_associations` → restore to `active`
   - If key has no `vault_associations` → restore to `suspended`
3. Clear `deactivated_at` timestamp
4. Cancel scheduled deletion
5. Record state transition in `status_history` with:
   - `status: <restored_state>`
   - `timestamp: <current_time>`
   - `reason: "User restored key"`
   - `changed_by: "user"`

**Error Cases:**
- Key not found → `KEY_NOT_FOUND`
- Key not in `deactivated` state → `INVALID_KEY_STATE`
- Key already destroyed → `KEY_NOT_FOUND`

**Example:**
```typescript
const result = await commands.restoreKey({
  key_id: "testkey-2025"
});

// Result:
{
  success: true,
  key_id: "testkey-2025",
  new_status: "suspended", // or "active" if has vault_associations
  restored_at: "2025-10-16T14:20:00Z"
}
```

---

### Data Model Updates

#### Add `deactivated_at` Field to `GlobalKey`

**Current `GlobalKey` Type (from `bindings.ts:717-758`):**
```typescript
export type GlobalKey = {
  id: string;
  label: string;
  key_type: KeyType;
  recipient: string;
  is_available: boolean;
  vault_associations: string[];
  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
  yubikey_info: YubiKeyInfo | null;
}
```

**Proposed Addition:**
```typescript
export type GlobalKey = {
  id: string;
  label: string;
  key_type: KeyType;
  recipient: string;
  is_available: boolean;
  vault_associations: string[];
  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
  yubikey_info: YubiKeyInfo | null;

  // NEW FIELD
  /**
   * Timestamp when key was deactivated (null if not deactivated)
   * Used to calculate days remaining before permanent deletion
   */
  deactivated_at: string | null;
}
```

**Registry JSON Structure:**
```json
{
  "schema": "barqly.vault.registry/2",
  "keys": {
    "testkey-2025": {
      "type": "passphrase",
      "label": "Test Key 2025",
      "lifecycle_status": "deactivated",
      "deactivated_at": "2025-10-15T10:30:00Z",
      "vault_associations": [],
      "status_history": [
        {
          "status": "active",
          "timestamp": "2025-10-01T12:00:00Z",
          "reason": "Attached to vault",
          "changed_by": "user"
        },
        {
          "status": "suspended",
          "timestamp": "2025-10-10T15:30:00Z",
          "reason": "Detached from all vaults",
          "changed_by": "system"
        },
        {
          "status": "deactivated",
          "timestamp": "2025-10-15T10:30:00Z",
          "reason": "No longer needed",
          "changed_by": "user"
        }
      ]
    }
  }
}
```

---

## Frontend Usage

### Status Badge with Countdown

```typescript
// KeyCard.tsx - Calculate days remaining
const getDaysRemaining = (deactivatedAt: string): number => {
  const now = new Date();
  const deactivated = new Date(deactivatedAt);
  const daysPassed = Math.floor((now.getTime() - deactivated.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysPassed);
};

// Status badge display
if (keyInfo.lifecycle_status === 'deactivated' && keyInfo.deactivated_at) {
  const daysLeft = getDaysRemaining(keyInfo.deactivated_at);
  return (
    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
      Deactivated {daysLeft}d
    </span>
  );
}
```

### Overflow Menu Actions

```typescript
// KeyCard.tsx - Overflow menu
const handleDeactivate = async () => {
  if (!confirm('Deactivate this key? You have 30 days to restore it.')) return;

  const result = await commands.deactivateKey({
    key_id: keyInfo.id,
    reason: 'User deactivation'
  });

  if (result.status === 'ok') {
    // Refresh keys to show updated status
    await refreshGlobalKeys();
  }
};

const handleRestore = async () => {
  const result = await commands.restoreKey({
    key_id: keyInfo.id
  });

  if (result.status === 'ok') {
    // Refresh keys to show updated status
    await refreshGlobalKeys();
  }
};

// In overflow menu
<DropdownMenuItem onClick={
  keyInfo.lifecycle_status === 'deactivated'
    ? handleRestore
    : handleDeactivate
}>
  {keyInfo.lifecycle_status === 'deactivated' ? 'Restore' : 'Deactivate'}
</DropdownMenuItem>
```

---

## State Transition Diagram

```
PreActivation
    ↓ (attach to vault)
Active ←→ Suspended (detach from all vaults)
    ↓ (deactivate)
Deactivated ←→ Active/Suspended (restore within 30 days)
    ↓ (30 days elapsed)
Destroyed (permanent deletion)

Compromised → Destroyed (immediate, cannot restore)
```

---

## Business Rules Summary

### Deactivation Rules
1. ✅ Can deactivate keys in `active` or `suspended` state
2. ❌ Cannot deactivate `pre_activation` keys (delete them instead)
3. ❌ Cannot deactivate `compromised` keys (automatic transition)
4. ⚠️ Warn if key is attached to vaults (UI confirmation)
5. 📝 Record reason in audit trail

### Restoration Rules
1. ✅ Can restore within 30 days
2. ✅ Restore to previous state (`active` if has vaults, `suspended` if not)
3. ❌ Cannot restore after 30 days (key destroyed)
4. ❌ Cannot restore `compromised` or `destroyed` keys

### Deletion Rules
1. Automatic deletion after 30 days from `deactivated_at`
2. System process runs daily to check for expired keys
3. Transition: `deactivated` → `destroyed`
4. Destroy action:
   - Delete encrypted key file (`.enc`)
   - Remove from registry OR mark as `destroyed` (keep metadata)
   - Cannot be restored after destruction

---

## Test Cases

### Deactivate Key

**Test 1: Deactivate Active Key**
```typescript
// Given: Key in "active" state with vault associations
const key = { id: "test-key", lifecycle_status: "active", vault_associations: ["vault-1"] };

// When: Deactivate
const result = await commands.deactivateKey({ key_id: "test-key" });

// Then: Status updated
expect(result.status).toBe("ok");
expect(result.data.new_status).toBe("deactivated");
expect(result.data.deactivated_at).toBeDefined();
```

**Test 2: Deactivate Suspended Key**
```typescript
// Given: Key in "suspended" state (no vaults)
const key = { id: "test-key", lifecycle_status: "suspended", vault_associations: [] };

// When: Deactivate
const result = await commands.deactivateKey({ key_id: "test-key" });

// Then: Status updated
expect(result.status).toBe("ok");
expect(result.data.new_status).toBe("deactivated");
```

**Test 3: Cannot Deactivate Pre-Activation Key**
```typescript
// Given: Key in "pre_activation" state
const key = { id: "test-key", lifecycle_status: "pre_activation" };

// When: Try to deactivate
const result = await commands.deactivateKey({ key_id: "test-key" });

// Then: Error
expect(result.status).toBe("error");
expect(result.error.code).toBe("INVALID_KEY_STATE");
```

**Test 4: Cannot Deactivate Already Deactivated Key**
```typescript
// Given: Key already deactivated
const key = { id: "test-key", lifecycle_status: "deactivated" };

// When: Try to deactivate again
const result = await commands.deactivateKey({ key_id: "test-key" });

// Then: Error
expect(result.status).toBe("error");
expect(result.error.code).toBe("INVALID_KEY_STATE");
```

---

### Restore Key

**Test 5: Restore to Active State**
```typescript
// Given: Deactivated key with vault associations
const key = {
  id: "test-key",
  lifecycle_status: "deactivated",
  vault_associations: ["vault-1"],
  deactivated_at: "2025-10-15T10:00:00Z"
};

// When: Restore
const result = await commands.restoreKey({ key_id: "test-key" });

// Then: Restored to active
expect(result.status).toBe("ok");
expect(result.data.new_status).toBe("active");
```

**Test 6: Restore to Suspended State**
```typescript
// Given: Deactivated key without vault associations
const key = {
  id: "test-key",
  lifecycle_status: "deactivated",
  vault_associations: [],
  deactivated_at: "2025-10-15T10:00:00Z"
};

// When: Restore
const result = await commands.restoreKey({ key_id: "test-key" });

// Then: Restored to suspended
expect(result.status).toBe("ok");
expect(result.data.new_status).toBe("suspended");
```

**Test 7: Cannot Restore Non-Deactivated Key**
```typescript
// Given: Key in "active" state
const key = { id: "test-key", lifecycle_status: "active" };

// When: Try to restore
const result = await commands.restoreKey({ key_id: "test-key" });

// Then: Error
expect(result.status).toBe("error");
expect(result.error.code).toBe("INVALID_KEY_STATE");
```

**Test 8: Cannot Restore Destroyed Key**
```typescript
// Given: Key was destroyed (30 days passed)
// Key no longer exists in registry

// When: Try to restore
const result = await commands.restoreKey({ key_id: "test-key" });

// Then: Error
expect(result.status).toBe("error");
expect(result.error.code).toBe("KEY_NOT_FOUND");
```

---

## Impact Analysis

### Affected Components

**Frontend:**
- `KeyCard.tsx` - Display status badge with countdown, show Deactivate/Restore in menu
- `ManageKeysPage.tsx` - Filter deactivated keys, refresh after operations
- `useManageKeysWorkflow.ts` - Add deactivate/restore handlers

**Backend:**
- New commands: `deactivate_key`, `restore_key`
- Registry schema: Add `deactivated_at` field
- State machine: Implement deactivation/restoration transitions
- Cleanup job: Daily process to destroy expired keys

### Migration Considerations

**No data migration needed:**
- New field `deactivated_at` defaults to `null` for existing keys
- Existing keys remain in current states
- Only affects new deactivation workflows

---

## UI Mockup Reference

### KeyCard with Deactivated Status

```
┌─────────────────────────────────────────────┐
│ [🔑] Test Key 2025            [⋮]           │
│                                             │
│ [Passphrase] [Deactivated 28d]             │
│                                             │
│ Not attached to any vault                   │
│                                             │
│ ┌───────┐  ┌────────┐                      │
│ │ Vault │  │ Export │                      │
│ └───────┘  └────────┘                      │
└─────────────────────────────────────────────┘

Overflow Menu (⋮):
  • Restore
```

### KeyCard with Active Status

```
┌─────────────────────────────────────────────┐
│ [🔑] Test Key 2025            [⋮]           │
│                                             │
│ [Passphrase] [Attached]                    │
│                                             │
│ Attached to: 2 vaults                      │
│                                             │
│ ┌───────┐  ┌────────┐                      │
│ │ Vault │  │ Export │                      │
│ └───────┘  └────────┘                      │
└─────────────────────────────────────────────┘

Overflow Menu (⋮):
  • Edit Label
  • Deactivate
```

---

## Additional Notes

### Automatic Cleanup Process

**Backend System Job:**
```rust
// Daily cleanup job (e.g., via cron or systemd timer)
async fn cleanup_expired_keys() {
    let registry = load_registry()?;
    let now = Utc::now();

    for (key_id, key_entry) in registry.keys.iter_mut() {
        if key_entry.lifecycle_status == KeyLifecycleStatus::Deactivated {
            if let Some(deactivated_at) = key_entry.deactivated_at {
                let elapsed_days = (now - deactivated_at).num_days();

                if elapsed_days >= 30 {
                    // Destroy key
                    destroy_key(key_id)?;
                    log_audit_event("key_destroyed", key_id, "30-day grace period expired");
                }
            }
        }
    }

    save_registry(registry)?;
}
```

### Audit Trail

All deactivation and restoration operations should be logged:

```rust
AuditEvent {
    event_type: "key_deactivated",
    key_id: "testkey-2025",
    timestamp: "2025-10-15T10:30:00Z",
    actor: "user",
    details: {
        previous_status: "suspended",
        new_status: "deactivated",
        reason: "No longer needed",
        deletion_scheduled_at: "2025-11-14T10:30:00Z"
    }
}
```

---

## Priority & Timeline

**Priority:** Medium

**Why Medium?**
- Not blocking current functionality
- Enhances UX for key management
- Provides safety net for accidental deletions
- Aligns with NIST lifecycle management

**Estimated Backend Work:**
- Add `deactivated_at` field to registry schema: ~30 minutes
- Implement `deactivate_key` command: ~2 hours
- Implement `restore_key` command: ~1 hour
- Add cleanup job: ~1 hour
- Testing: ~2 hours
- **Total:** ~6-7 hours

**Frontend Work (after backend ready):**
- Update KeyCard component: ~2 hours
- Add overflow menu with actions: ~1 hour
- Testing: ~1 hour
- **Total:** ~4 hours

---

## Request Summary

**What Frontend Needs:**

1. ✅ `deactivate_key` command
   - Transition key to `deactivated` state
   - Record `deactivated_at` timestamp
   - Add status history entry

2. ✅ `restore_key` command
   - Restore key to previous state
   - Clear `deactivated_at` timestamp
   - Add status history entry

3. ✅ Add `deactivated_at: string | null` field to `GlobalKey` type

4. ✅ Auto-generate TypeScript bindings via `tauri-specta`

5. ✅ Implement 30-day cleanup job (backend system process)

**Priority:** Please implement before final R2 release if possible, otherwise can be R2.1

---

_Document created by: Frontend Engineer_
_Date: 2025-10-15_
_Related: KeyCard Redesign, Manage Keys Page_
