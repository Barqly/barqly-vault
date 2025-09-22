//! Manifest verification command
//!
//! This module provides the Tauri command for verifying file manifests
//! after decryption to ensure data integrity.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ProgressManager, ValidateInput,
    ValidationHelper,
};
use crate::constants::*;
use crate::file_ops;
use crate::prelude::*;

/// Input for manifest verification command
#[derive(Debug, Deserialize, specta::Type)]
pub struct VerifyManifestInput {
    pub manifest_path: String,
    pub extracted_files_dir: String,
}

/// Response from manifest verification command
#[derive(Debug, Serialize, specta::Type)]
pub struct VerifyManifestResponse {
    pub is_valid: bool,
    pub message: String,
    pub file_count: usize,
    pub total_size: u64,
}

impl ValidateInput for VerifyManifestInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.manifest_path, "Manifest path")?;
        ValidationHelper::validate_not_empty(
            &self.extracted_files_dir,
            "Extracted files directory",
        )?;

        // Validate manifest path exists and is a file
        ValidationHelper::validate_path_exists(&self.manifest_path, "Manifest file")?;
        ValidationHelper::validate_is_file(&self.manifest_path, "Manifest file")?;

        // Validate extracted files directory exists and is a directory
        ValidationHelper::validate_path_exists(
            &self.extracted_files_dir,
            "Extracted files directory",
        )?;
        ValidationHelper::validate_is_directory(
            &self.extracted_files_dir,
            "Extracted files directory",
        )?;

        Ok(())
    }
}

/// Verify a manifest file against extracted files
#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(manifest_path = %input.manifest_path))]
pub async fn verify_manifest(
    input: VerifyManifestInput,
) -> CommandResponse<VerifyManifestResponse> {
    // Initialize progress manager for operation tracking
    let operation_id = format!(
        "verify_{timestamp}",
        timestamp = chrono::Utc::now().timestamp()
    );
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    // Create error handler
    let error_handler = ErrorHandler::new();

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured fields
    info!(
        manifest_path = %input.manifest_path,
        extracted_files_dir = %input.extracted_files_dir,
        "Starting manifest verification"
    );

    // Report initial progress
    progress_manager.set_progress(
        PROGRESS_VERIFY_INIT,
        "Initializing manifest verification...",
    );

    // Load the manifest
    progress_manager.set_progress(PROGRESS_VERIFY_LOAD, "Loading manifest file...");

    let manifest = error_handler.handle_operation_error(
        file_ops::archive_manifest::Manifest::load(std::path::Path::new(&input.manifest_path)),
        "load_manifest",
        ErrorCode::FileNotFound,
    )?;

    // Get file information for extracted files
    progress_manager.set_progress(PROGRESS_VERIFY_SCAN, "Scanning extracted files...");

    let extracted_files = error_handler.handle_operation_error(
        get_extracted_files_info(&input.extracted_files_dir),
        "get_extracted_files_info",
        ErrorCode::FileNotFound,
    )?;

    // Verify the manifest
    progress_manager.set_progress(PROGRESS_VERIFY_CHECK, "Verifying file integrity...");

    let verification_result = file_ops::verify_manifest(
        &manifest,
        &extracted_files,
        &file_ops::FileOpsConfig::default(),
    );

    match verification_result {
        Ok(()) => {
            // Complete the operation
            progress_manager.complete("Manifest verification completed successfully");

            // Log successful verification
            info!(
                file_count = manifest.files.len(),
                total_size = manifest.archive.total_uncompressed_size,
                "Manifest verification completed successfully"
            );

            Ok(VerifyManifestResponse {
                is_valid: true,
                message: "Manifest verification successful".to_string(),
                file_count: manifest.files.len(),
                total_size: manifest.archive.total_uncompressed_size,
            })
        }
        Err(e) => {
            // Complete the operation with error
            progress_manager.complete("Manifest verification failed");

            // Log verification failure
            warn!(
                error = %e,
                "Manifest verification failed"
            );

            Ok(VerifyManifestResponse {
                is_valid: false,
                message: format!("Manifest verification failed: {e}"),
                file_count: manifest.files.len(),
                total_size: manifest.archive.total_uncompressed_size,
            })
        }
    }
}

/// Helper function to get file information from extracted directory
pub(crate) fn get_extracted_files_info(
    extracted_dir: &str,
) -> Result<Vec<crate::file_ops::FileInfo>, crate::file_ops::FileOpsError> {
    use std::fs;
    #[cfg(unix)]
    use std::os::unix::fs::PermissionsExt;
    use std::path::Path;
    use walkdir::WalkDir;

    let mut file_infos = Vec::new();
    let extracted_path = Path::new(extracted_dir);

    for entry in WalkDir::new(extracted_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let metadata = fs::metadata(path)?;

        // Calculate relative path from extracted directory
        let relative_path = path
            .strip_prefix(extracted_path)
            .unwrap_or(path)
            .to_path_buf();

        // Calculate hash for file
        let hash = calculate_file_hash_simple(path)?;

        let file_info = crate::file_ops::FileInfo {
            path: relative_path,
            size: metadata.len(),
            modified: chrono::DateTime::from(metadata.modified()?),
            hash,
            #[cfg(unix)]
            permissions: metadata.permissions().mode(),
        };

        file_infos.push(file_info);
    }

    Ok(file_infos)
}

/// Helper function to calculate simple file hash
pub(crate) fn calculate_file_hash_simple(
    path: &std::path::Path,
) -> Result<String, crate::file_ops::FileOpsError> {
    use sha2::{Digest, Sha256};
    use std::fs::File;
    use std::io::Read;

    let mut file = File::open(path).map_err(|_e| crate::file_ops::FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; IO_BUFFER_SIZE];

    loop {
        let n = file.read(&mut buffer).map_err(|e| {
            crate::file_ops::FileOpsError::HashCalculationFailed {
                message: format!("Failed to read file: {e}"),
            }
        })?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(format!("{:x}", hasher.finalize()))
}
