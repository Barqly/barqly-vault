//! File decryption command
//!
//! This module provides the Tauri command for decrypting files that were
//! previously encrypted with age encryption.

use super::file_helpers;
use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ProgressManager, ValidateInput,
    ValidationHelper,
};
use crate::constants::*;
use crate::file_ops;
use crate::logging::{log_operation, SpanContext};
use crate::storage;
use age::secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use tauri::Window;
use tracing::instrument;

/// Input for decryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct DecryptDataInput {
    pub encrypted_file: String,
    pub key_id: String,
    pub passphrase: String,
    pub output_dir: String,
}

/// Result of decryption operation
#[derive(Debug, Serialize, specta::Type)]
pub struct DecryptionResult {
    pub extracted_files: Vec<String>,
    pub output_dir: String,
    pub manifest_verified: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub external_manifest_restored: Option<bool>,
}

impl ValidateInput for DecryptDataInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.encrypted_file, "Encrypted file path")?;
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        ValidationHelper::validate_not_empty(&self.output_dir, "Output directory")?;

        // Validate encrypted file exists and is a file
        ValidationHelper::validate_path_exists(&self.encrypted_file, "Encrypted file")?;
        ValidationHelper::validate_is_file(&self.encrypted_file, "Encrypted file")?;

        // Note: We don't validate output directory exists here because we'll create it if needed
        // This provides feature parity with encrypt_files command

        Ok(())
    }
}

