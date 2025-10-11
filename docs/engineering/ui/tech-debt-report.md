# R2 UI Redesign - Technical Debt Report

**Date:** 2025-10-10
**Status:** Active - To be addressed before release
**Priority:** Medium-High

---

## Critical Issues (Fix Now)

### 1. VaultCard - Mock Metadata ⚠️ HIGH PRIORITY
**File:** `/src-ui/src/components/vault/VaultCard.tsx`
**Lines:** 45, 51, 57

**Current Code:**
```typescript
// Format last encrypted time (mock data for now)
const lastEncrypted = 'Mock: 2 hours ago';

// Format vault size (mock data for now)
const vaultSize = 'Mock: 125 MB';

// Format file count (mock data for now)
const fileCount = 'Mock: 42 files';
```

**Impact:** Users see fake data instead of real vault statistics

**Fix Required:**
```typescript
// Use backend command to get real statistics
const stats = await commands.getVaultStatistics({ vault_id: vault.id });
const lastEncrypted = formatDistanceToNow(new Date(stats.last_encrypted));
const vaultSize = formatBytes(stats.size);
const fileCount = `${stats.file_count} files`;
```

**Backend API Needed:**
- Check if `commands.getVaultStatistics({ vault_id })` exists
- If not, we need backend API for: `last_encrypted`, `size`, `file_count`

**Priority:** HIGH - Visible on main screen

---

### 2. VaultRecognition - Mock File Size ⚠️ MEDIUM
**File:** `/src-ui/src/components/decrypt/VaultRecognition.tsx`
**Line:** 24

**Current Code:**
```typescript
// Extract file size if available (mock for now)
const fileSize = 'Unknown size';
```

**Impact:** Recovery screen shows "Unknown size" instead of actual file size

**Fix Required:**
```typescript
// Get actual file stats from system
const stats = await fs.stat(file.path);
const fileSize = formatBytes(stats.size);
```

**Priority:** MEDIUM - Only visible during recovery

---

## TODO Items (Implement Missing Features)

### 3. ManageKeysPage - Missing Backend Integrations ⚠️ HIGH
**File:** `/src-ui/src/pages/ManageKeysPage.tsx`
**Lines:** 74, 85, 100, 114, 124

**Missing Implementations:**

**a) Import .enc Key (Line 74)**
```typescript
// TODO: Implement actual import when backend command is available
const handleImport = async (file: File) => {
  console.log('Import key:', file);
};
```

**Fix:** Use `commands.importKeyFile({ file_path })` from bindings

---

**b) Add YubiKey to Registry (Line 85)**
```typescript
// TODO: Implement actual YubiKey addition when backend command is available
const handleAddYubiKey = async (yubikey: YubiKeyInfo) => {
  console.log('Add YubiKey:', yubikey);
};
```

**Fix:** Use `commands.registerYubikey(serial, label, pin)` from bindings

---

**c) Attach Key to Vault (Line 100)**
```typescript
// TODO: Implement attach key to vault
const handleAttachToVault = (keyId: string) => {
  console.log('Attach key to vault:', keyId);
};
```

**Fix:** Use `commands.addKeyToVault({ vault_id, key_id })` from bindings

---

**d) Delete Orphan Key (Line 114)**
```typescript
// TODO: Implement delete orphan key when backend command is available
const handleDelete = (keyId: string) => {
  console.log('Delete key:', keyId);
};
```

**Fix:** Use `commands.deleteKey({ key_id })` - verify this command exists

---

**e) Export Key (Line 124)**
```typescript
// TODO: Implement key export when backend command is available
const handleExport = (keyId: string) => {
  console.log('Export key:', keyId);
};
```

**Fix:** Need to verify if export command exists or implement file copy

**Priority:** HIGH - Core functionality missing

---

### 4. DecryptPage - Missing Dialog Implementations ⚠️ MEDIUM
**File:** `/src-ui/src/pages/DecryptPage.tsx`
**Lines:** 179, 183

**Missing Implementations:**

**a) Key Import Dialog (Line 179)**
```typescript
// TODO: Implement key import dialog
onImportKey={() => console.log('Import key')}
```

**Fix:** Open KeyImportDialog component (already created)

---

