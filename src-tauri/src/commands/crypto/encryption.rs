//! File encryption command
//!
//! This module provides the Tauri command for encrypting files and folders
//! with age encryption, including progress tracking and archive creation.

use super::file_helpers;
use crate::commands::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ProgressManager, ValidateInput,
    ValidationHelper,
};
use crate::constants::*;
use crate::file_ops;
use crate::logging::{log_operation, SpanContext};
use crate::storage;
use serde::Deserialize;
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::Ordering;
use tauri::Window;
use tracing::{info, instrument};

/// Input for encryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptDataInput {
    pub key_id: String,
    pub file_paths: Vec<String>,
    pub output_name: Option<String>,
    pub output_path: Option<String>, // Optional directory path for output
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

        // Validate file count limit
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

/// Encrypt files with progress streaming
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(key_id = %input.key_id, file_count = input.file_paths.len()))]
pub async fn encrypt_files(input: EncryptDataInput, _window: Window) -> CommandResponse<String> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("encrypt_files")
        .with_attribute("key_id", &input.key_id)
        .with_attribute("file_count", input.file_paths.len().to_string());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input with structured error handling
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Check for race conditions - prevent concurrent encryption operations
    if super::ENCRYPTION_IN_PROGRESS
        .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
        .is_err()
    {
        let error = error_handler.handle_validation_error(
            "operation",
            "Another encryption operation is already in progress",
        );
        return Err(error);
    }

    // Ensure cleanup on exit
    let _cleanup_guard = EncryptionCleanupGuard;

    // Initialize progress manager for operation tracking
    let operation_id = format!(
        "encrypt_{timestamp}",
        timestamp = chrono::Utc::now().timestamp()
    );
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("file_count".to_string(), input.file_paths.len().to_string());
    attributes.insert("key_id".to_string(), input.key_id.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting encryption operation",
        &span_context,
        attributes,
    );

    info!("Starting encryption for {} files", input.file_paths.len());

    // Report initial progress
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_INIT,
        "Initializing encryption operation...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Get the public key for encryption with structured error handling
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_KEY_RETRIEVAL,
        "Retrieving encryption key...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let keys = error_handler.handle_operation_error(
        storage::list_keys(),
        "list_keys",
        ErrorCode::StorageFailed,
    )?;

    let key_info = keys
        .iter()
        .find(|k| k.label == input.key_id)
        .ok_or_else(|| {
            let error = error_handler
                .handle_validation_error("key_id", &format!("Key '{}' not found", input.key_id));
            error
        })?;

    // Get the public key string, handling the case where it might be None
    let public_key_str = key_info.public_key.as_ref().ok_or_else(|| {
        error_handler.handle_validation_error(
            "public_key",
            &format!("Public key not available for key '{}'", input.key_id),
        )
    })?;

    // Create PublicKey from the string
    let public_key = crate::crypto::PublicKey::from(public_key_str.clone());

    // Create file selection from input paths with atomic validation
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_FILE_VALIDATION,
        "Validating file selection...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let file_selection =
        file_helpers::create_file_selection_atomic(&input.file_paths, &error_handler)?;

    // Validate the file selection
    error_handler.handle_operation_error(
        file_ops::validate_selection(&file_selection, &file_ops::FileOpsConfig::default()),
        "validate_selection",
        ErrorCode::InvalidInput,
    )?;

    // Determine output directory and filename
    let output_dir = if let Some(ref path) = input.output_path {
        // Validate and use provided output directory
        let dir_path = Path::new(path);
        error_handler.handle_operation_error(
            file_helpers::validate_output_directory(dir_path),
            "validate_output_directory",
            ErrorCode::InvalidPath,
        )?;
        dir_path.to_path_buf()
    } else {
        // Use current directory as fallback
        error_handler.handle_operation_error(
            std::env::current_dir(),
            "get_current_directory",
            ErrorCode::InternalError,
        )?
    };

    let output_name = input.output_name.unwrap_or_else(|| {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        format!("encrypted_{timestamp}") // Note: .age extension added later
    });

    let output_path = output_dir.join(&output_name);

    // Create file operations config
    let config = file_ops::FileOpsConfig::default();

    // Create archive with progress reporting
    progress_manager.set_progress(PROGRESS_ENCRYPT_ARCHIVE_START, "Creating archive...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Create archive with progress reporting and capture file info for external manifest
    let (archive_operation, archive_files, staging_path) = error_handler.handle_operation_error(
        file_ops::create_archive_with_file_info(&file_selection, &output_path, &config),
        "create_archive",
        ErrorCode::EncryptionFailed,
    )?;

    progress_manager.set_progress(
        PROGRESS_ENCRYPT_ARCHIVE_COMPLETE,
        "Archive created successfully",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Read the archive file with streaming for large files
    progress_manager.set_progress(PROGRESS_ENCRYPT_READ_ARCHIVE, "Reading archive file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let archive_data = error_handler.handle_operation_error(
        file_helpers::read_archive_file_safely(&archive_operation.archive_path, &error_handler),
        "read_archive_file",
        ErrorCode::EncryptionFailed,
    )?;

    // Encrypt the archive data
    progress_manager.set_progress(PROGRESS_ENCRYPT_ENCRYPTING, "Encrypting data...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_data = error_handler.handle_operation_error(
        crate::crypto::encrypt_data(&archive_data, &public_key),
        "encrypt_data",
        ErrorCode::EncryptionFailed,
    )?;

    // Write encrypted data to final output file
    progress_manager.set_progress(PROGRESS_ENCRYPT_WRITING, "Writing encrypted file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_path = output_path.with_extension("age");
    error_handler.handle_operation_error(
        std::fs::write(&encrypted_path, encrypted_data),
        "write_encrypted_file",
        ErrorCode::EncryptionFailed,
    )?;

    // Create external manifest file for user-facing vault information
    progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Creating manifest file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let external_manifest_path = file_ops::generate_external_manifest_path(&encrypted_path);
    if let Err(manifest_err) = file_ops::create_external_manifest_for_archive(
        &archive_operation,
        &archive_files,
        &staging_path,
        &encrypted_path,
        &input.key_id,
        public_key_str,
        Some(&external_manifest_path),
    ) {
        // Log warning but don't fail the entire operation for external manifest
        tracing::warn!("Failed to create external manifest: {}", manifest_err);
    }

    // Clean up temporary archive file with proper error handling
    progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Cleaning up temporary files...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    file_helpers::cleanup_temp_file(&archive_operation.archive_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Encryption completed successfully");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert(
        "file_count".to_string(),
        archive_operation.file_count.to_string(),
    );
    completion_attributes.insert(
        "output_path".to_string(),
        encrypted_path.to_string_lossy().to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Encryption completed successfully",
        &span_context,
        completion_attributes,
    );

    info!(
        "Encryption completed successfully: {} -> {}",
        archive_operation.file_count,
        encrypted_path.display()
    );

    Ok(encrypted_path.to_string_lossy().to_string())
}

/// RAII guard for encryption operation cleanup
struct EncryptionCleanupGuard;

impl Drop for EncryptionCleanupGuard {
    fn drop(&mut self) {
        // Release the encryption lock when the operation completes
        super::ENCRYPTION_IN_PROGRESS.store(false, Ordering::Release);
    }
}
