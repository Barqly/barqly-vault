//! Crypto commands for key generation, encryption, and decryption
//!
//! This module provides Tauri commands that expose the crypto module
//! functionality to the frontend with proper validation and error handling.

use super::types::{
    CommandError, CommandResponse, ErrorCode, ErrorHandler, ProgressDetails, ProgressManager,
    ValidateInput, ValidationHelper,
};
use crate::crypto::{encrypt_private_key, generate_keypair};
use crate::file_ops;
use crate::logging::{log_operation, SpanContext};
use crate::storage;
use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Window;
use tracing::{info, instrument};

// Global operation state to prevent race conditions
static ENCRYPTION_IN_PROGRESS: AtomicBool = AtomicBool::new(false);

// Global progress tracking
use std::sync::Mutex;

static PROGRESS_TRACKER: once_cell::sync::Lazy<
    Mutex<HashMap<String, super::types::ProgressUpdate>>,
> = once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

/// Update global progress for an operation
fn update_global_progress(operation_id: &str, progress: super::types::ProgressUpdate) {
    if let Ok(mut tracker) = PROGRESS_TRACKER.lock() {
        tracker.insert(operation_id.to_string(), progress);
    }
}

/// Get global progress for an operation
fn get_global_progress(operation_id: &str) -> Option<super::types::ProgressUpdate> {
    if let Ok(tracker) = PROGRESS_TRACKER.lock() {
        tracker.get(operation_id).cloned()
    } else {
        None
    }
}

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

/// Input for passphrase validation command
#[derive(Debug, Deserialize)]
pub struct ValidatePassphraseInput {
    pub passphrase: String,
}

