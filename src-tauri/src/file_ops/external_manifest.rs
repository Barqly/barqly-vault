//! External manifest operations for user-facing vault metadata
//!
//! This module handles the creation and management of external manifest files
//! that provide users with readable information about their encrypted vaults.

use super::{ArchiveOperation, FileInfo};
use super::{FileOpsError, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;

/// External manifest for user-facing vault information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExternalManifest {
    pub vault_info: VaultInfo,
    pub contents: Vec<ContentEntry>,
    pub encryption: EncryptionInfo,
}

/// Vault metadata information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultInfo {
    pub created: DateTime<Utc>,
    pub encrypted_file: String,
    pub total_files: usize,
    pub vault_size: String,
}

/// File/folder entry in the vault
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentEntry {
    pub file: String,
    pub size: String,
    pub hash: String,
}

/// Encryption information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptionInfo {
    pub method: String,
    pub key_label: String,
    pub public_key: String,
}

impl ExternalManifest {
    /// Create a new external manifest
    pub fn new(
        archive_operation: &ArchiveOperation,
        files: &[FileInfo],
        staging_path: &Path,
        encrypted_file_path: &Path,
        key_label: &str,
        public_key: &str,
    ) -> Result<Self> {
        // Get the actual encrypted file size
        let encrypted_metadata = fs::metadata(encrypted_file_path).map_err(|e| {
            FileOpsError::ManifestCreationFailed {
                message: format!("Failed to read encrypted file metadata: {e}"),
            }
        })?;

        let vault_info = VaultInfo {
            created: archive_operation.created,
            encrypted_file: encrypted_file_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "encrypted.age".to_string()),
            total_files: files.len(),
            vault_size: format_file_size(encrypted_metadata.len()),
        };

        let contents: Vec<ContentEntry> = files
            .iter()
            .map(|file| {
                // Convert staging path to archive-relative path
                let relative_path = file.path
                    .strip_prefix(staging_path)
                    .unwrap_or(&file.path)
                    .to_string_lossy()
                    .to_string();
                
                ContentEntry {
                    file: relative_path,
                    size: format_file_size(file.size),
                    hash: file.hash.clone(),
                }
            })
            .collect();

        let encryption = EncryptionInfo {
            method: "Age encryption".to_string(),
            key_label: key_label.to_string(),
            public_key: public_key.to_string(),
        };

        Ok(Self {
            vault_info,
            contents,
            encryption,
        })
    }

    /// Save external manifest to file
    pub fn save(&self, path: &Path) -> Result<()> {
        let json = serde_json::to_string_pretty(self).map_err(|e| {
            FileOpsError::ManifestCreationFailed {
                message: format!("Failed to serialize external manifest: {e}"),
            }
        })?;

        fs::write(path, json).map_err(|e| FileOpsError::IoError {
            message: format!("Failed to write external manifest file: {e}"),
            source: e,
        })?;

        info!("External manifest saved to: {}", path.display());
        Ok(())
    }

    /// Load external manifest from file
    pub fn load(path: &Path) -> Result<Self> {
        let content =
            fs::read_to_string(path).map_err(|e| FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to read external manifest file: {e}"),
            })?;

        let manifest: ExternalManifest = serde_json::from_str(&content).map_err(|e| {
            FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to parse external manifest JSON: {e}"),
            }
        })?;

        info!("External manifest loaded from: {}", path.display());
        Ok(manifest)
    }
}

/// Create external manifest for archive
pub fn create_external_manifest_for_archive(
    archive_operation: &ArchiveOperation,
    files: &[FileInfo],
    staging_path: &Path,
    encrypted_file_path: &Path,
    key_label: &str,
    public_key: &str,
    manifest_path: Option<&Path>,
) -> Result<ExternalManifest> {
    info!(
        "Creating external manifest for archive: {} files",
        files.len()
    );

    let manifest = ExternalManifest::new(
        archive_operation,
        files,
        staging_path,
        encrypted_file_path,
        key_label,
        public_key,
    )?;

    // Save manifest if path provided
    if let Some(path) = manifest_path {
        manifest.save(path)?;
    }

    info!(
        "External manifest created successfully: {} files, vault size: {}",
        manifest.vault_info.total_files, manifest.vault_info.vault_size
    );

    Ok(manifest)
}

/// Generate external manifest path from encrypted file path
pub fn generate_external_manifest_path(encrypted_file_path: &Path) -> PathBuf {
    encrypted_file_path.with_extension("manifest")
}

/// Format file size in human-readable format
fn format_file_size(bytes: u64) -> String {
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

    if unit_index == 0 {
        format!("{} {}", bytes, UNITS[unit_index])
    } else {
        format!("{:.1} {}", size, UNITS[unit_index])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(0), "0 B");
        assert_eq!(format_file_size(512), "512 B");
        assert_eq!(format_file_size(1024), "1.0 KB");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(1048576), "1.0 MB");
        assert_eq!(format_file_size(2621440), "2.5 MB");
    }

    #[test]
    fn test_generate_external_manifest_path() {
        let encrypted_path = PathBuf::from("/path/to/vault.age");
        let manifest_path = generate_external_manifest_path(&encrypted_path);
        assert_eq!(manifest_path, PathBuf::from("/path/to/vault.manifest"));
    }
}
