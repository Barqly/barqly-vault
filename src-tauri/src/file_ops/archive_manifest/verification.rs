//! Manifest verification and hash calculation
//!
//! This module provides functionality for verifying archive manifests
//! and calculating hashes for integrity checking.

use super::types::Manifest;
use crate::constants::IO_BUFFER_SIZE;
use crate::file_ops::{FileInfo, FileOpsConfig, FileOpsError, Result};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use tracing::{info, warn};

/// Verify manifest against extracted files
pub fn verify_manifest(
    manifest: &Manifest,
    extracted_files: &[FileInfo],
    _config: &FileOpsConfig,
) -> Result<()> {
    info!(
        "Verifying manifest against {} extracted files",
        extracted_files.len()
    );

    // Verify manifest integrity first
    manifest.verify_integrity()?;

    // Check file count
    if manifest.file_count() != extracted_files.len() {
        return Err(FileOpsError::ManifestVerificationFailed {
            message: format!(
                "File count mismatch: manifest has {}, extracted has {}",
                manifest.file_count(),
                extracted_files.len()
            ),
        });
    }

    // Verify each file
    for extracted_file in extracted_files {
        let manifest_entry = manifest
            .get_file_entry(&extracted_file.path)
            .ok_or_else(|| FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File not found in manifest: {}",
                    extracted_file.path.display()
                ),
            })?;

        // Verify file size
        if manifest_entry.size != extracted_file.size {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File size mismatch for {}: manifest has {}, extracted has {}",
                    extracted_file.path.display(),
                    manifest_entry.size,
                    extracted_file.size
                ),
            });
        }

        // Verify file hash
        if manifest_entry.hash != extracted_file.hash {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: format!(
                    "File hash mismatch for {}: manifest has {}, extracted has {}",
                    extracted_file.path.display(),
                    manifest_entry.hash,
                    extracted_file.hash
                ),
            });
        }

        // Verify file permissions (Unix only)
        #[cfg(unix)]
        {
            if manifest_entry.permissions != extracted_file.permissions {
                warn!(
                    "File permissions mismatch for {}: manifest has {:o}, extracted has {:o}",
                    extracted_file.path.display(),
                    manifest_entry.permissions,
                    extracted_file.permissions
                );
            }
        }
    }

    info!("Manifest verification completed successfully");
    Ok(())
}

/// Calculate SHA-256 hash of manifest content
pub fn calculate_manifest_hash(manifest: &Manifest) -> Result<String> {
    // Create a copy without the hash field for calculation
    let mut manifest_copy = manifest.clone();
    manifest_copy.manifest_hash = String::new();

    let json = serde_json::to_string(&manifest_copy).map_err(|e| {
        FileOpsError::ManifestCreationFailed {
            message: format!("Failed to serialize manifest for hash calculation: {e}"),
        }
    })?;

    let mut hasher = Sha256::new();
    hasher.update(json.as_bytes());
    let result = hasher.finalize();

    Ok(hex::encode(result))
}

/// Calculate SHA-256 hash of a file
pub fn calculate_file_hash(path: &Path) -> Result<String> {
    let mut file = File::open(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; IO_BUFFER_SIZE];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| FileOpsError::HashCalculationFailed {
                message: format!("Failed to read file: {e}"),
            })?;

        if n == 0 {
            break;
        }

        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}
