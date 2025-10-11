# R2 UI - Missing Backend API Requirements

**Date:** 2025-01-11
**Author:** Frontend Engineering Team
**Status:** Requirements Pending Implementation
**Priority:** High - Blocking R2 UI Release

---

## Executive Summary

The R2 UI redesign transforms Barqly Vault from a simple passphrase-only encryption tool (R1) to a comprehensive vault-centric system supporting multiple keys (1 passphrase + up to 3 YubiKeys). During implementation of the new UI, we've identified critical gaps in the backend API that prevent us from delivering a complete user experience.

This document outlines the missing APIs, explains why they're needed, shows what existing APIs we evaluated, and provides detailed requirements for implementation.

---

## Background & Context

### R2 Architecture Overview
- **Vault-Centric Design:** Users create named vaults (e.g., "Family Trust", "Business Documents")
- **Multiple Keys per Vault:** Each vault can have 1 passphrase + up to 3 YubiKeys
- **Key Registry:** Central registry tracks all keys across all vaults
- **Key States:** Keys can be `active`, `registered`, or `orphaned`
- **Recovery Features:** System can recover vaults/keys from encrypted files

### Current UI Implementation Status
We've completed Phases 1-5 of the R2 redesign:
1. ✅ Phase 1: Navigation restructure
2. ✅ Phase 2: Manage Keys screen with registry
3. ✅ Phase 3: Vault Hub with visual cards
4. ✅ Phase 4: Encrypt with recovery info
5. ✅ Phase 5: Decrypt with vault recognition
6. ⏳ Phase 6: Polish & cleanup (blocked by missing APIs)