**b) YubiKey Detection (Line 183)**
```typescript
// TODO: Implement YubiKey detection
onDetectYubiKey={() => console.log('Detect YubiKey')}
```

**Fix:** Open YubiKeyDetector component (already created)

**Priority:** MEDIUM - Recovery features

---

### 5. KeyCard - Missing Menu Implementation ⚠️ LOW
**File:** `/src-ui/src/components/keys/KeyCard.tsx`
**Line:** 90

**Current Code:**
```typescript
// TODO: Show dropdown menu
<MoreVertical className="h-5 w-5" />
```

**Fix:** Implement dropdown menu with options (Attach, Export, Delete)

**Priority:** LOW - UI enhancement

---

### 6. YubiKey Error Handling ⚠️ LOW
**File:** `/src-ui/src/hooks/useYubiKeySetupWorkflow.ts`
**Line:** 105

**Current Code:**
```typescript
// TODO: Replace this fragile string-based error filtering with proper error classification
if (errorMessage.includes('Command failed') || errorMessage.includes('not found')) {
  // String matching - fragile!
}
```

**Fix:** Backend should return structured error codes, not strings to parse

**Priority:** LOW - Backend improvement needed

---

## Summary by Priority

### 🔴 HIGH Priority (Fix Before Release)
1. **VaultCard mock metadata** - Users see fake data
2. **ManageKeysPage missing integrations** - Core features don't work
   - Import .enc key
   - Add YubiKey
   - Attach key to vault
   - Delete key
   - Export key

### 🟡 MEDIUM Priority (Fix Soon)
3. **VaultRecognition file size** - Shows "Unknown" during recovery
4. **DecryptPage missing dialogs** - Recovery UX incomplete

### 🟢 LOW Priority (Nice to Have)
5. **KeyCard dropdown menu** - UI polish
6. **YubiKey error handling** - Better error classification

---

## Backend API Verification Needed

Before fixing, verify these commands exist in `bindings.ts`:

```bash
# Search for each command
rg "getVaultStatistics" src-ui/src/bindings.ts
rg "importKeyFile" src-ui/src/bindings.ts
rg "registerYubikey" src-ui/src/bindings.ts
rg "addKeyToVault" src-ui/src/bindings.ts
rg "deleteKey" src-ui/src/bindings.ts
rg "exportKey" src-ui/src/bindings.ts
```

**Results from previous check:**
- ✅ `listYubikeys()` - EXISTS
- ✅ `registerYubikey(serial, label, pin)` - EXISTS
- ✅ `addKeyToVault()` - Need to verify exact signature
- ❓ `getVaultStatistics()` - NOT FOUND (need to request)
- ❓ `deleteKey()` - Need to verify
- ❓ `exportKey()` - Need to verify

---

## Recommended Action Plan

### Immediate (Before Phase 6)
1. **Ask backend team:** Does `getVaultStatistics({ vault_id })` exist?
2. **Verify commands:** Check bindings for all TODO items
3. **Fix VaultCard:** Remove mock data, use real stats or hide if unavailable

### Phase 6 (Polish)
4. **Implement missing handlers** in ManageKeysPage
5. **Connect dialogs** in DecryptPage
6. **Add dropdown menu** in KeyCard
7. **Test all integrations** with real backend

### Post-Release (Technical Debt)
8. **Improve error handling** in YubiKey workflows
9. **Add proper loading states** for all async operations
10. **Add error boundaries** for component failures

---

## Testing Checklist (After Fixes)

- [ ] VaultCard shows real statistics (not "Mock:")
- [ ] Import .enc key works end-to-end
- [ ] Add YubiKey to registry works
- [ ] Attach key to vault updates UI
- [ ] Delete orphan key removes from list
- [ ] Export key creates file
- [ ] Key import dialog opens in DecryptPage
- [ ] YubiKey detection works in DecryptPage
- [ ] No console.log in production code
- [ ] All TODOs resolved or tracked in issues

---

## Notes

- Test mocks (`test-setup.ts`, `test-mocks/`) are OK - used for testing
- `tauri-safe.ts` mocks are OK - used for web preview mode
- Focus on production code TODOs only

---

_Last Updated: 2025-10-10_
_Next Review: Before Phase 6 completion_