/// Response from passphrase validation
#[derive(Debug, Serialize)]
pub struct ValidatePassphraseResponse {
    pub is_valid: bool,
    pub message: String,
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

/// Input for encryption status command
#[derive(Debug, Deserialize)]
pub struct GetEncryptionStatusInput {
    pub operation_id: String,
}

/// Input for manifest verification command
#[derive(Debug, Deserialize)]
pub struct VerifyManifestInput {
    pub manifest_path: String,
    pub extracted_files_dir: String,
}

/// Input for progress status command
#[derive(Debug, Deserialize)]
pub struct GetProgressInput {
    pub operation_id: String,
}

/// Response from progress status command
#[derive(Debug, Serialize)]
pub struct GetProgressResponse {
    pub operation_id: String,
    pub progress: f32,
    pub message: String,
    pub details: Option<ProgressDetails>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub estimated_time_remaining: Option<u64>,
    pub is_complete: bool,
}

/// Response from manifest verification command
#[derive(Debug, Serialize)]
pub struct VerifyManifestResponse {
    pub is_valid: bool,
    pub message: String,
    pub file_count: usize,
    pub total_size: u64,
}

/// Response from encryption status command
#[derive(Debug, Serialize)]
pub struct EncryptionStatusResponse {
    pub operation_id: String,
    pub status: EncryptionStatus,
    pub progress_percentage: u8,
    pub current_file: Option<String>,
    pub total_files: usize,
    pub processed_files: usize,
    pub total_size: u64,
    pub processed_size: u64,
    pub estimated_time_remaining: Option<u64>, // in seconds
    pub error_message: Option<String>,
}

/// Encryption operation status
#[derive(Debug, Serialize)]
pub enum EncryptionStatus {
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled,
}

impl ValidateInput for GenerateKeyInput {
    fn validate(&self) -> Result<(), CommandError> {
        // Validate label is not empty
        ValidationHelper::validate_not_empty(&self.label, "Key label")?;

        // Validate label format
        ValidationHelper::validate_key_label(&self.label)?;

        // Validate passphrase strength
        ValidationHelper::validate_passphrase_strength(&self.passphrase)?;

        Ok(())
    }
}

impl ValidateInput for ValidatePassphraseInput {
    fn validate(&self) -> Result<(), CommandError> {
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        Ok(())
    }
}

impl ValidateInput for EncryptDataInput {
    fn validate(&self) -> Result<(), CommandError> {
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;

        if self.file_paths.is_empty() {
            return Err(CommandError::operation(
                ErrorCode::MissingParameter,
                "At least one file must be selected",
            )
            .with_recovery_guidance("Please select one or more files to encrypt"));
        }

        // Validate file count limit
        if self.file_paths.len() > 1000 {
            return Err(CommandError::operation(
                ErrorCode::TooManyFiles,
                format!(
                    "Too many files selected: {} (maximum 1000)",
                    self.file_paths.len()
                ),
            )
            .with_recovery_guidance("Please select fewer files"));
        }

        Ok(())
    }
}

impl ValidateInput for DecryptDataInput {
    fn validate(&self) -> Result<(), CommandError> {
        ValidationHelper::validate_not_empty(&self.encrypted_file, "Encrypted file path")?;
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;
        ValidationHelper::validate_not_empty(&self.passphrase, "Passphrase")?;
        ValidationHelper::validate_not_empty(&self.output_dir, "Output directory")?;

        // Validate encrypted file exists and is a file
        ValidationHelper::validate_path_exists(&self.encrypted_file, "Encrypted file")?;
        ValidationHelper::validate_is_file(&self.encrypted_file, "Encrypted file")?;

        // Validate output directory exists and is a directory
        ValidationHelper::validate_path_exists(&self.output_dir, "Output directory")?;
        ValidationHelper::validate_is_directory(&self.output_dir, "Output directory")?;

        Ok(())
    }
}

impl ValidateInput for GetEncryptionStatusInput {
    fn validate(&self) -> Result<(), CommandError> {
        ValidationHelper::validate_not_empty(&self.operation_id, "Operation ID")?;
        ValidationHelper::validate_length(&self.operation_id, "Operation ID", 1, 100)?;
        Ok(())
    }
}

impl ValidateInput for VerifyManifestInput {
    fn validate(&self) -> Result<(), CommandError> {
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

impl ValidateInput for GetProgressInput {
    fn validate(&self) -> Result<(), CommandError> {
        ValidationHelper::validate_not_empty(&self.operation_id, "Operation ID")?;
        ValidationHelper::validate_length(&self.operation_id, "Operation ID", 1, 100)?;
        Ok(())
    }
}

/// Generate a new encryption keypair
#[tauri::command]
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
            &format!("A key with label '{}' already exists", input.label),
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

/// Validate passphrase strength
#[tauri::command]
#[instrument(skip(input), fields(passphrase_length = input.passphrase.len()))]
pub async fn validate_passphrase(
    input: ValidatePassphraseInput,
) -> CommandResponse<ValidatePassphraseResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("validate_passphrase")
        .with_attribute("passphrase_length", input.passphrase.len().to_string());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert(
        "passphrase_length".to_string(),
        input.passphrase.len().to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting passphrase validation",
        &span_context,
        attributes,
    );

    let passphrase = &input.passphrase;

    // Check minimum length (12 characters as per security principles)
    if passphrase.len() < 12 {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_length".to_string());
        failure_attributes.insert("required_length".to_string(), "12".to_string());
        failure_attributes.insert("actual_length".to_string(), passphrase.len().to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient length",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase must be at least 12 characters long".to_string(),
        });
    }

    // Check for complexity requirements (at least 3 of 4 categories)
    let has_uppercase = passphrase.chars().any(|c| c.is_uppercase());
    let has_lowercase = passphrase.chars().any(|c| c.is_lowercase());
    let has_digit = passphrase.chars().any(|c| c.is_numeric());
    let has_special = passphrase.chars().any(|c| !c.is_alphanumeric());

    let complexity_score = [has_uppercase, has_lowercase, has_digit, has_special]
        .iter()
        .filter(|&&x| x)
        .count();

