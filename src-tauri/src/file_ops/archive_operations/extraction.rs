//! Archive extraction functionality
//!
//! This module handles the extraction of TAR.GZ archives.

use crate::file_ops::utils::calculate_file_hash;
use crate::file_ops::{FileInfo, FileOpsConfig, FileOpsError, Result};
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

        let output_path = output_dir.join(&path);

        // Create parent directories if needed
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|e| FileOpsError::IoError {
                message: format!("Failed to create parent directory: {e}"),
                source: e,
            })?;
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
