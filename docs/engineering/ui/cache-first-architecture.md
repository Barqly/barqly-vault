# Cache-First Architecture

**Author:** AI Assistant
**Date:** 2025-10-03
**Status:** ✅ Implemented in VaultHub & KeyMenuBar
**Next:** Migrate Decrypt and Manage Keys screens

---

## Overview

Cache-first architecture for vault key management across the entire Barqly Vault application. Eliminates async lag, race conditions, and flickering by maintaining a global key cache in VaultContext.

**Core Principle:** For desktop apps with local data, **cache-first reads** + **explicit backend writes** provide instant performance.

---

## What We Built (Global Architecture)

### VaultContext: App-Wide State Provider

VaultContext wraps the entire React app, providing shared state to all screens:

```typescript
// App structure:
<VaultProvider>  // ← Wraps entire app, provides global cache
  <VaultHub />
  <ManageKeys />
  <Encrypt />
  <Decrypt />
</VaultProvider>
```

Any component can access the cache:

```typescript
const { getCurrentVaultKeys, keyCache, currentVault } = useVault();
const keys = getCurrentVaultKeys(); // ✅ Instant cache read, no async
```

---

## Architecture Pattern

### The Cache-First Flow

```
1. App Mount
   ↓
2. Load ALL vault keys in parallel
   ↓
3. Populate global cache: Map<vaultId, KeyReference[]>
   ↓
4. User clicks vault → setCurrentVault() [SYNC]
   ↓
5. UI reads from cache → getCurrentVaultKeys() [INSTANT]
   ↓
6. No backend calls, no lag, no flickering
```

### When Backend Calls Happen

**Initial Load (app mount):**
```typescript
// VaultContext automatically loads all vault keys
vaults.forEach(vault => refreshKeysForVault(vault.id)); // Parallel
```

**Explicit Mutations (Manage Keys screen only):**
```typescript
// When user adds/removes keys:
await addKeyToVault(...);
await refreshKeysForVault(currentVault.id); // Update cache
```

**Never:**
- ❌ On vault switching (now synchronous, reads cache)
- ❌ On screen navigation (read-only screens use cache)
- ❌ During user interactions (instant cache reads)

---

## Current Implementation Status

| Screen | Status | Cache Usage | Backend Calls |
|--------|--------|-------------|---------------|
| **VaultHub** | ✅ Complete | `getCurrentVaultKeys()` for badges | None (display only) |
| **KeyMenuBar** | ✅ Complete | `getCurrentVaultKeys()` for display | None (display only) |
| **Encrypt** | ✅ Correct | KeyMenuBar only (visual display) | `vault_id` only (backend retrieves keys) |
| **Decrypt** | 🔄 Migration needed | Currently uses deprecated `vaultKeys` | Should use cache for key selection UI |
| **Manage Keys** | 🔄 Migration needed | Local state (out of sync) | Should call `refreshKeysForVault()` |

---

## VaultContext API Reference

### State (Read)

```typescript
// Current vault selection
currentVault: VaultSummary | null;

// All vaults
vaults: VaultSummary[];

// DEPRECATED: Direct key access (use getCurrentVaultKeys instead)
vaultKeys: KeyReference[];

// NEW: Global key cache
keyCache: Map<string, KeyReference[]>;

// Loading states
isLoading: boolean;        // Vaults loading
isLoadingKeys: boolean;    // Keys loading

// Error state
error: string | null;
```

### Actions (Write)

```typescript
// Vault management
createVault(name: string, description?: string) => Promise<void>
refreshVaults() => Promise<void>

// NEW: Synchronous vault switching (instant, no backend call for keys)
setCurrentVault(vaultId: string) => void

// NEW: Cache-first key access (instant)
getCurrentVaultKeys() => KeyReference[]

// NEW: Explicit key refresh (only when needed)
refreshKeysForVault(vaultId: string) => Promise<void>

// DEPRECATED: Use refreshKeysForVault instead
refreshKeys() => Promise<void>

// Key mutations
removeKeyFromVault(keyId: string) => Promise<void>
```

---

## Component Migration Guide

### Display Components (Read-Only)

**Before (old pattern):**
```typescript
const { vaultKeys } = useVault(); // ❌ Async, may be stale

// Use keys for display
{vaultKeys.map(key => ...)}
```

**After (cache-first):**
```typescript
const { getCurrentVaultKeys } = useVault(); // ✅ Instant cache read

// Use keys for display
const keys = getCurrentVaultKeys();
{keys.map(key => ...)}
```

**Migration steps:**
1. Replace `vaultKeys` with `getCurrentVaultKeys()`
2. Remove any local caching logic
3. Test - should be instant, no flickering

