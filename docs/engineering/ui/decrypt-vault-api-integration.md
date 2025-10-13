# Decrypt Vault - API Integration Guide

**For:** Frontend Engineer
**Date:** 2025-10-13
**Status:** ✅ Backend Implementation Complete

---

## Overview

The backend has implemented the `analyze_encrypted_vault` API as requested in your requirements document. This guide shows you how to use the new API and provides recommendations for removing duplicate frontend logic.

---

## New API: `analyze_encrypted_vault`

### Purpose
Analyze an encrypted `.age` file to extract vault metadata needed for the decryption UI without performing actual decryption.

### Request
```typescript
import { commands } from '../bindings';

const result = await commands.analyzeEncryptedVault({
  encrypted_file_path: '/path/to/Sam-Family-Vault-2025-01-13.age'
});
```

### Response
```typescript
{
  // Vault identification
  vault_name: "Sam Family Vault",              // Desanitized for display
  vault_name_sanitized: "Sam-Family-Vault",    // From filename

  // Manifest detection
  manifest_exists: true,                        // true = normal, false = recovery mode
  vault_id: "7Bw3eqLGahnF5DXZyMa8Jz" | null,   // ID if manifest found

  // Keys (normal case - from manifest)
  associated_keys: [
    {
      id: "MBP2024-Nauman",
      label: "MBP2024 Nauman",
      key_type: { type: "Passphrase", data: { key_id: "..." } },
      lifecycle_status: "active",
      created_at: "2025-10-08T03:21:33Z",
      last_used: null
    }
  ],

  // Metadata
  creation_date: "2025-01-13" | null,

  // Recovery mode
  is_recovery_mode: false
}
```

---

## Getting ALL Available Keys (Recovery Mode)

The existing `listUnifiedKeys` API already supports this! Use the `All` filter:

```typescript
import { commands } from '../bindings';

// Get ALL keys on this machine (for recovery mode dropdown)
const result = await commands.listUnifiedKeys({
  type: "All"
});

if (result.status === 'ok') {
  const allKeys = result.data; // Array of KeyInfo
}
```

### Available Filters
```typescript
// All registered keys across all vaults
{ type: "All" }

// Keys registered to a specific vault
{ type: "ForVault", value: vault_id }

// Keys NOT in a specific vault but available to add
{ type: "AvailableForVault", value: vault_id }

// Only currently connected/available keys (for decryption UI)
{ type: "ConnectedOnly" }
```

---

## Implementation Examples

### Normal Case (Manifest Exists)

```typescript
// Step 1: User selects encrypted file
const filePath = '/path/to/Sam-Family-Vault-2025-01-13.age';

// Step 2: Analyze the file
const analysisResult = await commands.analyzeEncryptedVault({
  encrypted_file_path: filePath
});

if (analysisResult.status === 'error') {
  // Handle error
  showError(analysisResult.error.message);
  return;
}

const vaultInfo = analysisResult.data;

// Step 3: Display in PageHeader
<PageHeader
  title="Decrypt Your Vault"
  icon={Unlock}
  showVaultSelector={true}
  vaultSelectorMode="readonly"
  readonlyVaultName={vaultInfo.vault_name}  // "Sam Family Vault"
  readonlyVaultVariant="normal"
  readonlyVaultId={vaultInfo.vault_id}      // For cache lookup
/>

// Step 4: Show associated keys in dropdown
<KeyDropdown keys={vaultInfo.associated_keys} />
```

### Recovery Mode (Manifest Missing)

```typescript
const analysisResult = await commands.analyzeEncryptedVault({
  encrypted_file_path: filePath
});

if (analysisResult.data.is_recovery_mode) {
  // Step 1: Get ALL available keys
  const allKeysResult = await commands.listUnifiedKeys({ type: "All" });

  if (allKeysResult.status === 'ok') {
    const allKeys = allKeysResult.data;

    // Step 2: Display recovery mode UI
    <PageHeader
      title="Decrypt Your Vault"
      icon={Unlock}
      showVaultSelector={true}
      vaultSelectorMode="readonly"
      readonlyVaultName={`${vaultInfo.vault_name} (Recovery Mode)`}
      readonlyVaultVariant="recovery"  // Yellow badge
    />

    // Step 3: Show ALL keys in dropdown (not just vault-specific)
    <KeyDropdown
      keys={allKeys}
      mode="recovery"
      helpText="Select any available key to attempt decryption"
    />
  }
}
```

---

## Remove Duplicate Frontend Logic

### ❌ REMOVE: Frontend Desanitization

**Location:** `src-ui/src/hooks/useDecryptionWorkflow.ts:127`

