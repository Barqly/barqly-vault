//! File decryption command
//!
//! Thin wrapper following Command → Manager → Service pattern.
//! Handles input validation, progress tracking, and response formatting.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ProgressManager, ValidateInput,
    ValidationHelper,
};
use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::CryptoManager;
use age::secrecy::SecretString;
use tauri::Window;

/// Input for decryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct DecryptDataInput {
    pub encrypted_file: String,
    pub key_id: String,
    pub passphrase: String,
    pub output_dir: Option<String>, // Optional - backend generates default if not provided
    pub force_overwrite: Option<bool>, // NEW - for user confirmation to overwrite
}

/// Result of decryption operation
#[derive(Debug, Serialize, specta::Type)]
pub struct DecryptionResult {
    pub extracted_files: Vec<String>,
    pub output_dir: String,
    pub manifest_verified: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_manifest_restored: Option<bool>,
    pub output_exists: bool, // NEW - for conflict dialog
}

impl ValidateInput for DecryptDataInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.encrypted_file, "Encrypted file path")?;
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;

        // If custom output_dir provided, validate it's safe
        if let Some(ref dir) = self.output_dir {
            ValidationHelper::validate_not_empty(dir, "Output directory")?;
            // Validate it's within safe directories (Documents, home)
            ValidationHelper::validate_safe_user_path(dir)?;
        }

        // Validate encrypted file exists and is a file
        ValidationHelper::validate_path_exists(&self.encrypted_file, "Encrypted file")?;
        ValidationHelper::validate_is_file(&self.encrypted_file, "Encrypted file")?;

        Ok(())
    }
}

/// Decrypt files with progress streaming - delegates to DecryptionOrchestrationService
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(key_id = %input.key_id))]
pub async fn decrypt_data(
    input: DecryptDataInput,
    _window: Window,
) -> CommandResponse<DecryptionResult> {
    // Validate input
    input
        .validate()
        .map_err(|e| ErrorHandler::new().handle_validation_error("input", &e.message))?;

    // Initialize progress manager
    let operation_id = format!("decrypt_{}", chrono::Utc::now().timestamp());
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    info!(
        encrypted_file = %input.encrypted_file,
        key_id = %input.key_id,
        output_dir = ?input.output_dir,
        "Starting decryption operation"
    );

    // Report initial progress
    progress_manager.set_progress(
        PROGRESS_DECRYPT_INIT,
        "Initializing decryption operation...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Use CryptoManager following Command → Manager → Service pattern
    let manager = CryptoManager::new();

    let custom_output = input.output_dir.as_ref().map(std::path::PathBuf::from);
    let force_overwrite = input.force_overwrite.unwrap_or(false);

    let output = manager
        .decrypt_data(
            &input.encrypted_file,
            &input.key_id,
            SecretString::from(input.passphrase),
            custom_output, // Pass Option<PathBuf>
            force_overwrite,
            &mut progress_manager,
        )
        .await
        .map_err(|e| {
            error!(error = %e, "Decryption failed");
            Box::new(CommandError::operation(
                ErrorCode::InternalError,
                format!("Decryption failed: {}", e),
            ))
        })?;

    // Update progress for completion
    progress_manager.complete("Decryption completed successfully");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    info!(
        extracted_files_count = output.extracted_files.len(),
        manifest_verified = output.manifest_verified,
        "Decryption operation completed successfully"
    );

    // Convert extracted files to string paths
    let extracted_file_paths: Vec<String> = output
        .extracted_files
        .iter()
        .map(|file_info| file_info.path.to_string_lossy().to_string())
        .collect();

    Ok(DecryptionResult {
        extracted_files: extracted_file_paths,
        output_dir: output.output_dir.to_string_lossy().to_string(),
        manifest_verified: output.manifest_verified,
        external_manifest_restored: output.external_manifest_restored,
        output_exists: output.output_exists, // NEW
    })
}