---

### Mutation Components (Manage Keys)

**Pattern:**
```typescript
const { getCurrentVaultKeys, refreshKeysForVault, currentVault } = useVault();

// 1. Display from cache immediately (instant)
const keys = getCurrentVaultKeys();

// 2. Refresh when screen opens (ensure fresh data)
useEffect(() => {
  if (currentVault) {
    refreshKeysForVault(currentVault.id);
  }
}, [currentVault?.id]);

// 3. After mutations, update cache
const handleAddKey = async () => {
  await addKeyToVault(...);
  await refreshKeysForVault(currentVault.id); // ✅ Cache updated
};
```

---

## Screen-Specific Guidance

### VaultHub Screen ✅

**Status:** Fully migrated

**What it does:**
- Displays vault cards with key counts and type badges
- Inline vault creation form

**Cache usage:**
```typescript
const { keyCache } = useVault();
const cachedKeys = keyCache.get(vault.id) || [];
const hasPassphrase = cachedKeys.some(isPassphraseKey);
const hasYubikey = cachedKeys.some(isYubiKey);
```

**Backend calls:** None (display only)

---

### Encrypt Screen ✅

**Status:** Already correct (no migration needed)

**What it does:**
- User selects files to encrypt
- Encrypts to ALL keys in the vault

**Cache usage:**
- KeyMenuBar displays keys (visual confirmation only)
- **Encryption logic does NOT use keys from UI**

**Backend API:**
```typescript
// UI sends ONLY vault_id
const input: EncryptFilesMultiInput = {
  vault_id: currentVault.id,  // ✅ Backend retrieves keys from vault
  in_file_paths: selectedFiles.paths,
  out_encrypted_file_name: archiveName,
  out_encrypted_file_path: outputPath,
};

await commands.encryptFilesMulti(input);
```

**Key insight:** UI never sends keys to backend for encryption. Backend retrieves keys from vault manifest/registry using `vault_id`. This is architecturally correct!

**Why KeyMenuBar is there:**
- Visual confirmation for user ("these keys will encrypt your files")
- Not used in encryption logic
- Reads from cache (instant display)

---

### Decrypt Screen 🔄

**Status:** Needs migration

**Current (slow):**
```typescript
const { vaultKeys } = useVault(); // ❌ Async, may be stale
// Show key selection dropdown
```

**After migration:**
```typescript
const { getCurrentVaultKeys } = useVault(); // ✅ Instant cache read
const keys = getCurrentVaultKeys();
// Populate key selection dropdown instantly
```

**Benefits:**
- ✅ Instant key list (no loading spinner)
- ✅ Dropdown ready immediately
- ✅ Consistent with VaultHub UX

---

### Manage Keys Screen 🔄

**Status:** Needs migration

**Pattern to implement:**
```typescript
const { getCurrentVaultKeys, refreshKeysForVault, currentVault } = useVault();

// Display keys immediately from cache
const keys = getCurrentVaultKeys();

// Refresh on screen open (ensure latest data)
useEffect(() => {
  if (currentVault) {
    refreshKeysForVault(currentVault.id);
  }
}, [currentVault?.id]);

// After adding key
const handleAddPassphraseKey = async () => {
  await commands.addPassphraseKey(...);
  await refreshKeysForVault(currentVault.id); // Update cache
};

// After removing key
const handleRemoveKey = async (keyId: string) => {
  await commands.removeKeyFromVault({ vault_id: currentVault.id, key_id: keyId });
  await refreshKeysForVault(currentVault.id); // Update cache
};
```

**Why this matters:**
- Manage Keys is the **only screen that mutates** key data
- All other screens are **read-only consumers** of cache
- Clear ownership boundaries

---

## Why Cache-First Works for Desktop Apps

### Traditional Web App Thinking ❌

```
User action → Backend API call → Wait for response → Update UI
```

**Problems:**
- Network latency (even localhost has lag)
- Race conditions (multiple requests in flight)
- Loading spinners everywhere
- Feels slow and janky

### Desktop App (Cache-First) Thinking ✅

```
App mount → Load all data once → Populate cache
User action → Read cache → Update UI immediately (INSTANT)
Mutations → Update cache + backend in parallel
```

**Benefits:**
- Zero latency (data already in memory)
- No race conditions (synchronous reads)
- No loading spinners needed
- Feels native and responsive

### Why Barqly Vault is Perfect for This

**Small dataset:**
- User has 2-3 vaults max
- Each vault has 1-4 keys max
- Total: ~10-12 keys across all vaults
- **Fits easily in memory**