    if complexity_score < 3 {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "insufficient_complexity".to_string());
        failure_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
        failure_attributes.insert("required_score".to_string(), "3".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: insufficient complexity",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase must contain at least 3 of: uppercase letters, lowercase letters, numbers, and special characters".to_string(),
        });
    }

    // Check for common weak patterns
    let common_patterns = [
        "password", "123456", "qwerty", "admin", "letmein", "welcome", "monkey", "dragon",
        "master", "football", "baseball", "shadow", "michael", "jennifer", "thomas", "jessica",
        "jordan", "hunter", "michelle", "charlie", "andrew", "daniel", "maggie", "summer",
    ];

    let passphrase_lower = passphrase.to_lowercase();
    for pattern in &common_patterns {
        if passphrase_lower.contains(pattern) {
            let mut failure_attributes = HashMap::new();
            failure_attributes.insert("reason".to_string(), "weak_pattern".to_string());
            failure_attributes.insert("pattern".to_string(), pattern.to_string());
            log_operation(
                crate::logging::LogLevel::Warn,
                "Passphrase validation failed: contains weak pattern",
                &span_context,
                failure_attributes,
            );
            return Ok(ValidatePassphraseResponse {
                is_valid: false,
                message: "Passphrase contains common weak patterns".to_string(),
            });
        }
    }

    // Check for sequential patterns
    if contains_sequential_pattern(passphrase) {
        let mut failure_attributes = HashMap::new();
        failure_attributes.insert("reason".to_string(), "sequential_pattern".to_string());
        log_operation(
            crate::logging::LogLevel::Warn,
            "Passphrase validation failed: contains sequential pattern",
            &span_context,
            failure_attributes,
        );
        return Ok(ValidatePassphraseResponse {
            is_valid: false,
            message: "Passphrase contains sequential patterns (like 123, abc)".to_string(),
        });
    }

    // Log successful validation
    let mut success_attributes = HashMap::new();
    success_attributes.insert("complexity_score".to_string(), complexity_score.to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Passphrase validation successful",
        &span_context,
        success_attributes,
    );
    Ok(ValidatePassphraseResponse {
        is_valid: true,
        message: "Passphrase meets security requirements".to_string(),
    })
}

/// Check for sequential patterns in passphrase
fn contains_sequential_pattern(passphrase: &str) -> bool {
    if passphrase.len() < 3 {
        return false;
    }

    let chars: Vec<char> = passphrase.chars().collect();

    for i in 0..chars.len() - 2 {
        let c1 = chars[i] as u32;
        let c2 = chars[i + 1] as u32;
        let c3 = chars[i + 2] as u32;

        // Check for sequential characters (like abc, 123)
        if c2 == c1 + 1 && c3 == c2 + 1 {
            return true;
        }

        // Check for reverse sequential characters (like cba, 321)
        if c2 == c1 - 1 && c3 == c2 - 1 {
            return true;
        }
    }

    false
}

