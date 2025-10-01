//! Vault encryption service for multi-key crypto operations
//!
//! Handles encryption to multiple keys (vault-based encryption) by coordinating
//! vault services, key registry, and multi-recipient encryption.

use super::{ArchiveOrchestrationService, CoreEncryptionService, FileValidationService};
use crate::commands::crypto::{EncryptFilesMultiInput, EncryptFilesMultiResponse};
use crate::commands::types::ProgressManager;
use crate::constants::*;
use crate::models::vault::{ArchiveContent, EncryptedArchive};
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::crypto::infrastructure as crypto;
use crate::services::key_management::shared::{KeyEntry, KeyRegistryService};
use crate::services::shared::infrastructure::path_management;
use crate::services::vault;
use crate::services::vault::application::services::VaultService;
use std::path::{Path, PathBuf};

#[derive(Debug)]
#[allow(dead_code)] // Services will be used when fully modularized
pub struct VaultEncryptionService {
    vault_service: VaultService,
    file_validation: FileValidationService,
    archive_orchestration: ArchiveOrchestrationService,
    core_encryption: CoreEncryptionService,
    key_registry_service: KeyRegistryService,
}

impl VaultEncryptionService {
    pub fn new() -> Self {
        Self {
            vault_service: VaultService::new(),
            file_validation: FileValidationService::new(),
            archive_orchestration: ArchiveOrchestrationService::new(),
            core_encryption: CoreEncryptionService::new(),
            key_registry_service: KeyRegistryService::new(),
        }
    }

    /// Encrypt files to all vault keys - complete business logic from backup
    #[instrument(skip(input), fields(vault_id = %input.vault_id, file_count = input.in_file_paths.len()))]
    pub async fn encrypt_files_multi(
        &self,
        input: EncryptFilesMultiInput,
    ) -> CryptoResult<EncryptFilesMultiResponse> {
        // Initialize progress tracking
        let operation_id = format!("encrypt_multi_{}", chrono::Utc::now().timestamp());
        let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

        info!(
            vault_id = %input.vault_id,
            file_count = input.in_file_paths.len(),
            operation_id = %operation_id,
            "Starting multi-key encryption operation"
        );

        // Step 1: Load vault using existing vault service
        progress_manager.set_progress(PROGRESS_ENCRYPT_KEY_RETRIEVAL, "Loading vault and keys...");

        let mut vault = vault::load_vault(&input.vault_id).await.map_err(|e| {
            CryptoError::InvalidInput(format!("Vault '{}' not found: {}", input.vault_id, e))
        })?;

        if vault.keys.is_empty() {
            return Err(CryptoError::ConfigurationError(
                "Vault has no registered keys for encryption".to_string(),
            ));
        }

        // Step 2: Collect public keys from vault using KeyRegistryService
        let (public_keys, keys_used) = self.collect_vault_public_keys(&vault)?;

        if public_keys.is_empty() {
            return Err(CryptoError::ConfigurationError(
                "No valid public keys found for encryption".to_string(),
            ));
        }

        info!(
            vault_id = %input.vault_id,
            keys_count = public_keys.len(),
            keys_used = ?keys_used,
            "Collected public keys for multi-recipient encryption"
        );

        // Step 3: Determine output paths
        let (output_dir, output_name) = self.determine_output_paths(&input, &vault.name)?;
        let output_path = output_dir.join(&output_name);
        let encrypted_path = output_path.with_extension("age");

        // Check if output file already exists
        let file_exists_warning = encrypted_path.exists();

        // Step 4: Create archive (reuse existing logic)
        let file_selection = self.create_file_selection_from_paths(&input.in_file_paths)?;
        let (archive_operation, archive_files) = self
            .create_archive_for_vault(
                &file_selection,
                &output_path,
                &mut progress_manager,
                &operation_id,
            )
            .await?;

        // Step 5: Read archive data
        let archive_data = std::fs::read(&archive_operation.archive_path)
            .map_err(|e| CryptoError::EncryptionFailed(format!("Failed to read archive: {}", e)))?;

        // Step 6: Multi-recipient encryption
        progress_manager.set_progress(
            PROGRESS_ENCRYPT_ENCRYPTING,
            "Encrypting to all vault keys...",
        );

        let encrypted_data = crypto::encrypt_data_multi_recipient(&archive_data, &public_keys)
            .map_err(|e| {
                CryptoError::EncryptionFailed(format!("Multi-recipient encryption failed: {}", e))
            })?;

        // Step 7: Write encrypted file (only if no conflict)
        if !file_exists_warning {
            std::fs::write(&encrypted_path, encrypted_data).map_err(|e| {
                CryptoError::EncryptionFailed(format!("Failed to write encrypted file: {}", e))
            })?;

            // Update vault manifest
            self.update_vault_manifest(
                &mut vault,
                &archive_operation,
                &archive_files,
                &encrypted_path,
            )
            .await?;
        }

        // Step 8: Cleanup
        progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Cleaning up temporary files...");
        let _ = std::fs::remove_file(&archive_operation.archive_path); // Best effort cleanup

        let vault_manifest_path = path_management::get_vault_manifest_path(&vault.name)
            .map_err(|e| CryptoError::ConfigurationError(format!("Invalid vault name: {}", e)))?;

        info!(
            vault_id = %input.vault_id,
            keys_count = keys_used.len(),
            output_path = %encrypted_path.display(),
            "Multi-key encryption completed successfully"
        );

        Ok(EncryptFilesMultiResponse {
            encrypted_file_path: encrypted_path.to_string_lossy().to_string(),
            manifest_file_path: vault_manifest_path.to_string_lossy().to_string(),
            file_exists_warning,
            keys_used,
        })
    }

