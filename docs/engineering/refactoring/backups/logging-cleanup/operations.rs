//! Operations for manifest creation and management
//!
//! This module provides operations for creating, loading, and managing
//! archive manifests.

use super::super::archive_operations::extract_archive;
use super::super::utils::calculate_file_hash;
use super::super::{ArchiveOperation, FileInfo, FileOpsConfig, FileOpsError, Result};
use super::types::{ArchiveManifest, FileManifestEntry, Manifest};
use super::verification::calculate_manifest_hash;
use chrono::Utc;
use std::fs;
use std::path::Path;
use tracing::info;

impl Manifest {
    /// Create a new manifest
    pub fn new(
        archive_operation: &ArchiveOperation,
        files: &[FileInfo],
        archive_path: &Path,
    ) -> Result<Self> {
        let archive_manifest = ArchiveManifest {
            archive_path: archive_path.to_path_buf(),
            archive_size: archive_operation.total_size,
            archive_hash: archive_operation.archive_hash.clone(),
            total_uncompressed_size: files.iter().map(|f| f.size).sum(),
            file_count: files.len(),
            compression: "gzip".to_string(),
            format: "tar".to_string(),
        };

        let file_entries: Vec<FileManifestEntry> = files
            .iter()
            .map(|file| FileManifestEntry {
                path: file.path.clone(),
                size: file.size,
                modified: file.modified,
                hash: file.hash.clone(),
                #[cfg(unix)]
                permissions: file.permissions,
            })
            .collect();

        let mut manifest = Self {
            version: "1.0".to_string(),
            created: Utc::now(),
            archive: archive_manifest,
            files: file_entries,
            manifest_hash: String::new(), // Will be calculated after creation
        };

        // Calculate manifest hash
        manifest.manifest_hash = calculate_manifest_hash(&manifest)?;

        Ok(manifest)
    }

    /// Save manifest to file
    pub fn save(&self, path: &Path) -> Result<()> {
        let json = serde_json::to_string_pretty(self).map_err(|e| {
            FileOpsError::ManifestCreationFailed {
                message: format!("Failed to serialize manifest: {e}"),
            }
        })?;

        fs::write(path, json).map_err(|e| FileOpsError::IoError {
            message: format!("Failed to write manifest file: {e}"),
            source: e,
        })?;

        info!("Manifest saved to: {}", path.display());
        Ok(())
    }

    /// Load manifest from file
    pub fn load(path: &Path) -> Result<Self> {
        let content =
            fs::read_to_string(path).map_err(|e| FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to read manifest file: {e}"),
            })?;

        let manifest: Manifest = serde_json::from_str(&content).map_err(|e| {
            FileOpsError::ManifestVerificationFailed {
                message: format!("Failed to parse manifest JSON: {e}"),
            }
        })?;

        info!("Manifest loaded from: {}", path.display());
        Ok(manifest)
    }

    /// Verify manifest integrity
    pub fn verify_integrity(&self) -> Result<()> {
        // Calculate current hash
        let current_hash = calculate_manifest_hash(self)?;

        // Compare with stored hash
        if current_hash != self.manifest_hash {
            return Err(FileOpsError::ManifestVerificationFailed {
                message: "Manifest hash verification failed".to_string(),
            });
        }

        info!("Manifest integrity verified");
        Ok(())
    }

    /// Get file entry by path
    pub fn get_file_entry(&self, path: &Path) -> Option<&FileManifestEntry> {
        self.files.iter().find(|entry| entry.path == path)
    }

    /// Check if file exists in manifest
    pub fn contains_file(&self, path: &Path) -> bool {
        self.get_file_entry(path).is_some()
    }

    /// Get total size of all files
    pub fn total_size(&self) -> u64 {
        self.files.iter().map(|f| f.size).sum()
    }

    /// Get file count
    pub fn file_count(&self) -> usize {
        self.files.len()
    }
}

/// Create manifest for archive
pub fn create_manifest_for_archive(
    archive_operation: &ArchiveOperation,
    files: &[FileInfo],
    manifest_path: Option<&Path>,
) -> Result<Manifest> {
    info!("Creating manifest for archive: {} files", files.len());

    let manifest = Manifest::new(archive_operation, files, &archive_operation.archive_path)?;

    // Save manifest if path provided
    if let Some(path) = manifest_path {
        manifest.save(path)?;
    }

    info!(
        "Manifest created successfully: {} files, {} bytes",
        manifest.file_count(),
        manifest.total_size()
    );

    Ok(manifest)
}

/// Extract and verify archive with manifest
pub fn extract_and_verify_archive(
    archive_path: &Path,
    manifest_path: &Path,
    output_dir: &Path,
    config: &FileOpsConfig,
) -> Result<Vec<FileInfo>> {
    info!(
        "Extracting and verifying archive: {} -> {}",
        archive_path.display(),
        output_dir.display()
    );

    // Load manifest
    let manifest = Manifest::load(manifest_path)?;

    // Verify manifest integrity
    manifest.verify_integrity()?;

    // Extract archive
    let extracted_files = extract_archive(archive_path, output_dir, config)?;

    // Verify extracted files against manifest
    super::verification::verify_manifest(&manifest, &extracted_files, config)?;

    info!(
        "Archive extraction and verification completed: {} files",
        extracted_files.len()
    );
    Ok(extracted_files)
}

/// Create manifest from archive (without external manifest file)
pub fn create_manifest_from_archive(
    archive_path: &Path,
    config: &FileOpsConfig,
) -> Result<Manifest> {
    info!("Creating manifest from archive: {}", archive_path.display());

    // Extract archive to temporary directory
    let temp_dir = tempfile::tempdir().map_err(|e| FileOpsError::ManifestCreationFailed {
        message: format!("Failed to create temporary directory: {e}"),
    })?;

    let extracted_files = extract_archive(archive_path, temp_dir.path(), config)?;

    // Calculate archive hash
    let archive_hash = calculate_file_hash(archive_path)?;

    // Get archive metadata
    let archive_metadata = fs::metadata(archive_path).map_err(|_e| FileOpsError::FileNotFound {
        path: archive_path.to_path_buf(),
    })?;

    // Create archive operation info
    let archive_operation = ArchiveOperation {
        archive_path: archive_path.to_path_buf(),
        manifest_path: None,
        total_size: archive_metadata.len(),
        file_count: extracted_files.len(),
        created: chrono::DateTime::from(
            archive_metadata
                .modified()
                .unwrap_or_else(|_| std::time::SystemTime::now()),
        ),
        archive_hash,
    };

    // Create manifest
    let manifest = Manifest::new(&archive_operation, &extracted_files, archive_path)?;

    info!(
        "Manifest created from archive: {} files, {} bytes",
        manifest.file_count(),
        manifest.total_size()
    );

    Ok(manifest)
}
