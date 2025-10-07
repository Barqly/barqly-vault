//! Vault Metadata Service
//!
//! Handles VaultMetadata CRUD operations, versioning, and persistence to non-sync storage.

use crate::error::StorageError;
use crate::prelude::*;
use crate::services::key_management::shared::{KeyEntry, KeyRegistryService};
use crate::services::shared::infrastructure::{
    DeviceInfo, atomic_write_sync, get_vault_manifest_path, sanitize_vault_name,
};
use crate::services::vault::infrastructure::persistence::metadata::{
    RecipientInfo, RecipientType, SelectionType, VaultFileEntry, VaultMetadata,
};
use std::path::Path;

/// Service for managing vault manifests (R2)
#[derive(Debug)]
pub struct VaultMetadataService {
    key_registry: KeyRegistryService,
}

impl VaultMetadataService {
    pub fn new() -> Self {
        Self {
            key_registry: KeyRegistryService::new(),
        }
    }

    /// Load manifest from non-sync storage or create new
    ///
    /// # Arguments
    /// * `vault_name` - Sanitized vault name (filesystem-safe)
    /// * `description` - Optional vault description
    pub fn load_or_create(
        &self,
        vault_id: &str,
        vault_name: &str,
        description: Option<String>,
        device_info: &DeviceInfo,
    ) -> Result<VaultMetadata, StorageError> {
        let manifest_path = get_vault_manifest_path(vault_name)?;

        if manifest_path.exists() {
            self.load_manifest(&manifest_path)
        } else {
            info!(vault_name, "Creating new manifest");
            self.create_new_manifest(vault_id, vault_name, description, device_info)
        }
    }

    /// Load manifest from file
    fn load_manifest(&self, path: &Path) -> Result<VaultMetadata, StorageError> {
        let content = std::fs::read_to_string(path).map_err(|e| StorageError::FileReadFailed {
            path: path.to_path_buf(),
            source: e,
        })?;

        let manifest: VaultMetadata =
            serde_json::from_str(&content).map_err(|e| StorageError::InvalidFormat {
                path: path.to_path_buf(),
                message: format!("Failed to parse manifest: {}", e),
            })?;

        manifest
            .validate()
            .map_err(|e| StorageError::InvalidFormat {
                path: path.to_path_buf(),
                message: format!("Manifest validation failed: {}", e),
            })?;

        debug!(
            vault = %manifest.label,
            version = manifest.encryption_revision,
            "Loaded manifest from non-sync storage"
        );

        Ok(manifest)
    }

    /// Create new manifest with default values
    fn create_new_manifest(
        &self,
        vault_id: &str,
        vault_name: &str,
        description: Option<String>,
        device_info: &DeviceInfo,
    ) -> Result<VaultMetadata, StorageError> {
        let sanitized = sanitize_vault_name(vault_name)?;

        Ok(VaultMetadata::new(
            vault_id.to_string(),
            sanitized.display, // Preserve user's original input
            description,
            sanitized.sanitized,
            device_info,
            SelectionType::Files,
            None,
            vec![],
            vec![],
            0,
            0,
        ))
    }

    /// Build VaultMetadata from vault and key registry
    ///
    /// Syncs recipients from registry and updates file listings.
    #[allow(clippy::too_many_arguments)]
    pub fn build_from_vault_and_registry(
        &self,
        vault_id: &str,
        vault_name: &str,
        description: Option<String>,
        vault_keys: &[String],
        device_info: &DeviceInfo,
        file_entries: Vec<VaultFileEntry>,
        selection_type: SelectionType,
        base_path: Option<String>,
    ) -> Result<VaultMetadata, StorageError> {
        let sanitized = sanitize_vault_name(vault_name)?;

        // Build recipient list from vault keys using registry
        let mut recipients = Vec::new();
        for key_id in vault_keys {
            if let Ok(registry_entry) = self.key_registry.get_key(key_id) {
                let recipient = Self::registry_entry_to_recipient(key_id, &registry_entry);
                recipients.push(recipient);
            } else {
                warn!(key_id, "Key not found in registry, skipping");
            }
        }

        let file_count = file_entries.len();
        let total_size: u64 = file_entries.iter().map(|f| f.size).sum();

        Ok(VaultMetadata::new(
            vault_id.to_string(),
            sanitized.display, // Preserve user's original input
            description,
            sanitized.sanitized,
            device_info,
            selection_type,
            base_path,
            recipients,
            file_entries,
            file_count,
            total_size,
        ))
    }

