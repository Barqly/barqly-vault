//! Vault Payload Staging Service
//!
//! Orchestrates creation of complete vault payload including user files,
//! manifest, encryption keys, and recovery instructions.

use crate::prelude::*;
use crate::services::file::infrastructure::file_operations::{
    self as file_ops, ArchiveOperation, FileOpsConfig, FileSelection,
};
use crate::services::shared::infrastructure::get_keys_dir;
use crate::services::vault::application::services::RecoveryTxtService;
use crate::services::vault::domain::VaultError;
use crate::services::vault::infrastructure::persistence::metadata::{
    BundleType, RecipientType, VaultMetadata,
};
use std::path::Path;

type Result<T> = std::result::Result<T, VaultError>;

/// Service for creating vault payloads with all required files
#[derive(Debug)]
pub struct PayloadStagingService {
    recovery_service: RecoveryTxtService,
}

impl PayloadStagingService {
    pub fn new() -> Self {
        Self {
            recovery_service: RecoveryTxtService::new(),
        }
    }

    /// Create complete vault payload with manifest, keys, and recovery instructions
    ///
    /// # Arguments
    /// * `user_file_selection` - User's selected files/folders
    /// * `vault_metadata` - Vault manifest with recipients and metadata
    /// * `output_path` - Where to create the TAR archive
    /// * `bundle_type` - Type of bundle: Backup (full) or Shared (stripped)
    ///
    /// # Returns
    /// ArchiveOperation with path to created archive
    pub fn create_vault_payload(
        &self,
        user_file_selection: &FileSelection,
        vault_metadata: &VaultMetadata,
        output_path: &Path,
        bundle_type: BundleType,
    ) -> Result<ArchiveOperation> {
        let is_shared = matches!(bundle_type, BundleType::Shared);

        info!(
            vault = %vault_metadata.label(),
            bundle_type = ?bundle_type,
            "Creating {} vault payload",
            if is_shared { "shared" } else { "backup" }
        );

        // Create staging area
        let mut staging = file_ops::StagingArea::new().map_err(|e| {
            VaultError::OperationFailed(format!("Failed to create staging area: {}", e))
        })?;

        // Step 1: Stage user files
        staging.stage_files(user_file_selection).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to stage user files: {}", e))
        })?;

        info!(file_count = staging.file_count(), "Staged user files");

        // Step 2: Add manifest to staging
        // For shared bundles, use sanitized manifest (redacted metadata)
        let manifest_to_include = if is_shared {
            vault_metadata.to_shared_manifest()
        } else {
            vault_metadata.clone()
        };

        let manifest_json = serde_json::to_string_pretty(&manifest_to_include).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to serialize manifest: {}", e))
        })?;

        let manifest_filename = format!("{}.manifest", vault_metadata.vault.sanitized_name);
        staging
            .add_file_content(&manifest_filename, manifest_json.as_bytes())
            .map_err(|e| {
                VaultError::OperationFailed(format!("Failed to add manifest to staging: {}", e))
            })?;

        info!(
            is_shared,
            "Added {} manifest to payload",
            if is_shared { "sanitized" } else { "full" }
        );

        // Step 3: Add passphrase .agekey.enc files to staging
        // ONLY for backup bundles - shared bundles exclude private key material
        let enc_files_added = if is_shared {
            debug!("Skipping .agekey.enc files for shared bundle");
            0
        } else {
            self.add_encryption_keys_to_staging(&mut staging, vault_metadata)?
        };

        info!(
            enc_files_count = enc_files_added,
            "Added encryption key files to payload"
        );

        // Step 4: RECOVERY.txt is no longer bundled inside the encrypted archive
        // It will be written separately alongside the .age file

        // Step 5: Create TAR from complete staging
        let config = FileOpsConfig::default();
        let archive_info =
            file_ops::archive_operations::creation::create_tar_gz(&staging, output_path, &config)
                .map_err(|e| VaultError::OperationFailed(format!("Failed to create TAR: {}", e)))?;

        let operation = ArchiveOperation {
            archive_path: output_path.to_path_buf(),
            manifest_path: None,
            total_size: archive_info.compressed_size,
            file_count: staging.file_count(),
            created: chrono::Utc::now(),
            archive_hash: archive_info.archive_hash,
        };

        info!(
            archive_size = operation.total_size,
            file_count = operation.file_count,
            bundle_type = ?bundle_type,
            "Complete vault payload created"
        );

        Ok(operation)
    }

    /// Write RECOVERY.txt file alongside encrypted vault
    ///
    /// Creates plaintext recovery instructions in same folder as .age file
    /// This is written OUTSIDE the encrypted bundle for accessibility
    pub fn write_recovery_file(
        &self,
        vault_metadata: &VaultMetadata,
        age_file_path: &Path,
    ) -> Result<()> {
        // Generate recovery content with updated format
        let recovery_txt = self.recovery_service.generate(vault_metadata);

        // Determine output path: {vault-name}-RECOVERY.txt
        let age_file_dir = age_file_path
            .parent()
            .ok_or_else(|| VaultError::OperationFailed("Invalid age file path".to_string()))?;

        let recovery_filename = format!("{}-RECOVERY.txt", vault_metadata.vault.sanitized_name);
        let recovery_path = age_file_dir.join(&recovery_filename);

        // Write plaintext file
        std::fs::write(&recovery_path, recovery_txt).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to write RECOVERY.txt: {}", e))
        })?;

        info!(
            recovery_file = %recovery_path.display(),
            "Created recovery instructions file"
        );

        Ok(())
    }

    /// Add passphrase encryption key files to staging
    ///
    /// Copies all .agekey.enc files referenced in vault recipients to staging.
    /// Only fetches keys directory if there are passphrase recipients to process.
    ///
    /// # Returns
    /// Number of encryption key files added
    fn add_encryption_keys_to_staging(
        &self,
        staging: &mut file_ops::StagingArea,
        vault_metadata: &VaultMetadata,
    ) -> Result<usize> {
        // Collect passphrase recipients that need key files
        let passphrase_recipients: Vec<_> = vault_metadata
            .recipients()
            .iter()
            .filter_map(|r| {
                if let RecipientType::Passphrase { key_filename } = &r.recipient_type {
                    Some(key_filename.clone())
                } else {
                    None
                }
            })
            .collect();

        // Early return if no passphrase recipients (avoid unnecessary path lookup)
        if passphrase_recipients.is_empty() {
            return Ok(0);
        }

        // Only get keys directory when we have passphrase recipients to process
        let keys_dir = get_keys_dir().map_err(|e| {
            VaultError::OperationFailed(format!("Failed to get keys directory: {}", e))
        })?;

        let mut added_count = 0;

        for key_filename in passphrase_recipients {
            let key_path = keys_dir.join(&key_filename);

            if key_path.exists() {
                staging
                    .copy_file_to_staging(&key_path, &key_filename)
                    .map_err(|e| {
                        VaultError::OperationFailed(format!(
                            "Failed to copy key file {}: {}",
                            key_filename, e
                        ))
                    })?;
                added_count += 1;
            } else {
                warn!(key_filename, "Passphrase key file not found, skipping");
            }
        }

        Ok(added_count)
    }
}

