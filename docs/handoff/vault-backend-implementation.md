# Vault Backend Implementation - Frontend Integration Guide

## Overview
The backend vault-centric architecture has been implemented. This document provides the integration guide for frontend engineers to connect the UI components with the new backend APIs.

## Status: ✅ Backend Complete

### Completed Items
1. **Vault Model** - `/src-tauri/src/models/vault.rs`
   - `Vault` struct with id, name, description, keys
   - `KeyReference` enum for Passphrase/YubiKey types
   - `KeyState` enum (Active, Registered, Orphaned)
   - `VaultSummary` for listing operations

2. **Vault Commands** - `/src-tauri/src/commands/vault_commands/`
   - Vault CRUD operations
   - Key management within vaults
   - YubiKey availability checking

3. **Storage Layer** - `/src-tauri/src/storage/vault_store/`
   - JSON-based vault persistence
   - Automatic migration from ProtectionMode
   - Atomic file operations

## New Tauri Commands Available

### Vault Management
```typescript
// Create a new vault
create_vault(input: CreateVaultRequest) -> CreateVaultResponse

// List all vaults
list_vaults() -> ListVaultsResponse

// Get current active vault
get_current_vault() -> GetCurrentVaultResponse

// Set current active vault
set_current_vault(input: SetCurrentVaultRequest) -> SetCurrentVaultResponse

// Delete a vault
delete_vault(input: DeleteVaultRequest) -> DeleteVaultResponse
```

### Key Management
```typescript
// Get all keys for a vault
get_vault_keys(input: GetVaultKeysRequest) -> GetVaultKeysResponse

// Add key to vault
add_key_to_vault(input: AddKeyToVaultRequest) -> AddKeyToVaultResponse

// Remove key from vault
remove_key_from_vault(input: RemoveKeyFromVaultRequest) -> RemoveKeyFromVaultResponse

// Update key label
update_key_label(input: UpdateKeyLabelRequest) -> UpdateKeyLabelResponse

// Check YubiKey availability
check_yubikey_availability(input: CheckYubiKeyAvailabilityRequest) -> CheckYubiKeyAvailabilityResponse
```

## TypeScript Interface Definitions

### Request Types
```typescript
interface CreateVaultRequest {
  name: string;
  description?: string;
}

interface GetVaultKeysRequest {
  vault_id: string;
}

interface AddKeyToVaultRequest {
  vault_id: string;
  key_type: 'passphrase' | 'yubikey';
  passphrase?: string; // For passphrase keys
  yubikey_serial?: string; // For YubiKey
  label: string;
}

interface RemoveKeyFromVaultRequest {
  vault_id: string;
  key_id: string;
}

interface UpdateKeyLabelRequest {
  vault_id: string;
  key_id: string;
  new_label: string;
}

interface CheckYubiKeyAvailabilityRequest {
  serial: string;
}
```

### Response Types
```typescript
interface VaultSummary {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  key_count: number;
  is_current: boolean;
}

interface KeyReference {
  id: string;
  key_type: {
    type: 'passphrase' | 'yubikey';
    // Additional fields based on type
  };
  label: string;
  state: 'active' | 'registered' | 'orphaned';
  created_at: string;
  last_used?: string;
}

interface GetVaultKeysResponse {
  vault_id: string;
  keys: KeyReference[];
}
```

## Frontend Integration Steps

### ✅ ALREADY DONE: TypeScript Types and Command Mappings
The backend engineer has already:
1. Generated all TypeScript types in `/src-ui/src/lib/api-types.ts`
2. Updated `/src-ui/src/lib/tauri-safe.ts` with new vault command mappings
3. All vault types and interfaces are ready to use

### 1. ~~Update tauri-safe.ts Command Mappings~~ ✅ COMPLETE
~~Add the new vault commands to the command parameter map:~~
```typescript
const commandParameterMap: Record<string, string | null> = {
  // ... existing commands

  // Vault commands
  create_vault: 'input',
  list_vaults: null,
  get_current_vault: null,
  set_current_vault: 'input',
  delete_vault: 'input',
  get_vault_keys: 'input',
  add_key_to_vault: 'input',
  remove_key_from_vault: 'input',
  update_key_label: 'input',
  check_yubikey_availability: 'input',
};
```

### 2. Update KeyMenuGrid Component
Replace the TODO placeholders with actual API calls:

```typescript
// KeyMenuGrid.tsx:21
const { data: keysResponse } = await safeInvoke('get_vault_keys', {
  vault_id: vaultId
});
const keys = keysResponse.keys;

// KeyMenuGrid.tsx:38,45,52,59
// Map keys to component props
const passphraseKey = keys.find(k => k.key_type.type === 'passphrase');
const yubiKeys = keys.filter(k => k.key_type.type === 'yubikey');
```

### 3. Migration from ProtectionMode

The backend automatically migrates old vaults on first load. No frontend action required, but be aware:
- Old `ProtectionMode` fields are converted to `KeyReference` arrays
- `PassphraseOnly` → 1 passphrase key
- `YubiKeyOnly` → 1 YubiKey
- `Hybrid` → 1 passphrase + 1 YubiKey

### 4. Error Handling

All commands return standard error format:
```typescript
interface CommandError {
  code: ErrorCode;
  message: string;
  details?: string;
  recovery_guidance?: string;
  user_actionable: boolean;
}
```

Common error codes:
- `InvalidInput` - Validation failed
- `KeyNotFound` - Vault or key not found
- `StorageFailed` - File system error

## Testing the Integration

1. **Create a vault:**
```typescript
const result = await safeInvoke('create_vault', {
  name: 'Test Vault',
  description: 'My first vault'
});
```

2. **Add a passphrase key:**
```typescript
const result = await safeInvoke('add_key_to_vault', {
  vault_id: vaultId,
  key_type: 'passphrase',
  passphrase: 'secure-password',
  label: 'Main Password'
});
```

3. **Get vault keys:**
```typescript
const result = await safeInvoke('get_vault_keys', {
  vault_id: vaultId
});
console.log('Keys:', result.keys);
```

## Next Steps for Frontend

1. **Remove ProtectionMode References**
   - Search and remove all `ProtectionMode` usage
   - Update components to use vault/key model

2. **Update Existing Components**
   - `KeyMenuGrid.tsx` - Wire up API calls
   - `PassphraseSlot.tsx` - Use key state from API
   - `YubiKeySlot.tsx` - Use key state from API

3. **Create Vault Management UI**
   - Vault creation dialog
   - Vault switcher dropdown
   - Vault settings page

4. **Test End-to-End**
   - Create vault → Add keys → Encrypt → Decrypt flow
   - Multiple vault switching
   - Key state updates (insert/remove YubiKey)

## Important Notes

1. **Key Generation**: The `add_key_to_vault` command currently creates placeholder key IDs. Integration with actual `generate_key` command needed.

2. **YubiKey State**: The `check_yubikey_availability` command provides basic detection. Full YubiKey state management requires additional work.

3. **Data Migration**: First run will automatically migrate existing vaults. Test with backup data first.

4. **File Locations**: Vaults stored in `~/.barqly-vault/vaults/*.json` (platform-specific paths)

## Contact

For questions or issues with the backend implementation:
- Review code in `/src-tauri/src/commands/vault_commands/`
- Check tests in `/src-tauri/src/storage/vault_store/persistence.rs`
- See original requirements in `/docs/engineering/frontend-backend-api-requirements.md`