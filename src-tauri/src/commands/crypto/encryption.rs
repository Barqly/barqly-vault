//! File encryption commands - thin wrappers for service layer
//!
//! This module provides Tauri commands that delegate to the crypto service layer
//! for actual business logic implementation.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ValidateInput, ValidationHelper,
};
use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::CryptoManager;
use tauri::Window;

/// Input for encryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptDataInput {
    pub key_id: String,
    pub file_paths: Vec<String>,
    pub output_name: Option<String>,
    pub output_path: Option<String>,
}

impl ValidateInput for EncryptDataInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;

        if self.file_paths.is_empty() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::MissingParameter,
                    "At least one file must be selected",
                )
                .with_recovery_guidance("Please select one or more files to encrypt"),
            ));
        }

        // Validate file count limit (from original validation)
        if self.file_paths.len() > MAX_FILES_PER_OPERATION {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::TooManyFiles,
                    format!(
                        "Too many files selected: {} (maximum {})",
                        self.file_paths.len(),
                        MAX_FILES_PER_OPERATION
                    ),
                )
                .with_recovery_guidance("Please select fewer files"),
            ));
        }

        Ok(())
    }
}

/// Encrypt files with progress streaming - delegates to service layer
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(key_id = %input.key_id, file_count = input.file_paths.len()))]
pub async fn encrypt_files(input: EncryptDataInput, _window: Window) -> CommandResponse<String> {
    // Validate input at command layer
    input.validate()?;

    // Delegate to service layer for business logic
    let manager = CryptoManager::new();

    match manager.encrypt_files(input).await {
        Ok(encrypted_path) => Ok(encrypted_path),
        Err(crypto_error) => {
            // Convert service error to command error
            Err(Box::new(CommandError::operation(
                ErrorCode::EncryptionFailed,
                crypto_error.to_string(),
            )))
        }
    }
}

/// Input for multi-key encryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptFilesMultiInput {
    pub vault_id: String,
    pub in_file_paths: Vec<String>,
    pub out_encrypted_file_name: Option<String>,
    pub out_encrypted_file_path: Option<String>,
}

impl ValidateInput for EncryptFilesMultiInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.vault_id, "Vault ID")?;

        if self.in_file_paths.is_empty() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::MissingParameter,
                    "At least one file must be selected",
                )
                .with_recovery_guidance("Please select one or more files to encrypt"),
            ));
        }

        Ok(())
    }
}

/// Response from multi-key encryption command
#[derive(Debug, Serialize, specta::Type)]
pub struct EncryptFilesMultiResponse {
    pub encrypted_file_path: String,
    pub manifest_file_path: String,
    pub file_exists_warning: bool,
    pub keys_used: Vec<String>,
}

/// Encrypt files with multiple keys (vault) - delegates to service layer
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(vault_id = %input.vault_id, file_count = input.in_file_paths.len()))]
pub async fn encrypt_files_multi(
    input: EncryptFilesMultiInput,
    _window: Window,
) -> CommandResponse<EncryptFilesMultiResponse> {
    // Validate input at command layer
    input.validate()?;

    // Delegate to service layer for business logic
    let manager = CryptoManager::new();

    match manager.encrypt_files_multi(input).await {
        Ok(response) => Ok(response),
        Err(crypto_error) => {
            // Convert service error to command error
            Err(Box::new(CommandError::operation(
                ErrorCode::EncryptionFailed,
                crypto_error.to_string(),
            )))
        }
    }
}
