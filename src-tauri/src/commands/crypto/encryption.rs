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
use crate::models::vault::{ArchiveContent, EncryptedArchive};
use crate::prelude::*;
use crate::storage::{self, KeyRegistry, path_management, vault_store};
use std::path::Path;
use std::sync::atomic::Ordering;
use tauri::Window;

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
    // Create error handler
    let error_handler = ErrorHandler::new();

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

    // Log operation start with structured fields
    info!(
        file_count = input.file_paths.len(),
        key_id = %input.key_id,
        "Starting encryption operation"
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

    debug!(
        key_id = %input.key_id,
        "Starting key retrieval for encryption operation"
    );

    let keys = error_handler.handle_operation_error(
        storage::list_keys(),
        "list_keys",
        ErrorCode::StorageFailed,
    )?;

    trace!(
        available_keys = keys.len(),
        "Successfully loaded encryption keys from storage"
    );

    let key_info = keys
        .iter()
        .find(|k| k.label == input.key_id)
        .ok_or_else(|| {
            debug!(
                key_id = %input.key_id,
                available_keys = ?keys.iter().map(|k| &k.label).collect::<Vec<_>>(),
                "Encryption key not found in available keys"
            );
            error_handler
                .handle_validation_error("key_id", &format!("Key '{}' not found", input.key_id))
        })?;

    debug!(
        key_id = %input.key_id,
        has_public_key = key_info.public_key.is_some(),
        "Successfully found encryption key"
    );

    // Get the public key string, handling the case where it might be None
    let public_key_str = key_info.public_key.as_ref().ok_or_else(|| {
        error!(
            key_id = %input.key_id,
            "Public key not available for encryption key"
        );
        error_handler.handle_validation_error(
            "public_key",
            &format!("Public key not available for key '{}'", input.key_id),
        )
    })?;

    trace!(
        key_id = %input.key_id,
        public_key_prefix = &public_key_str[..std::cmp::min(20, public_key_str.len())],
        "Creating PublicKey object for encryption"
    );

    // Create PublicKey from the string
    let public_key = crate::crypto::PublicKey::from(public_key_str.clone());

    // Create file selection from input paths with atomic validation
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_FILE_VALIDATION,
        "Validating file selection...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    debug!(
        file_count = input.file_paths.len(),
        first_path = input.file_paths.first().map(|p| p.as_str()).unwrap_or(""),
        "Starting file selection validation"
    );

    let file_selection =
        file_helpers::create_file_selection_atomic(&input.file_paths, &error_handler)?;

    trace!(
        selection_type = ?file_selection.selection_type(),
        "File selection created successfully"
    );

    // Validate the file selection
    error_handler.handle_operation_error(
        file_ops::validate_selection(&file_selection, &file_ops::FileOpsConfig::default()),
        "validate_selection",
        ErrorCode::InvalidInput,
    )?;

    debug!("File selection validation completed successfully");

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
    let (archive_operation, archive_files, _staging_path) = error_handler.handle_operation_error(
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

    debug!(
        archive_size = archive_data.len(),
        key_id = %input.key_id,
        "Starting archive data encryption"
    );

    let encrypted_data = error_handler.handle_crypto_operation_error(
        crate::crypto::encrypt_data(&archive_data, &public_key),
        "encrypt_data",
    )?;

    debug!(
        original_size = archive_data.len(),
        encrypted_size = encrypted_data.len(),
        compression_ratio = (encrypted_data.len() as f64 / archive_data.len() as f64),
        "Archive encryption completed successfully"
    );

    // Write encrypted data to final output file
    progress_manager.set_progress(PROGRESS_ENCRYPT_WRITING, "Writing encrypted file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let encrypted_path = output_path.with_extension("age");

    debug!(
        output_path = %encrypted_path.display(),
        encrypted_size = encrypted_data.len(),
        "Writing encrypted data to final output file"
    );

    error_handler.handle_operation_error(
        std::fs::write(&encrypted_path, encrypted_data),
        "write_encrypted_file",
        ErrorCode::EncryptionFailed,
    )?;

    debug!(
        output_path = %encrypted_path.display(),
        "Encrypted file written successfully"
    );

    // Create external manifest file for user-facing vault information
    progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Creating manifest file...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let external_manifest_path = file_ops::generate_external_manifest_path(&encrypted_path);
    if let Err(manifest_err) = file_ops::create_external_manifest_for_archive(
        &archive_operation,
        &archive_files,
        &_staging_path,
        &encrypted_path,
        &input.key_id,
        public_key_str,
        Some(&external_manifest_path),
    ) {
        // Log warning but don't fail the entire operation for external manifest
        warn!("Failed to create external manifest: {}", manifest_err);
    }

    // Clean up temporary archive file with proper error handling
    progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Cleaning up temporary files...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    file_helpers::cleanup_temp_file(&archive_operation.archive_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Encryption completed successfully");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Log operation completion
    info!(
        file_count = archive_operation.file_count,
        output_path = %encrypted_path.display(),
        "Encryption completed successfully"
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

/// Input for multi-key encryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptFilesMultiInput {
    pub vault_id: String,
    pub in_file_paths: Vec<String>,
    pub out_encrypted_file_name: Option<String>, // Defaults to vault label
    pub out_encrypted_file_path: Option<String>, // Defaults to ~/Documents/Barqly-Vaults/
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

        // Validate file count limit
        if self.in_file_paths.len() > MAX_FILES_PER_OPERATION {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::TooManyFiles,
                    format!(
                        "Too many files selected: {} (maximum {})",
                        self.in_file_paths.len(),
                        MAX_FILES_PER_OPERATION
                    ),
                )
                .with_recovery_guidance("Please select fewer files"),
            ));
        }

        Ok(())
    }
}

