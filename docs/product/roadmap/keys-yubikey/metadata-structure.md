# Metadata Structure for Multi-Recipient Support

## Overview

This document details the metadata structure changes required to support multiple recipients (passphrase keys and YubiKeys) in Barqly Vault.

## Current Metadata Structure (v1.0)

### Key Metadata File: `{key-name}.agekey.meta`

```json
{
  "label": "family-vault",
  "created_at": "2025-08-08T15:52:09.347467Z",
  "file_path": "~/Library/Application Support/com.barqly.vault/keys/family-vault.agekey.enc",
  "public_key": "age1aajp29j7rdpp709mk5ejjufnt49mk00zq4svgs74kct5qjj7fqjsyc83dr",
  "passphrase_hint": "Anniversary + dog's nickname",
  "last_accessed": null
}
```

## New Metadata Structure (v2.0)

### Key Metadata File: `{key-name}.agekey.meta`

```json
{
  "version": "2.0",
  "label": "family-vault",
  "created_at": "2025-08-08T15:52:09.347467Z",
  "updated_at": "2025-08-09T10:30:00.000000Z",
  "encryption_config": {
    "mode": "both", // "passphrase" | "yubikey" | "both"
    "algorithm": "age-v1"
  },
  "recipients": [
    {
      "id": "rec_01H5K3B4C5D6E7F8G9",
      "type": "passphrase",
      "public_key": "age1aajp29j7rdpp709mk5ejjufnt49mk00zq4svgs74kct5qjj7fqjsyc83dr",
      "label": "Primary passphrase key",
      "passphrase_hint": "Anniversary + dog's nickname",
      "file_path": "~/Library/Application Support/com.barqly.vault/keys/family-vault.agekey.enc",
      "added_at": "2025-08-08T15:52:09.347467Z",
      "last_used": "2025-08-09T09:15:00.000000Z",
      "status": "active"
    },
    {
      "id": "rec_01H5K3B4C5D6E7F8GA",
      "type": "yubikey",
      "public_key": "age1yubikey1qwt50d05nh5vutpdzmlg5wn80xq5sturcpryy0mvf6gydqu28gdyyqe5k",
      "label": "YubiKey 5C NFC",
      "device_info": {
        "serial": 12345678,
        "version": "5.4.3",
        "slot": "0x82"
      },
      "added_at": "2025-08-08T16:00:00.000000Z",
      "last_used": "2025-08-09T10:30:00.000000Z",
      "status": "active"
    },
    {
      "id": "rec_01H5K3B4C5D6E7F8GB",
      "type": "yubikey",
      "public_key": "age1yubikey1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678ab",
      "label": "Backup YubiKey 5",
      "device_info": {
        "serial": 87654321,
        "version": "5.4.3",
        "slot": "0x82"
      },
      "added_at": "2025-08-08T16:05:00.000000Z",
      "last_used": null,
      "status": "active"
    }
  ],
  "backup_locations": [
    {
      "type": "usb",
      "path": "/Volumes/BackupDrive/Barqly-Keys/",
      "backed_up_at": "2025-08-08T17:00:00.000000Z"
    }
  ],
  "statistics": {
    "total_encryptions": 42,
    "total_decryptions": 15,
    "last_encryption": "2025-08-09T10:00:00.000000Z",
    "last_decryption": "2025-08-09T10:30:00.000000Z"
  }
}
```

## Vault Metadata Structure

### For Each Encrypted Vault: `{vault-name}.age.meta`

```json
{
  "version": "2.0",
  "vault_id": "vault_01H5K3B4C5D6E7F8G9",
  "original_file": {
    "name": "bitcoin-wallet-seeds.txt",
    "size_bytes": 1024,
    "mime_type": "text/plain",
    "checksum": "sha256:abcdef1234567890..."
  },
  "encryption": {
    "encrypted_at": "2025-08-08T20:00:00.000000Z",
    "key_label": "family-vault",
    "algorithm": "age-v1",
    "recipients": [
      {
        "type": "passphrase",
        "public_key": "age1aajp29j7rdpp709mk5ejjufnt49mk00zq4svgs74kct5qjj7fqjsyc83dr",
        "label": "Primary passphrase key"
      },
      {
        "type": "yubikey",
        "public_key": "age1yubikey1qwt50d05nh5vutpdzmlg5wn80xq5sturcpryy0mvf6gydqu28gdyyqe5k",
        "label": "YubiKey 5C NFC (#12345678)"
      },
      {
        "type": "yubikey",
        "public_key": "age1yubikey1abc123def456ghi789jkl012mno345pqr678stu901vwx234yz5678ab",
        "label": "Backup YubiKey 5 (#87654321)"
      }
    ]
  },
  "access_log": [
    {
      "action": "encrypted",
      "timestamp": "2025-08-08T20:00:00.000000Z",
      "method": "passphrase"
    },
    {
      "action": "decrypted",
      "timestamp": "2025-08-09T10:30:00.000000Z",
      "method": "yubikey",
      "device_serial": 12345678
    }
  ]
}
```

