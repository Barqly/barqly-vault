# R2 Backend API Implementation - Response Document

**Date:** 2025-01-11
**Status:** ✅ Implemented & Available
**Author:** Backend Engineering Team

---

## Executive Summary

All three requested backend APIs have been implemented and are now available for frontend integration. Additionally, a unified key lifecycle management system has been implemented across all key types.

---

## API 1: Get Vault Statistics ✅

### Commands Available

#### 1.1 Get Single Vault Statistics

```typescript
import { commands } from '../bindings';

// Get statistics for a specific vault
const result = await commands.getVaultStatistics({
  vault_id: "7Bw3eqLGahnF5DXZyMa8Jz"
});
```

**Request Type:**
```typescript
interface GetVaultStatisticsRequest {
  vault_id: string
}
```

**Response Type:**
```typescript
interface GetVaultStatisticsResponse {
  vault_id: string
  status: VaultStatus
  encryption_history: EncryptionHistory
  content_stats: ContentStats
  key_stats: KeyStats
}

type VaultStatus =
  | "new"         // Just created, never used
  | "active"      // Has encrypted files
  | "orphaned"    // Was active but all keys removed
  | "incomplete"  // Has keys but never encrypted

interface EncryptionHistory {
  last_encrypted_at: string | null        // ISO timestamp
  last_decrypted_at: string | null        // ISO timestamp
  encryption_count: number                 // Total times used
  last_encrypted_by: MachineInfo | null
}

interface MachineInfo {
  machine_id: string
  machine_label: string
}

interface ContentStats {
  file_count: number           // Number of files last encrypted
  total_size_bytes: number     // Total size of encrypted content
  largest_file_bytes: number   // Size of largest file
}

interface KeyStats {
  total_keys: number       // Total keys attached to vault
  active_keys: number      // Keys currently available
  key_types: KeyTypeCount  // Breakdown by type
}

interface KeyTypeCount {
  passphrase_count: number
  yubikey_count: number
}
```

**Usage Example:**
```typescript
const stats = await commands.getVaultStatistics({
  vault_id: "vault-123"
});

// Display in UI
console.log(`Vault Status: ${stats.status}`);
console.log(`Last Encrypted: ${stats.encryption_history.last_encrypted_at}`);
console.log(`File Count: ${stats.content_stats.file_count}`);
console.log(`Total Keys: ${stats.key_stats.total_keys}`);
```

#### 1.2 Get All Vault Statistics

```typescript
// Get statistics for ALL vaults at once (more efficient)
const result = await commands.getAllVaultStatistics();
```

**Response Type:**
```typescript
interface GetAllVaultStatisticsResponse {
  vaults: VaultStatistics[]  // Array of all vault statistics
}
```

**Usage Example:**
```typescript
const allStats = await commands.getAllVaultStatistics();

allStats.vaults.forEach(vault => {
  console.log(`${vault.vault_id}: ${vault.status}`);
});
```

---

## API 2: Attach Key to Vault ✅

### Command Available

```typescript
import { commands } from '../bindings';

// Attach an orphaned key to a vault
const result = await commands.attachKeyToVault({
  vault_id: "7Bw3eqLGahnF5DXZyMa8Jz",
  key_id: "MBP2024-Nauman"
});
```

**Request Type:**
```typescript
interface AttachKeyToVaultRequest {
  vault_id: string  // Target vault ID
  key_id: string    // Key ID to attach (from registry)
}
```

**Response Type:**
```typescript
interface AttachKeyToVaultResponse {
  success: boolean
  key_reference: KeyReference
  warnings: string[]  // Optional warnings (e.g., "Key already attached to 2 other vaults")
}

interface KeyReference {
  id: string
  label: string
  type: "passphrase" | "yubikey"
  state: KeyState
  created_at: string
  last_used: string | null
  // Type-specific data
  data?: {
    key_id?: string           // For passphrase
    serial?: string           // For YubiKey
    firmware_version?: string // For YubiKey
  }
}

type KeyState =
  | "active"         // Available and can be used
  | "registered"     // Registered but not currently available
  | "orphaned"       // Not associated with any vault
```

**Usage Example:**
```typescript
try {
  const result = await commands.attachKeyToVault({
    vault_id: "vault-123",
    key_id: "orphaned-key-456"
  });

  if (result.success) {
    console.log("Key attached:", result.key_reference.label);

    // Show warnings if any
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.warn(warning));
    }
  }
} catch (error) {
  console.error("Failed to attach key:", error);
}
```

**Error Cases:**
- Key not found
- Vault not found
- Key already attached to this vault
- Vault at maximum key limit (4 keys)
- Key in invalid lifecycle state (e.g., deactivated)

---

## API 3: Import Key File ✅

### Command Available

```typescript
import { commands } from '../bindings';

// Import an external .enc key file
const result = await commands.importKeyFile({
  file_path: "/Users/john/backup/my-key.agekey.enc",
  passphrase: "mySecurePassphrase123",
  override_label: "Imported Backup Key",
  attach_to_vault: "vault-123",  // Optional
  validate_only: false
});
```

