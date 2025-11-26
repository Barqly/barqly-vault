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
use std::path::{Path, PathBuf};

/// Input for decryption orchestration
#[derive(Debug)]
pub struct DecryptionInput<'a> {
    pub encrypted_file: &'a str,
    pub key_id: &'a str,
    pub passphrase: SecretString,
    pub custom_output_dir: Option<PathBuf>, // Optional custom override
    pub force_overwrite: bool,              // NEW - for user confirmation
}

/// Result of decryption orchestration
#[derive(Debug)]
pub struct DecryptionOutput {
    pub extracted_files: Vec<file_operations::FileInfo>,
    pub output_dir: PathBuf, // Actual path used
    pub output_exists: bool, // NEW - conflict detection
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
            custom_output_dir = ?input.custom_output_dir,
            "Starting decryption orchestration"
        );

        // Extract vault name from encrypted filename
        let vault_name = self.extract_vault_name_from_file(input.encrypted_file)?;

        // Determine output directory
        let output_dir = if let Some(custom) = input.custom_output_dir {
            custom
        } else {
            self.generate_default_output_path(&vault_name)?
        };

        // Check if output already exists (for frontend conflict dialog)
        let output_exists = self.check_output_exists(&output_dir);

        info!(
            vault_name = %vault_name,
            output_dir = %output_dir.display(),
            output_exists = output_exists,
            force_overwrite = input.force_overwrite,
            "Determined output directory for decryption"
        );

        // CRITICAL: Stop if output exists and no force flag
        if output_exists && !input.force_overwrite {
            info!(
                output_dir = %output_dir.display(),
                "Output directory exists and force_overwrite is false - returning conflict response"
            );

            // Return early with conflict info - DON'T decrypt yet
            return Ok(DecryptionOutput {
                extracted_files: vec![], // Empty - nothing decrypted yet
                output_dir,
                output_exists: true, // Signal conflict to frontend
                manifest_verified: false,
                external_manifest_restored: None,
            });
        }

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
            KeyEntry::Recipient { .. } => {
                error!(
                    key_id = %input.key_id,
                    "Cannot decrypt with recipient key - no private key available"
                );
                return Err(CryptoError::DecryptionFailed(
                    "Cannot decrypt with a recipient key. Recipients are public keys only - you need the owner's private key to decrypt.".to_string()
                ));
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
            .extract_archive(&decrypted_data, &output_dir)?;

        info!(
            extracted_files_count = extracted_files.len(),
            "Successfully extracted archive"
        );

        // Step 5: Process vault manifest from extracted files
        progress_manager.set_progress(PROGRESS_DECRYPT_CLEANUP, "Processing vault manifest...");

        let (manifest_updated, encryption_revision, bundle_manifest) =
            self.process_vault_manifest(&extracted_files, &output_dir)?;

        // Step 6: Restore .agekey.enc files from bundle to keys directory
        let enc_files_restored = self.restore_encryption_keys(&extracted_files)?;

        if enc_files_restored > 0 {
            info!(
                enc_files_count = enc_files_restored,
                "Restored encryption key files from bundle"
            );
        }

        // Step 7: Restore Key Registry from vault manifest (RECOVERY FLOW)
        if manifest_updated && bundle_manifest.is_some() {
            // If manifest was restored from bundle, also restore registry
            let bundle_manifest = bundle_manifest.unwrap();
            let keys_restored = self.restore_key_registry_from_manifest(&bundle_manifest)?;
            info!(
                keys_restored,
                "Restored keys to registry from vault manifest"
            );
        }

        // Step 8: Verify manifest if exists
        progress_manager.set_progress(PROGRESS_DECRYPT_VERIFY, "Verifying manifest...");

        let manifest_verified = self
            .manifest_verification
            .verify_manifest(&extracted_files, &output_dir);

        info!(
            manifest_verified = manifest_verified,
            manifest_updated = manifest_updated,
            encryption_revision = ?encryption_revision,
            enc_files_restored = enc_files_restored,
            "Decryption orchestration completed successfully"
        );

        Ok(DecryptionOutput {
            extracted_files,
            output_dir,
            output_exists,
            manifest_verified,
            external_manifest_restored: Some(manifest_updated),
        })
    }

    /// Process vault manifest from extracted files
    ///
    /// Reads manifest from bundle, compares with local, and handles version conflicts.
    ///
    /// # Returns
    /// (manifest_was_updated, encryption_revision, bundle_manifest)
    fn process_vault_manifest(
        &self,
        extracted_files: &[file_operations::FileInfo],
        output_dir: &Path,
    ) -> CryptoResult<(bool, Option<u32>, Option<VaultMetadata>)> {
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
            return Ok((false, None, None));
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
            revision = bundle_manifest.versioning.revision,
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

        Ok((
            was_updated,
            Some(bundle_manifest.encryption_revision()),
            Some(bundle_manifest),
        ))
    }

    /// Restore Key Registry from vault manifest
    fn restore_key_registry_from_manifest(&self, manifest: &VaultMetadata) -> CryptoResult<usize> {
        use crate::services::key_management::shared::application::services::registry_service::{
            KeyRegistryService, MergeStrategy,
        };

        let registry_service = KeyRegistryService::new();

        // Use Replace strategy for recovery (bundle is authoritative)
        registry_service
            .merge_keys_from_manifest(
                manifest,
                manifest.vault_id(),
                MergeStrategy::ReplaceIfDuplicate,
            )
            .map_err(|e| {
                CryptoError::DecryptionFailed(format!("Failed to restore registry: {}", e))
            })
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

    /// Extract vault name from encrypted filename
    ///
    /// Parses filenames like "Sam-Family-Vault-2025-01-13.age" or "Sam-Family-Vault.age"
    /// Returns the sanitized vault name portion
    fn extract_vault_name_from_file(&self, encrypted_file_path: &str) -> CryptoResult<String> {
        use regex::Regex;

        let file_path = Path::new(encrypted_file_path);
        let filename = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .ok_or_else(|| CryptoError::InvalidInput("Could not extract filename".to_string()))?;

        // Regex pattern: capture vault name, optional date, then .age extension
        // Pattern: ^(vault-name)(?:-(\d{4}-\d{2}-\d{2}))?\.age$
        let pattern = r"^([^-]+(?:-[^-]+)*?)(?:-(\d{4}-\d{2}-\d{2}))?\.age$";
        let re = Regex::new(pattern)
            .map_err(|e| CryptoError::InvalidInput(format!("Regex compilation failed: {}", e)))?;

        let captures = re.captures(filename).ok_or_else(|| {
            CryptoError::InvalidInput(format!(
                "Filename does not match expected vault format: '{}'",
                filename
            ))
        })?;

        let vault_name = captures
            .get(1)
            .map(|m| m.as_str().to_string())
            .ok_or_else(|| {
                CryptoError::InvalidInput("Could not extract vault name from filename".to_string())
            })?;

        Ok(vault_name)
    }

    /// Generate default output path for decryption
    ///
    /// Creates path like: ~/Documents/Barqly-Recovery/{vault_name}/
    fn generate_default_output_path(&self, vault_name: &str) -> CryptoResult<PathBuf> {
        use crate::services::shared::infrastructure::path_management::get_recovery_directory;

        let recovery_dir = get_recovery_directory().map_err(|e| {
            CryptoError::InvalidInput(format!("Cannot access recovery directory: {}", e))
        })?;

        let vault_output = recovery_dir.join(vault_name);
        Ok(vault_output)
    }

    /// Check if output directory already exists
    fn check_output_exists(&self, path: &Path) -> bool {
        path.exists() && path.is_dir()
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
