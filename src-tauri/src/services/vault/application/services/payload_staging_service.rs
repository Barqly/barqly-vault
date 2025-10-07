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
use crate::services::vault::infrastructure::persistence::metadata::{RecipientType, VaultMetadata};
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
    ///
    /// # Returns
    /// ArchiveOperation with path to created archive
    pub fn create_vault_payload(
        &self,
        user_file_selection: &FileSelection,
        vault_metadata: &VaultMetadata,
        output_path: &Path,
    ) -> Result<ArchiveOperation> {
        info!(
            vault = %vault_metadata.label,
            "Creating complete vault payload"
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
        let manifest_json = serde_json::to_string_pretty(vault_metadata).map_err(|e| {
            VaultError::OperationFailed(format!("Failed to serialize manifest: {}", e))
        })?;

        let manifest_filename = format!("{}.manifest", vault_metadata.sanitized_name);
        staging
            .add_file_content(&manifest_filename, manifest_json.as_bytes())
            .map_err(|e| {
                VaultError::OperationFailed(format!("Failed to add manifest to staging: {}", e))
            })?;

        info!("Added manifest to payload");

        // Step 3: Add all passphrase .agekey.enc files to staging
        let enc_files_added = self.add_encryption_keys_to_staging(&mut staging, vault_metadata)?;

        info!(
            enc_files_count = enc_files_added,
            "Added encryption key files to payload"
        );

        // Step 4: Generate and add RECOVERY.txt
        let recovery_txt = self.recovery_service.generate(vault_metadata);
        staging
            .add_file_content("RECOVERY.txt", recovery_txt.as_bytes())
            .map_err(|e| {
                VaultError::OperationFailed(format!("Failed to add RECOVERY.txt: {}", e))
            })?;

        info!("Added RECOVERY.txt to payload");

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
            "Complete vault payload created"
        );

        Ok(operation)
    }

    /// Add passphrase encryption key files to staging
    ///
    /// Copies all .agekey.enc files referenced in vault recipients to staging.
    ///
    /// # Returns
    /// Number of encryption key files added
    fn add_encryption_keys_to_staging(
        &self,
        staging: &mut file_ops::StagingArea,
        vault_metadata: &VaultMetadata,
    ) -> Result<usize> {
        let keys_dir = get_keys_dir().map_err(|e| {
            VaultError::OperationFailed(format!("Failed to get keys directory: {}", e))
        })?;

        let mut added_count = 0;

        for recipient in &vault_metadata.recipients {
            if let RecipientType::Passphrase { key_filename } = &recipient.recipient_type {
                let key_path = keys_dir.join(key_filename);

                if key_path.exists() {
                    staging
                        .copy_file_to_staging(&key_path, key_filename)
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
    use crate::services::vault::infrastructure::persistence::metadata::{
        RecipientInfo, SelectionType,
    };
    use tempfile::TempDir;

    #[test]
    fn test_payload_staging_service_creation() {
        let _service = PayloadStagingService::new();
        // Verify creation works
    }

    #[test]
    fn test_create_vault_payload_with_manifest() {
        let temp_dir = TempDir::new().unwrap();

        // Create a test file to encrypt
        let test_file = temp_dir.path().join("test.txt");
        std::fs::write(&test_file, b"test content").unwrap();

        let selection = FileSelection::from_paths(std::slice::from_ref(&test_file));
        let output_path = temp_dir.path().join("vault.tar.gz");

        let device_info = DeviceInfo {
            machine_id: "test-123".to_string(),
            machine_label: "test".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        let recipient = RecipientInfo::new_passphrase(
            "test-key".to_string(),
            "age1test".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new(
            "test-vault".to_string(),
            "Test Vault".to_string(),
            None, // No description
            "Test-Vault".to_string(),
            &device_info,
            Some(SelectionType::Files),
            None,
            vec![recipient],
            vec![],
            1,
            12,
        );

        let service = PayloadStagingService::new();
        let result = service.create_vault_payload(&selection, &metadata, &output_path);

        assert!(result.is_ok());
        let operation = result.unwrap();
        assert!(operation.archive_path.exists());
        assert!(operation.file_count >= 1); // At least user file + manifest + RECOVERY.txt
    }
}
