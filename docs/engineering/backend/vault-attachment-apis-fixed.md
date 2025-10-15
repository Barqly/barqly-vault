# Vault Attachment APIs - All Issues Fixed

**Date:** 2025-10-14
**Status:** ✅ Complete - Ready for Frontend Integration
**For:** Frontend Engineer

---

## All Three Issues Resolved ✅

### Issue 1: getVaultStatistics Now Uses vault_id ✅
### Issue 2: attach_key_to_vault is Idempotent ✅
### Issue 3: Types Renamed for Clarity ✅

---

## Issue 1 Fixed: getVaultStatistics API

### Before (BROKEN):
```typescript
// Required sanitized vault name - confusing and error-prone
const stats = await commands.getVaultStatistics({
  vault_name: "Sam-Family-Vault"  // ❌ How do we get sanitized name?
});
// Error: "Vault 'Sam Family Vault' not found"
```

### After (FIXED):
```typescript
// Use deterministic vault ID
const vaults = await commands.listVaults();
const vault = vaults.data.vaults[0];

const stats = await commands.getVaultStatistics({
  vault_id: vault.id  // ✅ Clean, deterministic!
});
```

**TypeScript Type Updated:**
```typescript
export type GetVaultStatisticsRequest = {
  vault_id: string  // Changed from vault_name
}
```

---

## Issue 2 Fixed: Idempotent Attach/Detach

### Before (BROKEN):
```typescript
// Attaching already-attached key caused error
await commands.attachKeyToVault({ key_id, vault_id });
// Error: "Invalid transition from Active to Active"
```

### After (FIXED):
```typescript
// First attach
await commands.attachKeyToVault({ key_id, vault_id });
// Result: success = true ✅

// Second attach (idempotent - no error!)
await commands.attachKeyToVault({ key_id, vault_id });
// Result: success = true, message = "Key already attached" ✅

// Detach
await commands.removeKeyFromVault({ key_id, vault_id });
// Result: success = true ✅

// Second detach (idempotent - no error!)
await commands.removeKeyFromVault({ key_id, vault_id });
// Result: success = true, message = "Key already not attached" ✅
```

**Frontend Benefits:**
- No need to track "what changed" in checkbox UI
- Can call attach/detach freely without checking current state first
- Simplifies VaultAttachmentDialog logic

---

## Issue 3 Fixed: Type Naming Clarity

### The Problem (CONFUSING):
- `KeyInfo` - Complete key info for global contexts
- `KeyReference` - Minimal key info for vault contexts
- **Same naming pattern, different purposes!**

### The Solution (CLEAR):
- `GlobalKey` - Complete key info for ManageKeys (all vaults)
- `VaultKey` - Minimal key info for Encrypt/Decrypt (single vault)

### TypeScript Bindings Updated:

```typescript
/**
 * Complete key information for global contexts
 *
 * Used when managing keys across all vaults (ManageKeys page, global key registry).
 * Contains ALL fields including vault_associations, recipient, availability, and metadata.
 */
export type GlobalKey = {
  id: string;
  label: string;
  key_type: KeyType;
  recipient: string;
  is_available: boolean;
  vault_associations: string[];  // Multi-vault support!
  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
  yubikey_info: YubiKeyInfo | null;
}

/**
 * Minimal key information for vault-specific contexts
 *
 * Used when displaying keys within a single vault context (Encrypt/Decrypt pages).
 * Contains only the essential fields needed for vault operations.
 */
export type VaultKey = {
  id: string;
  label: string;
  key_type: KeyType;
  lifecycle_status: KeyLifecycleStatus;
  created_at: string;
  last_used: string | null;
}
```

---

## Frontend Action Items

### ✅ DO: Remove Conversion Code (Tech Debt)

**File:** `src-ui/src/hooks/useManageKeysWorkflow.ts:24-50`

```typescript
// ❌ DELETE THIS ENTIRE BLOCK (lines 24-50):
const allKeys = useMemo(() => {
  return globalKeys.map((keyInfo) => {
    const keyRef: any = {
      id: keyInfo.id,
      label: keyInfo.label,
      type: keyInfo.key_type.type,
      // ... STRIPS vault_associations, recipient, etc!
    };
    return keyRef;
  });
}, [globalKeys]);

// ✅ REPLACE WITH:
const allKeys = globalKeys;  // Use GlobalKey directly!
```

**File:** `src-ui/src/pages/ManageKeysPage.tsx:82-92`

```typescript
// ❌ DELETE reconstruction workaround:
const fullKeyInfo: GlobalKey = {
  ...keyInfo as any,
  vault_associations,
  // ... reconstructing stripped data
};

// ✅ REPLACE WITH:
const keyInfo = allKeys.find(k => k.id === keyId);  // Already has all fields!
```

### ✅ DO: Use GlobalKey in ManageKeys

```typescript
// ManageKeys context - use GlobalKey directly
import { GlobalKey } from '../bindings';

const allKeys: GlobalKey[] = globalKeys;  // No conversion!

// Access fields directly:
key.vault_associations  // ✅ Available!
key.recipient           // ✅ Available!
key.is_available        // ✅ Available!
key.yubikey_info        // ✅ Available!
```

### ✅ DO: Use VaultKey in Vault Contexts

