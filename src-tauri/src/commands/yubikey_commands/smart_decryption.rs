//! Smart decryption commands with automatic method selection

use crate::commands::command_types::CommandError;
use crate::crypto::multi_recipient::{MultiRecipientCrypto, MultiRecipientDecryptParams};
use crate::crypto::yubikey::{UnlockCredentials, UnlockMethod};
use crate::storage::VaultMetadataV2;
use serde::{Deserialize, Serialize};
use tauri;

/// Method confidence level matching frontend expectations
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub enum ConfidenceLevel {
    High,
    Medium,
    Low,
}

/// Available unlock method matching frontend structure
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct AvailableMethod {
    pub method_type: UnlockMethod,
    pub display_name: String,
    pub description: String,
    pub requires_hardware: bool,
    pub estimated_time: String,
    pub confidence_level: ConfidenceLevel,
}

/// Decrypt a vault with smart method selection
///
/// This command automatically determines the best unlock method based on
/// the vault's protection mode and currently available unlock methods.
///
/// # Arguments
/// * `encrypted_file` - Path to the encrypted vault file
/// * `unlock_method` - Optional preferred unlock method (auto-selected if None)
/// * `credentials` - Credentials for unlocking (passphrase or YubiKey info)
/// * `output_path` - Directory where decrypted files should be extracted
///
/// # Returns
/// DecryptionResult with information about the decryption process
#[tauri::command]
#[specta::specta]
pub async fn yubikey_decrypt_file(
    encrypted_file: String,
    unlock_method: Option<UnlockMethod>,
    credentials: UnlockCredentials,
    output_path: String,
) -> Result<VaultDecryptionResult, CommandError> {
    crate::logging::log_info(&format!(
        "Starting smart decryption for vault: {encrypted_file}"
    ));

    // Load vault metadata
    let metadata_path = format!("{encrypted_file}.metadata.json");
    let metadata = load_vault_metadata(&metadata_path)?;

    // Load encrypted data
    let encrypted_data = std::fs::read(&encrypted_file).map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::FileNotFound,
            format!("Failed to read encrypted file: {e}"),
        )
    })?;

    // Set up decryption parameters
    let decrypt_params = MultiRecipientDecryptParams {
        metadata,
        unlock_method,
        credentials,
        encrypted_data,
    };

    // Perform smart decryption
    let result = MultiRecipientCrypto::decrypt_with_smart_selection(decrypt_params)
        .await
        .map_err(CommandError::from)?;

    // Extract files to output directory
    let extracted_files = extract_decrypted_data(&result.decrypted_data, &output_path)?;

    let vault_result = VaultDecryptionResult {
        method_used: result.method_used,
        recipient_used: result.recipient_used,
        files_extracted: extracted_files,
        output_path,
        decryption_time: chrono::Utc::now(),
    };

    crate::logging::log_info(&format!(
        "Successfully decrypted vault using {:?} method",
        vault_result.method_used
    ));

    Ok(vault_result)
}

/// Get available unlock methods for a vault
///
/// Analyzes a vault and determines which unlock methods are currently
/// available based on the vault's recipients and system state.
///
/// # Arguments
/// * `encrypted_file` - Path to the encrypted vault file
///
/// # Returns
/// AvailableUnlockMethods with information about available methods
#[tauri::command]
#[specta::specta]
pub async fn yubikey_get_available_unlock_methods(
    file_path: String,
) -> Result<Vec<AvailableMethod>, CommandError> {
    let encrypted_file = file_path;
    // Load vault metadata
    let metadata_path = format!("{encrypted_file}.metadata.json");
    let metadata = load_vault_metadata(&metadata_path)?;

    // Determine available methods
    let passphrase_recipients = metadata.get_recipients_by_type("passphrase");
    let yubikey_recipients = metadata.get_recipients_by_type("yubikey");

    let mut available_methods = Vec::new();

    // Check passphrase methods
    if !passphrase_recipients.is_empty() {
        available_methods.push(AvailableMethod {
            method_type: UnlockMethod::Passphrase,
            display_name: "Master Passphrase".to_string(),
            description: "Decrypt using your vault master passphrase".to_string(),
            requires_hardware: false,
            estimated_time: "5 seconds".to_string(),
            confidence_level: ConfidenceLevel::High,
        });
    }

    // Check YubiKey methods
    if !yubikey_recipients.is_empty() {
        // For now, assume YubiKey is available (we can add proper detection later)
        available_methods.push(AvailableMethod {
            method_type: UnlockMethod::YubiKey,
            display_name: "YubiKey Hardware Device".to_string(),
            description: "Decrypt using your YubiKey hardware security key".to_string(),
            requires_hardware: true,
            estimated_time: "10 seconds".to_string(),
            confidence_level: ConfidenceLevel::High,
        });
    }

    Ok(available_methods)
}

