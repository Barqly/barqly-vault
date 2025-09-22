//! Key generation command
//!
//! This module provides the Tauri command for generating new encryption keypairs
//! with passphrase protection.

use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ValidateInput, ValidationHelper,
};
use crate::crypto::{encrypt_private_key, generate_keypair};
use crate::logging::{log_operation, SpanContext};
use crate::storage;
use age::secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

/// Input for key generation command
#[derive(Debug, Deserialize, specta::Type)]
pub struct GenerateKeyInput {
    pub label: String,
    pub passphrase: String,
}

/// Response from key generation
#[derive(Debug, Serialize, specta::Type)]
pub struct GenerateKeyResponse {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: String,
}

impl ValidateInput for GenerateKeyInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        // Validate label is not empty
        ValidationHelper::validate_not_empty(&self.label, "Key label")?;

        // Validate label format
        ValidationHelper::validate_key_label(&self.label)?;

        // Validate passphrase strength
        ValidationHelper::validate_passphrase_strength(&self.passphrase)?;

        Ok(())
    }
}

/// Generate a new encryption keypair
#[tauri::command]
#[specta::specta]
#[instrument(skip(input), fields(label = %input.label))]
pub async fn generate_key(input: GenerateKeyInput) -> CommandResponse<GenerateKeyResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("generate_key").with_attribute("label", &input.label);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("label".to_string(), input.label.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting key generation",
        &span_context,
        attributes,
    );

    // Check if label already exists
    let existing_keys = error_handler.handle_operation_error(
        storage::list_keys(),
        "list_keys",
        ErrorCode::StorageFailed,
    )?;

    if existing_keys.iter().any(|k| k.label == input.label) {
        return Err(error_handler.handle_validation_error(
            "label",
            &format!("A key with label '{}' already exists. Please choose a different label or use the existing key.", input.label),
        ));
    }

    // Generate keypair using crypto module
    let keypair = error_handler.handle_operation_error(
        generate_keypair(),
        "generate_keypair",
        ErrorCode::EncryptionFailed,
    )?;

    // Encrypt private key with passphrase
    let encrypted_key = error_handler.handle_operation_error(
        encrypt_private_key(&keypair.private_key, SecretString::from(input.passphrase)),
        "encrypt_private_key",
        ErrorCode::EncryptionFailed,
    )?;

    // Save to storage
    let saved_path = error_handler.handle_operation_error(
        storage::save_encrypted_key(
            &input.label,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
        ),
        "save_encrypted_key",
        ErrorCode::StorageFailed,
    )?;

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("label".to_string(), input.label.clone());
    completion_attributes.insert(
        "saved_path".to_string(),
        saved_path.to_string_lossy().to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Keypair generated and saved successfully",
        &span_context,
        completion_attributes,
    );

    Ok(GenerateKeyResponse {
        public_key: keypair.public_key.to_string(),
        key_id: input.label,
        saved_path: saved_path.to_string_lossy().to_string(),
    })
}
