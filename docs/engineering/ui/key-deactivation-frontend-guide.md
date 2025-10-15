# Key Deactivation/Restore - Frontend Integration Guide

**Date:** 2025-10-15
**Status:** ✅ Backend Complete - Ready to Use

---

## Quick Start

### Import Commands
```typescript
import { commands } from '../bindings';
import type { GlobalKey, KeyLifecycleStatus } from '../bindings';
```

---

## API Usage

### 1. Deactivate a Key

```typescript
const handleDeactivate = async (keyId: string) => {
  const result = await commands.deactivateKey({
    key_id: keyId,
    reason: "User deactivation" // Optional
  });

  if (result.status === 'ok') {
    console.log('Deactivated at:', result.data.deactivated_at);
    console.log('Will delete on:', result.data.deletion_scheduled_at);
    // Refresh key list to show updated status
    await refreshKeys();
  }
};
```

### 2. Restore a Key

```typescript
const handleRestore = async (keyId: string) => {
  const result = await commands.restoreKey({
    key_id: keyId
  });

  if (result.status === 'ok') {
    console.log('Restored to:', result.data.new_status); // "active" or "suspended"
    // Refresh key list
    await refreshKeys();
  }
};
```

---

## Calculate Days Remaining

```typescript
// In KeyCard.tsx or ManageKeysPage.tsx

const getDaysRemaining = (deactivatedAt: string): number => {
  const now = new Date();
  const deactivated = new Date(deactivatedAt);
  const daysPassed = Math.floor(
    (now.getTime() - deactivated.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, 30 - daysPassed);
};

// Usage:
if (key.lifecycle_status === 'deactivated' && key.deactivated_at) {
  const daysLeft = getDaysRemaining(key.deactivated_at);
  console.log(`${daysLeft} days until permanent deletion`);
}
```

---

## UI Display Examples

### Status Badge
```typescript
const getStatusBadge = (key: GlobalKey) => {
  if (key.lifecycle_status === 'deactivated' && key.deactivated_at) {
    const daysLeft = getDaysRemaining(key.deactivated_at);
    return `Deactivated ${daysLeft}d`;
  }

  if (key.lifecycle_status === 'active') {
    return 'Attached';
  }

  if (key.lifecycle_status === 'suspended') {
    return 'Not attached';
  }

  return 'New';
};
```

### Overflow Menu
```typescript
<DropdownMenu>
  {key.lifecycle_status === 'deactivated' ? (
    <DropdownMenuItem onClick={() => handleRestore(key.id)}>
      Restore
    </DropdownMenuItem>
  ) : (
    <DropdownMenuItem onClick={() => handleDeactivate(key.id)}>
      Deactivate
    </DropdownMenuItem>
  )}
</DropdownMenu>
```

---

## Complete Example

```typescript
// KeyCard.tsx

interface KeyCardProps {
  keyInfo: GlobalKey;
  onRefresh: () => Promise<void>;
}

export function KeyCard({ keyInfo, onRefresh }: KeyCardProps) {
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm('Deactivate this key? You have 30 days to restore it.')) {
      return;
    }

    setLoading(true);
    try {
      const result = await commands.deactivateKey({
        key_id: keyInfo.id,
        reason: null // Optional
      });

      if (result.status === 'ok') {
        toast.success('Key deactivated. 30 days to restore.');
        await onRefresh();
      } else {
        toast.error(result.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await commands.restoreKey({
        key_id: keyInfo.id
      });

      if (result.status === 'ok') {
        toast.success(`Key restored to ${result.data.new_status} state`);
        await onRefresh();
      } else {
        toast.error(result.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate countdown
  const daysRemaining = keyInfo.lifecycle_status === 'deactivated' && keyInfo.deactivated_at
    ? getDaysRemaining(keyInfo.deactivated_at)
    : null;

  return (
    <div className="key-card">
      {/* Status badge */}
      <span className={
        keyInfo.lifecycle_status === 'deactivated'
          ? 'badge-red'
          : 'badge-green'
      }>
        {keyInfo.lifecycle_status === 'deactivated' && daysRemaining !== null
          ? `Deactivated ${daysRemaining}d`
          : keyInfo.lifecycle_status
        }
      </span>

      {/* Overflow menu */}
      <DropdownMenu>
        {keyInfo.lifecycle_status === 'deactivated' ? (
          <DropdownMenuItem onClick={handleRestore} disabled={loading}>
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleDeactivate} disabled={loading}>
            Deactivate
          </DropdownMenuItem>
        )}
      </DropdownMenu>
    </div>
  );
}
```

---

## Key States & Actions

| Current State | Available Action | Result |
|--------------|------------------|--------|
| `pre_activation` | (none - just delete) | N/A |
| `active` | Deactivate | → deactivated (30-day countdown starts) |
| `suspended` | Deactivate | → deactivated (30-day countdown starts) |
| `deactivated` | Restore | → active or suspended (previous state) |

---

## Error Handling

```typescript
const result = await commands.deactivateKey({ key_id, reason: null });

if (result.status === 'error') {
  switch (result.error.code) {
    case 'KEY_NOT_FOUND':
      toast.error('Key not found');
      break;
    case 'INVALID_KEY_STATE':
      toast.error('Key cannot be deactivated in its current state');
      break;
    default:
      toast.error(result.error.message);
  }
}
```

---

## TypeScript Types Available

```typescript
// Request/Response types auto-generated in bindings.ts

type DeactivateKeyRequest = {
  key_id: string;
  reason: string | null;
}

type DeactivateKeyResponse = {
  success: boolean;
  key_id: string;
  new_status: KeyLifecycleStatus; // Always "deactivated"
  deactivated_at: string; // ISO 8601
  deletion_scheduled_at: string; // deactivated_at + 30 days
}

type RestoreKeyRequest = {
  key_id: string;
}

type RestoreKeyResponse = {
  success: boolean;
  key_id: string;
  new_status: KeyLifecycleStatus; // "active" or "suspended"
  restored_at: string; // ISO 8601
}

// GlobalKey now has:
type GlobalKey = {
  // ... existing fields
  deactivated_at?: string | null; // NEW FIELD
}
```

---

## Summary

**Backend provides:**
- ✅ `deactivateKey()` - Idempotent, starts 30-day countdown
- ✅ `restoreKey()` - Restores to previous state
- ✅ `deactivated_at` field in GlobalKey for countdown calculation

**Frontend implements:**
- UI countdown display
- Deactivate/Restore in overflow menu
- Confirmation dialogs

**All ready to use!**