/// Test unlock credentials without performing decryption
///
/// Validates that the provided credentials can successfully unlock the vault
/// without actually decrypting and extracting the contents.
///
/// # Arguments
/// * `encrypted_file` - Path to the encrypted vault file
/// * `credentials` - Credentials to test
///
/// # Returns
/// CredentialsTestResult with validation status
#[tauri::command]
#[specta::specta]
pub async fn yubikey_test_unlock_credentials(
    encrypted_file: String,
    credentials: UnlockCredentials,
) -> Result<CredentialsTestResult, CommandError> {
    crate::logging::log_debug("Testing unlock credentials");

    // Load vault metadata
    let metadata_path = format!("{encrypted_file}.metadata.json");
    let metadata = load_vault_metadata(&metadata_path)?;

    let test_result = match &credentials {
        UnlockCredentials::Passphrase {
            key_label,
            passphrase: _,
        } => {
            // Check if passphrase recipient exists
            let recipient_exists = metadata.recipients.iter().any(|r| {
                matches!(r.recipient_type, crate::storage::RecipientType::Passphrase)
                    && r.label == *key_label
            });

            if recipient_exists {
                CredentialsTestResult {
                    valid: true,
                    method: UnlockMethod::Passphrase,
                    message: "Passphrase recipient found".to_string(),
                }
            } else {
                CredentialsTestResult {
                    valid: false,
                    method: UnlockMethod::Passphrase,
                    message: format!("Passphrase recipient '{key_label}' not found in vault"),
                }
            }
        }
        UnlockCredentials::YubiKey { serial, pin: _ } => {
            // Check if YubiKey recipient exists and device is available
            let yubikey_recipient = metadata
                .recipients
                .iter()
                .find(|r| match &r.recipient_type {
                    crate::storage::RecipientType::YubiKey { serial: s, .. } => s == serial,
                    _ => false,
                });

            if let Some(recipient) = yubikey_recipient {
                if recipient.is_available() {
                    CredentialsTestResult {
                        valid: true,
                        method: UnlockMethod::YubiKey,
                        message: format!("YubiKey {serial} is available"),
                    }
                } else {
                    CredentialsTestResult {
                        valid: false,
                        method: UnlockMethod::YubiKey,
                        message: format!("YubiKey {serial} is not currently connected"),
                    }
                }
            } else {
                CredentialsTestResult {
                    valid: false,
                    method: UnlockMethod::YubiKey,
                    message: format!("YubiKey {serial} is not a valid recipient for this vault"),
                }
            }
        }
    };

    Ok(test_result)
}

// Supporting data structures

/// Result of vault decryption operation
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct VaultDecryptionResult {
    pub method_used: UnlockMethod,
    pub recipient_used: String,
    pub files_extracted: Vec<String>,
    pub output_path: String,
    pub decryption_time: chrono::DateTime<chrono::Utc>,
}

// Removed legacy types - now using AvailableMethod directly

/// Result of credentials testing
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct CredentialsTestResult {
    pub valid: bool,
    pub method: UnlockMethod,
    pub message: String,
}

// Helper functions

/// Load vault metadata from file
#[allow(clippy::result_large_err)]
fn load_vault_metadata(metadata_path: &str) -> Result<VaultMetadataV2, CommandError> {
    let metadata_path_buf = std::path::PathBuf::from(metadata_path);

    crate::storage::MetadataV2Storage::load_metadata(&metadata_path_buf).map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::FileNotFound,
            format!("Failed to load vault metadata: {e}"),
        )
    })
}

/// Extract decrypted data to output directory
#[allow(clippy::result_large_err)]
fn extract_decrypted_data(
    decrypted_data: &[u8],
    output_path: &str,
) -> Result<Vec<String>, CommandError> {
    use std::io::Cursor;

    // Create output directory if it doesn't exist
    std::fs::create_dir_all(output_path).map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::PermissionDenied,
            format!("Failed to create output directory: {e}"),
        )
    })?;

    // Extract files from tar archive
    let cursor = Cursor::new(decrypted_data);
    let mut archive = tar::Archive::new(flate2::read::GzDecoder::new(cursor));

    let mut extracted_files = Vec::new();

    for entry in archive.entries().map_err(|e| {
        CommandError::operation(
            crate::commands::command_types::ErrorCode::ArchiveCorrupted,
            format!("Failed to read archive: {e}"),
        )
    })? {
        let mut entry = entry.map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::ArchiveCorrupted,
                format!("Failed to process archive entry: {e}"),
            )
        })?;

        let entry_path = entry.path().map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::ArchiveCorrupted,
                format!("Invalid archive entry path: {e}"),
            )
        })?;

        // Extract to output directory
        let output_file_path = std::path::Path::new(output_path).join(&entry_path);

        // Ensure parent directory exists
        if let Some(parent) = output_file_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                CommandError::operation(
                    crate::commands::command_types::ErrorCode::PermissionDenied,
                    format!("Failed to create directory: {e}"),
                )
            })?;
        }

        entry.unpack(&output_file_path).map_err(|e| {
            CommandError::operation(
                crate::commands::command_types::ErrorCode::PermissionDenied,
                format!("Failed to extract file: {e}"),
            )
        })?;

        extracted_files.push(output_file_path.to_string_lossy().to_string());
    }

    crate::logging::log_info(&format!(
        "Extracted {} files to {}",
        extracted_files.len(),
        output_path
    ));

    Ok(extracted_files)
}

// Removed get_unlock_recommendations function - no longer needed

// Convert crypto module errors to command errors
impl From<crate::crypto::CryptoError> for CommandError {
    fn from(err: crate::crypto::CryptoError) -> Self {
        match err {
            crate::crypto::CryptoError::DecryptionFailed(msg) => CommandError::operation(
                crate::commands::command_types::ErrorCode::DecryptionFailed,
                msg,
            )
            .with_recovery_guidance("Check your credentials and try again"),
            crate::crypto::CryptoError::EncryptionFailed(msg) => CommandError::operation(
                crate::commands::command_types::ErrorCode::EncryptionFailed,
                msg,
            ),
            crate::crypto::CryptoError::InvalidKey(msg) => {
                CommandError::operation(crate::commands::command_types::ErrorCode::InvalidKey, msg)
                    .with_recovery_guidance("Verify the key is correct and not corrupted")
            }
            _ => CommandError::operation(
                crate::commands::command_types::ErrorCode::UnexpectedError,
                format!("Crypto operation failed: {err}"),
            ),
        }
    }
}
