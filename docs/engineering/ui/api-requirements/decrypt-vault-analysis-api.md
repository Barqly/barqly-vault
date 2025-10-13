# Decrypt Page - Vault Analysis API Requirements

**Author:** Frontend Engineer
**Date:** 2025-10-13
**Status:** 🔴 Awaiting Backend Implementation
**Target:** sr-backend-engineer

---

## Executive Summary

The Decrypt page needs enhanced vault analysis when a user selects an encrypted `.age` file. We need the backend to handle vault name desanitization, manifest detection, and key discovery to support both normal decryption and edge-case recovery mode.

**Current Problem:** Frontend is doing string manipulation to desanitize vault names (line 127 in `useDecryptionWorkflow.ts`), which duplicates backend logic and may be incorrect.

---

## User Flow Context

### Normal Case (99% - Manifest Exists)
1. User selects encrypted vault file: `Sam-Family-Vault-2025-01-13.age`
2. Backend checks: Does vault manifest exist locally?
3. Backend returns: Vault name ("Sam Family Vault"), vault ID, associated keys
4. UI displays: Vault name in PageHeader + keys in dropdown
5. User selects key → decrypts

### Edge Case (1% - Recovery Mode / No Manifest)
1. User selects encrypted vault file: `Sam-Family-Vault-2025-01-13.age`
2. Backend checks: Vault manifest NOT found (machine crash, fresh install)
3. Backend returns: Vault name + recovery mode flag
4. UI displays: "Recovery Mode" in PageHeader + ALL available keys in dropdown
5. User selects any available key → attempts decryption
6. Age validates cryptographically (not based on manifest)
7. If successful: Manifest restored from encrypted bundle

---

## Current Implementation Issues

### Problem 1: Frontend Doing Desanitization
**Location:** `src-ui/src/hooks/useDecryptionWorkflow.ts:127`

```typescript
const existingVault = vaults.find(
  (v) => v.name.toLowerCase().replace(/\s+/g, '-') === possibleVaultName.toLowerCase(),
);
```

**Issue:**
- Frontend duplicates backend sanitization logic
- May not match backend's actual sanitization algorithm
- Fragile - breaks if backend sanitization changes

**Solution Needed:**
- Backend should handle desanitization
- Return human-readable vault name

---

### Problem 2: Vault Name Parsing in Frontend
**Location:** `src-ui/src/hooks/useDecryptionWorkflow.ts:118-120`

```typescript
const fileName = filePath.split('/').pop() || '';
const vaultNameMatch = fileName.match(/^([^-]+(?:-[^-]+)*?)(?:-\d{4}-\d{2}-\d{2})?\.age$/i);
const possibleVaultName = vaultNameMatch ? vaultNameMatch[1] : null;
```

**Issue:**
- Brittle regex parsing
- Doesn't handle edge cases
- Frontend shouldn't know filename format

**Solution Needed:**
- Backend parses filename
- Returns desanitized vault name

---

## API Requirements

### New/Enhanced Command: `analyze_encrypted_vault`

**Purpose:** Analyze an encrypted vault file and return metadata needed for UI display

**Input:**
```typescript
export type AnalyzeEncryptedVaultRequest = {
  encrypted_file_path: string;  // Absolute path to .age file
}
```

**Output:**
```typescript
export type AnalyzeEncryptedVaultResponse = {
  // Vault identification
  vault_name: string;              // Desanitized name: "Sam Family Vault"
  vault_name_sanitized: string;    // Sanitized name: "Sam-Family-Vault"

  // Manifest detection
  manifest_exists: boolean;         // true = normal flow, false = recovery mode
  vault_id: string | null;         // ID if manifest found, null otherwise

  // Key information (normal case - from manifest)
  associated_keys: KeyReference[];  // Keys from vault manifest (empty if recovery mode)

  // Metadata from filename
  creation_date: string | null;    // Extracted from filename: "2025-01-13"

  // Recovery mode indicators
  is_recovery_mode: boolean;       // true if manifest missing
}
```

