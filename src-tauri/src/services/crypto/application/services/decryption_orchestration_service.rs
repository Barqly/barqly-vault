//! Decryption Orchestration Service
//!
//! Coordinates all decryption services to provide a complete decryption workflow.
//! This is the main entry point for decryption operations.

use super::{
    ArchiveExtractionService, KeyRetrievalDecryptionService, ManifestVerificationService,
    PassphraseDecryptionService, YubiKeyDecryptionService,
};
use crate::commands::types::ProgressManager;
use crate::constants::*;
use crate::file_ops;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::key_management::shared::KeyEntry;
use age::secrecy::{ExposeSecret, SecretString};
use std::path::Path;

/// Input for decryption orchestration
#[derive(Debug)]
pub struct DecryptionInput<'a> {
    pub encrypted_file: &'a str,
    pub key_id: &'a str,
    pub passphrase: SecretString,
    pub output_dir: &'a Path,
}

/// Result of decryption orchestration
#[derive(Debug)]
pub struct DecryptionOutput {
    pub extracted_files: Vec<file_ops::FileInfo>,
    pub manifest_verified: bool,
    pub external_manifest_restored: Option<bool>,
}

/// Main orchestration service for decryption operations
#[derive(Debug)]
pub struct DecryptionOrchestrationService {
    key_retrieval: KeyRetrievalDecryptionService,
    passphrase_decryption: PassphraseDecryptionService,
    yubikey_decryption: YubiKeyDecryptionService,
    archive_extraction: ArchiveExtractionService,
    manifest_verification: ManifestVerificationService,
}

impl DecryptionOrchestrationService {
    pub fn new() -> Self {
        Self {
            key_retrieval: KeyRetrievalDecryptionService::new(),
            passphrase_decryption: PassphraseDecryptionService::new(),
            yubikey_decryption: YubiKeyDecryptionService::new(),
            archive_extraction: ArchiveExtractionService::new(),
            manifest_verification: ManifestVerificationService::new(),
        }
    }

    /// Execute complete decryption workflow
    #[instrument(skip(self, input, progress_manager))]
    pub async fn decrypt(
        &self,
        input: DecryptionInput<'_>,
        progress_manager: &mut ProgressManager,
    ) -> CryptoResult<DecryptionOutput> {
        info!(
            encrypted_file = %input.encrypted_file,
            key_id = %input.key_id,
            output_dir = %input.output_dir.display(),
            "Starting decryption orchestration"
        );

        // Step 1: Load key from registry
        progress_manager.set_progress(PROGRESS_DECRYPT_KEY_LOAD, "Loading encryption key...");

        let key_entry = self.key_retrieval.get_decryption_key_info(input.key_id)?;

        debug!(
            key_id = %input.key_id,
            key_type = ?key_entry,
            "Retrieved key entry from registry"
        );

        // Step 2: Read encrypted file
        progress_manager.set_progress(PROGRESS_DECRYPT_READ_FILE, "Reading encrypted file...");

        let encrypted_data = std::fs::read(input.encrypted_file).map_err(|e| {
            error!(
                encrypted_file = %input.encrypted_file,
                error = %e,
                "Failed to read encrypted file"
            );
            CryptoError::InvalidInput(format!("Failed to read encrypted file: {}", e))
        })?;

        debug!(
            encrypted_file = %input.encrypted_file,
            encrypted_data_size = encrypted_data.len(),
            "Successfully read encrypted file"
        );

        // Step 3: Decrypt based on key type
        progress_manager.set_progress(PROGRESS_DECRYPT_DECRYPTING, "Decrypting data...");

        let decrypted_data = match &key_entry {
            KeyEntry::Passphrase { key_filename, .. } => {
                debug!(
                    key_id = %input.key_id,
                    key_filename = %key_filename,
                    "Using passphrase-based decryption"
                );

                progress_manager
                    .set_progress(PROGRESS_DECRYPT_KEY_DECRYPT, "Decrypting private key...");

                self.passphrase_decryption.decrypt_with_passphrase(
                    &encrypted_data,
                    key_filename,
                    input.passphrase,
                )?
            }
            KeyEntry::Yubikey { .. } => {
                debug!(
                    key_id = %input.key_id,
                    "Using YubiKey-based decryption"
                );

                // Convert SecretString to &str safely
                let passphrase_str =
                    String::from_utf8_lossy(input.passphrase.expose_secret().as_bytes());

                self.yubikey_decryption.decrypt_with_yubikey(
                    &encrypted_data,
                    &key_entry,
                    &passphrase_str,
                )?
            }
        };

        debug!(
            decrypted_data_size = decrypted_data.len(),
            "Successfully decrypted data"
        );

        // Step 4: Extract archive
        progress_manager.set_progress(PROGRESS_DECRYPT_EXTRACT, "Extracting archive...");

        let extracted_files = self
            .archive_extraction
            .extract_archive(&decrypted_data, input.output_dir)?;

        info!(
            extracted_files_count = extracted_files.len(),
            "Successfully extracted archive"
        );

        // Step 5: Restore external manifest if exists
        progress_manager.set_progress(PROGRESS_DECRYPT_CLEANUP, "Restoring manifest file...");

        let external_manifest_restored = self
            .manifest_verification
            .restore_external_manifest(input.encrypted_file, input.output_dir);

        // Step 6: Verify manifest if exists
        progress_manager.set_progress(PROGRESS_DECRYPT_VERIFY, "Verifying manifest...");

        let manifest_verified = self
            .manifest_verification
            .verify_manifest(&extracted_files, input.output_dir);

        info!(
            manifest_verified = manifest_verified,
            external_manifest_restored = ?external_manifest_restored,
            "Decryption orchestration completed successfully"
        );

        Ok(DecryptionOutput {
            extracted_files,
            manifest_verified,
            external_manifest_restored,
        })
    }
}

impl Default for DecryptionOrchestrationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decryption_orchestration_service_creation() {
        let _service = DecryptionOrchestrationService::new();
        // Just verify creation works
    }
}
