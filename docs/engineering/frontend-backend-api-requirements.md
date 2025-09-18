# Frontend Backend API Requirements

## Unified Key Menu - Backend API Requirements

### Context
The frontend has implemented the Unified Key Menu components (KeyMenuGrid, PassphraseSlot, YubiKeySlot) as part of the YubiKey UX project plan. These components require backend APIs to function properly with the new vault-centric architecture.

### Required Backend APIs

#### 1. Vault Key Management APIs

**Get Vault Keys**
```typescript
// Command: get_vault_keys
interface GetVaultKeysRequest {
  vault_id: string;
}

interface KeyReference {
  type: 'passphrase' | 'yubikey';
  id: string;
  label: string;
  state: 'active' | 'registered' | 'orphaned';
  serial?: string; // For YubiKeys
  slot_index?: number; // 0-2 for YubiKeys
  created_at: string;
  last_used?: string;
}

interface GetVaultKeysResponse {
  vault_id: string;
  keys: KeyReference[];
}
```

**Add Key to Vault**
```typescript
// Command: add_key_to_vault
interface AddKeyToVaultRequest {
  vault_id: string;
  key_type: 'passphrase' | 'yubikey';
  passphrase?: string; // For passphrase keys
  yubikey_serial?: string; // For YubiKey
  label: string;
}

interface AddKeyToVaultResponse {
  success: boolean;
  key_reference: KeyReference;
}
```

**Remove Key from Vault**
```typescript
// Command: remove_key_from_vault
interface RemoveKeyFromVaultRequest {
  vault_id: string;
  key_id: string;
}

interface RemoveKeyFromVaultResponse {
  success: boolean;
}
```

#### 2. Vault Management APIs

**Create Vault**
```typescript
// Command: create_vault
interface CreateVaultRequest {
  name: string;
  description?: string;
}

interface Vault {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  key_count: number;
}

interface CreateVaultResponse {
  vault: Vault;
}
```

**List Vaults**
```typescript
// Command: list_vaults
interface ListVaultsResponse {
  vaults: Vault[];
}
```

**Get Current Vault**
```typescript
// Command: get_current_vault
interface GetCurrentVaultResponse {
  vault: Vault | null;
}
```

**Set Current Vault**
```typescript
// Command: set_current_vault
interface SetCurrentVaultRequest {
  vault_id: string;
}

interface SetCurrentVaultResponse {
  success: boolean;
  vault: Vault;
}
```

#### 3. Key State Management APIs

**Check YubiKey Availability**
```typescript
// Command: check_yubikey_availability
interface CheckYubiKeyAvailabilityRequest {
  serial: string;
}

interface CheckYubiKeyAvailabilityResponse {
  is_inserted: boolean;
  is_configured: boolean;
  needs_recovery: boolean;
}
```

**Update Key Label**
```typescript
// Command: update_key_label
interface UpdateKeyLabelRequest {
  vault_id: string;
  key_id: string;
  new_label: string;
}

interface UpdateKeyLabelResponse {
  success: boolean;
}
```

### Data Model Requirements

The backend needs to implement the following data structures:

1. **Vault Model**
   - Remove all references to `ProtectionMode`
   - Add support for multiple keys per vault
   - Each vault can have 1 passphrase + up to 3 YubiKeys

2. **Key Reference Model**
   - Keys belong to vaults (not global)
   - Keys can be shared across vaults
   - Track key state (active, registered, orphaned)

### Migration Requirements

Since the app was released 2 weeks ago, the backend needs to:

1. Detect vaults using old `ProtectionMode` structure
2. Auto-migrate to new vault-centric structure
3. Preserve all existing keys
4. Create backup before migration

### Frontend Integration Points

The frontend components have TODOs marking where backend integration is needed:

1. **KeyMenuGrid.tsx:21** - Needs `getVaultKeys` API
2. **KeyMenuGrid.tsx:38** - Needs vault key state for passphrase
3. **KeyMenuGrid.tsx:45,52,59** - Needs vault key state for YubiKeys

### Security Considerations

1. All key operations must be authenticated
2. Passphrase should never be returned in API responses
3. YubiKey PINs should never be stored or returned
4. Recovery codes should only be shown once during setup

### Performance Requirements

1. Key detection should complete in <500ms
2. Vault switching should be instant (<100ms)
3. Key state checks should be cached appropriately

### Error Handling

The backend should return appropriate error codes for:
- Vault not found
- Key not found
- YubiKey not inserted
- Invalid passphrase
- Duplicate key registration
- Maximum keys exceeded (3 YubiKeys per vault)

### Next Steps for Backend Engineer

1. Review this requirements document
2. Implement the Vault and KeyReference models
3. Create the required Tauri commands
4. Generate TypeScript types using the existing script
5. Test with the frontend components

### References

- Project Plan: `/docs/product/roadmap/ux-yubikey/ux-yubi-project-plan.md`
- Design Spec: `/docs/product/roadmap/ux-yubikey/unified-key-menu-design.md`
- Frontend Components: `/src-ui/src/components/keys/`