/// Response for multi-key encryption
#[derive(Debug, Serialize, specta::Type)]
pub struct EncryptFilesMultiResponse {
    pub encrypted_file_path: String,
    pub manifest_file_path: String,
    pub file_exists_warning: bool, // True if output file already exists
    pub keys_used: Vec<String>,    // Labels of keys used for encryption
}

/// Sanitize filename for cross-platform compatibility
fn sanitize_filename(name: &str) -> String {
    // Replace invalid characters but keep spaces
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// Encrypt files to all vault keys with progress streaming
#[tauri::command]
#[specta::specta]
#[instrument(skip(input, _window), fields(vault_id = %input.vault_id, file_count = input.in_file_paths.len()))]
pub async fn encrypt_files_multi(
    input: EncryptFilesMultiInput,
    _window: Window,
) -> CommandResponse<EncryptFilesMultiResponse> {
    // Create error handler
    let error_handler = ErrorHandler::new();

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
        "encrypt_multi_{timestamp}",
        timestamp = chrono::Utc::now().timestamp()
    );
    let mut progress_manager = ProgressManager::new(operation_id.clone(), PROGRESS_TOTAL_WORK);

    // Log operation start with structured fields
    info!(
        file_count = input.in_file_paths.len(),
        vault_id = %input.vault_id,
        "Starting multi-key encryption operation"
    );

    // Report initial progress
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_INIT,
        "Initializing multi-key encryption operation...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Load vault to get its name and keys
    progress_manager.set_progress(PROGRESS_ENCRYPT_KEY_RETRIEVAL, "Loading vault and keys...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    debug!(
        vault_id = %input.vault_id,
        "Loading vault for multi-key encryption"
    );

    let mut vault = match vault_store::load_vault(&input.vault_id).await {
        Ok(vault) => vault,
        Err(e) => {
            error!(
                vault_id = %input.vault_id,
                error = %e,
                "Failed to load vault"
            );
            return Err(error_handler.handle_validation_error(
                "vault_id",
                &format!("Vault '{}' not found", input.vault_id),
            ));
        }
    };

    debug!(
        vault_id = %input.vault_id,
        vault_name = %vault.name,
        key_count = vault.keys.len(),
        "Vault loaded successfully"
    );

    if vault.keys.is_empty() {
        return Err(error_handler
            .handle_validation_error("vault_keys", "Vault has no registered keys for encryption"));
    }

    // Determine output directory and filename
    let output_dir = if let Some(ref path) = input.out_encrypted_file_path {
        // Validate and use provided output directory
        let dir_path = Path::new(path);
        error_handler.handle_operation_error(
            file_helpers::validate_output_directory(dir_path),
            "validate_output_directory",
            ErrorCode::InvalidPath,
        )?;
        dir_path.to_path_buf()
    } else {
        // Use ~/Documents/Barqly-Vaults/ as default
        let home_dir = match std::env::var("HOME") {
            Ok(home) => std::path::PathBuf::from(home),
            Err(_) => {
                return Err(error_handler.handle_validation_error(
                    "output_path",
                    "Could not determine home directory for default output path",
                ));
            }
        };
        let default_dir = home_dir.join("Documents").join("Barqly-Vaults");

        // Create directory if it doesn't exist
        error_handler.handle_operation_error(
            std::fs::create_dir_all(&default_dir),
            "create_output_directory",
            ErrorCode::InternalError,
        )?;

        default_dir
    };

    // Generate output filename
    let output_name = if let Some(ref name) = input.out_encrypted_file_name {
        sanitize_filename(name)
    } else {
        // Use vault name as default
        sanitize_filename(&vault.name)
    };

    let output_path = output_dir.join(&output_name);
    let encrypted_path = output_path.with_extension("age");
    let vault_manifest_path =
        path_management::get_vault_manifest_path(&vault.name).map_err(|e| {
            error_handler
                .handle_validation_error("vault_name", &format!("Invalid vault name: {}", e))
        })?;

    // Check if output file already exists
    let file_exists_warning = encrypted_path.exists();
    if file_exists_warning {
        debug!(
            output_path = %encrypted_path.display(),
            "Output file already exists - will need user confirmation"
        );
    }

    // Load the key registry
    let registry = match KeyRegistry::load() {
        Ok(r) => r,
        Err(e) => {
            error!(error = ?e, "Failed to load key registry");
            return Err(error_handler
                .handle_validation_error("key_registry", "Failed to load key registry"));
        }
    };

    // Collect all public keys from vault
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_KEY_RETRIEVAL + 10.0,
        "Collecting public keys from vault...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    let mut public_keys = Vec::new();
    let mut keys_used = Vec::new();

    for key_id in &vault.keys {
        if let Some(registry_entry) = registry.get_key(key_id) {
            match registry_entry {
                crate::storage::KeyEntry::Passphrase {
                    label,
                    public_key,
                    key_filename,
                    ..
                } => {
                    debug!(
                        key_label = %label,
                        key_id = %key_id,
                        "Loading passphrase key for encryption"
                    );

                    let public_key_obj = crate::crypto::PublicKey::from(public_key.clone());
                    public_keys.push(public_key_obj);
                    keys_used.push(label.clone());
                    debug!(
                        key_label = %label,
                        "Added passphrase key for encryption"
                    );
                }
                crate::storage::KeyEntry::Yubikey {
                    label,
                    serial,
                    recipient,
                    ..
                } => {
                    debug!(
                        key_label = %label,
                        serial = %serial,
                        "Loading YubiKey public key for encryption"
                    );

                    // Use the recipient (public key) stored in the registry
                    let public_key = crate::crypto::PublicKey::from(recipient.clone());
                    public_keys.push(public_key);
                    keys_used.push(label.clone());
                    debug!(
                        key_label = %label,
                        "Added YubiKey public key for encryption"
                    );
                }
            }
        } else {
            warn!(
                key_id = %key_id,
                vault_id = %input.vault_id,
                "Key ID referenced by vault not found in registry - skipping"
            );
        }
    }

    if public_keys.is_empty() {
        return Err(error_handler
            .handle_validation_error("public_keys", "No valid public keys found for encryption"));
    }

    info!(
        vault_id = %input.vault_id,
        keys_count = public_keys.len(),
        keys_used = ?keys_used,
        "Collected public keys for multi-recipient encryption"
    );

    // Create file selection from input paths with atomic validation
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_FILE_VALIDATION,
        "Validating file selection...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    debug!(
        file_count = input.in_file_paths.len(),
        first_path = input
            .in_file_paths
            .first()
            .map(|p| p.as_str())
            .unwrap_or(""),
        "Starting file selection validation"
    );

    let file_selection =
        file_helpers::create_file_selection_atomic(&input.in_file_paths, &error_handler)?;

    trace!(
        selection_type = ?file_selection.selection_type(),
        "File selection created successfully"
    );

    // Validate the file selection
    error_handler.handle_operation_error(
        file_ops::validate_selection(&file_selection, &file_ops::FileOpsConfig::default()),
        "validate_selection",
        ErrorCode::InvalidInput,
    )?;

    debug!("File selection validation completed successfully");

    // Create file operations config
    let config = file_ops::FileOpsConfig::default();

    // Create archive with progress reporting
    progress_manager.set_progress(PROGRESS_ENCRYPT_ARCHIVE_START, "Creating archive...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Create archive with progress reporting and capture file info for external manifest
    let (archive_operation, archive_files, _staging_path) = error_handler.handle_operation_error(
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

    // Encrypt the archive data to all public keys using age multi-recipient
    progress_manager.set_progress(
        PROGRESS_ENCRYPT_ENCRYPTING,
        "Encrypting to all vault keys...",
    );
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    debug!(
        archive_size = archive_data.len(),
        vault_id = %input.vault_id,
        recipients_count = public_keys.len(),
        "Starting multi-recipient archive encryption"
    );

    // Use age's multi-recipient encryption
    let encrypted_data = error_handler.handle_crypto_operation_error(
        crate::crypto::encrypt_data_multi_recipient(&archive_data, &public_keys),
        "encrypt_data_multi_recipient",
    )?;

    debug!(
        original_size = archive_data.len(),
        encrypted_size = encrypted_data.len(),
        recipients_count = public_keys.len(),
        "Multi-recipient archive encryption completed successfully"
    );

    // Write encrypted data to final output file (only if user confirmed or no conflict)
    if !file_exists_warning {
        progress_manager.set_progress(PROGRESS_ENCRYPT_WRITING, "Writing encrypted file...");
        super::update_global_progress(&operation_id, progress_manager.get_current_update());

        debug!(
            output_path = %encrypted_path.display(),
            encrypted_size = encrypted_data.len(),
            "Writing encrypted data to final output file"
        );

        error_handler.handle_operation_error(
            std::fs::write(&encrypted_path, encrypted_data),
            "write_encrypted_file",
            ErrorCode::EncryptionFailed,
        )?;

        debug!(
            output_path = %encrypted_path.display(),
            "Encrypted file written successfully"
        );

        // Update vault manifest with encryption information
        progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Updating vault manifest...");
        super::update_global_progress(&operation_id, progress_manager.get_current_update());

        if let Err(manifest_err) = update_vault_manifest_with_encryption(
            &mut vault,
            &archive_operation,
            &archive_files,
            &encrypted_path,
        )
        .await
        {
            // Log warning but don't fail the entire operation for manifest update
            warn!("Failed to update vault manifest: {}", manifest_err);
        }
    }

    // Clean up temporary archive file with proper error handling
    progress_manager.set_progress(PROGRESS_ENCRYPT_CLEANUP, "Cleaning up temporary files...");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());
    file_helpers::cleanup_temp_file(&archive_operation.archive_path, &error_handler);

    // Complete the operation
    progress_manager.complete("Multi-key encryption completed successfully");
    super::update_global_progress(&operation_id, progress_manager.get_current_update());

    // Log operation completion
    info!(
        file_count = archive_operation.file_count,
        output_path = %encrypted_path.display(),
        keys_count = keys_used.len(),
        vault_id = %input.vault_id,
        "Multi-key encryption completed successfully"
    );

    Ok(EncryptFilesMultiResponse {
        encrypted_file_path: encrypted_path.to_string_lossy().to_string(),
        manifest_file_path: vault_manifest_path.to_string_lossy().to_string(),
        file_exists_warning,
        keys_used,
    })
}