**Stable data:**
- Keys rarely change (set up once, used many times)
- Vaults stable (created once, rarely deleted)
- Perfect for caching

**Local everything:**
- Backend runs on same machine as UI
- No network latency
- But still has process communication overhead
- **Cache eliminates even this overhead**

---

## Technical Implementation

### VaultContext Refactor

**Added:**

```typescript
// Global cache state
const [keyCache, setKeyCache] = useState<Map<string, KeyReference[]>>(new Map());

// Instant cache read
const getCurrentVaultKeys = useCallback((): KeyReference[] => {
  if (!currentVault) return [];
  return keyCache.get(currentVault.id) || [];
}, [currentVault?.id, keyCache]);

// Explicit refresh (updates cache)
const refreshKeysForVault = useCallback(async (vaultId: string) => {
  setIsLoadingKeys(true);
  const keyRefs = await backend.getKeyMenuData(vaultId);

  // Update cache
  setKeyCache(prev => {
    const newCache = new Map(prev);
    newCache.set(vaultId, keyRefs);
    return newCache;
  });

  // Update deprecated vaultKeys for backward compat
  setVaultKeys(keyRefs);
  setIsLoadingKeys(false);
}, []);
```

**Changed:**

```typescript
// Synchronous vault switching (was async)
const setCurrentVault = (vaultId: string) => {
  // 1. Update state immediately (sync)
  setCurrentVaultState(vault);

  // 2. Update vaultKeys from cache (sync)
  const cachedKeys = keyCache.get(vaultId) || [];
  setVaultKeys(cachedKeys);

  // 3. Persist to backend in background (don't wait)
  commands.setCurrentVault({ vault_id: vaultId });
};
```

**Removed:**

```typescript
// DELETED: Auto-refresh effect (caused all the problems!)
useEffect(() => {
  if (currentVault) {
    refreshKeys(); // ❌ Backend call on EVERY vault switch
  }
}, [currentVault?.id]);
```

**Added:**

```typescript
// NEW: Initial cache population
useEffect(() => {
  if (vaults.length > 0) {
    // Load keys for all vaults in parallel
    vaults.forEach(vault => refreshKeysForVault(vault.id));
  }
}, [vaults.length]);
```

---

## Migration Checklist

When migrating a screen to cache-first architecture:

### 1. Identify Screen Type

**Display-only screens** (VaultHub, Encrypt display, Decrypt display):
- [ ] Replace `vaultKeys` with `getCurrentVaultKeys()`
- [ ] Remove any local key state/caching
- [ ] Remove loading spinners (cache is instant)
- [ ] Test: Should be instant, no flickering

**Mutation screens** (Manage Keys):
- [ ] Replace `vaultKeys` with `getCurrentVaultKeys()`
- [ ] Add `useEffect` to call `refreshKeysForVault()` on mount
- [ ] After mutations, call `refreshKeysForVault()` to update cache
- [ ] Remove local state management
- [ ] Test: Changes visible immediately across all screens

### 2. Update Imports

```typescript
// Before:
const { vaultKeys } = useVault();

// After:
const { getCurrentVaultKeys, refreshKeysForVault } = useVault();
```

### 3. Update Dependencies

If using `useMemo` or `useEffect`:

```typescript
// Before:
useMemo(() => { ... }, [vaultKeys]);

// After:
useMemo(() => { ... }, [currentVault?.id, keyCache]);
// OR just call getCurrentVaultKeys() directly in render
```

### 4. Testing

**Manual tests:**
1. Switch vaults rapidly - should be instant, no flickering
2. Add/remove keys in Manage Keys - should update everywhere immediately
3. Navigate between screens - keys should persist (cached)
4. Refresh app - keys should reload from backend

**Expected behavior:**
- ✅ First vault visit: Small delay (cache population)
- ✅ Subsequent visits: Instant (cache hit)
- ✅ All components in sync (same cache source)
- ✅ No loading spinners on vault switching

---

## Component Responsibilities

### VaultContext (Global State)

**Responsibilities:**
- Owns global `keyCache: Map<vaultId, KeyReference[]>`
- Provides `getCurrentVaultKeys()` for instant reads
- Provides `refreshKeysForVault()` for explicit updates
- Maintains `currentVault` state
- Synchronous vault switching (no async lag)

**Does NOT:**
- Auto-refresh keys on vault switch (removed!)
- Expose raw async key loading to consumers

---

### VaultHub (Display + Vault Management)

**Responsibilities:**
- Display vault cards with key counts and badges
- Inline vault creation form
- Vault selection
- Vault deletion