```typescript
// Encrypt/Decrypt pages - use VaultKey from getKeyMenuData
const menuResult = await commands.getKeyMenuData({ vault_id });
const vaultKeys: VaultKey[] = menuResult.data.keys;

// These have minimal fields (enough for vault operations)
vaultKey.id
vaultKey.label
vaultKey.key_type
vaultKey.lifecycle_status
```

---

## VaultAttachmentDialog Implementation

### Complete Example:

```typescript
async function VaultAttachmentDialog({ keyInfo }: { keyInfo: GlobalKey }) {
  const [vaults, setVaults] = useState<VaultSummary[]>([]);
  const [vaultStats, setVaultStats] = useState<Map<string, VaultStatistics>>(new Map());

  useEffect(() => {
    // Load all vaults
    commands.listVaults().then(result => {
      if (result.status === 'ok') {
        setVaults(result.data.vaults);

        // Load statistics for each vault
        result.data.vaults.forEach(async (vault) => {
          const stats = await commands.getVaultStatistics({
            vault_id: vault.id  // ✅ Use vault_id now!
          });
          if (stats.status === 'ok' && stats.data.statistics) {
            setVaultStats(prev => new Map(prev).set(vault.id, stats.data.statistics!));
          }
        });
      }
    });
  }, []);

  async function handleToggle(vaultId: string, currentlyAttached: boolean) {
    if (currentlyAttached) {
      // Detach (idempotent!)
      await commands.removeKeyFromVault({ vault_id: vaultId, key_id: keyInfo.id });
    } else {
      // Attach (idempotent!)
      await commands.attachKeyToVault({ key_id: keyInfo.id, vault_id: vaultId });
    }
    // Refresh keys
    await refreshKeys();
  }

  return (
    <Dialog>
      {vaults.map(vault => {
        const isAttached = keyInfo.vault_associations.includes(vault.id);
        const stats = vaultStats.get(vault.id);
        const isEncrypted = (stats?.encryption_count || 0) > 0;
        const canDetach = !isEncrypted;

        return (
          <Checkbox
            key={vault.id}
            checked={isAttached}
            disabled={isAttached && !canDetach}
            onChange={() => handleToggle(vault.id, isAttached)}
            label={vault.name}
            tooltip={
              isAttached && !canDetach
                ? "This key was used to encrypt this vault. It cannot be removed."
                : isAttached
                ? "Unlink key from vault (metadata only)"
                : "Attach this key to use it for encrypting this vault."
            }
          />
        );
      })}
    </Dialog>
  );
}
```

---

## Type Usage Guide

### When to Use Which Type:

| Context | Type to Use | API | Fields Available |
|---------|-------------|-----|------------------|
| **ManageKeys** (Global) | `GlobalKey` | `listUnifiedKeys({ type: 'All' })` | ALL fields including vault_associations |
| **Encrypt Page** (Vault) | `VaultKey` | `getKeyMenuData({ vault_id })` | Minimal fields for vault ops |
| **Decrypt Page** (Vault) | `VaultKey` | `getKeyMenuData({ vault_id })` | Minimal fields for vault ops |
| **Key Import** | `VaultKey` | `importKeyFile(...)` | Returns minimal after import |
| **YubiKey Setup** | `VaultKey` | `initYubikeyForVault(...)` | Returns minimal after setup |

---

## Breaking Changes

### Type Renames (Will Cause TypeScript Errors - Easy to Fix):
- `KeyInfo` → `GlobalKey`
- `KeyReference` → `VaultKey`

**Migration:**
```typescript
// OLD:
import { KeyInfo, KeyReference } from '../bindings';
const keys: KeyInfo[] = ...;

// NEW:
import { GlobalKey, VaultKey } from '../bindings';
const keys: GlobalKey[] = ...;
```

### GetVaultStatisticsRequest (Breaking):
```typescript
// OLD:
{ vault_name: "Sam-Family-Vault" }

// NEW:
{ vault_id: "7Bw3eqLGahnF5DXZyMa8Jz" }
```

---

## Testing Checklist

After frontend updates:

- [ ] ManageKeys displays all keys with correct vault_associations
- [ ] VaultAttachmentDialog shows all vaults with checkboxes
- [ ] Attach key to vault works (first time)
- [ ] Attach key to vault works (idempotent - second time)
- [ ] Detach key from vault works (first time)
- [ ] Detach key from vault works (idempotent - second time)
- [ ] Encrypted vaults show disabled checkboxes
- [ ] Tooltips explain why detach is disabled
- [ ] getVaultStatistics works with vault.id
- [ ] No KeyInfo→VaultKey conversion in useManageKeysWorkflow

---

## Summary of Changes

### ✅ Fixed:
1. **getVaultStatistics** - Now accepts `vault_id` (deterministic)
2. **attachKeyToVault** - Now idempotent (no error if already attached)
3. **removeKeyFromVault** - Now idempotent (no error if not attached)
4. **Type names** - Clear distinction: GlobalKey (all fields) vs VaultKey (minimal)

### ✅ Backend Ready For:
- VaultAttachmentDialog checkbox popup
- Multi-vault key management
- Clean attach/detach workflows
- No workarounds needed

### ⚠️ Frontend Must:
1. Remove KeyInfo→VaultKey conversion in useManageKeysWorkflow
2. Use GlobalKey directly in ManageKeys
3. Update vault_name → vault_id in getVaultStatistics calls
4. Update type imports (KeyInfo → GlobalKey, KeyReference → VaultKey)

---

**All backend work complete! Frontend can proceed with VaultAttachmentDialog implementation.**