impl Default for PayloadStagingService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::services::shared::infrastructure::DeviceInfo;
    use crate::services::vault::infrastructure::persistence::metadata::RecipientInfo;
    use tempfile::TempDir;

    fn create_test_device_info() -> DeviceInfo {
        DeviceInfo {
            machine_id: "test-123".to_string(),
            machine_label: "test".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        }
    }

    fn create_test_metadata(recipients: Vec<RecipientInfo>) -> VaultMetadata {
        let device_info = create_test_device_info();
        VaultMetadata::new(
            "test-vault".to_string(),
            "Test Vault".to_string(),
            None,
            "Test-Vault".to_string(),
            &device_info,
            None,
            recipients,
            vec![],
            1,
            12,
        )
    }

    #[test]
    fn test_payload_staging_service_creation() {
        let _service = PayloadStagingService::new();
    }

    #[test]
    fn test_create_vault_payload_backup_bundle() {
        use crate::services::vault::infrastructure::persistence::metadata::RecipientType;

        let temp_dir = TempDir::new().unwrap();

        let test_file = temp_dir.path().join("test.txt");
        std::fs::write(&test_file, b"test content").unwrap();

        let selection = FileSelection::from_paths(std::slice::from_ref(&test_file));
        let output_path = temp_dir.path().join("vault.tar.gz");

        // Use PublicKeyOnly recipient to avoid requiring keys directory
        let recipient = RecipientInfo {
            key_id: "external-recipient".to_string(),
            recipient_type: RecipientType::PublicKeyOnly,
            public_key: "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p"
                .to_string(),
            label: "External Recipient".to_string(),
            created_at: chrono::Utc::now(),
        };

        let metadata = create_test_metadata(vec![recipient]);

        let service = PayloadStagingService::new();
        let result =
            service.create_vault_payload(&selection, &metadata, &output_path, BundleType::Backup);

        assert!(result.is_ok(), "Error: {:?}", result.err());
        let operation = result.unwrap();
        assert!(operation.archive_path.exists());
        assert!(operation.file_count >= 1);
    }

    #[test]
    fn test_create_vault_payload_shared_bundle() {
        use crate::services::vault::infrastructure::persistence::metadata::RecipientType;

        let temp_dir = TempDir::new().unwrap();

        let test_file = temp_dir.path().join("test.txt");
        std::fs::write(&test_file, b"test content").unwrap();

        let selection = FileSelection::from_paths(std::slice::from_ref(&test_file));
        let output_path = temp_dir.path().join("vault-shared.tar.gz");

        // Use PublicKeyOnly recipient (typical for shared bundles going to external recipients)
        let recipient = RecipientInfo {
            key_id: "bob-recipient".to_string(),
            recipient_type: RecipientType::PublicKeyOnly,
            public_key: "age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p"
                .to_string(),
            label: "Bob's Public Key".to_string(),
            created_at: chrono::Utc::now(),
        };

        let metadata = create_test_metadata(vec![recipient]);

        let service = PayloadStagingService::new();
        let result =
            service.create_vault_payload(&selection, &metadata, &output_path, BundleType::Shared);

        assert!(result.is_ok(), "Error: {:?}", result.err());
        let operation = result.unwrap();
        assert!(operation.archive_path.exists());
        // Shared bundle excludes .agekey.enc files (sanitized for sharing)
        assert!(operation.file_count >= 1);
    }
}