**Request Type:**
```typescript
interface ImportKeyFileRequest {
  file_path: string              // Absolute path to .enc file
  passphrase?: string            // Required for encrypted key files
  override_label?: string        // Optional custom label
  attach_to_vault?: string       // Optional immediate attachment
  validate_only: boolean         // If true, only validates without importing
}
```

**Response Type:**
```typescript
interface ImportKeyFileResponse {
  key_reference: KeyReference
  validation_status: ValidationStatus
  import_warnings: string[]
}

interface ValidationStatus {
  is_valid: boolean
  is_duplicate: boolean
  original_metadata?: KeyMetadata
}

interface KeyMetadata {
  label: string
  created_at: string
  key_type: "passphrase" | "yubikey"
  public_key?: string      // For passphrase keys
  recipient?: string       // For YubiKey keys
  serial?: string          // For YubiKey keys
}
```

**Usage Examples:**

**1. Standard Import:**
```typescript
const result = await commands.importKeyFile({
  file_path: "/backup/key.agekey.enc",
  passphrase: "myPassword",
  override_label: null,
  attach_to_vault: null,
  validate_only: false
});

if (result.validation_status.is_valid) {
  console.log("Key imported:", result.key_reference.id);

  if (result.validation_status.is_duplicate) {
    console.warn("This key already exists in registry");
  }
}
```

**2. Dry-Run Validation:**
```typescript
// Validate without importing
const validation = await commands.importKeyFile({
  file_path: "/unknown/key.enc",
  passphrase: "test",
  override_label: null,
  attach_to_vault: null,
  validate_only: true  // Only validate, don't import
});

if (validation.validation_status.is_valid) {
  console.log("File is valid, safe to import");
  console.log("Original label:", validation.validation_status.original_metadata?.label);
}
```

**3. Import with Immediate Attachment:**
```typescript
// Import and attach to vault in one operation
const result = await commands.importKeyFile({
  file_path: "/backup/key.enc",
  passphrase: "password",
  override_label: "Production Key",
  attach_to_vault: "vault-123",  // Attach immediately
  validate_only: false
});
```

**Error Cases:**
- File not found or unreadable
- Invalid .enc file format
- Incorrect passphrase
- Corrupted file data
- Invalid age key format
- Vault not found (if attach_to_vault specified)

---

## Bonus: Key Lifecycle Management 🎁

### New Unified Lifecycle States

All keys now follow a NIST-aligned lifecycle:

```typescript
type KeyLifecycleStatus =
  | "pre_activation"  // Generated but never used
  | "active"          // Currently in use
  | "suspended"       // Temporarily disabled
  | "deactivated"     // Permanently disabled (30-day retention)
  | "destroyed"       // Cryptographically destroyed
  | "compromised"     // Security incident detected
```

### Status History Tracking

Every key now has an audit trail:

```typescript
interface StatusHistoryEntry {
  status: KeyLifecycleStatus
  timestamp: string  // ISO format
  reason: string
  changed_by: "user" | "system" | "security"
}
```

### Key Registry Schema v2

The key registry now includes:
```json
{
  "schema": "barqly.vault.registry/2",
  "keys": {
    "key-id": {
      "lifecycle_status": "active",
      "status_history": [
        {
          "status": "pre_activation",
          "timestamp": "2025-01-11T10:00:00Z",
          "reason": "Key created",
          "changed_by": "system"
        },
        {
          "status": "active",
          "timestamp": "2025-01-11T10:05:00Z",
          "reason": "Attached to vault",
          "changed_by": "user"
        }
      ],
      "vault_associations": ["vault-1", "vault-2"]
    }
  }
}
```

---

## Integration Guide

### Step 1: Update Imports
```typescript
import { commands } from '../bindings';
```

### Step 2: Remove Mock Data

**Before (VaultCard.tsx):**
```typescript
const lastEncrypted = 'Mock: 2 hours ago';
const vaultSize = 'Mock: 125 MB';
const fileCount = 'Mock: 42 files';
```

**After:**
```typescript
const [stats, setStats] = useState(null);

useEffect(() => {
  const loadStats = async () => {
    const result = await commands.getVaultStatistics({
      vault_id: vault.id
    });
    setStats(result);
  };
  loadStats();
}, [vault.id]);

// Use real data
const lastEncrypted = stats?.encryption_history.last_encrypted_at
  ? formatDate(stats.encryption_history.last_encrypted_at)
  : 'Never';
const vaultSize = formatBytes(stats?.content_stats.total_size_bytes || 0);
const fileCount = stats?.content_stats.file_count || 0;
```

### Step 3: Handle Key Attachment

