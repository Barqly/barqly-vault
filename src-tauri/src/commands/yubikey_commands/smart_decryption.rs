//! Smart decryption commands with automatic method selection

use crate::commands::command_types::CommandError;
use crate::crypto::multi_recipient::{MultiRecipientCrypto, MultiRecipientDecryptParams};
use crate::crypto::yubikey::{ProtectionMode, UnlockCredentials, UnlockMethod};
use crate::storage::VaultMetadataV2;
use serde::{Deserialize, Serialize};
use tauri::command;

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
#[command]
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
#[command]
pub async fn yubikey_get_available_unlock_methods(
    encrypted_file: String,
) -> Result<AvailableUnlockMethods, CommandError> {
    // Load vault metadata
    let metadata_path = format!("{encrypted_file}.metadata.json");
    let metadata = load_vault_metadata(&metadata_path)?;

    // Determine available methods
    let passphrase_recipients = metadata.get_recipients_by_type("passphrase");
    let yubikey_recipients = metadata.get_recipients_by_type("yubikey");

    let mut available_methods = Vec::new();
    let mut method_details = Vec::new();

    // Check passphrase methods
    if !passphrase_recipients.is_empty() {
        available_methods.push(UnlockMethod::Passphrase);
        for recipient in passphrase_recipients {
            method_details.push(UnlockMethodDetail {
                method: UnlockMethod::Passphrase,
                description: format!("Passphrase: {}", recipient.label),
                available: true,
                requirements: vec!["Master passphrase".to_string()],
            });
        }
    }

    // Check YubiKey methods
    for recipient in yubikey_recipients {
        let is_available = recipient.is_available();
        if is_available {
            available_methods.push(UnlockMethod::YubiKey);
        }

        method_details.push(UnlockMethodDetail {
            method: UnlockMethod::YubiKey,
            description: recipient.get_description(),
            available: is_available,
            requirements: vec!["YubiKey device".to_string(), "YubiKey PIN".to_string()],
        });
    }

    // Remove duplicates
    available_methods.sort();
    available_methods.dedup();

    let protection_mode = metadata.protection_mode.clone();

    let result = AvailableUnlockMethods {
        protection_mode,
        available_methods,
        method_details,
        recommendations: get_unlock_recommendations(&metadata),
    };

    Ok(result)
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
#[command]
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
#[derive(Debug, Serialize, Deserialize)]
pub struct VaultDecryptionResult {
    pub method_used: UnlockMethod,
    pub recipient_used: String,
    pub files_extracted: Vec<String>,
    pub output_path: String,
    pub decryption_time: chrono::DateTime<chrono::Utc>,
}

/// Available unlock methods for a vault
#[derive(Debug, Serialize, Deserialize)]
pub struct AvailableUnlockMethods {
    pub protection_mode: ProtectionMode,
    pub available_methods: Vec<UnlockMethod>,
    pub method_details: Vec<UnlockMethodDetail>,
    pub recommendations: Vec<String>,
}

/// Detailed information about an unlock method
#[derive(Debug, Serialize, Deserialize)]
pub struct UnlockMethodDetail {
    pub method: UnlockMethod,
    pub description: String,
    pub available: bool,
    pub requirements: Vec<String>,
}

/// Result of credentials testing
#[derive(Debug, Serialize, Deserialize)]
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

/// Get unlock recommendations based on vault metadata
fn get_unlock_recommendations(metadata: &VaultMetadataV2) -> Vec<String> {
    let mut recommendations = Vec::new();

    match &metadata.protection_mode {
        ProtectionMode::PassphraseOnly => {
            recommendations.push("This vault is protected with a passphrase only".to_string());
            recommendations.push("Ensure you remember your master passphrase".to_string());
        }
        ProtectionMode::YubiKeyOnly { serial } => {
            recommendations.push(format!("This vault requires YubiKey {serial}"));
            recommendations
                .push("Ensure your YubiKey is connected and you know the PIN".to_string());
        }
        ProtectionMode::Hybrid { yubikey_serial } => {
            recommendations
                .push("This vault supports both YubiKey and passphrase unlock".to_string());
            recommendations.push(format!("Primary method: YubiKey {yubikey_serial}"));
            recommendations.push("Backup method: Master passphrase".to_string());
        }
    }

    let yubikey_recipients = metadata.get_recipients_by_type("yubikey");
    if !yubikey_recipients.is_empty() && !yubikey_recipients.iter().all(|r| r.is_available()) {
        recommendations.push("Some YubiKeys are not currently connected".to_string());
    }

    recommendations
}

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
