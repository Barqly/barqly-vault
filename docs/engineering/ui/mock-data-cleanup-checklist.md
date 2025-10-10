# Mock Data Cleanup Checklist

**Purpose:** Track all mock/hardcoded data added during R2 UI development
**Status:** To be cleaned up during Phase 6 (Polish) or after backend integration testing

---

## Components with Mock Data

### 1. VaultCard Component ❌
**File:** `/src-ui/src/components/vault/VaultCard.tsx`

**Mock Data:**
- Last encrypted timestamp (hardcoded "2 hours ago")
- Vault size (hardcoded "125 MB")
- File count (hardcoded "42 files")

**Location:** Lines ~40-50 in component

**Fix:**
```typescript
// Replace with actual backend call
const stats = await commands.getVaultStatistics({ vault_id: vault.id });
// Use: stats.last_encrypted, stats.size, stats.file_count
```

**Backend Command Needed:**
- `commands.getVaultStatistics({ vault_id })` - Returns last encrypted, size, file count

---

### 2. YubiKeyDetector Component ✅ FIXED
**File:** `/src-ui/src/components/keys/YubiKeyDetector.tsx`

**Status:** ✅ Already fixed - now uses `commands.detectYubikey()`

**Commit:** `0d9128a9` - "fix: Replace mock YubiKey detection with actual backend command"

---

### 3. TopStatusBar Component ⚠️
**File:** `/src-ui/src/components/layout/TopStatusBar.tsx`

**Mock Data:**
- YubiKey connection status (simulated polling)

**Location:** Lines ~30-40

**Current Implementation:**
```typescript
// Simulates YubiKey detection every 5 seconds
setInterval(() => {
  // Mock detection logic
}, 5000);
```

**Fix:**
```typescript
// Use actual backend polling
const checkYubiKey = async () => {
  try {
    const result = await commands.detectYubikey();
    setYubiKeyConnected(!!result);
  } catch {
    setYubiKeyConnected(false);
  }
};
```

---

### 4. KeyCard Component (Potential) ⚠️
**File:** `/src-ui/src/components/keys/KeyCard.tsx`

**Check for:**
- Mock vault attachment counts
- Hardcoded creation dates
- Fake identity strings

**Verify:** Review component to ensure all data comes from `KeyReference` type

---

### 5. EncryptionSuccess Component ⚠️
**File:** `/src-ui/src/components/encrypt/EncryptionSuccess.tsx`

**Mock Data:**
- Recovery items list (may be hardcoded)

**Current:**
```typescript
recoveryItemsIncluded: [
  'Vault manifest',
  'Passphrase key (.enc)',
  'Recovery instructions'
]
```

**Fix:** Ensure this comes from actual backend response after encryption

---

### 6. RecoveryInfoPanel Component ⚠️
**File:** `/src-ui/src/components/encrypt/RecoveryInfoPanel.tsx`

**Mock Data:**
- File counts shown in recovery preview

**Verify:** Ensure `fileCount` and `totalSize` props come from actual selected files, not hardcoded

---

## Data That Should Be Real (Verify)

### VaultContext
- ✅ Vault list (from backend)
- ✅ Key cache (from backend)
- ✅ Current vault (from backend)

### File Selection
- ✅ Selected files (from Tauri dialog)
- ✅ File sizes (from actual files)
- ✅ File paths (from actual selection)

---

## Cleanup Process (Phase 6)

### Step 1: Search for Mock Data
```bash
# Search for common mock indicators
rg -i "mock|hardcoded|fake|dummy|todo.*replace" src-ui/src/components/
rg -i "simulated|placeholder" src-ui/src/components/
rg "// TODO" src-ui/src/components/
```

### Step 2: Test with Real Backend
For each component:
1. Verify backend command exists
2. Replace mock data with actual command call
3. Test with real data
4. Remove TODO comments

### Step 3: Update Components

**Priority Order:**
1. **High Priority** (affects functionality):
   - YubiKeyDetector ✅ DONE
   - TopStatusBar YubiKey polling
   - VaultCard statistics

2. **Medium Priority** (affects UX):
   - EncryptionSuccess recovery items
   - RecoveryInfoPanel calculations

3. **Low Priority** (cosmetic):
   - Any remaining placeholders

---

## Backend Commands to Verify Exist

- [x] `commands.detectYubikey()` - ✅ Available
- [ ] `commands.getVaultStatistics({ vault_id })` - Check availability
- [ ] `commands.revealInFinder({ path })` - Check availability (removed from UI)
- [x] `commands.encryptFilesMulti(...)` - ✅ Available
- [x] `commands.generateKeypairAge(...)` - ✅ Available

---

## Testing Checklist (After Cleanup)

- [ ] VaultCard shows real statistics from backend
- [ ] TopStatusBar detects actual YubiKey presence
- [ ] Encryption success shows actual recovery items
- [ ] No console warnings about mock data
- [ ] All TODOs addressed or removed

---

## Notes

### When to Clean Up:
- **Phase 6 (Polish)** - Before final release
- **After Backend Integration** - When all commands available
- **Before User Testing** - Real data needed for accurate testing

### How to Track:
- Search for "TODO" comments in code
- Run `rg -i "mock|hardcoded"` before release
- Manual testing with real operations

---

## Quick Search Commands

```bash
# Find all mock data references
rg -i "mock" src-ui/src/components/ src-ui/src/pages/

# Find all hardcoded values
rg -i "hardcoded" src-ui/src/

# Find all TODOs
rg "TODO" src-ui/src/

# Find simulated/placeholder data
rg -i "simulated|placeholder|fake|dummy" src-ui/src/
```

---

_Last Updated: 2025-10-10 (Phase 4 complete)_
_Next Review: Phase 6 (Polish)_