**Cache usage:**
```typescript
const { keyCache } = useVault();
// Read cache directly for badges
const cachedKeys = keyCache.get(vault.id) || [];
```

**Backend calls:**
- None for display
- `createVault()` when user creates vault
- `deleteVault()` when user deletes vault

---

### KeyMenuBar (Display Only)

**Responsibilities:**
- Show keys for current vault in header
- Visual confirmation of vault's key configuration
- Up to 4 slots: 1 passphrase + 3 YubiKeys

**Cache usage:**
```typescript
const { getCurrentVaultKeys } = useVault();
const keys = getCurrentVaultKeys(); // Instant
```

**Backend calls:** None (pure display component)

---

### Encrypt Screen (Display + Encryption)

**Responsibilities:**
- File selection
- Vault encryption with all vault keys

**Cache usage:**
- **KeyMenuBar uses cache** for visual display only
- **Encryption logic does NOT use UI keys**

**Backend API:**
```typescript
// UI sends ONLY vault_id (correct!)
const input: EncryptFilesMultiInput = {
  vault_id: currentVault.id,  // ✅ Backend retrieves keys from vault manifest
  in_file_paths: selectedFiles.paths,
  out_encrypted_file_name: archiveName,
  out_encrypted_file_path: outputPath,
};

await commands.encryptFilesMulti(input);
```

**Why this is correct:**
- ✅ UI doesn't send keys to backend (security + separation of concerns)
- ✅ Backend owns key retrieval from vault manifest/registry
- ✅ KeyMenuBar provides visual confirmation only
- ✅ No migration needed for encryption logic

---

### Decrypt Screen (Display + Decryption) 🔄

**Status:** Needs migration

**Responsibilities:**
- Vault file selection
- Key selection for decryption
- Output location selection

**Current (slow):**
```typescript
const { vaultKeys } = useVault(); // ❌ Async, may be stale
// Populate key selection dropdown
```

**After migration (instant):**
```typescript
const { getCurrentVaultKeys } = useVault(); // ✅ Instant
const keys = getCurrentVaultKeys();
// Populate key selection dropdown instantly
```

**Benefits:**
- Instant key list (no loading spinner)
- Dropdown ready immediately
- Consistent with rest of app

---

### Manage Keys Screen (Mutation) 🔄

**Status:** Needs migration

**Responsibilities:**
- Display current vault's keys
- Add passphrase keys
- Add YubiKeys
- Remove keys from vault

**Pattern to implement:**
```typescript
const {
  getCurrentVaultKeys,
  refreshKeysForVault,
  currentVault
} = useVault();

// 1. Display from cache immediately
const keys = getCurrentVaultKeys();

// 2. Refresh when screen opens
useEffect(() => {
  if (currentVault) {
    refreshKeysForVault(currentVault.id);
  }
}, [currentVault?.id]);

// 3. After mutations, update cache
const handleAddKey = async () => {
  await addKeyToVault(...);
  await refreshKeysForVault(currentVault.id); // ✅ Cache updated
};

const handleRemoveKey = async (keyId: string) => {
  await removeKeyFromVault(keyId);
  await refreshKeysForVault(currentVault.id); // ✅ Cache updated
};
```

**Why this matters:**
- Manage Keys is the **only screen that mutates** key data
- All other screens are **read-only consumers**
- Clear ownership: mutations happen here, propagate via cache
- Changes instantly visible across all screens

---

## Benefits Summary

### Performance

✅ **Instant vault switching** - No backend calls, pure cache reads
✅ **No loading spinners** - Data already in memory
✅ **Parallel initial load** - All vault keys loaded at once
✅ **Offline-first feel** - Desktop app performance

### Correctness

✅ **No race conditions** - Synchronous operations
✅ **No flickering** - Atomic state updates
✅ **No stale data** - Single source of truth
✅ **Component sync** - All read from same cache

### Maintainability

✅ **Single source of truth** - Global keyCache in VaultContext
✅ **Clear ownership** - Only Manage Keys mutates
✅ **Explicit data flow** - Clear when backend is called
✅ **Testable** - Pure functions, predictable state

---

## Comparison: Before vs After

### Before (Async-First, Web App Pattern)

```typescript
// VaultContext
useEffect(() => {
  if (currentVault) {
    refreshKeys(); // ❌ Backend call on EVERY switch
  }
}, [currentVault?.id]);

// Component
const { vaultKeys } = useVault(); // ❌ May be stale/empty during transitions
<Badge>{vaultKeys.length}</Badge> // ❌ Flickers: 0 → 3 → 0 → 3
```

**Problems:**
- Async lag on every interaction
- Race conditions (vault updated, keys not yet loaded)
- Flickering UI
- Felt like slow web app