/// Encrypt files with progress streaming
#[tauri::command]
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
    if ENCRYPTION_IN_PROGRESS
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
    let operation_id = format!("encrypt_{}", chrono::Utc::now().timestamp());
    let mut progress_manager = ProgressManager::new(operation_id.clone(), 100);

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
    progress_manager.set_progress(0.05, "Initializing encryption operation...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    // Get the public key for encryption with structured error handling
    progress_manager.set_progress(0.10, "Retrieving encryption key...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

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
    progress_manager.set_progress(0.15, "Validating file selection...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    let file_selection = create_file_selection_atomic(&input.file_paths, &error_handler)?;

    // Validate the file selection
    error_handler.handle_operation_error(
        file_ops::validate_selection(&file_selection, &file_ops::FileOpsConfig::default()),
        "validate_selection",
        ErrorCode::InvalidInput,
    )?;

    // Determine output path
    let output_name = input.output_name.unwrap_or_else(|| {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        format!("encrypted_{timestamp}.age")
    });

    let output_path = determine_output_path(&output_name, &error_handler)?;

    // Create file operations config
    let config = file_ops::FileOpsConfig::default();

    // Create archive with progress reporting
    progress_manager.set_progress(0.20, "Creating archive...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    // Create archive with progress reporting
    let archive_operation = error_handler.handle_operation_error(
        file_ops::create_archive(&file_selection, &output_path, &config),
        "create_archive",
        ErrorCode::EncryptionFailed,
    )?;

    progress_manager.set_progress(0.60, "Archive created successfully");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    // Read the archive file with streaming for large files
    progress_manager.set_progress(0.70, "Reading archive file...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    let archive_data = error_handler.handle_operation_error(
        read_archive_file_safely(&archive_operation.archive_path, &error_handler),
        "read_archive_file",
        ErrorCode::EncryptionFailed,
    )?;

    // Encrypt the archive data
    progress_manager.set_progress(0.80, "Encrypting data...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_data = error_handler.handle_operation_error(
        crate::crypto::encrypt_data(&archive_data, &public_key),
        "encrypt_data",
        ErrorCode::EncryptionFailed,
    )?;

    // Write encrypted data to final output file
    progress_manager.set_progress(0.90, "Writing encrypted file...");
    update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_path = output_path.with_extension("age");
    error_handler.handle_operation_error(
        std::fs::write(&encrypted_path, encrypted_data),
        "write_encrypted_file",
        ErrorCode::EncryptionFailed,
    )?;

    // Clean up temporary archive file with proper error handling
    progress_manager.set_progress(0.95, "Cleaning up temporary files...");
    update_global_progress(&operation_id, progress_manager.get_current_update());
    cleanup_temp_file(&archive_operation.archive_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Encryption completed successfully");
    update_global_progress(&operation_id, progress_manager.get_current_update());

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

// Helper functions for atomic operations and safe file handling

/// Create file selection with atomic validation to prevent TOCTOU
fn create_file_selection_atomic(
    file_paths: &[String],
    error_handler: &ErrorHandler,
) -> Result<file_ops::FileSelection, CommandError> {
    if file_paths.len() == 1 {
        // Atomic check: validate path exists and get metadata in single operation
        let path = Path::new(&file_paths[0]);

        // Use metadata to determine if it's a directory (atomic operation)
        let metadata = error_handler.handle_operation_error(
            std::fs::metadata(path),
            "get_file_metadata",
            ErrorCode::InvalidInput,
        )?;

        if metadata.is_dir() {
            Ok(file_ops::FileSelection::Folder(path.to_path_buf()))
        } else {
            Ok(file_ops::FileSelection::Files(
                file_paths.iter().map(|p| p.into()).collect(),
            ))
        }
    } else {
        Ok(file_ops::FileSelection::Files(
            file_paths.iter().map(|p| p.into()).collect(),
        ))
    }
}

/// Determine output path with proper validation
fn determine_output_path(
    output_name: &str,
    error_handler: &ErrorHandler,
) -> Result<std::path::PathBuf, CommandError> {
    let output_path = Path::new(output_name);
    if output_path.is_relative() {
        // Use current directory for relative paths
        let current_dir = error_handler.handle_operation_error(
            std::env::current_dir(),
            "get_current_directory",
            ErrorCode::InternalError,
        )?;
        Ok(output_path.join(&current_dir))
    } else {
        Ok(output_path.to_path_buf())
    }
}

/// Read archive file with memory safety checks
fn read_archive_file_safely(
    archive_path: &std::path::Path,
    error_handler: &ErrorHandler,
) -> Result<Vec<u8>, CommandError> {
    // Check file size before reading to prevent memory exhaustion
    let metadata = error_handler.handle_operation_error(
        std::fs::metadata(archive_path),
        "get_archive_metadata",
        ErrorCode::EncryptionFailed,
    )?;

    const MAX_ARCHIVE_SIZE: u64 = 100 * 1024 * 1024; // 100MB limit
    if metadata.len() > MAX_ARCHIVE_SIZE {
        return Err(error_handler.handle_validation_error(
            "archive_size",
            &format!(
                "Archive too large: {} bytes (max: {} bytes)",
                metadata.len(),
                MAX_ARCHIVE_SIZE
            ),
        ));
    }

    // Read file with proper error handling
    error_handler.handle_operation_error(
        std::fs::read(archive_path),
        "read_archive_file",
        ErrorCode::EncryptionFailed,
    )
}

/// Clean up temporary file with proper error handling
fn cleanup_temp_file(temp_path: &std::path::Path, error_handler: &ErrorHandler) {
    if let Err(e) = std::fs::remove_file(temp_path) {
        // Log cleanup failure but don't fail the operation
        let _: Result<(), CommandError> = error_handler.handle_operation_error(
            Err(e),
            "cleanup_temp_file",
            ErrorCode::InternalError,
        );
    }
}

/// RAII guard for encryption operation cleanup
struct EncryptionCleanupGuard;

impl Drop for EncryptionCleanupGuard {
    fn drop(&mut self) {
        // Release the encryption lock when the operation completes
        ENCRYPTION_IN_PROGRESS.store(false, Ordering::Release);
    }
}

/// Helper function to verify manifest if it exists in the extracted files
fn verify_manifest_if_exists(
    extracted_files: &[crate::file_ops::FileInfo],
    output_path: &std::path::Path,
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
        match file_ops::manifest::Manifest::load(&manifest_path) {
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

/// Helper function to get file information for extracted files
fn get_extracted_files_info(
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
        let relative_path = path.strip_prefix(extracted_path).map_err(|_| {
            crate::file_ops::FileOpsError::PathValidationFailed {
                path: path.to_path_buf(),
                reason: "Failed to get relative path".to_string(),
            }
        })?;

        // Calculate file hash
        let hash = calculate_file_hash_simple(path)?;

        let file_info = crate::file_ops::FileInfo {
            path: relative_path.to_path_buf(),
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

/// Simple file hash calculation function
fn calculate_file_hash_simple(
    path: &std::path::Path,
) -> Result<String, crate::file_ops::FileOpsError> {
    use sha2::{Digest, Sha256};
    use std::fs::File;
    use std::io::Read;

    let mut file = File::open(path).map_err(|_e| crate::file_ops::FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];

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

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

/// Decrypt files with progress streaming
#[tauri::command]
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
    let operation_id = format!("decrypt_{}", chrono::Utc::now().timestamp());
    let mut progress_manager = ProgressManager::new(operation_id.clone(), 100);

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
    progress_manager.set_progress(0.05, "Initializing decryption operation...");

    // Load the encrypted private key
    progress_manager.set_progress(0.10, "Loading encryption key...");

    let encrypted_key = error_handler.handle_operation_error(
        storage::load_encrypted_key(&input.key_id),
        "load_encrypted_key",
        ErrorCode::KeyNotFound,
    )?;

    // Decrypt the private key with the passphrase
    progress_manager.set_progress(0.20, "Decrypting private key...");

    let private_key = error_handler.handle_operation_error(
        crate::crypto::decrypt_private_key(&encrypted_key, SecretString::from(input.passphrase)),
        "decrypt_private_key",
        ErrorCode::DecryptionFailed,
    )?;

    // Read the encrypted file
    progress_manager.set_progress(0.30, "Reading encrypted file...");

    let encrypted_data = error_handler.handle_operation_error(
        std::fs::read(&input.encrypted_file),
        "read_encrypted_file",
        ErrorCode::FileNotFound,
    )?;

    // Decrypt the data
    progress_manager.set_progress(0.50, "Decrypting data...");

    let decrypted_data = error_handler.handle_operation_error(
        crate::crypto::decrypt_data(&encrypted_data, &private_key),
        "decrypt_data",
        ErrorCode::DecryptionFailed,
    )?;

    // Create output directory if it doesn't exist
    let output_path = std::path::Path::new(&input.output_dir);
    error_handler.handle_operation_error(
        std::fs::create_dir_all(output_path),
        "create_output_directory",
        ErrorCode::PermissionDenied,
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
    progress_manager.set_progress(0.70, "Extracting archive...");

    let config = file_ops::FileOpsConfig::default();
    let extracted_files = error_handler.handle_operation_error(
        file_ops::extract_archive(&temp_archive_path, output_path, &config),
        "extract_archive",
        ErrorCode::InternalError,
    )?;

    // Clean up temporary file
    progress_manager.set_progress(0.90, "Cleaning up temporary files...");
    cleanup_temp_file(&temp_archive_path, &error_handler);

    // Try to verify manifest if it exists
    progress_manager.set_progress(0.95, "Verifying manifest...");
    let manifest_verified =
        verify_manifest_if_exists(&extracted_files, output_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Decryption completed successfully");

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
    })
}

/// Get encryption operation status
#[tauri::command]
#[instrument(skip(input), fields(operation_id = %input.operation_id))]
pub async fn get_encryption_status(
    input: GetEncryptionStatusInput,
) -> CommandResponse<EncryptionStatusResponse> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("get_encryption_status")
        .with_attribute("operation_id", &input.operation_id);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("operation_id".to_string(), input.operation_id.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Getting encryption status",
        &span_context,
        attributes,
    );

    // TODO: Implement actual status tracking
    // For now, return a placeholder response indicating the operation is completed
    // In a real implementation, this would query a status store or progress tracker

    let response = EncryptionStatusResponse {
        operation_id: input.operation_id,
        status: EncryptionStatus::Completed,
        progress_percentage: 100,
        current_file: None,
        total_files: 1,
        processed_files: 1,
        total_size: 1024,
        processed_size: 1024,
        estimated_time_remaining: None,
        error_message: None,
    };

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("status".to_string(), "Completed".to_string());
    completion_attributes.insert("progress_percentage".to_string(), "100".to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Encryption status retrieved successfully",
        &span_context,
        completion_attributes,
    );

    Ok(response)
}

/// Get progress for a long-running operation
#[tauri::command]
#[instrument(skip(input), fields(operation_id = %input.operation_id))]
pub async fn get_progress(input: GetProgressInput) -> CommandResponse<GetProgressResponse> {
    // Create span context for operation tracing
    let span_context =
        SpanContext::new("get_progress").with_attribute("operation_id", &input.operation_id);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Get progress from global tracker
    match get_global_progress(&input.operation_id) {
        Some(progress) => {
            let is_complete = progress.progress >= 1.0;

            Ok(GetProgressResponse {
                operation_id: progress.operation_id,
                progress: progress.progress,
                message: progress.message,
                details: progress.details,
                timestamp: progress.timestamp,
                estimated_time_remaining: progress.estimated_time_remaining,
                is_complete,
            })
        }
        None => {
            // Return not found error
            Err(error_handler.handle_validation_error(
                "operation_id",
                &format!("Operation '{}' not found", input.operation_id),
            ))
        }
    }
}

/// Verify manifest integrity
#[tauri::command]
#[instrument(skip(input), fields(manifest_path = %input.manifest_path))]
pub async fn verify_manifest(
    input: VerifyManifestInput,
) -> CommandResponse<VerifyManifestResponse> {
    // Create span context for operation tracing
    let span_context =
        SpanContext::new("verify_manifest").with_attribute("manifest_path", &input.manifest_path);

    // Initialize progress manager for operation tracking
    let operation_id = format!("verify_{}", chrono::Utc::now().timestamp());
    let mut progress_manager = ProgressManager::new(operation_id.clone(), 100);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Validate input
    input
        .validate()
        .map_err(|e| error_handler.handle_validation_error("input", &e.message))?;

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("manifest_path".to_string(), input.manifest_path.clone());
    attributes.insert(
        "extracted_files_dir".to_string(),
        input.extracted_files_dir.clone(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting manifest verification",
        &span_context,
        attributes,
    );

    // Report initial progress
    progress_manager.set_progress(0.10, "Initializing manifest verification...");

    // Load the manifest
    progress_manager.set_progress(0.30, "Loading manifest file...");

    let manifest = error_handler.handle_operation_error(
        file_ops::manifest::Manifest::load(std::path::Path::new(&input.manifest_path)),
        "load_manifest",
        ErrorCode::FileNotFound,
    )?;

    // Get file information for extracted files
    progress_manager.set_progress(0.50, "Scanning extracted files...");

    let extracted_files = error_handler.handle_operation_error(
        get_extracted_files_info(&input.extracted_files_dir),
        "get_extracted_files_info",
        ErrorCode::FileNotFound,
    )?;

    // Verify the manifest
    progress_manager.set_progress(0.70, "Verifying file integrity...");

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
            let mut completion_attributes = HashMap::new();
            completion_attributes
                .insert("file_count".to_string(), manifest.files.len().to_string());
            completion_attributes.insert(
                "total_size".to_string(),
                manifest.archive.total_uncompressed_size.to_string(),
            );
            log_operation(
                crate::logging::LogLevel::Info,
                "Manifest verification completed successfully",
                &span_context,
                completion_attributes,
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
            let mut failure_attributes = HashMap::new();
            failure_attributes.insert("error".to_string(), e.to_string());
            log_operation(
                crate::logging::LogLevel::Warn,
                "Manifest verification failed",
                &span_context,
                failure_attributes,
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