    /// Collect all public keys from vault using KeyRegistryService
    fn collect_vault_public_keys(
        &self,
        vault: &crate::models::Vault,
    ) -> CryptoResult<(Vec<crypto::PublicKey>, Vec<String>)> {
        let mut public_keys = Vec::new();
        let mut keys_used = Vec::new();

        for key_id in &vault.keys {
            match self.key_registry_service.get_key(key_id) {
                Ok(registry_entry) => match registry_entry {
                    KeyEntry::Passphrase {
                        label, public_key, ..
                    } => {
                        let public_key_obj = crypto::PublicKey::from(public_key.clone());
                        public_keys.push(public_key_obj);
                        keys_used.push(label.clone());
                    }
                    KeyEntry::Yubikey {
                        label, recipient, ..
                    } => {
                        let public_key = crypto::PublicKey::from(recipient.clone());
                        public_keys.push(public_key);
                        keys_used.push(label.clone());
                    }
                },
                Err(_) => {
                    warn!(
                        key_id = %key_id,
                        vault_id = %vault.id,
                        "Key ID referenced by vault not found in registry - skipping"
                    );
                }
            }
        }

        Ok((public_keys, keys_used))
    }

    /// Determine output paths for vault encryption
    fn determine_output_paths(
        &self,
        input: &EncryptFilesMultiInput,
        vault_name: &str,
    ) -> CryptoResult<(PathBuf, String)> {
        let output_dir = if let Some(ref path) = input.out_encrypted_file_path {
            PathBuf::from(path)
        } else {
            // Use ~/Documents/Barqly-Vaults/ as default
            let home_dir = std::env::var("HOME").map_err(|_| {
                CryptoError::ConfigurationError("Could not determine home directory".to_string())
            })?;
            let default_dir = PathBuf::from(home_dir)
                .join("Documents")
                .join("Barqly-Vaults");

            // Create directory if it doesn't exist
            std::fs::create_dir_all(&default_dir).map_err(|e| {
                CryptoError::ConfigurationError(format!("Failed to create output directory: {}", e))
            })?;

            default_dir
        };

        let output_name = if let Some(ref name) = input.out_encrypted_file_name {
            self.sanitize_filename(name)
        } else {
            self.sanitize_filename(vault_name)
        };

        Ok((output_dir, output_name))
    }

