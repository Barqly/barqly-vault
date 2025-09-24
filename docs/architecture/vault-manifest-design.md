# Vault Manifest Design

## Overview

The vault manifest is a single JSON file that serves as the complete source of truth for a vault's lifecycle. It grows organically as operations are performed, maintaining all vault metadata, key associations, and encryption history in one cohesive document.

## Design Principles

1. **Single Source of Truth**: One manifest per vault containing ALL vault information
2. **Progressive Enhancement**: The manifest grows as operations are performed (create → add keys → encrypt files)
3. **Backward Compatibility**: Versioning enables future migrations and compatibility
4. **User-Friendly**: Users see one manifest file per vault, reducing confusion
5. **Backup-Ready**: Complete vault state in one file, ready for signing and backup

## Manifest Structure

### Root Fields

```json
{
  "manifest_version": "0.1.0",  // Schema version (semver format)
  "app_version": "0.1.0",        // App version that created/last updated
  "id": "QxBpgim7BSEzdKdAVwEt2K",
  "name": "sam-family-vault",
  "description": "This is my family vault",
  "created_at": "2025-09-20T02:15:50.703796Z",
  "updated_at": "2025-09-23T16:41:42.007144Z",
  "keys": [...],
  "encrypted_archives": [...]
}
```

### Key Reference Structure

```json
{
  "type": "passphrase" | "yubikey",
  "id": "keyref_XREr5Z45gSF",
  "label": "mbp2024-nauman",
  "state": "active" | "registered" | "orphaned",
  "created_at": "2025-09-20T02:17:57.405281Z",
  "last_used": "2025-09-23T16:41:42.007144Z" | null,

  // For passphrase keys:
  "key_id": "mbp2024-nauman",

  // For YubiKey:
  "serial": "31310420",
  "slot_index": 0,
  "piv_slot": 82,
  "firmware_version": "5.4.3"  // Critical for compatibility
}
```

### Encrypted Archive Structure

```json
{
  "filename": "Sam Family Vault.age",
  "encrypted_at": "2025-09-23T16:41:42.007144Z",
  "total_files": 1,
  "total_size": "7.6 KB",
  "contents": [
    {
      "file": "Book1.xlsx",
      "size": "9.6 KB",
      "hash": "23157a33..."
    }
  ]
  // Note: No keys_used field - all vault keys are always used
}
```

## Manifest Evolution

### Stage 1: Vault Creation
```json
{
  "manifest_version": "0.1.0",
  "app_version": "0.1.0",
  "id": "QxBpgim7BSEzdKdAVwEt2K",
  "name": "sam-family-vault",
  "description": "This is my family vault",
  "created_at": "2025-09-20T02:15:50.703796Z",
  "updated_at": "2025-09-20T02:15:50.703796Z",
  "keys": []
}
```

### Stage 2: Keys Added
```json
{
  // ... previous fields ...
  "updated_at": "2025-09-20T02:17:57.405281Z",
  "keys": [
    {
      "type": "passphrase",
      "key_id": "mbp2024-nauman",
      // ... key details ...
    }
  ]
}
```

### Stage 3: Files Encrypted
```json
{
  // ... previous fields ...
  "updated_at": "2025-09-23T16:41:42.007144Z",
  "encrypted_archives": [
    {
      "filename": "Sam Family Vault.age",
      // ... archive details ...
    }
  ]
}
```

## Version Management

### manifest_version (Schema Version)
- **Purpose**: Tracks manifest structure changes
- **Format**: Semantic versioning (e.g., "0.1.0")
- **Use Cases**:
  - Schema migrations when fields are added/removed/changed
  - Backward compatibility parsing
  - Forward compatibility warnings

### app_version (Creator Version)
- **Purpose**: Tracks which app version created/modified the vault
- **Format**: Matches application version
- **Use Cases**:
  - Security fixes: Identify vaults needing re-encryption
  - Bug workarounds: Handle known issues from specific versions
  - Feature gating: Enable/disable features based on creation version
  - Support/debugging: Immediate context for troubleshooting

## Backward Compatibility Strategy

```rust
// Example migration logic
match manifest.manifest_version.as_str() {
    "0.1.0" => migrate_v0_1_to_current(manifest),
    "0.2.0" => migrate_v0_2_to_current(manifest),
    "1.0.0" => Ok(manifest), // Current version
    version if version > CURRENT_VERSION => {
        Err("This vault requires a newer app version")
    },
    _ => Err("Unknown manifest version")
}
```

## File Locations

- **Vault Manifest**: `~/Documents/Barqly-Vaults/{vault_name}.manifest`
- **Encrypted Archive**: `~/Documents/Barqly-Vaults/{vault_name}.age`
- **Key Metadata**: `~/Library/Application Support/com.Barqly.Vault/keys/{key_id}.agekey.meta`

## Security Considerations

1. **No Redundant Data**: Removed `keys_used` field to avoid confusion - all vault keys are always used for encryption
2. **Firmware Tracking**: YubiKey firmware versions enable security update tracking
3. **Audit Trail**: Complete history via `created_at` and `updated_at` timestamps
4. **Future Signing**: Manifest structure supports future digital signatures for integrity verification

## Implementation Notes

### When Encrypting Files
1. Load existing vault manifest
2. Add/update `encrypted_archives` array
3. Update `updated_at` timestamp
4. Save merged manifest (preserving all existing data)

### When Decrypting
1. Load vault manifest to get available keys
2. Use manifest data to populate decryption UI
3. Reference `encrypted_archives` for file metadata

## Migration Path from Current Implementation

The current implementation overwrites the vault manifest with encryption metadata. To fix:

1. Change encryption process to merge data instead of overwrite
2. Update Vault model to include `manifest_version` and `app_version`
3. Add `encrypted_archives` field to Vault model
4. Update YubiKey reference to include `firmware_version`
5. Modify `encrypt_files_multi` to update manifest instead of creating external manifest
6. Update decryption to read from unified manifest

## Future Enhancements

1. **Digital Signatures**: Sign manifests for integrity verification
2. **Compression**: Optional compression for large manifest files
3. **Cloud Sync Metadata**: Track sync status and conflicts
4. **Access Logs**: Optional audit trail of vault access
5. **Key Rotation History**: Track when keys were rotated