/// Decrypt files with progress streaming
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(key_id = %input.key_id))]
pub async fn decrypt_data(
    input: DecryptDataInput,
    _window: Window,
) -> CommandResponse<DecryptionResult> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("decrypt_data")
        .with_attribute("key_id", &input.key_id)
        .with_attribute("encrypted_file", &input.encrypted_file);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Initialize progress manager for operation tracking
    let operation_id = format!(
        "decrypt_{timestamp}",
        timestamp = chrono::Utc::now().timestamp()
    );
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("encrypted_file".to_string(), input.encrypted_file.clone());
    attributes.insert("key_id".to_string(), input.key_id.clone());
    attributes.insert("output_dir".to_string(), input.output_dir.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting decryption operation",
        &span_context,
        attributes,
    );

    // Report initial progress
    progress_manager.set_progress(
        PROGRESS_DECRYPT_INIT,
        "Initializing decryption operation...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Load the encrypted private key
    progress_manager.set_progress(PROGRESS_DECRYPT_KEY_LOAD, "Loading encryption key...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_key = error_handler.handle_operation_error(
        storage::load_encrypted_key(&input.key_id),
        "load_encrypted_key",
        ErrorCode::KeyNotFound,
    )?;

    // Decrypt the private key with the passphrase
    progress_manager.set_progress(PROGRESS_DECRYPT_KEY_DECRYPT, "Decrypting private key...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let private_key = error_handler.handle_operation_error(
        crate::crypto::decrypt_private_key(&encrypted_key, SecretString::from(input.passphrase)),
        "decrypt_private_key",
        ErrorCode::DecryptionFailed,
    )?;

    // Read the encrypted file
    progress_manager.set_progress(PROGRESS_DECRYPT_READ_FILE, "Reading encrypted file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_data = error_handler.handle_operation_error(
        std::fs::read(&input.encrypted_file),
        "read_encrypted_file",
        ErrorCode::FileNotFound,
    )?;

    // Decrypt the data
    progress_manager.set_progress(PROGRESS_DECRYPT_DECRYPTING, "Decrypting data...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let decrypted_data = error_handler.handle_operation_error(
        crate::crypto::decrypt_data(&encrypted_data, &private_key),
        "decrypt_data",
        ErrorCode::DecryptionFailed,
    )?;

    // Validate and create output directory if it doesn't exist
    let output_path = Path::new(&input.output_dir);
    error_handler.handle_operation_error(
        file_helpers::validate_output_directory(output_path),
        "validate_output_directory",
        ErrorCode::InvalidPath,
    )?;

    // Write decrypted data to temporary file
    let temp_archive_path = error_handler.handle_operation_error(
        tempfile::NamedTempFile::new(),
        "create_temp_file",
        ErrorCode::InternalError,
    )?;

    let temp_archive_path = temp_archive_path.path().to_path_buf();
    error_handler.handle_operation_error(
        std::fs::write(&temp_archive_path, &decrypted_data),
        "write_temp_archive",
        ErrorCode::InternalError,
    )?;

    // Extract the archive
    progress_manager.set_progress(PROGRESS_DECRYPT_EXTRACT, "Extracting archive...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let config = file_ops::FileOpsConfig::default();
    let extracted_files = error_handler.handle_operation_error(
        file_ops::extract_archive(&temp_archive_path, output_path, &config),
        "extract_archive",
        ErrorCode::InternalError,
    )?;

    // Restore external manifest if it exists alongside the encrypted file
    progress_manager.set_progress(PROGRESS_DECRYPT_CLEANUP, "Restoring manifest file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    let external_manifest_restored =
        restore_external_manifest_if_exists(&input.encrypted_file, output_path, &error_handler);

    // Clean up temporary file
    progress_manager.set_progress(PROGRESS_DECRYPT_CLEANUP, "Cleaning up temporary files...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    file_helpers::cleanup_temp_file(&temp_archive_path, &error_handler);

    // Try to verify manifest if it exists
    progress_manager.set_progress(PROGRESS_DECRYPT_VERIFY, "Verifying manifest...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    let manifest_verified =
        verify_manifest_if_exists(&extracted_files, output_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Decryption completed successfully");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert(
        "extracted_files_count".to_string(),
        extracted_files.len().to_string(),
    );
    completion_attributes.insert(
        "manifest_verified".to_string(),
        manifest_verified.to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Decryption operation completed successfully",
        &span_context,
        completion_attributes,
    );

    // Convert extracted files to string paths
    let extracted_file_paths: Vec<String> = extracted_files
        .iter()
        .map(|file_info| file_info.path.to_string_lossy().to_string())
        .collect();

    Ok(DecryptionResult {
        extracted_files: extracted_file_paths,
        output_dir: input.output_dir,
        manifest_verified,
        external_manifest_restored,
    })
}

/// Helper function to verify manifest if it exists in the extracted files
fn verify_manifest_if_exists(
    extracted_files: &[crate::file_ops::FileInfo],
    output_path: &Path,
    _error_handler: &ErrorHandler,
) -> bool {
    // Look for manifest file in extracted files
    let manifest_file = extracted_files.iter().find(|file| {
        file.path
            .file_name()
            .is_some_and(|name| name == "manifest.json")
    });

    if let Some(manifest_info) = manifest_file {
        let manifest_path = output_path.join(&manifest_info.path);

        // Try to load and verify the manifest
        match file_ops::archive_manifest::Manifest::load(&manifest_path) {
            Ok(manifest) => {
                match file_ops::verify_manifest(
                    &manifest,
                    extracted_files,
                    &file_ops::FileOpsConfig::default(),
                ) {
                    Ok(()) => {
                        log_operation(
                            crate::logging::LogLevel::Info,
                            "Manifest verification successful",
                            &SpanContext::new("verify_manifest"),
                            HashMap::new(),
                        );
                        true
                    }
                    Err(e) => {
                        log_operation(
                            crate::logging::LogLevel::Warn,
                            &format!("Manifest verification failed: {e}"),
                            &SpanContext::new("verify_manifest"),
                            HashMap::new(),
                        );
                        false
                    }
                }
            }
            Err(e) => {
                log_operation(
                    crate::logging::LogLevel::Warn,
                    &format!("Failed to load manifest: {e}"),
                    &SpanContext::new("verify_manifest"),
                    HashMap::new(),
                );
                false
            }
        }
    } else {
        // No manifest found, consider it verified (optional manifest)
        log_operation(
            crate::logging::LogLevel::Info,
            "No manifest found, skipping verification",
            &SpanContext::new("verify_manifest"),
            HashMap::new(),
        );
        true
    }
}

/// Helper function to restore external manifest if it exists alongside the encrypted file
fn restore_external_manifest_if_exists(
    encrypted_file_path: &str,
    output_path: &Path,
    _error_handler: &ErrorHandler,
) -> Option<bool> {
    let encrypted_path = Path::new(encrypted_file_path);
    let external_manifest_path = file_ops::generate_external_manifest_path(encrypted_path);

    // Check if external manifest exists
    if !external_manifest_path.exists() {
        log_operation(
            crate::logging::LogLevel::Info,
            "No external manifest found, skipping restoration",
            &SpanContext::new("restore_external_manifest"),
            HashMap::new(),
        );
        return None;
    }

    // Try to copy the external manifest to the output directory
    let output_manifest_path = output_path.join(
        external_manifest_path
            .file_name()
            .unwrap_or_else(|| std::ffi::OsStr::new("vault.manifest")),
    );

    match std::fs::copy(&external_manifest_path, &output_manifest_path) {
        Ok(_) => {
            log_operation(
                crate::logging::LogLevel::Info,
                &format!(
                    "External manifest restored successfully: {} -> {}",
                    external_manifest_path.display(),
                    output_manifest_path.display()
                ),
                &SpanContext::new("restore_external_manifest"),
                HashMap::new(),
            );
            Some(true)
        }
        Err(e) => {
            log_operation(
                crate::logging::LogLevel::Warn,
                &format!("Failed to restore external manifest: {e}"),
                &SpanContext::new("restore_external_manifest"),
                HashMap::new(),
            );
            Some(false)
        }
    }
}