**Error Cases:**
```typescript
CommandError {
  code: "FILE_NOT_FOUND" | "INVALID_FILE_FORMAT" | "PARSE_ERROR"
  message: string
  user_actionable: boolean
}
```

---

## Detailed Requirements

### 1. **Vault Name Desanitization**

**Backend Should:**
- Parse filename: `Sam-Family-Vault-2025-01-13.age`
- Extract sanitized name: `Sam-Family-Vault`
- Desanitize using **existing backend logic**: `"Sam Family Vault"`
- Return both sanitized and desanitized versions

**Example Transformations:**
| Filename | Sanitized Extract | Desanitized Output |
|----------|------------------|-------------------|
| `Sam-Family-Vault-2025-01-13.age` | `Sam-Family-Vault` | `Sam Family Vault` |
| `AKAH-Trust-2025-01-13.age` | `AKAH-Trust` | `AKAH Trust` |
| `Lightning-Node-2025-01-13.age` | `Lightning-Node` | `Lightning Node` |

**Why:** Backend already has sanitization logic for vault creation. Desanitization should use the inverse of that algorithm.

---

### 2. **Manifest Detection**

**Backend Should:**
- Check if vault manifest exists on local machine
- Path: `~/Library/Application Support/com.barqly.vault/vaults/{sanitized-name}.manifest`
- Return boolean: `manifest_exists`

**Normal Case (Manifest Found):**
```json
{
  "vault_name": "Sam Family Vault",
  "manifest_exists": true,
  "vault_id": "abc-123-def",
  "associated_keys": [
    { "id": "key1", "label": "MBP2024 Nauman", "type": "Passphrase", ... },
    { "id": "key2", "label": "YubiKey-31310420", "type": "YubiKey", ... }
  ],
  "is_recovery_mode": false
}
```

**Edge Case (Manifest Missing):**
```json
{
  "vault_name": "Sam Family Vault",
  "manifest_exists": false,
  "vault_id": null,
  "associated_keys": [],
  "is_recovery_mode": true
}
```

---

### 3. **Key Discovery for Recovery Mode**

**This might already exist!** Need to verify.

**Required Command:** Get ALL available keys (not vault-specific)

```typescript
// Possible existing command? Need to check
export type GetAllAvailableKeysRequest = {}

export type GetAllAvailableKeysResponse = {
  keys: KeyReference[];  // ALL keys on machine (orphaned, attached, everything)
}
```

**Keys to include in recovery mode:**
- Passphrase keys: Any `.agekey.enc` files in keys directory
- YubiKeys: Currently plugged in/detected YubiKeys
- Orphaned keys: Keys not attached to any vault

**Why needed:** In recovery mode, user might have ANY key available. Let them try any key - age will cryptographically validate.

---

### 4. **Date Extraction from Filename**

**Backend Should:**
- Parse date from filename: `Sam-Family-Vault-2025-01-13.age` → `"2025-01-13"`
- Return as `creation_date` field
- Handle missing date gracefully (return null)

**Why:** Date extraction logic belongs with filename parsing logic.

---

## UI Usage Patterns

### Normal Case Flow:

```typescript
// Step 1: User selects file
const result = await commands.analyzeEncryptedVault({
  encrypted_file_path: selectedFilePath
});

if (result.status === 'error') {
  // Handle error
  return;
}

const vaultInfo = result.data;

// Step 2: Display in PageHeader
<PageHeader
  title="Decrypt Your Vault"
  icon={Unlock}
  showVaultSelector={true}
  vaultSelectorMode="readonly"
  readonlyVaultName={vaultInfo.vault_name}
  readonlyVaultVariant="normal"
  readonlyVaultId={vaultInfo.vault_id}  // For cache lookup
/>

// KeyMenuBar automatically shows keys from vault via cache
// Key dropdown populated with vaultInfo.associated_keys
```

### Recovery Mode Flow:

