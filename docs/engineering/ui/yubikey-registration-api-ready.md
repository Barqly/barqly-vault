# YubiKey Registration API - Implementation Complete

**For:** Frontend Engineer
**Date:** 2025-10-14
**Status:** ✅ Backend Implementation Complete - Ready for Integration

---

## Overview

The backend has implemented the vault-agnostic `registerYubikey()` API as requested. Additionally, we've cleaned up terminology to use NIST-standard lifecycle states throughout the backend.

---

## New API: `registerYubikey()`

### Purpose
Register an already-initialized YubiKey (orphaned/suspended state) to the global key registry WITHOUT attaching it to any vault.

### Request
```typescript
import { commands } from '../bindings';

const result = await commands.registerYubikey(
  serial,    // e.g., "15903715"
  label,     // e.g., "YubiKey-15903715"
  pin        // e.g., "654321"
);
```

### Response
```typescript
{
  serial: "15903715",
  slot: 1,
  recipient: "age1yubikey1q...",
  identity_tag: "AGE-PLUGIN-YUBIKEY-...",
  label: "YubiKey-15903715",
  recovery_code: ""  // Empty for orphaned keys (already initialized)
}
```

---

## When to Use Which API

### Three YubiKey Commands Available:

1. **`listYubikeys()`** - List ALL YubiKeys with state detection
   ```typescript
   const result = await commands.listYubikeys();
   // Returns: Array of YubiKeyStateInfo with device state + lifecycle_status
   ```

2. **`initYubikey(serial, pin, label)`** - Initialize NEW YubiKey
   ```typescript
   // For YubiKeys in state: "new" or "reused"
   // Generates NEW age identity + recovery code
   const result = await commands.initYubikey(serial, newPin, label);
   ```

3. **`registerYubikey(serial, label, pin)`** - Register ORPHANED YubiKey ✨ NEW
   ```typescript
   // For YubiKeys in state: "orphaned" (lifecycle_status: "suspended")
   // Reads EXISTING age identity, NO recovery code
   const result = await commands.registerYubikey(serial, label, pin);
   ```

---

## Terminology Update: NIST-Aligned Lifecycle States

### Backend Now Uses Standard NIST Terms

All backend APIs now include `lifecycle_status` field with these values:

| lifecycle_status | UI Display | Old Term (Deprecated) | Meaning |
|-----------------|------------|----------------------|---------|
| `pre_activation` | "New" | "new" / "reused" | Key generated but never used |
| `active` | "Active" | "registered" | Currently available for operations |
| `suspended` | "Suspended" | **"orphaned"** | Was active, now detached from vault |
| `deactivated` | "Deactivated" | N/A | Permanently disabled |
| `destroyed` | (Hidden) | N/A | Cryptographically destroyed |
| `compromised` | "Compromised" | N/A | Security breach |

### Dual State System

Backend responses now include BOTH states for YubiKeys:

```typescript
{
  state: "orphaned",  // Device-level: hardware initialization status
  lifecycle_status: "suspended",  // Registry-level: NIST standard
  // ... other fields
}
```

**Recommendation:** Frontend should migrate to use `lifecycle_status` for all UI logic. The `state` field is kept for backward compatibility.

---

## Implementation Example

### ManageKeys - YubiKeyRegistryDialog

```typescript
import { useState } from 'react';
import { commands } from '../bindings';

function YubiKeyRegistryDialog({ yubikey, onSuccess }) {
  const [pin, setPin] = useState('');
  const [label, setLabel] = useState(yubikey.label || '');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);

    try {
      // Determine which API to call based on lifecycle_status
      const result = yubikey.lifecycle_status === 'pre_activation'
        ? await commands.initYubikey(yubikey.serial, pin, label)
        : await commands.registerYubikey(yubikey.serial, label, pin);

      if (result.status === 'ok') {
        toast.success('YubiKey added to registry successfully!');
        onSuccess(result.data);
      } else {
        toast.error(result.error.message);
      }
    } catch (error) {
      toast.error('Failed to register YubiKey');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTitle>
        {yubikey.lifecycle_status === 'pre_activation'
          ? 'Initialize New YubiKey'
          : 'Register YubiKey'}
      </DialogTitle>

      <DialogContent>
        {yubikey.lifecycle_status === 'suspended' && (
          <Alert>
            This YubiKey was previously used. Registering will add it back to the registry.
          </Alert>
        )}

        <TextField
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />

        <TextField
          type="password"
          label="YubiKey PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleRegister} disabled={loading}>
          {yubikey.lifecycle_status === 'pre_activation'
            ? 'Initialize'
            : 'Add to Registry'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## Error Handling

```typescript
const result = await commands.registerYubikey(serial, label, pin);