## Migration Strategy

### Detecting Version

```rust
#[derive(Deserialize)]
#[serde(untagged)]
pub enum MetadataVersion {
    V1(MetadataV1),
    V2(MetadataV2),
}

impl MetadataVersion {
    pub fn load(path: &Path) -> Result<MetadataV2, Error> {
        let content = fs::read_to_string(path)?;
        let metadata: MetadataVersion = serde_json::from_str(&content)?;

        match metadata {
            MetadataVersion::V1(v1) => Ok(Self::migrate_v1_to_v2(v1)),
            MetadataVersion::V2(v2) => Ok(v2),
        }
    }

    fn migrate_v1_to_v2(v1: MetadataV1) -> MetadataV2 {
        MetadataV2 {
            version: "2.0".to_string(),
            label: v1.label,
            created_at: v1.created_at,
            updated_at: Utc::now(),
            encryption_config: EncryptionConfig {
                mode: "passphrase".to_string(),
                algorithm: "age-v1".to_string(),
            },
            recipients: vec![Recipient {
                id: generate_recipient_id(),
                type_: "passphrase".to_string(),
                public_key: v1.public_key,
                label: "Primary passphrase key".to_string(),
                passphrase_hint: v1.passphrase_hint,
                file_path: Some(v1.file_path),
                added_at: v1.created_at,
                last_used: v1.last_accessed,
                status: "active".to_string(),
                device_info: None,
            }],
            backup_locations: vec![],
            statistics: Statistics::default(),
        }
    }
}
```

### Backward Compatibility

```rust
// When loading old vaults without metadata
pub fn infer_recipients(vault_path: &Path) -> Vec<Recipient> {
    // Try to parse age file headers to identify recipients
    let mut recipients = vec![];

    if let Ok(file) = File::open(vault_path) {
        if let Ok(decryptor) = age::Decryptor::new(file) {
            // Age files contain recipient information in headers
            // This is a fallback for vaults without .meta files
        }
    }

    recipients
}
```

## TypeScript Types

```typescript
// types/metadata.ts

export interface MetadataV2 {
  version: "2.0";
  label: string;
  createdAt: string;
  updatedAt: string;
  encryptionConfig: EncryptionConfig;
  recipients: Recipient[];
  backupLocations: BackupLocation[];
  statistics: Statistics;
}

export interface EncryptionConfig {
  mode: "passphrase" | "yubikey" | "both";
  algorithm: "age-v1";
}

export interface Recipient {
  id: string;
  type: "passphrase" | "yubikey";
  publicKey: string;
  label: string;
  passphraseHint?: string;
  filePath?: string;
  deviceInfo?: YubiKeyInfo;
  addedAt: string;
  lastUsed: string | null;
  status: "active" | "removed";
}

export interface YubiKeyInfo {
  serial: number;
  version: string;
  slot: string;
}

export interface BackupLocation {
  type: "usb" | "file" | "printed";
  path?: string;
  backedUpAt: string;
}

export interface Statistics {
  totalEncryptions: number;
  totalDecryptions: number;
  lastEncryption: string | null;
  lastDecryption: string | null;
}

export interface VaultMetadata {
  version: "2.0";
  vaultId: string;
  originalFile: FileInfo;
  encryption: EncryptionInfo;
  accessLog: AccessLogEntry[];
}

export interface FileInfo {
  name: string;
  sizeBytes: number;
  mimeType: string;
  checksum: string;
}

export interface EncryptionInfo {
  encryptedAt: string;
  keyLabel: string;
  algorithm: "age-v1";
  recipients: RecipientSummary[];
}

export interface RecipientSummary {
  type: "passphrase" | "yubikey";
  publicKey: string;
  label: string;
}

export interface AccessLogEntry {
  action: "encrypted" | "decrypted";
  timestamp: string;
  method: "passphrase" | "yubikey";
  deviceSerial?: number;
}
```