```typescript
const vaultInfo = result.data;

if (vaultInfo.is_recovery_mode) {
  // Get ALL available keys
  const allKeysResult = await commands.getAllAvailableKeys();

  // Display in PageHeader
  <PageHeader
    title="Decrypt Your Vault"
    icon={Unlock}
    showVaultSelector={true}
    vaultSelectorMode="readonly"
    readonlyVaultName="Recovery Mode"
    readonlyVaultVariant="recovery"
  />

  // KeyMenuBar shows empty slots (no manifest = unknown keys)
  // Key dropdown populated with allKeysResult.keys (ALL available)
}
```

---

## Implementation Checklist for Backend Engineer

### Required:
- [ ] Create `analyze_encrypted_vault` command (or enhance existing)
- [ ] Parse filename and extract sanitized vault name
- [ ] **Desanitize vault name** using existing backend logic
- [ ] Check if vault manifest exists locally
- [ ] Return vault ID if manifest found
- [ ] Return associated keys from manifest (if exists)
- [ ] Return recovery mode flag
- [ ] Extract creation date from filename
- [ ] Handle error cases (file not found, invalid format)

### Nice to Have:
- [ ] Command to get ALL available keys (for recovery mode dropdown)
  - OR confirm if `getKeyMenuData` can be called with `vault_id: null`?
  - OR confirm if there's an existing "orphaned keys" API?

---

## Open Questions for Backend Engineer

### Q1: Does an API like this already exist?
- Do we have a command that analyzes encrypted vault files?
- Or do we need to create this from scratch?

### Q2: How to get ALL available keys for recovery mode?
- Is there an existing command to list all keys (not vault-specific)?
- Can we call `getKeyMenuData` with a null/empty vault_id?
- Or should we create a new `getAllAvailableKeys` command?

### Q3: Desanitization Logic
- Where in the backend codebase is the sanitization logic?
- Can you provide the inverse function for desanitization?
- Examples:
  - `"Sam-Family-Vault"` → `"Sam Family Vault"`
  - `"AKAH-Trust"` → `"AKAH Trust"`
  - `"Lightning-Node"` → `"Lightning Node"`

### Q4: Manifest File Location
- Confirm path: `~/Library/Application Support/com.barqly.vault/vaults/{sanitized-name}.manifest`?
- Or is there a different location/naming convention?

---

## Expected Response from Backend Engineer

Please provide:

1. **Existing API mapping** (if available)
   - Which command(s) already provide this functionality?
   - What's the current request/response structure?
   - Do we just need to call it differently?

2. **New API specification** (if needed)
   - Confirm the proposed `analyze_encrypted_vault` structure
   - Timeline for implementation
   - Any concerns or alternative approaches

3. **All-keys API**
   - How to get ALL available keys (recovery mode)?
   - Existing command or need new one?

4. **Code pointers**
   - Where is sanitization logic? (for desanitization)
   - Where is manifest lookup logic?
   - Any existing utilities we should reuse?

---

## Success Criteria

After backend implementation, frontend should be able to:

✅ Call ONE API with encrypted file path
✅ Get desanitized vault name (no frontend parsing)
✅ Know if manifest exists (normal vs recovery mode)
✅ Get associated keys for normal mode
✅ Get ALL available keys for recovery mode
✅ Display proper PageHeader vault badge (blue normal / yellow recovery)
✅ Populate key dropdown with correct key list

---

## Timeline

**Frontend readiness:** Immediately (waiting on backend)
**Target completion:** Before R2 launch (Oct 15, 2025)
**Priority:** High - Core decryption UX enhancement

---

## Related Documents

- `/docs/engineering/ui/cache-first-architecture.md` - Key caching system
- `/docs/engineering/ui/refactoring-guidelines.md` - UI patterns
- `/docs/architecture/key-lifecycle-management.md` - Key states
- Current implementation: `src-ui/src/hooks/useDecryptionWorkflow.ts:114-150`

---

_This document will be updated once backend engineer provides API details or confirms implementation._