```typescript
// DELETE THIS - Backend now handles desanitization
const existingVault = vaults.find(
  (v) => v.name.toLowerCase().replace(/\s+/g, '-') === possibleVaultName.toLowerCase(),
);
```

**Replace with:**
```typescript
// Use vault_name directly from API (already desanitized)
const vaultName = vaultInfo.vault_name;
```

### ❌ REMOVE: Frontend Filename Parsing

**Location:** `src-ui/src/hooks/useDecryptionWorkflow.ts:118-120`

```typescript
// DELETE THIS - Backend now parses filenames
const fileName = filePath.split('/').pop() || '';
const vaultNameMatch = fileName.match(/^([^-]+(?:-[^-]+)*?)(?:-\d{4}-\d{2}-\d{2})?\.age$/i);
const possibleVaultName = vaultNameMatch ? vaultNameMatch[1] : null;
```

**Replace with:**
```typescript
// Use analyze_encrypted_vault API instead
const vaultInfo = await commands.analyzeEncryptedVault({
  encrypted_file_path: selectedFilePath
});
```

### ✅ NEW: Single API Call

Replace all the above logic with:

```typescript
async function analyzeSelectedVault(filePath: string) {
  const result = await commands.analyzeEncryptedVault({
    encrypted_file_path: filePath
  });

  if (result.status === 'error') {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

---

## Error Handling

```typescript
const result = await commands.analyzeEncryptedVault({
  encrypted_file_path: filePath
});

if (result.status === 'error') {
  const error = result.error;

  switch (error.code) {
    case 'FILE_NOT_FOUND':
      showError('Encrypted file not found. Please select a valid .age file.');
      break;

    case 'INVALID_INPUT':
      showError('Invalid filename format. Expected format: VaultName-YYYY-MM-DD.age');
      break;

    case 'INTERNAL_ERROR':
      showError('Failed to analyze vault file. Please try again.');
      break;

    default:
      showError(error.message);
  }
}
```

---

## Complete Decryption Workflow Example

```typescript
import { useState } from 'react';
import { commands } from '../bindings';

function DecryptPage() {
  const [vaultInfo, setVaultInfo] = useState(null);
  const [allKeys, setAllKeys] = useState([]);

  async function handleFileSelected(filePath: string) {
    // Step 1: Analyze the encrypted file
    const analysisResult = await commands.analyzeEncryptedVault({
      encrypted_file_path: filePath
    });

    if (analysisResult.status === 'error') {
      showError(analysisResult.error.message);
      return;
    }

    const info = analysisResult.data;
    setVaultInfo(info);

    // Step 2: If recovery mode, get all available keys
    if (info.is_recovery_mode) {
      const keysResult = await commands.listUnifiedKeys({ type: "All" });

      if (keysResult.status === 'ok') {
        setAllKeys(keysResult.data);
      }
    }
  }

  const keysToDisplay = vaultInfo?.is_recovery_mode
    ? allKeys
    : vaultInfo?.associated_keys || [];

  return (
    <div>
      <PageHeader
        title="Decrypt Your Vault"
        showVaultSelector={!!vaultInfo}
        readonlyVaultName={
          vaultInfo?.is_recovery_mode
            ? `${vaultInfo.vault_name} (Recovery Mode)`
            : vaultInfo?.vault_name
        }
        readonlyVaultVariant={vaultInfo?.is_recovery_mode ? "recovery" : "normal"}
      />

      <FileSelector onSelect={handleFileSelected} />

      {vaultInfo && (
        <>
          <KeyDropdown
            keys={keysToDisplay}
            mode={vaultInfo.is_recovery_mode ? "recovery" : "normal"}
          />

          {vaultInfo.is_recovery_mode && (
            <Alert variant="warning">
              Vault manifest not found on this machine. You can try any available key to decrypt.
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
```

---

## Summary

### What Changed
- ✅ New `analyze_encrypted_vault` command available
- ✅ Returns desanitized vault name (no frontend parsing needed)
- ✅ Returns manifest status (normal vs recovery mode)
- ✅ Returns associated keys (if manifest exists)
- ✅ Existing `listUnifiedKeys` with `{ type: "All" }` gets all keys for recovery mode

### What To Remove
- ❌ Frontend vault name desanitization logic
- ❌ Frontend filename parsing regex
- ❌ Frontend manifest lookup attempts

### What To Use
- ✅ Single `analyzeEncryptedVault` API call
- ✅ Existing `listUnifiedKeys({ type: "All" })` for recovery mode
- ✅ Clean separation: Backend handles file parsing, Frontend handles UI

---

## Questions?

If you encounter any issues or need clarification on the API behavior, please let me know!
