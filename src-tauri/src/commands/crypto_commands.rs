//! Crypto commands for key generation, encryption, and decryption
//!
//! This module provides Tauri commands that expose the crypto module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandError, CommandResponse, ErrorCode, ValidateInput};
use crate::crypto::{encrypt_private_key, generate_keypair};
use crate::storage;
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use tauri::Window;
use tracing::{info, instrument};

/// Input for key generation command
#[derive(Debug, Deserialize)]
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}

/// Response from key generation
#[derive(Debug, Serialize)]
pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}

/// Input for encryption command
#[derive(Debug, Deserialize)]
pub struct EncryptDataInput {
    pub key_id: String,
    pub file_paths: Vec<String>,
    pub output_name: Option<String>,
}

/// Input for decryption command
#[derive(Debug, Deserialize)]
pub struct DecryptDataInput {
    pub encrypted_file: String,
    pub key_id: String,
    pub passphrase: String,
    pub output_dir: String,
}

/// Result of decryption operation
#[derive(Debug, Serialize)]
pub struct DecryptionResult {
    pub extracted_files: Vec<String>,
    pub output_dir: String,
    pub manifest_verified: bool,
}

impl ValidateInput for GenerateKeyInput {
    fn validate(&self) -> Result<(), CommandError> {
        // Validate label format (alphanumeric, dash, underscore)
        if self.label.is_empty() {
            return Err(CommandError::validation("Key label cannot be empty"));
        }

        if !self
            .label
            .chars()
            .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
        {
            return Err(CommandError::validation(
                "Key label can only contain letters, numbers, and dashes",
            ));
        }

        // Validate passphrase strength
        if self.passphrase.len() < 12 {
            return Err(CommandError::validation(
                "Passphrase must be at least 12 characters",
            ));
        }

        Ok(())
    }
}

impl ValidateInput for EncryptDataInput {
    fn validate(&self) -> Result<(), CommandError> {
        if self.key_id.is_empty() {
            return Err(CommandError::validation("Key ID cannot be empty"));
        }

        if self.file_paths.is_empty() {
            return Err(CommandError::validation(
                "At least one file must be selected",
            ));
        }

        Ok(())
    }
}

impl ValidateInput for DecryptDataInput {
    fn validate(&self) -> Result<(), CommandError> {
        if self.encrypted_file.is_empty() {
            return Err(CommandError::validation(
                "Encrypted file path cannot be empty",
            ));
        }

        if self.key_id.is_empty() {
            return Err(CommandError::validation("Key ID cannot be empty"));
        }

        if self.passphrase.is_empty() {
            return Err(CommandError::validation("Passphrase cannot be empty"));
        }

        if self.output_dir.is_empty() {
            return Err(CommandError::validation("Output directory cannot be empty"));
        }

        Ok(())
    }
}

/// Generate a new encryption keypair
#[tauri::command]
#[instrument(skip(input), fields(label = %input.label))]
pub async fn generate_key(input: GenerateKeyInput) -> CommandResponse<GenerateKeyResponse> {
    // Validate input
    input.validate()?;

    info!("Generating new keypair for label: {}", input.label);

    // Check if label already exists
    let existing_keys = storage::list_keys()
        .map_err(|e| CommandError::operation(ErrorCode::StorageFailed, e.to_string()))?;

    if existing_keys.iter().any(|k| k.label == input.label) {
        return Err(CommandError::validation(format!(
            "A key with label '{}' already exists",
            input.label
        )));
    }

    // Generate keypair using crypto module
    let keypair = generate_keypair()
        .map_err(|e| CommandError::operation(ErrorCode::EncryptionFailed, e.to_string()))?;

    // Encrypt private key with passphrase
    let encrypted_key =
        encrypt_private_key(&keypair.private_key, SecretString::from(input.passphrase))
            .map_err(|e| CommandError::operation(ErrorCode::EncryptionFailed, e.to_string()))?;

    // Save to storage
    let saved_path = storage::save_encrypted_key(
        &input.label,
        &encrypted_key,
        Some(&keypair.public_key.to_string()),
    )
    .map_err(|e| CommandError::operation(ErrorCode::StorageFailed, e.to_string()))?;

    info!("Keypair generated and saved successfully");

    Ok(GenerateKeyResponse {
        public_key: keypair.public_key.to_string(),
        key_id: input.label,
        saved_path: saved_path.to_string_lossy().to_string(),
    })
}

/// Encrypt files with progress streaming
#[tauri::command]
#[instrument(skip(input, _window), fields(key_id = %input.key_id, file_count = input.file_paths.len()))]
pub async fn encrypt_data(input: EncryptDataInput, _window: Window) -> CommandResponse<String> {
    // Validate input
    input.validate()?;

    info!("Starting encryption for {} files", input.file_paths.len());

    // TODO: Implement full encryption workflow with progress streaming
    // This is a placeholder implementation

    // For now, return a placeholder response
    Ok("encrypted_file.age".to_string())
}

/// Decrypt files with progress streaming
#[tauri::command]
#[instrument(skip(input, _window), fields(key_id = %input.key_id))]
pub async fn decrypt_data(
    input: DecryptDataInput,
    _window: Window,
) -> CommandResponse<DecryptionResult> {
    // Validate input
    input.validate()?;

    info!("Starting decryption of file: {}", input.encrypted_file);

    // TODO: Implement full decryption workflow with progress streaming
    // This is a placeholder implementation

    // For now, return a placeholder response
    Ok(DecryptionResult {
        extracted_files: vec!["extracted_file.txt".to_string()],
        output_dir: input.output_dir,
        manifest_verified: true,
    })
}
