//! Vault Bundle Encryption Service
//!
//! Orchestrates complete vault encryption with manifest-in-bundle architecture.
//! Proper domain separation: vault operations in vault domain.

use crate::prelude::*;
use crate::services::crypto::infrastructure as crypto;
use crate::services::file::infrastructure::file_operations::FileSelection;
use crate::services::key_management::shared::{KeyEntry, KeyRegistryService};
use crate::services::shared::infrastructure::{DeviceInfo, get_vaults_directory};
use crate::services::vault;
use crate::services::vault::application::services::{PayloadStagingService, VaultMetadataService};
use crate::services::vault::domain::VaultError;
use crate::services::vault::infrastructure::persistence::metadata::{BundleType, VaultFileEntry};
use std::path::PathBuf;

type Result<T> = std::result::Result<T, VaultError>;

/// Input for vault bundle encryption
#[derive(Debug, Clone)]
pub struct VaultBundleEncryptionInput {
    pub vault_id: String,
    pub vault_name: String,
    pub file_paths: Vec<String>,
    pub source_root: Option<String>, // Folder name if folder selection, None if files
}

/// Result of vault bundle encryption
#[derive(Debug, Clone)]
pub struct VaultBundleEncryptionResult {
    /// Path to the backup bundle (full recovery with .agekey.enc files)
    pub encrypted_file_path: String,
    /// Path to the shared bundle (stripped, no private keys) - present when Recipients exist
    pub shared_file_path: Option<String>,
    pub manifest_path: String,
    pub encryption_revision: u32,
    pub keys_used: Vec<String>,
}

/// Vault bundle encryption service
#[derive(Debug)]
pub struct VaultBundleEncryptionService {
    metadata_service: VaultMetadataService,
    payload_staging: PayloadStagingService,
    key_registry: KeyRegistryService,
}

impl VaultBundleEncryptionService {
    pub fn new() -> Self {
        Self {
            metadata_service: VaultMetadataService::new(),
            payload_staging: PayloadStagingService::new(),
            key_registry: KeyRegistryService::new(),
        }
    }

