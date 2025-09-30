//! Manifest Verification Service
//!
//! Handles verification of extracted file manifests and restoration of external manifests.

use crate::file_ops;
use crate::prelude::*;
use std::path::Path;

/// Service for manifest verification and restoration
#[derive(Debug)]
pub struct ManifestVerificationService;

impl ManifestVerificationService {
    pub fn new() -> Self {
        Self
    }

    /// Verify manifest if it exists in the extracted files
    #[instrument(skip(self, extracted_files))]
    pub fn verify_manifest(
        &self,
        extracted_files: &[file_ops::FileInfo],
        output_path: &Path,
    ) -> bool {
        debug!(
            extracted_files_count = extracted_files.len(),
            output_path = %output_path.display(),
            "Checking for manifest verification"
        );

        // Look for manifest file in extracted files
        let manifest_file = extracted_files.iter().find(|file| {
            file.path
                .file_name()
                .is_some_and(|name| name == "manifest.json")
        });

        if let Some(manifest_info) = manifest_file {
            let manifest_path = output_path.join(&manifest_info.path);

            debug!(
                manifest_path = %manifest_path.display(),
                "Found manifest file, attempting verification"
            );

            // Try to load and verify the manifest
            match file_ops::archive_manifest::Manifest::load(&manifest_path) {
                Ok(manifest) => {
                    match file_ops::verify_manifest(
                        &manifest,
                        extracted_files,
                        &file_ops::FileOpsConfig::default(),
                    ) {
                        Ok(()) => {
                            info!("Manifest verification successful");
                            true
                        }
                        Err(e) => {
                            warn!(error = %e, "Manifest verification failed");
                            false
                        }
                    }
                }
                Err(e) => {
                    warn!(error = %e, "Failed to load manifest");
                    false
                }
            }
        } else {
            // No manifest found, consider it verified (optional manifest)
            info!("No manifest found, skipping verification");
            true
        }
    }

    /// Restore external manifest if it exists alongside the encrypted file
    #[instrument(skip(self))]
    pub fn restore_external_manifest(
        &self,
        encrypted_file_path: &str,
        output_path: &Path,
    ) -> Option<bool> {
        let encrypted_path = Path::new(encrypted_file_path);
        let external_manifest_path = file_ops::generate_external_manifest_path(encrypted_path);

        debug!(
            encrypted_file_path = %encrypted_file_path,
            external_manifest_path = %external_manifest_path.display(),
            "Checking for external manifest"
        );

        // Check if external manifest exists
        if !external_manifest_path.exists() {
            info!("No external manifest found, skipping restoration");
            return None;
        }

        // Try to copy the external manifest to the output directory
        let output_manifest_path = output_path.join(
            external_manifest_path
                .file_name()
                .unwrap_or_else(|| std::ffi::OsStr::new("vault.manifest")),
        );

        match std::fs::copy(&external_manifest_path, &output_manifest_path) {
            Ok(_) => {
                info!(
                    from = %external_manifest_path.display(),
                    to = %output_manifest_path.display(),
                    "External manifest restored successfully"
                );
                Some(true)
            }
            Err(e) => {
                warn!(
                    error = %e,
                    from = %external_manifest_path.display(),
                    "Failed to restore external manifest"
                );
                Some(false)
            }
        }
    }
}

impl Default for ManifestVerificationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_verification_service_creation() {
        let _service = ManifestVerificationService::new();
        // Just verify creation works
    }
}
