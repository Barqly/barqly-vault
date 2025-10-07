//! Decryption Orchestration Service
//!
//! Coordinates all decryption services to provide a complete decryption workflow.
//! This is the main entry point for decryption operations.

use super::{
    ArchiveExtractionService, KeyRetrievalDecryptionService, ManifestVerificationService,
    PassphraseDecryptionService, YubiKeyDecryptionService,
};
use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::file::infrastructure::file_operations;
use crate::services::key_management::shared::KeyEntry;
use crate::services::shared::infrastructure::progress::ProgressManager;
use crate::services::shared::infrastructure::{get_keys_dir, get_vault_manifest_path};
use crate::services::vault::application::services::VersionComparisonService;
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;
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
    pub extracted_files: Vec<file_operations::FileInfo>,
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

        // Step 5: Process vault manifest from extracted files
        progress_manager.set_progress(PROGRESS_DECRYPT_CLEANUP, "Processing vault manifest...");

        let (manifest_updated, encryption_revision) =
            self.process_vault_manifest(&extracted_files, input.output_dir)?;

        // Step 6: Restore .agekey.enc files from bundle to keys directory
        let enc_files_restored = self.restore_encryption_keys(&extracted_files)?;

        if enc_files_restored > 0 {
            info!(
                enc_files_count = enc_files_restored,
                "Restored encryption key files from bundle"
            );
        }

        // Step 7: Verify manifest if exists
        progress_manager.set_progress(PROGRESS_DECRYPT_VERIFY, "Verifying manifest...");

        let manifest_verified = self
            .manifest_verification
            .verify_manifest(&extracted_files, input.output_dir);

        info!(
            manifest_verified = manifest_verified,
            manifest_updated = manifest_updated,
            encryption_revision = ?encryption_revision,
            enc_files_restored = enc_files_restored,
            "Decryption orchestration completed successfully"
        );

        Ok(DecryptionOutput {
            extracted_files,
            manifest_verified,
            external_manifest_restored: Some(manifest_updated),
        })
    }

    /// Process vault manifest from extracted files
    ///
    /// Reads manifest from bundle, compares with local, and handles version conflicts.
    ///
    /// # Returns
    /// (manifest_was_updated, encryption_revision)
    fn process_vault_manifest(
        &self,
        extracted_files: &[file_operations::FileInfo],
        output_dir: &Path,
    ) -> CryptoResult<(bool, Option<u32>)> {
        // Look for vault manifest in extracted files (e.g., "Vault-001.manifest" or "*.manifest")
        let manifest_file = extracted_files.iter().find(|file| {
            file.path.extension().is_some_and(|ext| ext == "manifest")
                && file.path.file_name().is_some_and(|name| {
                    name.to_string_lossy().ends_with(".manifest")
                        && !name.to_string_lossy().contains("vault.manifest")
                })
        });

        let Some(manifest_info) = manifest_file else {
            info!("No vault manifest found in bundle, skipping version comparison");
            return Ok((false, None));
        };

        // Read manifest from extracted files
        let manifest_path = output_dir.join(&manifest_info.path);
        let content = std::fs::read_to_string(&manifest_path).map_err(|e| {
            CryptoError::InvalidInput(format!("Failed to read manifest from bundle: {}", e))
        })?;

        let bundle_manifest: VaultMetadata = serde_json::from_str(&content)
            .map_err(|e| CryptoError::InvalidInput(format!("Failed to parse manifest: {}", e)))?;

        info!(
            vault = %bundle_manifest.label(),
            version = bundle_manifest.encryption_revision(),
            "Found vault manifest in bundle"
        );

        // Get path to local manifest in non-sync storage
        let local_manifest_path = get_vault_manifest_path(&bundle_manifest.vault.sanitized_name)
            .map_err(|e| CryptoError::InvalidInput(format!("Invalid vault name: {}", e)))?;

        // Load local manifest if exists
        let local_manifest = if local_manifest_path.exists() {
            match std::fs::read_to_string(&local_manifest_path)
                .and_then(|c| serde_json::from_str::<VaultMetadata>(&c).map_err(|e| e.into()))
            {
                Ok(m) => Some(m),
                Err(e) => {
                    warn!(error = ?e, "Failed to load local manifest, will use bundle version");
                    None
                }
            }
        } else {
            None
        };

        // Use VersionComparisonService to resolve
        let was_updated = VersionComparisonService::resolve_with_backup(
            &bundle_manifest,
            local_manifest.as_ref(),
            &local_manifest_path,
        )
        .map_err(|e| {
            CryptoError::DecryptionFailed(format!("Failed to resolve version conflict: {}", e))
        })?;

        // Log conflict message if any
        let comparison =
            VersionComparisonService::compare_manifests(&bundle_manifest, local_manifest.as_ref());
        if let Some(msg) = VersionComparisonService::get_conflict_message(&comparison) {
            info!(message = %msg, "Version comparison result");
        }

        Ok((was_updated, Some(bundle_manifest.encryption_revision())))
    }

    /// Restore .agekey.enc files from bundle to keys directory
    ///
    /// # Returns
    /// Number of key files restored
    fn restore_encryption_keys(
        &self,
        extracted_files: &[file_operations::FileInfo],
    ) -> CryptoResult<usize> {
        let keys_dir = get_keys_dir().map_err(|e| {
            CryptoError::InvalidInput(format!("Failed to get keys directory: {}", e))
        })?;

        let mut restored_count = 0;

        for file_info in extracted_files {
            if let Some(file_name) = file_info.path.file_name() {
                let file_name_str = file_name.to_string_lossy();

                // Check if this is a .agekey.enc file
                if file_name_str.ends_with(".agekey.enc") {
                    let source_path = &file_info.path;
                    let dest_path = keys_dir.join(file_name);

                    // Only restore if doesn't already exist (don't overwrite existing keys)
                    if !dest_path.exists() {
                        match std::fs::copy(source_path, &dest_path) {
                            Ok(_) => {
                                info!(
                                    key_file = %file_name_str,
                                    "Restored encryption key from bundle"
                                );
                                restored_count += 1;
                            }
                            Err(e) => {
                                warn!(
                                    key_file = %file_name_str,
                                    error = %e,
                                    "Failed to restore encryption key"
                                );
                            }
                        }
                    } else {
                        debug!(
                            key_file = %file_name_str,
                            "Key file already exists, skipping"
                        );
                    }
                }
            }
        }

        Ok(restored_count)
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