    /// Create file selection from paths (helper)
    fn create_file_selection_from_paths(
        &self,
        file_paths: &[String],
    ) -> CryptoResult<crate::services::file::infrastructure::file_operations::FileSelection> {
        let path_bufs: Vec<PathBuf> = file_paths.iter().map(PathBuf::from).collect();

        let selection = if path_bufs.len() == 1 && path_bufs[0].is_dir() {
            crate::services::file::infrastructure::file_operations::FileSelection::Folder(
                path_bufs[0].clone(),
            )
        } else {
            crate::services::file::infrastructure::file_operations::FileSelection::Files(path_bufs)
        };

        Ok(selection)
    }

    /// Create archive for vault (helper using existing services)
    async fn create_archive_for_vault(
        &self,
        file_selection: &crate::services::file::infrastructure::file_operations::FileSelection,
        output_path: &Path,
        progress_manager: &mut ProgressManager,
        _operation_id: &str,
    ) -> CryptoResult<(
        crate::services::file::infrastructure::file_operations::ArchiveOperation,
        Vec<crate::services::file::infrastructure::file_operations::FileInfo>,
    )> {
        progress_manager.set_progress(PROGRESS_ENCRYPT_ARCHIVE_START, "Creating archive...");

        let config =
            crate::services::file::infrastructure::file_operations::FileOpsConfig::default();
        let (archive_operation, archive_files, _staging_path) =
            crate::services::file::infrastructure::file_operations::create_archive_with_file_info(
                file_selection,
                output_path,
                &config,
            )
            .map_err(|e| {
                CryptoError::EncryptionFailed(format!("Archive creation failed: {}", e))
            })?;

        progress_manager.set_progress(
            PROGRESS_ENCRYPT_ARCHIVE_COMPLETE,
            "Archive created successfully",
        );

        Ok((archive_operation, archive_files))
    }

    /// Update vault manifest with encryption info
    async fn update_vault_manifest(
        &self,
        vault: &mut crate::models::Vault,
        archive_operation: &crate::services::file::infrastructure::file_operations::ArchiveOperation,
        archive_files: &[crate::services::file::infrastructure::file_operations::FileInfo],
        encrypted_path: &Path,
    ) -> CryptoResult<()> {
        // Create archive contents from file info
        let contents: Vec<ArchiveContent> = archive_files
            .iter()
            .map(|file_info| ArchiveContent {
                file: file_info
                    .path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                size: self.format_file_size(file_info.size),
                hash: file_info.hash.clone(),
            })
            .collect();

        let total_size = archive_files.iter().map(|f| f.size).sum::<u64>();

        let encrypted_archive = EncryptedArchive {
            filename: encrypted_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            encrypted_at: chrono::Utc::now(),
            total_files: archive_operation.file_count as u64,
            total_size: self.format_file_size(total_size),
            contents,
        };

        vault.add_encrypted_archive(encrypted_archive);
        vault::save_vault(vault)
            .await
            .map_err(|e| CryptoError::ConfigurationError(format!("Failed to save vault: {}", e)))?;

        Ok(())
    }

    /// Sanitize filename for cross-platform compatibility (extracted from backup)
    fn sanitize_filename(&self, name: &str) -> String {
        name.chars()
            .map(|c| match c {
                '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
                _ => c,
            })
            .collect::<String>()
            .trim()
            .to_string()
    }

    /// Format file size in human-readable format (extracted from backup)
    fn format_file_size(&self, bytes: u64) -> String {
        if bytes == 0 {
            return "0 B".to_string();
        }

        const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
        const THRESHOLD: f64 = 1024.0;

        let mut size = bytes as f64;
        let mut unit_index = 0;

        while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
            size /= THRESHOLD;
            unit_index += 1;
        }

        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

impl Default for VaultEncryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_encryption_service_creation() {
        let _service = VaultEncryptionService::new();
        // Just verify creation works
    }

    #[test]
    fn test_sanitize_filename_basic() {
        let service = VaultEncryptionService::new();
        let result = service.sanitize_filename("test/file:name");
        assert_eq!(result, "test_file_name");
    }

    #[test]
    fn test_format_file_size() {
        let service = VaultEncryptionService::new();
        assert_eq!(service.format_file_size(0), "0 B");
        assert_eq!(service.format_file_size(1024), "1.0 KB");
        assert_eq!(service.format_file_size(1048576), "1.0 MB");
    }
}
