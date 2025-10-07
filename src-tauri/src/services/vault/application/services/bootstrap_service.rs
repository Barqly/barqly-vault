//! Bootstrap Service
//!
//! Handles application startup initialization: device identity, manifest scanning,
//! and registry synchronization from vault manifests.

use crate::error::StorageError;
use crate::prelude::*;
use crate::services::key_management::shared::{KeyEntry, KeyRegistry};
use crate::services::shared::infrastructure::{DeviceInfo, get_vaults_manifest_dir};
use crate::services::vault::infrastructure::persistence::metadata::{RecipientType, VaultMetadata};
use std::collections::HashSet;

/// Bootstrap service for app initialization
#[derive(Debug)]
pub struct BootstrapService;

impl BootstrapService {
    pub fn new() -> Self {
        Self
    }

    /// Bootstrap application state on startup
    ///
    /// Performs:
    /// 1. Load/generate device.json
    /// 2. Scan vaults/ directory for manifests
    /// 3. Load key registry
    /// 4. Additive merge: manifests → registry
    /// 5. Detect and merge YubiKeys (TODO - future)
    /// 6. Save updated registry
    pub async fn bootstrap(&self) -> Result<BootstrapResult, StorageError> {
        info!("Starting application bootstrap");

        // Step 1: Load or generate device identity
        let device_info = DeviceInfo::load_or_create("2.0.0")?;

        info!(
            machine_id = %device_info.machine_id,
            machine_label = %device_info.machine_label,
            "Device identity loaded"
        );

        // Step 2: Scan for vault manifests
        let manifests = self.scan_vault_manifests().await?;

        info!(manifest_count = manifests.len(), "Scanned vault manifests");

        // Step 3: Load or create key registry
        let mut registry = KeyRegistry::load().map_err(|e| StorageError::InvalidFormat {
            path: std::path::PathBuf::from("registry"),
            message: format!("Failed to load registry: {}", e),
        })?;

        let initial_key_count = registry.keys.len();

        // Step 4: Additive merge from manifests to registry
        let merge_stats = self.merge_manifests_to_registry(&mut registry, &manifests)?;

        // Step 5: TODO - Detect and merge YubiKeys
        // let yubikey_stats = self.detect_and_merge_yubikeys(&mut registry).await?;

        // Step 6: Save updated registry (atomic write)
        registry
            .save()
            .map_err(|e| StorageError::SerializationFailed {
                message: format!("Failed to save registry: {}", e),
            })?;

        info!(
            initial_keys = initial_key_count,
            final_keys = registry.keys.len(),
            keys_added = merge_stats.keys_added,
            manifests_processed = merge_stats.manifests_processed,
            "Bootstrap completed successfully"
        );

        Ok(BootstrapResult {
            device_info,
            manifests_found: manifests.len(),
            keys_before: initial_key_count,
            keys_after: registry.keys.len(),
            keys_added: merge_stats.keys_added,
        })
    }

    /// Scan vaults manifest directory for all .manifest files
    async fn scan_vault_manifests(&self) -> Result<Vec<VaultMetadata>, StorageError> {
        let vaults_manifest_dir = get_vaults_manifest_dir()?;

        if !vaults_manifest_dir.exists() {
            info!("Vaults manifest directory doesn't exist yet, creating");
            return Ok(Vec::new());
        }

        let mut manifests = Vec::new();

        let entries =
            std::fs::read_dir(&vaults_manifest_dir).map_err(|e| StorageError::FileReadFailed {
                path: vaults_manifest_dir.clone(),
                source: e,
            })?;

        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();

            // Only process .manifest files
            if path.extension().is_some_and(|ext| ext == "manifest") {
                match std::fs::read_to_string(&path) {
                    Ok(content) => match serde_json::from_str::<VaultMetadata>(&content) {
                        Ok(manifest) => {
                            debug!(
                                vault = %manifest.label,
                                version = manifest.encryption_revision,
                                recipients = manifest.recipients.len(),
                                "Loaded vault manifest"
                            );
                            manifests.push(manifest);
                        }
                        Err(e) => {
                            warn!(
                                path = %path.display(),
                                error = %e,
                                "Failed to parse manifest file, skipping"
                            );
                        }
                    },
                    Err(e) => {
                        warn!(
                            path = %path.display(),
                            error = %e,
                            "Failed to read manifest file, skipping"
                        );
                    }
                }
            }
        }