    /// Convert KeyEntry to RecipientInfo
    fn registry_entry_to_recipient(key_id: &str, entry: &KeyEntry) -> RecipientInfo {
        match entry {
            KeyEntry::Passphrase {
                label,
                public_key,
                key_filename,
                created_at,
                ..
            } => RecipientInfo {
                key_id: key_id.to_string(),
                recipient_type: RecipientType::Passphrase {
                    key_filename: key_filename.clone(),
                },
                public_key: public_key.clone(),
                label: label.clone(),
                created_at: *created_at,
            },
            KeyEntry::Yubikey {
                label,
                recipient,
                serial,
                slot,
                piv_slot,
                identity_tag,
                model,
                firmware_version,
                created_at,
                ..
            } => {
                RecipientInfo {
                    key_id: key_id.to_string(),
                    recipient_type: RecipientType::YubiKey {
                        serial: serial.clone(),
                        slot: *slot,
                        piv_slot: *piv_slot,
                        model: model.clone(), // Use model from registry
                        identity_tag: identity_tag.clone(),
                        firmware_version: firmware_version.clone(),
                    },
                    public_key: recipient.clone(),
                    label: label.clone(),
                    created_at: *created_at,
                }
            }
        }
    }

    /// Increment manifest version and save
    pub fn increment_version_and_save(
        &self,
        manifest: &mut VaultMetadata,
        device_info: &DeviceInfo,
    ) -> Result<(), StorageError> {
        manifest.increment_version(device_info);
        self.save_manifest(manifest)
    }


    /// Save manifest to non-sync storage (atomic write)
    pub fn save_manifest(&self, manifest: &VaultMetadata) -> Result<(), StorageError> {
        let manifest_path = get_vault_manifest_path(&manifest.sanitized_name)?;

        let json = serde_json::to_string_pretty(manifest).map_err(|e| {
            StorageError::SerializationFailed {
                message: format!("Failed to serialize manifest: {}", e),
            }
        })?;

        atomic_write_sync(&manifest_path, json.as_bytes()).map_err(|e| {
            StorageError::FileWriteFailed {
                path: manifest_path.clone(),
                source: std::io::Error::other(e),
            }
        })?;

        debug!(
            vault = %manifest.label,
            version = manifest.encryption_revision,
            path = %manifest_path.display(),
            "Saved manifest to non-sync storage"
        );

        Ok(())
    }
}

impl Default for VaultMetadataService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_metadata_service_creation() {
        let _service = VaultMetadataService::new();
    }

    #[test]
    fn test_registry_entry_to_recipient_passphrase() {
        let entry = KeyEntry::Passphrase {
            label: "test-key".to_string(),
            created_at: chrono::Utc::now(),
            last_used: None,
            public_key: "age1test123".to_string(),
            key_filename: "test-key.agekey.enc".to_string(),
        };

        let recipient = VaultMetadataService::registry_entry_to_recipient("test-key-id", &entry);

        assert_eq!(recipient.label, "test-key");
        assert_eq!(recipient.public_key, "age1test123");
        assert!(matches!(
            recipient.recipient_type,
            RecipientType::Passphrase { .. }
        ));
    }

    #[test]
    fn test_registry_entry_to_recipient_yubikey() {
        let entry = KeyEntry::Yubikey {
            label: "YubiKey-12345".to_string(),
            created_at: chrono::Utc::now(),
            last_used: None,
            serial: "12345".to_string(),
            slot: 1,
            piv_slot: 0x82,
            recipient: "age1yubikey123".to_string(),
            identity_tag: "AGE-PLUGIN-TEST".to_string(),
            model: "YubiKey 5C Nano".to_string(),
            firmware_version: Some("5.7.1".to_string()),
            recovery_code_hash: "hash123".to_string(),
        };

        let recipient = VaultMetadataService::registry_entry_to_recipient("test-key-id", &entry);

        assert_eq!(recipient.label, "YubiKey-12345");
        match recipient.recipient_type {
            RecipientType::YubiKey {
                serial,
                piv_slot,
                identity_tag,
                model,
                ..
            } => {
                assert_eq!(serial, "12345");
                assert_eq!(piv_slot, 0x82);
                assert_eq!(identity_tag, "AGE-PLUGIN-TEST");
                assert_eq!(model, "YubiKey 5C Nano");
            }
            _ => panic!("Expected YubiKey recipient"),
        }
    }
}
