# Decrypt Output Path - DDD Architecture Fix Complete

**Date:** 2025-10-18
**Status:** ✅ Complete - Ready for Frontend Integration
**Type:** Architecture Fix + Security Enhancement

---

## What Was Fixed

### Problem
**Before:** Frontend generated decrypt output paths with timestamps, violating DDD and creating security risk.

**Security Issue:** Frontend could theoretically pass system paths (`/etc/`, `/System/`) - backend only validated "not empty"

**Architecture Issue:** Path generation is business logic that belonged in backend Application layer, not frontend

### Solution
**After:** Backend generates default output paths matching Encrypt pattern, validates custom paths for safety.

**Now:**
- Backend controls all path generation
- Frontend only provides custom path if user explicitly chooses different location
- Consistent with Encrypt flow (Replace or Keep dialog)

---

## API Changes

### DecryptDataInput (Request)

**Before:**
```typescript
{
  encrypted_file: string;
  key_id: string;
  passphrase: string;
  output_dir: string;  // Required
}
```

**After:**
```typescript
{
  encrypted_file: string;
  key_id: string;
  passphrase: string;
  output_dir?: string | null;  // ✅ Optional - backend generates default
}
```

### DecryptionResult (Response)

**Before:**
```typescript
{
  extracted_files: string[];
  output_dir: string;
  manifest_verified: boolean;
  external_manifest_restored?: boolean;
}
```

**After:**
```typescript
{
  extracted_files: string[];
  output_dir: string;  // Actual path used (may be default or custom)
  manifest_verified: boolean;
  external_manifest_restored?: boolean;
  output_exists: boolean;  // ✅ NEW - for conflict dialog
}
```

---

## Frontend Migration Guide

### Before (Old Pattern):
```typescript
// Frontend generated path
const timestamp = new Date().toISOString().replace(/:/g, '-');
const outputDir = `~/Documents/Barqly-Recovery/${timestamp}`;

const result = await commands.decryptData({
  encrypted_file: selectedFile,
  key_id: selectedKey.id,
  passphrase: password,
  output_dir: outputDir  // Frontend-generated path
});
```

### After (New Pattern):
```typescript
// Let backend generate default path
const result = await commands.decryptData({
  encrypted_file: selectedFile,
  key_id: selectedKey.id,
  passphrase: password,
  output_dir: null  // or undefined - backend generates default
});

// Check for conflicts
if (result.status === 'ok' && result.data.output_exists) {
  // Show dialog: "Vault folder already exists. Replace or Keep Both?"
  const userChoice = await showConflictDialog(result.data.output_dir);

  if (userChoice === 'keep-both') {
    // Call again with timestamped path
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const customPath = `${result.data.output_dir}-${timestamp}`;

    await commands.decryptData({
      encrypted_file: selectedFile,
      key_id: selectedKey.id,
      passphrase: password,
      output_dir: customPath  // Custom path for "Keep Both"
    });
  } else {
    // User chose "Replace" - success, files are there
    showSuccess(result.data.output_dir);
  }
}
```

---

## Backend Behavior

### Default Path Generation

Backend extracts vault name from encrypted filename:
```
Sam-Family-Vault-2025-10-23.age → "Sam-Family-Vault"
```

Then generates:
```
~/Documents/Barqly-Recovery/Sam-Family-Vault/
```

**Pattern:** `{Documents}/Barqly-Recovery/{vault_sanitized_name}/`

**Benefits:**
- ✅ One folder per vault (clean)
- ✅ Easy to find (named after vault)
- ✅ Consistent location
- ✅ Matches Encrypt pattern

### Conflict Detection

If `~/Documents/Barqly-Recovery/Sam-Family-Vault/` already exists:
```typescript
{
  output_exists: true,
  output_dir: "~/Documents/Barqly-Recovery/Sam-Family-Vault"
}
```

Frontend shows dialog, user chooses action.

### Path Safety Validation

If custom `output_dir` provided, backend validates:
- ✅ Must be within user's home directory
- ✅ Cannot be system directories (`/etc`, `/System`, `/usr`)
- ✅ No path traversal (`../../`)
- ✅ Must be absolute path or user-relative (`~/`)

**Returns error** if unsafe path provided.

---

## Implementation Details

### Files Modified

**Command Layer:**
- `commands/crypto/decryption.rs` - Made output_dir optional, added output_exists

**Application Layer:**
- `services/crypto/application/manager.rs` - Updated decrypt_data signature
- `services/crypto/application/services/decryption_orchestration_service.rs` - Added default path generation, conflict detection, vault name extraction

**Validation Layer:**
- `types/validation.rs` - Added validate_safe_user_path for security

### Vault Name Extraction

Reuses logic from `analyze_encrypted_vault` command:
- Parses filename pattern: `{vault-name}-{date}.age` or `{vault-name}.age`
- Extracts sanitized vault name
- Handles edge cases (no date, invalid formats)

---

## Testing

✅ **308 tests passing** (up from 305)
✅ **TypeScript bindings generated**
✅ **No clippy warnings**
✅ **Path safety validation working**

**Manual Test Scenarios:**

1. **Default path:**
   - Decrypt with `output_dir: null`
   - Verify creates: `Barqly-Recovery/{vault_name}/`

2. **Conflict detection:**
   - Decrypt vault first time → `output_exists: false`
   - Decrypt same vault again → `output_exists: true`

3. **Custom path (safe):**
   - Pass `output_dir: "~/Desktop/my-recovery"`
   - Verify uses custom location

4. **Custom path (unsafe):**
   - Pass `output_dir: "/etc/test"`
   - Verify returns error

---

## Frontend Action Items

### 1. Remove Path Generation Logic
**File:** `src-ui/src/hooks/useDecryptionWorkflow.ts:300`

**Delete:**
```typescript
const recoveryPath = await join(docsPath, 'Barqly-Recovery', `${date}_${time}`);
```

**Replace with:**
```typescript
output_dir: null  // Let backend generate default
```

### 2. Add Conflict Dialog
**Similar to Encrypt flow** - show "Replace or Keep Both?" when `output_exists: true`

**If Keep Both:**
- Generate timestamped suffix: `-${timestamp}`
- Call decrypt again with custom path

### 3. Use Returned output_dir
Backend returns actual path used (whether default or custom) - show this to user in success message.

---

## Security Benefits

✅ **Backend controls all paths** - Frontend can't bypass safety
✅ **Validated custom paths** - System directory protection
✅ **No path traversal** - Backend checks for `../`
✅ **Consistent with Encrypt** - Same security model
✅ **DDD compliant** - Application layer owns business rules

---

## Breaking Changes

### ⚠️ API Change (Non-Breaking)
- `output_dir` changed from required to optional
- **Backward compatible:** Passing it still works (custom path)
- **New behavior:** Omitting it triggers default path generation

Frontend can migrate gradually:
1. First: Test with `output_dir: null` to verify defaults work
2. Then: Remove path generation code
3. Finally: Add conflict dialog

---

**Backend Status:** ✅ Complete and tested
**Frontend Status:** Ready to migrate
**TypeScript Bindings:** Updated
**Security:** Enhanced
**DDD Compliance:** Fixed ✅