---

### After (Cache-First, Desktop App Pattern)

```typescript
// VaultContext
const setCurrentVault = (vaultId: string) => {
  setCurrentVaultState(vault); // ✅ Sync
  const cachedKeys = keyCache.get(vaultId); // ✅ Instant
  setVaultKeys(cachedKeys); // ✅ Instant
};

// Component
const keys = getCurrentVaultKeys(); // ✅ Always correct, instant
<Badge>{keys.length}</Badge> // ✅ Stable: 3 → 3 → 3
```

**Benefits:**
- Instant response
- No race conditions
- Stable UI
- Feels like native desktop app

---

## Architecture Principles

### 1. Cache-First Reads

**Rule:** Display components NEVER call backend directly

```typescript
// ✅ Good: Read from cache
const keys = getCurrentVaultKeys();

// ❌ Bad: Call backend on render
useEffect(() => { loadKeys(); }, []);
```

### 2. Explicit Mutations

**Rule:** Only mutation screens call backend, then update cache

```typescript
// ✅ Good: Explicit mutation + cache update
await addKey(...);
await refreshKeysForVault(vaultId);

// ❌ Bad: Auto-refresh on navigation
useEffect(() => { refreshKeys(); }, [screen]);
```

### 3. Synchronous State

**Rule:** UI state updates should be synchronous when possible

```typescript
// ✅ Good: Sync state, async backend (background)
const setCurrentVault = (vaultId: string) => {
  setCurrentVaultState(vault); // Instant UI update
  persistToBackend(vaultId); // Background, don't wait
};

// ❌ Bad: Wait for backend before UI update
const setCurrentVault = async (vaultId: string) => {
  await backend.setVault(vaultId); // UI frozen during call
  setCurrentVaultState(vault);
};
```

### 4. Component-Level Thinking

**Rule:** Think in terms of whole components, not individual fields

**Bad (field-level):**
```typescript
const keyCount = ... // Some logic
const badges = ...   // Different logic
const menuBar = ...  // Different logic
// ❌ These can get out of sync!
```

**Good (component-level):**
```typescript
// All components read from same cache source
const keys = getCurrentVaultKeys();
// ✅ Guaranteed in sync!
```

---

## Future Enhancements

### Optimistic Updates

For even faster UX, update cache before backend completes:

```typescript
const handleAddKey = async (keyData) => {
  // 1. Update cache immediately (optimistic)
  const newKey = createKeyReference(keyData);
  updateCache(vaultId, [...existingKeys, newKey]);

  // 2. Call backend
  try {
    await backend.addKey(keyData);
  } catch (err) {
    // 3. Rollback on error
    updateCache(vaultId, existingKeys);
    showError(err);
  }
};
```

### Cache Invalidation

For data that changes externally (future: sync between devices):

```typescript
// Invalidate cache after N minutes
useEffect(() => {
  const interval = setInterval(() => {
    vaults.forEach(vault => refreshKeysForVault(vault.id));
  }, 5 * 60 * 1000); // 5 minutes

  return () => clearInterval(interval);
}, [vaults]);
```

**Note:** Probably not needed for offline-only app, but useful if adding cloud sync later.

---

## Troubleshooting

### "Keys not showing after mutation"

**Cause:** Forgot to call `refreshKeysForVault()` after mutation

**Fix:**
```typescript
await addKey(...);
await refreshKeysForVault(currentVault.id); // ← Add this!
```

---

### "Keys flickering during vault switch"

**Cause:** Component using deprecated `vaultKeys` instead of `getCurrentVaultKeys()`

**Fix:**
```typescript
// Before:
const { vaultKeys } = useVault();

// After:
const { getCurrentVaultKeys } = useVault();
const keys = getCurrentVaultKeys();
```

---

### "Cache shows old data after key addition"

**Cause:** Cache not updated after mutation

**Fix:** Ensure mutation calls `refreshKeysForVault()`:
```typescript
await addKeyToVault(...);
await refreshKeysForVault(currentVault.id); // ✅ Updates cache
```

---

## Related Documentation

- `/docs/engineering/refactoring/ui/highlevel-thoughts.md` - UI refactoring context
- `/docs/engineering/refactoring/centralized-architecture-design.md` - DDD architecture
- `/docs/architecture/context.md` - Technology stack

---

## Commits

- `216c4486` - Cache-first architecture implementation
- `b0e6fa00` - Initial key caching (partial fix)
- `d349a65e` - Key count flickering fix

---

_This architecture transforms Barqly Vault from web-app-style async patterns to true desktop-app instant responsiveness._