## API Changes

### Reading Metadata

```rust
#[tauri::command]
pub async fn get_key_metadata(
    key_label: String
) -> CommandResponse<MetadataV2> {
    let path = get_metadata_path(&key_label)?;
    let metadata = MetadataVersion::load(&path)?;

    Ok(CommandResponse::Success {
        data: metadata,
        message: format!("Loaded metadata for {}", key_label),
    })
}
```

### Updating Recipients

```rust
#[tauri::command]
pub async fn add_recipient(
    key_label: String,
    recipient: NewRecipient,
) -> CommandResponse<MetadataV2> {
    let mut metadata = load_metadata(&key_label)?;

    // Add new recipient
    metadata.recipients.push(Recipient {
        id: generate_recipient_id(),
        type_: recipient.type_,
        public_key: recipient.public_key,
        label: recipient.label,
        added_at: Utc::now(),
        last_used: None,
        status: "active".to_string(),
        ..Default::default()
    });

    metadata.updated_at = Utc::now();
    save_metadata(&key_label, &metadata)?;

    Ok(CommandResponse::Success {
        data: metadata,
        message: format!("Added recipient to {}", key_label),
    })
}
```

### Removing Recipients

```rust
#[tauri::command]
pub async fn remove_recipient(
    key_label: String,
    recipient_id: String,
) -> CommandResponse<MetadataV2> {
    let mut metadata = load_metadata(&key_label)?;

    // Don't actually delete, just mark as removed
    if let Some(recipient) = metadata.recipients.iter_mut()
        .find(|r| r.id == recipient_id) {
        recipient.status = "removed".to_string();
    }

    // Check if at least one active recipient remains
    let active_count = metadata.recipients.iter()
        .filter(|r| r.status == "active")
        .count();

    if active_count == 0 {
        return Err(CommandError {
            code: ErrorCode::InvalidOperation,
            message: "Cannot remove last recipient".to_string(),
        });
    }

    metadata.updated_at = Utc::now();
    save_metadata(&key_label, &metadata)?;

    Ok(CommandResponse::Success {
        data: metadata,
        message: format!("Removed recipient from {}", key_label),
    })
}
```

## File System Layout

```
~/Library/Application Support/com.barqly.vault/
├── keys/
│   ├── family-vault.agekey.enc        # Passphrase-encrypted key
│   ├── family-vault.agekey.meta       # Metadata for all recipients
│   ├── work-vault.agekey.enc
│   └── work-vault.agekey.meta
└── config/
    └── yubikey-cache.json             # Cached YubiKey information

~/Documents/Barqly Vault/
├── Encrypted Vaults/
│   ├── 2025-08-08 bitcoin-backup.age
│   ├── 2025-08-08 bitcoin-backup.age.meta  # Vault metadata
│   ├── 2025-07-15 tax-documents.age
│   └── 2025-07-15 tax-documents.age.meta
└── Recovered Files/
    └── 2025-08-09 bitcoin-backup/
```

## Benefits of This Structure

1. **Discoverability**: Users can see which keys can decrypt each vault
2. **Recovery**: Clear understanding of available decryption methods
3. **Auditing**: Access log shows who decrypted what and when
4. **Migration**: Clean path from v1 to v2 format
5. **Flexibility**: Easy to add new recipient types in future
6. **Performance**: Statistics help optimize user experience

## Security Considerations

1. **Metadata Privacy**: Metadata files reveal recipient information
2. **Backup Inclusion**: Metadata must be included in backups
3. **Tampering**: Consider signing metadata for integrity
4. **Access Control**: Metadata files need same protection as keys

## Future Extensions

### Potential v3.0 Features

```json
{
  "version": "3.0",
  "recipients": [
    {
      "type": "shamir",
      "threshold": 2,
      "shares": 3,
      "public_keys": ["age1...", "age1...", "age1..."]
    },
    {
      "type": "hardware_wallet",
      "device": "ledger",
      "derivation_path": "m/44'/0'/0'/0/0"
    }
  ]
}
```

This structure is designed to grow with future requirements while maintaining backward compatibility.