**In ManageKeysPage.tsx:**
```typescript
const handleAttachToVault = async (keyId: string, vaultId: string) => {
  try {
    const result = await commands.attachKeyToVault({
      vault_id: vaultId,
      key_id: keyId
    });

    if (result.success) {
      showToast('Key attached successfully');
      refreshKeyList();
    }
  } catch (error) {
    showError('Failed to attach key: ' + error.message);
  }
};
```

### Step 4: Implement Key Import

```typescript
const handleImport = async (file: File) => {
  const filePath = file.path; // Tauri provides this
  const passphrase = await promptForPassphrase();

  try {
    // First, validate
    const validation = await commands.importKeyFile({
      file_path: filePath,
      passphrase: passphrase,
      override_label: null,
      attach_to_vault: null,
      validate_only: true
    });

    if (!validation.validation_status.is_valid) {
      showError('Invalid key file');
      return;
    }

    if (validation.validation_status.is_duplicate) {
      const proceed = await confirmDialog('Key already exists. Import anyway?');
      if (!proceed) return;
    }

    // Import for real
    const result = await commands.importKeyFile({
      file_path: filePath,
      passphrase: passphrase,
      override_label: null,
      attach_to_vault: null,
      validate_only: false
    });

    showToast('Key imported: ' + result.key_reference.label);
    refreshKeyList();
  } catch (error) {
    showError('Import failed: ' + error.message);
  }
};
```

---

## Status Badges in UI

Map lifecycle status to UI badges:

```typescript
function getLifecycleStatusBadge(status: KeyLifecycleStatus) {
  switch(status) {
    case 'pre_activation':
      return { label: 'New', color: 'gray', icon: '○' };
    case 'active':
      return { label: 'Active', color: 'green', icon: '●' };
    case 'suspended':
      return { label: 'Suspended', color: 'yellow', icon: '⏸' };
    case 'deactivated':
      return { label: 'Deactivated', color: 'red', icon: '⊘' };
    case 'compromised':
      return { label: 'Compromised', color: 'red', icon: '⚠' };
    default:
      return { label: 'Unknown', color: 'gray', icon: '?' };
  }
}
```

---

## Error Handling

All commands return structured errors via Tauri's Result type:

```typescript
try {
  const result = await commands.someCommand(input);
  // Success
} catch (error) {
  // Error structure:
  // {
  //   code: "VAULT_NOT_FOUND" | "KEY_NOT_FOUND" | "INVALID_INPUT" | ...,
  //   message: "User-friendly error message",
  //   details: "Technical details (optional)",
  //   recovery_guidance: "What user should do next (optional)"
  // }

  console.error(error.message);
  if (error.recovery_guidance) {
    showHint(error.recovery_guidance);
  }
}
```

---

## Testing Checklist

### Vault Statistics
- [ ] Display real last-encrypted timestamp (not "Mock: 2 hours ago")
- [ ] Show correct vault status badge (new/active/orphaned/incomplete)
- [ ] Display accurate file count
- [ ] Display accurate total size
- [ ] Show key count with breakdown by type
- [ ] Handle vaults that have never been encrypted (null timestamps)

### Key Attachment
- [ ] Attach orphaned passphrase key to vault
- [ ] Attach orphaned YubiKey to vault
- [ ] Show error when vault already has 4 keys
- [ ] Show error when key is already attached
- [ ] Update UI after successful attachment

### Key Import
- [ ] Import passphrase .enc file with valid passphrase
- [ ] Import passphrase .enc file with wrong passphrase (should error)
- [ ] Import corrupted file (should error with validation failure)
- [ ] Detect duplicate keys with warning
- [ ] Validate-only mode (dry-run without importing)
- [ ] Import with immediate vault attachment
- [ ] Display original metadata during validation

---

## Performance Notes

- `get_all_vault_statistics` is more efficient than calling `get_vault_statistics` multiple times
- Vault statistics are cached internally for performance
- Cache invalidates on vault modifications (encrypt/decrypt/key changes)
- Import operations validate file format before performing expensive decryption

---

## Migration from Mock Data

### Priority Order
1. **High Priority**: `getVaultStatistics` - Removes all "Mock:" text from vault cards
2. **Medium Priority**: `attachKeyToVault` - Enables orphaned key recovery
3. **Low Priority**: `importKeyFile` - Nice-to-have for backup restoration

### Breaking Changes
- None! All APIs are additive
- Existing vault and key operations continue to work
- Key lifecycle status is backward compatible

---

## Support & Documentation

- **Architecture**: `/docs/architecture/key-lifecycle-management.md`
- **Implementation Plan**: `/docs/engineering/refactoring/backend/r2-api-implementation-plan.md`
- **API Registration**: `/docs/common/api-command-registration.md`

---

## Summary

✅ **All requested APIs implemented**
✅ **TypeScript bindings generated**
✅ **Runtime registration complete**
✅ **Backend tests passing**
✅ **Ready for frontend integration**

The R2 UI can now remove all mock data and use real backend APIs for vault statistics, key management, and file imports.

---

*Last Updated: 2025-01-11*