/// Update vault manifest with encryption information
async fn update_vault_manifest_with_encryption(
    vault: &mut crate::models::Vault,
    archive_operation: &crate::file_ops::ArchiveOperation,
    archive_files: &[crate::file_ops::FileInfo],
    encrypted_path: &std::path::Path,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Create archive contents from file info
    let contents: Vec<ArchiveContent> = archive_files
        .iter()
        .map(|file_info| ArchiveContent {
            file: file_info
                .path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            size: format_file_size(file_info.size),
            hash: file_info.hash.clone(),
        })
        .collect();

    // Calculate total size from archive operation
    let total_size = archive_files.iter().map(|f| f.size).sum::<u64>();

    // Create encrypted archive entry
    let encrypted_archive = EncryptedArchive {
        filename: encrypted_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        encrypted_at: chrono::Utc::now(),
        total_files: archive_operation.file_count as u64,
        total_size: format_file_size(total_size),
        contents,
    };

    // Add to vault
    vault.add_encrypted_archive(encrypted_archive);

    // Save updated vault
    vault_store::save_vault(vault).await?;

    Ok(())
}

/// Format file size in human-readable format
fn format_file_size(bytes: u64) -> String {
    if bytes == 0 {
        return "0 B".to_string();
    }

    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    const THRESHOLD: f64 = 1024.0;

    let mut size = bytes as f64;
    let mut unit_index = 0;

    while size >= THRESHOLD && unit_index < UNITS.len() - 1 {
        size /= THRESHOLD;
        unit_index += 1;
    }

    format!("{:.1} {}", size, UNITS[unit_index])
}