        Ok(manifests)
    }

    /// Merge recipients from manifests into registry (additive only)
    ///
    /// Never removes keys from registry - preserves unattached keys.
    fn merge_manifests_to_registry(
        &self,
        registry: &mut KeyRegistry,
        manifests: &[VaultMetadata],
    ) -> Result<MergeStatistics, StorageError> {
        let mut keys_added = 0;
        let mut manifests_processed = 0;

        // Track which keys we've seen to avoid duplicates within same run
        let mut seen_keys = HashSet::new();

        for manifest in manifests {
            manifests_processed += 1;

            for recipient in &manifest.recipients {
                // Generate key ID for this recipient
                let key_id = self.generate_key_id_from_recipient(recipient);

                // Skip if already processed in this run
                if seen_keys.contains(&key_id) {
                    continue;
                }
                seen_keys.insert(key_id.clone());

                // Check if key already exists in registry
                if registry.keys.contains_key(&key_id) {
                    debug!(
                        key_id = %key_id,
                        vault = %manifest.label,
                        "Key already in registry, skipping"
                    );
                    continue;
                }

                // Add key to registry (additive only)
                let key_entry = self.recipient_to_key_entry(recipient);
                registry.keys.insert(key_id.clone(), key_entry);
                keys_added += 1;

                info!(
                    key_id = %key_id,
                    label = %recipient.label,
                    vault = %manifest.label,
                    "Added key from manifest to registry"
                );
            }
        }

        Ok(MergeStatistics {
            manifests_processed,
            keys_added,
        })
    }

    /// Generate key ID from recipient (matches registry convention)
    fn generate_key_id_from_recipient(
        &self,
        recipient: &crate::services::vault::infrastructure::persistence::metadata::RecipientInfo,
    ) -> String {
        // Now that RecipientInfo has key_id field, we can use it directly
        recipient.key_id.clone()
    }

    /// Convert RecipientInfo to KeyEntry for registry
    fn recipient_to_key_entry(
        &self,
        recipient: &crate::services::vault::infrastructure::persistence::metadata::RecipientInfo,
    ) -> KeyEntry {
        match &recipient.recipient_type {
            RecipientType::Passphrase { key_filename } => KeyEntry::Passphrase {
                label: recipient.label.clone(),
                created_at: recipient.created_at,
                last_used: None,
                public_key: recipient.public_key.clone(),
                key_filename: key_filename.clone(),
            },
            RecipientType::YubiKey {
                serial,
                slot,
                piv_slot,
                identity_tag,
                model,
                firmware_version,
                ..
            } => KeyEntry::Yubikey {
                label: recipient.label.clone(),
                created_at: recipient.created_at,
                last_used: None,
                serial: serial.clone(),
                slot: *slot,
                piv_slot: *piv_slot,
                recipient: recipient.public_key.clone(),
                identity_tag: identity_tag.clone(),
                model: model.clone(),
                firmware_version: firmware_version.clone(),
                recovery_code_hash: String::new(), // Not available from manifest
            },
        }
    }
}

impl Default for BootstrapService {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of bootstrap operation
#[derive(Debug, Clone)]
pub struct BootstrapResult {
    pub device_info: DeviceInfo,
    pub manifests_found: usize,
    pub keys_before: usize,
    pub keys_after: usize,
    pub keys_added: usize,
}

/// Statistics from manifest merge operation
#[derive(Debug, Clone)]
struct MergeStatistics {
    manifests_processed: usize,
    keys_added: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bootstrap_service_creation() {
        let _service = BootstrapService::new();
    }

    #[test]
    fn test_generate_key_id_passphrase() {
        use crate::services::vault::infrastructure::persistence::metadata::RecipientInfo;

        let service = BootstrapService::new();
        let recipient = RecipientInfo::new_passphrase(
            "my-key".to_string(),
            "age1test".to_string(),
            "my-key".to_string(),
            "my-key.agekey.enc".to_string(),
        );

        let key_id = service.generate_key_id_from_recipient(&recipient);
        assert_eq!(key_id, "my-key");
    }

    #[test]
    fn test_generate_key_id_yubikey() {
        use crate::services::vault::infrastructure::persistence::metadata::RecipientInfo;

        let service = BootstrapService::new();
        let recipient = RecipientInfo::new_yubikey(
            "keyref_123451".to_string(),
            "age1yubikey".to_string(),
            "YubiKey-12345".to_string(),
            "12345".to_string(),
            1,
            0x82,
            "YubiKey 5".to_string(),
            "AGE-PLUGIN-TEST".to_string(),
            Some("5.7.1".to_string()),
        );

        let key_id = service.generate_key_id_from_recipient(&recipient);
        assert_eq!(key_id, "keyref_123451");
    }

    #[test]
    fn test_recipient_to_key_entry_passphrase() {
        use crate::services::vault::infrastructure::persistence::metadata::RecipientInfo;

        let service = BootstrapService::new();
        let recipient = RecipientInfo::new_passphrase(
            "test-key".to_string(),
            "age1test".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let key_entry = service.recipient_to_key_entry(&recipient);

        match key_entry {
            KeyEntry::Passphrase {
                label,
                public_key,
                key_filename,
                ..
            } => {
                assert_eq!(label, "test-key");
                assert_eq!(public_key, "age1test");
                assert_eq!(key_filename, "test-key.agekey.enc");
            }
            _ => panic!("Expected Passphrase key entry"),
        }
    }
}