    /// Orchestrate complete vault bundle encryption
    ///
    /// Flow: Load vault → Build/update manifest → Create payload → Encrypt → Save manifest
    pub async fn orchestrate_vault_encryption(
        &self,
        input: VaultBundleEncryptionInput,
    ) -> Result<VaultBundleEncryptionResult> {
        info!(
            vault = %input.vault_name,
            file_count = input.file_paths.len(),
            "Starting vault bundle encryption"
        );

        // Step 1: Load device info
        let device_info = DeviceInfo::load_or_create("2.0.0").map_err(|e| {
            VaultError::OperationFailed(format!("Failed to load device info: {}", e))
        })?;

        // Step 2: Load vault
        let vault = vault::load_vault(&input.vault_id)
            .await
            .map_err(|e| VaultError::NotFound(format!("Vault '{}': {}", input.vault_id, e)))?;

        if vault.recipients().is_empty() {
            return Err(VaultError::InvalidOperation(
                "Vault has no keys for encryption".to_string(),
            ));
        }

        // Step 3: Build file entries with hashes (handles folders recursively)
        let file_entries =
            self.build_file_entries(&input.file_paths, input.source_root.as_deref())?;

        // Step 4: Build or update VaultMetadata
        let mut vault_metadata = self
            .metadata_service
            .build_from_vault_and_registry(
                &input.vault_id,
                &input.vault_name,
                vault.vault.description.clone(),
                &vault.get_key_ids(),
                &device_info,
                file_entries,
                input.source_root,
            )
            .map_err(|e| VaultError::OperationFailed(format!("Failed to build manifest: {}", e)))?;

        // If manifest exists, use its revision and increment for this encryption
        // IMPORTANT: Use sanitized_name to match the filename used when saving
        // Works for both first encryption (0→1) and subsequent encryptions (n→n+1)
        if let Ok(existing) = self.metadata_service.load_or_create(
            &input.vault_id,
            &vault_metadata.vault.sanitized_name,
            vault.vault.description.clone(),
            &device_info,
        ) {
            vault_metadata.versioning.revision = existing.encryption_revision();
            vault_metadata.increment_version(&device_info);
        }

        info!(
            vault = %vault_metadata.label(),
            revision = vault_metadata.versioning.revision,
            "Built VaultMetadata"
        );

        // Step 5: Determine output paths
        use crate::services::shared::infrastructure::io::SecureTempFile;

        let vaults_dir = get_vaults_directory().map_err(|e| {
            VaultError::StorageError(format!("Failed to get vaults directory: {}", e))
        })?;

        // Check if vault has external recipients (PublicKeyOnly) for dual-output
        let has_recipients = vault_metadata.has_recipients();

        // Step 6: Create file selection for payload staging
        let file_selection = self.create_file_selection(&input.file_paths)?;

        // Step 7: Collect public keys from vault (same for both bundles)
        let (public_keys, keys_used) = self.collect_vault_public_keys(&vault.get_key_ids())?;

        if public_keys.is_empty() {
            return Err(VaultError::InvalidOperation(
                "No valid public keys found".to_string(),
            ));
        }

        // Step 8: Create and encrypt BACKUP bundle (full recovery)
        let backup_encrypted_path =
            vaults_dir.join(format!("{}.age", vault_metadata.vault.sanitized_name));

        let secure_tar_backup = SecureTempFile::new().map_err(|e| {
            VaultError::OperationFailed(format!("Failed to create secure temp file: {}", e))
        })?;

        self.payload_staging
            .create_vault_payload(
                &file_selection,
                &vault_metadata,
                secure_tar_backup.path(),
                BundleType::Backup,
            )
            .map_err(|e| {
                VaultError::OperationFailed(format!("Failed to create backup payload: {}", e))
            })?;

        let backup_data = std::fs::read(secure_tar_backup.path()).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to read backup archive: {}", e))
        })?;

        let backup_encrypted = crypto::encrypt_data_multi_recipient(&backup_data, &public_keys)
            .map_err(|e| VaultError::OperationFailed(format!("Backup encryption failed: {}", e)))?;

        std::fs::write(&backup_encrypted_path, backup_encrypted).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to write backup bundle: {}", e))
        })?;

        info!(
            encrypted_path = %backup_encrypted_path.display(),
            size = backup_data.len(),
            "Created backup bundle"
        );

        // Securely delete backup temp file
        secure_tar_backup.secure_delete().map_err(|e| {
            VaultError::OperationFailed(format!("Failed to securely delete temp TAR: {}", e))
        })?;

        // Step 9: Create and encrypt SHARED bundle if Recipients present
        let shared_encrypted_path = if has_recipients {
            let shared_path = vaults_dir.join(format!(
                "{}-shared.age",
                vault_metadata.vault.sanitized_name
            ));

            let secure_tar_shared = SecureTempFile::new().map_err(|e| {
                VaultError::OperationFailed(format!(
                    "Failed to create secure temp file for shared: {}",
                    e
                ))
            })?;

            self.payload_staging
                .create_vault_payload(
                    &file_selection,
                    &vault_metadata,
                    secure_tar_shared.path(),
                    BundleType::Shared,
                )
                .map_err(|e| {
                    VaultError::OperationFailed(format!("Failed to create shared payload: {}", e))
                })?;

            let shared_data = std::fs::read(secure_tar_shared.path()).map_err(|e| {
                VaultError::OperationFailed(format!("Failed to read shared archive: {}", e))
            })?;

            let shared_encrypted = crypto::encrypt_data_multi_recipient(&shared_data, &public_keys)
                .map_err(|e| {
                    VaultError::OperationFailed(format!("Shared encryption failed: {}", e))
                })?;

            std::fs::write(&shared_path, shared_encrypted).map_err(|e| {
                VaultError::OperationFailed(format!("Failed to write shared bundle: {}", e))
            })?;

            info!(
                shared_path = %shared_path.display(),
                size = shared_data.len(),
                "Created shared bundle (stripped for recipients)"
            );

            // Securely delete shared temp file
            secure_tar_shared.secure_delete().map_err(|e| {
                VaultError::OperationFailed(format!(
                    "Failed to securely delete shared temp TAR: {}",
                    e
                ))
            })?;

            Some(shared_path.to_string_lossy().to_string())
        } else {
            None
        };

        // Step 10: Write RECOVERY.txt alongside backup .age file (non-fatal if fails)
        if let Err(e) = self
            .payload_staging
            .write_recovery_file(&vault_metadata, &backup_encrypted_path)
        {
            warn!("Failed to create RECOVERY.txt (non-fatal): {}", e);
        }

        // Step 11: Save VaultMetadata to non-sync storage
        self.metadata_service
            .save_manifest(&vault_metadata)
            .map_err(|e| VaultError::StorageError(format!("Failed to save manifest: {}", e)))?;

        info!(
            vault = %vault_metadata.label(),
            revision = vault_metadata.versioning.revision,
            keys_count = keys_used.len(),
            has_shared = has_recipients,
            "Vault bundle encryption completed"
        );

        Ok(VaultBundleEncryptionResult {
            encrypted_file_path: backup_encrypted_path.to_string_lossy().to_string(),
            shared_file_path: shared_encrypted_path,
            manifest_path: format!(
                "non-sync vaults/{}.manifest",
                vault_metadata.vault.sanitized_name
            ),
            encryption_revision: vault_metadata.encryption_revision(),
            keys_used,
        })
    }

    /// Build file entries with SHA256 hashes (handles files and folders)
    fn build_file_entries(
        &self,
        file_paths: &[String],
        source_root: Option<&str>,
    ) -> Result<Vec<VaultFileEntry>> {
        use crate::services::file::infrastructure::file_operations::{
            SelectionType as FileSelectionType, collect_files_with_metadata,
        };

        // Infer selection type from source_root presence
        let file_selection_type = if source_root.is_some() {
            FileSelectionType::Folder
        } else {
            FileSelectionType::Files
        };

        // Use reusable file collection utility
        let collected_files =
            collect_files_with_metadata(file_paths, file_selection_type, source_root).map_err(
                |e| VaultError::OperationFailed(format!("Failed to collect files: {}", e)),
            )?;

        // Convert to VaultFileEntry
        let entries = collected_files
            .into_iter()
            .map(|cf| VaultFileEntry {
                path: cf.relative_path,
                size: cf.size,
                sha256: cf.sha256,
            })
            .collect();

        Ok(entries)
    }

    /// Create FileSelection from paths
    fn create_file_selection(&self, file_paths: &[String]) -> Result<FileSelection> {
        let path_bufs: Vec<PathBuf> = file_paths.iter().map(PathBuf::from).collect();
        Ok(FileSelection::from_paths(&path_bufs))
    }

    /// Collect public keys from vault keys using registry
    fn collect_vault_public_keys(
        &self,
        vault_keys: &[String],
    ) -> Result<(Vec<crypto::PublicKey>, Vec<String>)> {
        let mut public_keys = Vec::new();
        let mut keys_used = Vec::new();

        for key_id in vault_keys {
            match self.key_registry.get_key(key_id) {
                Ok(KeyEntry::Passphrase {
                    label, public_key, ..
                }) => {
                    public_keys.push(crypto::PublicKey::from(public_key.clone()));
                    keys_used.push(label.clone());
                }
                Ok(KeyEntry::Yubikey {
                    label, recipient, ..
                }) => {
                    public_keys.push(crypto::PublicKey::from(recipient.clone()));
                    keys_used.push(label.clone());
                }
                Ok(KeyEntry::Recipient {
                    label, public_key, ..
                }) => {
                    public_keys.push(crypto::PublicKey::from(public_key.clone()));
                    keys_used.push(label.clone());
                }
                Err(_) => {
                    warn!(key_id, "Key not found in registry, skipping");
                }
            }
        }

        Ok((public_keys, keys_used))
    }
}

impl Default for VaultBundleEncryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_bundle_encryption_service_creation() {
        let _service = VaultBundleEncryptionService::new();
    }
}
