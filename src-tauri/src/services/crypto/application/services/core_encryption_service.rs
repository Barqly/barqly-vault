//! Core encryption service for crypto operations
//!
//! Handles the actual age encryption/decryption operations.
//! Extracted from commands/crypto/encryption.rs for proper domain separation.

use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::crypto::infrastructure as crypto;
use crate::services::file::infrastructure::file_operations::ArchiveOperation;
use crate::services::shared::infrastructure::error::ErrorHandler;
use crate::services::shared::infrastructure::progress::{ProgressManager, update_global_progress};

#[derive(Debug)]
pub struct CoreEncryptionService;

impl CoreEncryptionService {
    pub fn new() -> Self {
        Self
    }

    /// Encrypt archive data using age encryption
    pub async fn encrypt_archive_data(
        &self,
        archive_data: &[u8],
        public_key_str: &str,
        progress_manager: &mut ProgressManager,
        operation_id: &str,
    ) -> CryptoResult<Vec<u8>> {
        let error_handler = ErrorHandler::new();

        // Convert public key string to crypto module format
        let public_key = crypto::PublicKey::from(public_key_str.to_string());

        // Update progress for encryption step
        progress_manager.set_progress(PROGRESS_ENCRYPT_ENCRYPTING, "Encrypting data...");
        self.update_progress(operation_id, progress_manager);

        debug!(
            archive_size = archive_data.len(),
            "Starting archive data encryption"
        );

        // Perform the actual encryption
        let encrypted_data = error_handler
            .handle_crypto_operation_error(
                crypto::encrypt_data(archive_data, &public_key),
                "encrypt_data",
            )
            .map_err(|e| CryptoError::EncryptionFailed(format!("Encryption failed: {}", e)))?;

        debug!(
            original_size = archive_data.len(),
            encrypted_size = encrypted_data.len(),
            compression_ratio = (encrypted_data.len() as f64 / archive_data.len() as f64),
            "Archive encryption completed successfully"
        );

        Ok(encrypted_data)
    }

    /// Write encrypted data to output file
    pub async fn write_encrypted_file(
        &self,
        encrypted_data: &[u8],
        archive_operation: &ArchiveOperation,
        progress_manager: &mut ProgressManager,
        operation_id: &str,
    ) -> CryptoResult<String> {
        // Update progress for writing step
        progress_manager.set_progress(PROGRESS_ENCRYPT_WRITING, "Writing encrypted file...");
        self.update_progress(operation_id, progress_manager);

        let encrypted_path = archive_operation.archive_path.with_extension("age");

        // Write encrypted data to file
        std::fs::write(&encrypted_path, encrypted_data).map_err(|e| {
            CryptoError::EncryptionFailed(format!("Failed to write encrypted file: {}", e))
        })?;

        debug!(
            encrypted_path = %encrypted_path.display(),
            file_size = encrypted_data.len(),
            "Encrypted file written successfully"
        );

        Ok(encrypted_path.to_string_lossy().to_string())
    }

    /// Helper method to update global progress
    fn update_progress(&self, operation_id: &str, progress_manager: &ProgressManager) {
        update_global_progress(operation_id, progress_manager.get_current_update());
    }
}

impl Default for CoreEncryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_core_encryption_service_creation() {
        let _service = CoreEncryptionService::new();
        // Just verify creation works
    }

    // Note: Actual encryption tests would require test data and keys
    // These should be integration tests rather than unit tests
}
