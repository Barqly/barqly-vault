//! File encryption commands - thin wrappers for service layer
//!
//! This module provides Tauri commands that delegate to the crypto service layer
//! for actual business logic implementation.

use crate::commands::types::{CommandError, CommandResponse, ErrorCode, ValidateInput};
use crate::prelude::*;
use crate::services::crypto::CryptoManager;
use tauri::Window;

// Re-export DTOs from application layer for Tauri bindings
pub use crate::services::crypto::application::dtos::EncryptDataInput;

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
// Re-export multi-key encryption DTOs from application layer for Tauri bindings
pub use crate::services::crypto::application::dtos::{
    EncryptFilesMultiInput, EncryptFilesMultiResponse,
};

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