if (result.status === 'error') {
  const error = result.error;

  switch (error.code) {
    case 'YUBIKEY_NOT_FOUND':
      showError('YubiKey not found. Please ensure it is connected.');
      break;

    case 'INVALID_INPUT':
      showError('This YubiKey needs initialization. Use "Initialize" instead.');
      break;

    case 'YUBIKEY_PIN_REQUIRED':
      showError('Invalid PIN. Please check and try again.');
      break;

    case 'KEY_ALREADY_EXISTS':
      showError('This YubiKey is already in the registry.');
      break;

    default:
      showError(error.message);
  }
}
```

---

## State-Based UI Logic

### Display Badge Based on Lifecycle Status

```typescript
function getKeyStatusBadge(lifecycleStatus: KeyLifecycleStatus) {
  switch(lifecycleStatus) {
    case 'pre_activation':
      return { label: 'New', color: 'gray', icon: 'circle-outline' };
    case 'active':
      return { label: 'Active', color: 'green', icon: 'check-circle' };
    case 'suspended':
      return { label: 'Suspended', color: 'yellow', icon: 'pause-circle' };
    case 'deactivated':
      return { label: 'Deactivated', color: 'red', icon: 'x-circle' };
    case 'compromised':
      return { label: 'Compromised', color: 'red', icon: 'alert-triangle' };
    default:
      return { label: 'Unknown', color: 'gray', icon: 'question' };
  }
}
```

### Enable Actions Based on Lifecycle Status

```typescript
function getAvailableActions(lifecycleStatus: KeyLifecycleStatus) {
  return {
    canEncrypt: lifecycleStatus === 'active',
    canDecrypt: lifecycleStatus === 'active',
    canAttachToVault: ['pre_activation', 'active'].includes(lifecycleStatus),
    canSuspend: lifecycleStatus === 'active',
    canReactivate: lifecycleStatus === 'suspended',
    canDelete: ['pre_activation', 'suspended', 'deactivated'].includes(lifecycleStatus),
  };
}
```

---

## Migration Guide: Deprecated "state" → "lifecycle_status"

### Current Code (Using deprecated "state")
```typescript
// ❌ OLD - Will be deprecated
if (yubikey.state === 'orphaned') {
  // Register orphaned key
}
```

### New Code (Using NIST "lifecycle_status")
```typescript
// ✅ NEW - Use lifecycle_status
if (yubikey.lifecycle_status === 'suspended') {
  // Register suspended key
}
```

### Mapping Table for Frontend Migration

| Old state | New lifecycle_status | Action |
|-----------|---------------------|--------|
| "new" | "pre_activation" | Initialize |
| "reused" | "pre_activation" | Initialize |
| "registered" | "active" | Use normally |
| **"orphaned"** | **"suspended"** | Register (add to registry) |

---

## Backend State Transitions

When `registerYubikey()` is called:

**Device Level:**
```
YubiKeyState: Orphaned → Registered
```

**Registry Level (NIST):**
```
KeyLifecycleStatus: PreActivation → Active
```

**Status History:**
```json
{
  "status_history": [
    {
      "status": "pre_activation",
      "timestamp": "2025-10-14T10:00:00Z",
      "reason": "YubiKey registered",
      "changed_by": "system"
    },
    {
      "status": "active",
      "timestamp": "2025-10-14T10:05:00Z",
      "reason": "Registered orphaned YubiKey from Manage Keys",
      "changed_by": "user"
    }
  ]
}
```

---

## Testing Checklist

### Manual Testing Required

- [ ] Insert YubiKey that was previously used (has age identity)
- [ ] Open Manage Keys screen
- [ ] Verify YubiKey shows `lifecycle_status: "suspended"` (not "orphaned")
- [ ] Click "Add to Registry"
- [ ] Enter label and PIN
- [ ] Submit
- [ ] Verify success message
- [ ] Verify YubiKey appears in key list with `lifecycle_status: "active"`
- [ ] Verify NO vault attachment (vault_associations should be empty)
- [ ] Verify can now attach to vaults using "Attach to Vault" button

### Error Case Testing

- [ ] Test with wrong PIN → Should show appropriate error
- [ ] Test with YubiKey already in registry → Should show "already registered" error
- [ ] Test with new YubiKey (no identity) → Should show "needs initialization" error

---

## Breaking Changes

### None! All Changes Are Additive

- ✅ Old `state` field still present (deprecated but functional)
- ✅ New `lifecycle_status` field added
- ✅ Frontend can migrate gradually
- ✅ No existing functionality broken

---

## Summary

### What Changed
- ✅ Implemented `registerYubikey()` API for orphaned YubiKeys
- ✅ Added `lifecycle_status` field to all key responses
- ✅ Updated backend to use NIST-aligned terminology
- ✅ Proper state transitions with status history tracking
- ✅ PIN verification for ownership proof
- ✅ NO vault attachment (global registry only)

### What Frontend Should Do
1. ✅ Use `registerYubikey()` for YubiKeys with `lifecycle_status: "suspended"`
2. ✅ Migrate UI logic from `state` → `lifecycle_status`
3. ✅ Update status badges to show NIST terms ("Suspended" not "Orphaned")
4. ✅ Test orphaned YubiKey workflow end-to-end

### Timeline
- ✅ Backend complete and tested (297 tests passing)
- ⏳ Frontend integration (can start immediately)
- 🎯 R2 deadline: Oct 15, 2025

---

**Questions?** Check `/docs/analysis/yubikey-registration-api-analysis.md` for detailed analysis or reach out to backend engineer.
