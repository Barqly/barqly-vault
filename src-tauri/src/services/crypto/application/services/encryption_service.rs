use super::{
    ArchiveOrchestrationService, CoreEncryptionService, FileValidationService, KeyRetrievalService,
    VaultEncryptionService,
};
use crate::commands::crypto::{
    self as crypto_commands, EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse,
};
use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use std::path::PathBuf;

#[derive(Debug)]
pub struct EncryptionService {
    key_retrieval: KeyRetrievalService,
    file_validation: FileValidationService,
    archive_orchestration: ArchiveOrchestrationService,
    core_encryption: CoreEncryptionService,
    vault_encryption: VaultEncryptionService,
}

impl EncryptionService {
    pub fn new() -> Self {
        Self {
            key_retrieval: KeyRetrievalService::new(),
            file_validation: FileValidationService::new(),
            archive_orchestration: ArchiveOrchestrationService::new(),
            core_encryption: CoreEncryptionService::new(),
            vault_encryption: VaultEncryptionService::new(),
        }
    }

    /// Encrypt files with single key - complete business logic using modular services
    #[instrument(skip(input), fields(key_id = %input.key_id, file_count = input.file_paths.len()))]
    pub async fn encrypt_files(&self, input: EncryptDataInput) -> CryptoResult<String> {
        // Check for concurrent operations (from original logic)
        if crypto_commands::ENCRYPTION_IN_PROGRESS
            .compare_exchange(
                false,
                true,
                std::sync::atomic::Ordering::Acquire,
                std::sync::atomic::Ordering::Relaxed,
            )
            .is_err()
        {
            return Err(CryptoError::OperationInProgress);
        }

        // Note: Cleanup handled by commands layer ENCRYPTION_IN_PROGRESS flag

        // Initialize progress manager (from original logic)
        let operation_id = format!("encrypt_{}", chrono::Utc::now().timestamp());
        let mut progress_manager =
            crate::commands::types::ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

        info!(
            key_id = %input.key_id,
            file_count = input.file_paths.len(),
            operation_id = %operation_id,
            "Starting encryption operation"
        );

        // Step 1: Validate input using dedicated service
        self.file_validation.validate_encrypt_input(&input)?;

        // Step 2: Retrieve and validate encryption key
        let public_key = self.key_retrieval.get_encryption_key(&input.key_id).await?;

        // Step 3: Determine output directory (from original logic)
        let output_dir = if let Some(ref output_path) = input.output_path {
            PathBuf::from(output_path)
        } else {
            std::env::current_dir().map_err(|e| {
                CryptoError::ConfigurationError(format!("Failed to get current directory: {}", e))
            })?
        };

        // Step 4: Create archive using orchestration service
        let (archive_operation, _archive_files, archive_data) = self
            .archive_orchestration
            .create_archive_for_encryption(
                &input,
                &output_dir,
                &mut progress_manager,
                &operation_id,
            )
            .await?;

        // Step 5: Encrypt archive data using core encryption service
        let encrypted_data = self
            .core_encryption
            .encrypt_archive_data(
                &archive_data,
                &public_key,
                &mut progress_manager,
                &operation_id,
            )
            .await?;

        // Step 6: Write encrypted file and get final path
        let encrypted_path = self
            .core_encryption
            .write_encrypted_file(
                &encrypted_data,
                &archive_operation,
                &mut progress_manager,
                &operation_id,
            )
            .await?;

        // Step 7: Cleanup and final progress
        progress_manager.set_progress(
            PROGRESS_ENCRYPT_CLEANUP,
            "Encryption completed successfully",
        );
        crypto_commands::update_global_progress(
            &operation_id,
            progress_manager.get_current_update(),
        );

        info!(
            encrypted_path = %encrypted_path,
            operation_id = %operation_id,
            "Encryption operation completed successfully"
        );

        Ok(encrypted_path)
    }

    /// Encrypt files with multiple keys - delegates to vault encryption service
    pub async fn encrypt_files_multi(
        &self,
        input: EncryptFilesMultiInput,
    ) -> CryptoResult<EncryptFilesMultiResponse> {
        self.vault_encryption.encrypt_files_multi(input).await
    }

    // NOTE: generate_key_multi removed - use key_management commands instead
    // Key generation belongs in key_management domain, not crypto domain
}

impl Default for EncryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_service_creation() {
        let _service = EncryptionService::new();
        // Just verify creation works
    }
}
