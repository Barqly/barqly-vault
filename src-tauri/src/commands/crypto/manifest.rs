//! Manifest verification command
//!
//! This module provides the Tauri command for verifying file manifests
//! after decryption to ensure data integrity.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ProgressManager, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::prelude::*;
use crate::services::file::FileManager;

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
    // Initialize progress manager
    let operation_id = format!("verify_{}", chrono::Utc::now().timestamp());
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    // Validate input
    input.validate()?;

    info!(
        manifest_path = %input.manifest_path,
        extracted_files_dir = %input.extracted_files_dir,
        "Starting manifest verification"
    );

    progress_manager.set_progress(
        PROGRESS_VERIFY_INIT,
        "Initializing manifest verification...",
    );

    // Use FileManager for verification
    let manager = FileManager::new();

    progress_manager.set_progress(PROGRESS_VERIFY_LOAD, "Loading and verifying manifest...");

    match manager
        .verify_manifest(
            input.manifest_path.clone(),
            input.extracted_files_dir.clone(),
        )
        .await
    {
        Ok(is_valid) => {
            progress_manager.complete("Manifest verification completed");

            info!(is_valid, "Manifest verification completed");

            Ok(VerifyManifestResponse {
                is_valid,
                message: if is_valid {
                    "Manifest verification successful".to_string()
                } else {
                    "Manifest verification failed".to_string()
                },
                file_count: 0,
                total_size: 0,
            })
        }
        Err(e) => {
            progress_manager.complete("Manifest verification failed");
            warn!(error = %e, "Manifest verification failed");

            Err(Box::new(
                CommandError::operation(
                    ErrorCode::FileNotFound,
                    format!("Manifest verification failed: {}", e),
                )
                .with_recovery_guidance("Ensure the manifest file and extracted files are correct"),
            ))
        }
    }
}