### The Problem
The UI currently displays **mock data** in critical places because the backend APIs don't provide the necessary information:
- Vault cards show "Mock: 2 hours ago" instead of real last-encrypted time
- Vault status is unknown (can't determine if vault is new/draft/encrypted)
- Can't attach orphaned keys back to vaults
- Can't import external .enc key files

---

## Missing API Requirements

### 1. Get Vault Statistics & Status

#### Why It's Needed
The Vault Hub displays cards for each vault showing:
- When the vault was last used for encryption
- Total size of encrypted data
- Number of files encrypted
- Vault status to show appropriate actions (Encrypt vs Decrypt)

#### Current Mock Implementation
```typescript
// In VaultCard.tsx (lines 45-57)
const lastEncrypted = 'Mock: 2 hours ago';
const vaultSize = 'Mock: 125 MB';
const fileCount = 'Mock: 42 files';
// Status is unknown - can't show correct buttons
```

#### Existing APIs We Checked
- ✅ `listVaults()` - Returns basic vault info (id, name, description, created_at, key_count)
- ❌ Missing: encryption history, size, file count, status

#### Required API Specification
```typescript
// Command
async getVaultStatistics(input: GetVaultStatisticsRequest): Promise<Result<GetVaultStatisticsResponse>>

// Types
type VaultStatus =
  | "new"        // Just created, never used
  | "draft"      // Has keys but never encrypted
  | "encrypted"  // Has encrypted files
  | "archived"   // Marked as archived by user

type GetVaultStatisticsRequest = {
  vault_id: string
}

type GetVaultStatisticsResponse = {
  vault_id: string,
  status: VaultStatus,
  last_encrypted_at: string | null,    // ISO timestamp or null if never
  last_decrypted_at: string | null,    // ISO timestamp or null if never
  total_size_bytes: number,             // Sum of all encrypted file sizes
  file_count: number,                   // Number of files encrypted
  encryption_count: number              // Times this vault was used
}
```

#### Use Cases
1. **Vault Card Display:** Show real statistics instead of mock data
2. **Action Buttons:** Show "Encrypt Files" for new/draft vaults, "Decrypt Files" for encrypted vaults
3. **Sorting:** Allow users to sort vaults by last-used, size, etc.
4. **Usage Tracking:** Help users identify inactive vaults

---

### 2. Attach Existing Key to Vault

#### Why It's Needed
Users may have orphaned keys (keys not attached to any vault) that they want to attach to a vault. This happens when:
- A key is removed from a vault but not deleted
- Keys are imported from external sources
- Keys are recovered from encrypted files

#### Current Implementation Gap
```typescript
// In ManageKeysPage.tsx (line 100)
// TODO: Implement attach key to vault
const handleAttachToVault = (keyId: string) => {
  console.log('Attach key to vault:', keyId);
  // No backend API available!
};
```

#### Existing APIs We Checked
- ✅ `addPassphraseKeyToVault({ vault_id, label, passphrase })` - Creates NEW key (not what we need)
- ✅ `registerYubikeyForVault({ serial, pin, label, vault_id })` - For YubiKeys only
- ✅ `removeKeyFromVault({ vault_id, key_id })` - Removes/deactivates keys
- ❌ Missing: Attach EXISTING key to vault

#### Required API Specification
```typescript
// Command
async attachKeyToVault(input: AttachKeyToVaultRequest): Promise<Result<AttachKeyToVaultResponse>>

// Types
type AttachKeyToVaultRequest = {
  vault_id: string,
  key_id: string     // ID of existing orphaned key
}

type AttachKeyToVaultResponse = {
  success: boolean,
  key_reference: KeyReference  // Updated key with new vault association
}
```

#### Use Cases
1. **Recover Orphaned Keys:** Re-attach keys that were removed from vaults
2. **Key Migration:** Move keys between vaults
3. **Recovery Scenarios:** Attach recovered keys to new vaults

---

### 3. Import External Key File

#### Why It's Needed
Users may have .enc key files from:
- Backup locations
- Other Barqly installations
- Shared from colleagues
- Exported for safekeeping

They need to import these into their key registry.

#### Current Implementation Gap
```typescript
// In ManageKeysPage.tsx (line 74)
// TODO: Implement actual import when backend command is available
const handleImport = async (file: File) => {
  console.log('Import key:', file);
  // No backend API available!
};
```

#### Existing APIs We Checked
- ✅ `generateKey({ label, passphrase })` - Creates new keys
- ✅ `selectFiles()` - For selecting files to encrypt (not .enc files)
- ❌ Missing: Import existing .enc key files

#### Required API Specification
```typescript
// Command
async importKeyFile(input: ImportKeyFileRequest): Promise<Result<ImportKeyFileResponse>>

// Types
type ImportKeyFileRequest = {
  file_path: string,           // Path to .enc file
  label: string,                // User-provided label
  vault_id: string | null       // Optional: immediately attach to vault
}

type ImportKeyFileResponse = {
  key_reference: KeyReference,  // Imported key details
  is_duplicate: boolean,        // True if key already existed
  original_label: string | null // Label from file metadata if available
}
```

#### Use Cases
1. **Restore from Backup:** Import keys from backup locations
2. **Multi-Device Setup:** Import keys from another device
3. **Team Collaboration:** Import shared keys from colleagues
4. **Recovery:** Import keys found during system recovery

---

## APIs We DON'T Need (Clarifications)

### ❌ deleteKey - Not Needed
**Initial assumption:** We need to delete orphaned keys
**Clarification:** `removeKeyFromVault` already handles deactivation per NIST lifecycle
**Decision:** No physical delete needed in UI - keys are deactivated, not deleted

### ❌ exportKey - Not Needed
**Initial assumption:** Users need to export keys
**Clarification:** The .enc files already contain the keys
**Decision:** Remove export functionality from UI

---

## Implementation Priority

### Phase 1 - Critical (Block Release)
1. **getVaultStatistics** - Without this, vault cards show mock data
2. **attachKeyToVault** - Without this, orphaned keys can't be recovered

### Phase 2 - Important (Post-Release OK)
3. **importKeyFile** - Users can work around this temporarily

---

## Visual Context

### Where These APIs Are Used

#### Vault Hub Screen (needs getVaultStatistics)
```
┌─────────────────────────────────────┐
│ Vault Hub                           │
├─────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐     │
│ │ Family      │ │ Business    │     │
│ │ Trust       │ │ Documents   │     │
│ │             │ │             │     │
│ │ Status: ??? │ │ Status: ??? │ ← Need vault status
│ │ Last: Mock  │ │ Last: Mock  │ ← Need last_encrypted_at
│ │ Size: Mock  │ │ Size: Mock  │ ← Need total_size_bytes
│ │ Files: Mock │ │ Files: Mock │ ← Need file_count
│ │             │ │             │     │
│ │ [Encrypt?]  │ │ [Decrypt?]  │ ← Button depends on status
│ └─────────────┘ └─────────────┘     │
└─────────────────────────────────────┘
```

#### Manage Keys Screen (needs attachKeyToVault, importKeyFile)
```
┌─────────────────────────────────────┐
│ Manage Keys                         │
├─────────────────────────────────────┤
│ Vault Keys (2)                      │
│ • Passphrase: Main Key              │
│ • YubiKey: 12345678                 │
│                                     │
│ Orphaned Keys (1)                   │
│ • Old Backup Key                    │
│   [Attach to Vault] ← Needs attachKeyToVault
│                                     │
│ [Import .enc File] ← Needs importKeyFile
└─────────────────────────────────────┘
```

---

## Testing Requirements

### Test Cases for getVaultStatistics
1. New vault (never encrypted) → status: "new", last_encrypted_at: null
2. Draft vault (has keys, no encryption) → status: "draft"
3. Active vault → status: "encrypted", real timestamps
4. Large vault → accurate size calculation

### Test Cases for attachKeyToVault
1. Attach orphaned passphrase key → success
2. Attach orphaned YubiKey → success
3. Attach to non-existent vault → error
4. Attach non-existent key → error
5. Attach already-attached key → error

### Test Cases for importKeyFile
1. Import valid .enc file → success
2. Import duplicate key → success with is_duplicate: true
3. Import corrupted file → error
4. Import with immediate vault attachment → success
5. Import without vault → creates orphaned key

---

## Migration & Compatibility

### Backward Compatibility
- Existing vaults without statistics should return sensible defaults
- Missing timestamps should return null (not errors)
- File count/size can be calculated on-demand if not cached

### Migration Path
1. Deploy backend APIs
2. Update UI to use real APIs with fallbacks
3. Remove mock data
4. Test with existing user data

---

## Security Considerations

### getVaultStatistics
- Should only return statistics, not sensitive data
- Must validate vault ownership/access rights
- Cache results for performance (statistics don't change often)

### attachKeyToVault
- Verify key is actually orphaned before attaching
- Validate vault key limits (max 4 keys per vault)
- Log key attachment for audit trail

### importKeyFile
- Validate .enc file format before import
- Check for malicious content
- Verify key isn't already at maximum vault associations
- Sanitize user-provided labels

---

## Questions for Backend Team

1. **Caching Strategy:** Should vault statistics be cached or calculated on-demand?
2. **Status Determination:** How do we determine if a vault has been used for encryption? Check file system? Database flag?
3. **Key Import Format:** What validation is needed for .enc files during import?
4. **Error Codes:** Can we use structured error codes instead of string messages for better error handling?
5. **Batch Operations:** Should we support batch operations (e.g., attach multiple keys at once)?

---

## Success Criteria

1. ✅ Vault cards show real statistics (no "Mock:" text)
2. ✅ Vault status determines correct action buttons
3. ✅ Orphaned keys can be attached to vaults
4. ✅ External .enc files can be imported
5. ✅ All mock data removed from production UI
6. ✅ Error handling for all edge cases

---

## References

- [R2 UI Redesign Overview](/docs/engineering/ui/r2-redesign-overview.md)
- [Technical Debt Report](/docs/engineering/ui/tech-debt-report.md)
- [Current bindings.ts](/src-ui/src/bindings.ts)
- [VaultCard Component](/src-ui/src/components/vault/VaultCard.tsx)
- [ManageKeysPage](/src-ui/src/pages/ManageKeysPage.tsx)

---

*End of Requirements Document*