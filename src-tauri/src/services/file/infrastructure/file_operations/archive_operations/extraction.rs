//! Archive extraction functionality
//!
//! This module handles the extraction of TAR.GZ archives.

use super::super::utils::calculate_file_hash;
use super::super::validation::contains_traversal_attempt;
use super::super::{FileInfo, FileOpsConfig, FileOpsError, Result};
use flate2::read::GzDecoder;
use std::fs::{self, File};
use std::io;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use tar::Archive;
use tracing::info;

/// Extract a TAR.GZ archive
pub fn extract_archive(
    archive_path: &Path,
    output_dir: &Path,
    config: &FileOpsConfig,
) -> Result<Vec<FileInfo>> {
    debug_assert!(
        !archive_path.as_os_str().is_empty(),
        "Archive path cannot be empty"
    );
    debug_assert!(
        !output_dir.as_os_str().is_empty(),
        "Output directory cannot be empty"
    );

    info!(
        "Extracting archive: {} -> {}",
        archive_path.display(),
        output_dir.display()
    );

    // Validate archive path
    if !archive_path.exists() {
        return Err(FileOpsError::FileNotFound {
            path: archive_path.to_path_buf(),
        });
    }

    // Create output directory if it doesn't exist
    fs::create_dir_all(output_dir).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to create output directory: {e}"),
        source: e,
    })?;

    // Open and validate archive
    let archive_file =
        File::open(archive_path).map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to open archive: {e}"),
        })?;

    // Create GZIP decoder
    let gz_decoder = GzDecoder::new(archive_file);

    // Create TAR archive reader
    let mut archive = Archive::new(gz_decoder);
    archive.set_preserve_permissions(config.preserve_permissions);

    let mut extracted_files = Vec::new();

    // Extract files
    for entry_result in archive
        .entries()
        .map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to read archive entries: {e}"),
        })?
    {
        let mut entry = entry_result.map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to read archive entry: {e}"),
        })?;

        let path = entry
            .path()
            .map_err(|e| FileOpsError::ArchiveExtractionFailed {
                message: format!("Failed to get entry path: {e}"),
            })?
            .to_path_buf();

        // Validate path for security - prevent directory traversal attacks
        if contains_traversal_attempt(&path) {
            return Err(FileOpsError::PathValidationFailed {
                path: path.clone(),
                reason: "Directory traversal attempt detected in archive entry".to_string(),
            });
        }

        let output_path = output_dir.join(&path);

        // Ensure the resolved path is still within the output directory
        // This catches symbolic links and other path resolution attacks
        let canonical_output_dir = output_dir
            .canonicalize()
            .unwrap_or_else(|_| output_dir.to_path_buf());

        // For the output path, we need to check the parent directory since the file doesn't exist yet
        let output_parent =
            output_path
                .parent()
                .ok_or_else(|| FileOpsError::PathValidationFailed {
                    path: output_path.clone(),
                    reason: "Invalid output path".to_string(),
                })?;

        // Create parent directories if needed (we'll validate after creation)
        if !output_parent.exists() {
            fs::create_dir_all(output_parent).map_err(|e| FileOpsError::IoError {
                message: format!("Failed to create parent directory: {e}"),
                source: e,
            })?;
        }

        // Now canonicalize the parent and verify it's within output_dir
        let canonical_parent =
            output_parent
                .canonicalize()
                .map_err(|e| FileOpsError::PathValidationFailed {
                    path: output_parent.to_path_buf(),
                    reason: format!("Failed to resolve output parent directory: {e}"),
                })?;

        if !canonical_parent.starts_with(&canonical_output_dir) {
            return Err(FileOpsError::PathValidationFailed {
                path: output_path.clone(),
                reason: "Archive entry would extract outside of output directory".to_string(),
            });
        }

        // Extract file
        if entry.header().entry_type().is_file() {
            let mut output_file =
                File::create(&output_path).map_err(|e| FileOpsError::IoError {
                    message: format!("Failed to create output file: {e}"),
                    source: e,
                })?;

            io::copy(&mut entry, &mut output_file).map_err(|e| FileOpsError::IoError {
                message: format!("Failed to extract file: {e}"),
                source: e,
            })?;

            // Get file metadata
            let metadata = fs::metadata(&output_path).map_err(|_e| FileOpsError::FileNotFound {
                path: output_path.clone(),
            })?;

            let file_info = FileInfo {
                path: output_path.clone(),
                size: metadata.len(),
                modified: chrono::DateTime::from(
                    metadata
                        .modified()
                        .unwrap_or_else(|_| std::time::SystemTime::now()),
                ),
                hash: calculate_file_hash(&output_path)?,
                #[cfg(unix)]
                permissions: metadata.permissions().mode(),
            };

            extracted_files.push(file_info);
            info!("Extracted file: {}", path.display());
        }
    }

    info!(
        "Archive extraction completed: {} files",
        extracted_files.len()
    );
    Ok(extracted_files)
}
