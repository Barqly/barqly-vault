//! Key Import Commands
//!
//! Commands for importing external .enc key files into the registry (R2 API Phase 4)

use crate::services::key_management::shared::application::services::KeyImportService;
use crate::services::key_management::shared::domain::models::key_reference::KeyReference;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

/// Request to import a key file
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportKeyFileRequest {
    /// Path to the .enc file to import
    pub file_path: String,
    /// Passphrase for encrypted .enc files (optional)
    pub passphrase: Option<String>,
    /// Override the label extracted from file name (optional)
    pub override_label: Option<String>,
    /// Immediately attach to a vault after import (optional)
    pub attach_to_vault: Option<String>,
    /// Only validate without actually importing (dry-run mode)
    pub validate_only: bool,
}

/// Response from key import
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ImportKeyFileResponse {
    /// The imported or validated key reference
    pub key_reference: KeyReference,
    /// Validation status information
    pub validation_status: ValidationStatus,
    /// Any warnings encountered during import
    pub import_warnings: Vec<String>,
}

/// Validation status for imported keys
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ValidationStatus {
    /// Whether the key file is valid
    pub is_valid: bool,
    /// Whether this key already exists in the registry
    pub is_duplicate: bool,
    /// Original metadata from the key file
    pub original_metadata: Option<KeyMetadata>,
}

/// Simplified key metadata for frontend
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub public_key: String,
}

/// Import an external .enc key file into the registry
///
/// This command allows importing backup or external key files into the vault system.
/// It supports both passphrase-protected keys and YubiKey metadata files.
///
/// Features:
/// - Validates age encryption format
/// - Checks for duplicate keys by comparing public keys
/// - Sanitizes labels to prevent injection attacks
/// - Supports dry-run validation mode
/// - Can immediately attach imported keys to vaults
/// - Creates audit trail for security compliance
#[tauri::command]
#[specta::specta]
pub async fn import_key_file(
    request: ImportKeyFileRequest,
) -> CommandResponse<ImportKeyFileResponse> {
    debug!(
        file_path = %request.file_path,
        has_passphrase = request.passphrase.is_some(),
        override_label = ?request.override_label,
        attach_to_vault = ?request.attach_to_vault,
        validate_only = request.validate_only,
        "Starting key file import"
    );

    // Validate input
    if request.file_path.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "File path cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid path to a .enc key file".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Validate file extension
    if !request.file_path.ends_with(".enc") && !request.file_path.ends_with(".agekey.enc") {
        warn!(
            file_path = %request.file_path,
            "File doesn't have expected .enc extension"
        );
    }

    // Create import service
    let import_service = KeyImportService::new();

    // Attempt import
    match import_service
        .import_key_file(
            &request.file_path,
            request.passphrase,
            request.override_label,
            request.attach_to_vault.clone(),
            request.validate_only,
        )
        .await
    {
        Ok((key_ref, validation_status, warnings)) => {
            let action = if request.validate_only {
                "validated"
            } else {
                "imported"
            };

            info!(
                file_path = %request.file_path,
                key_id = %key_ref.id,
                label = %key_ref.label,
                is_duplicate = validation_status.is_duplicate,
                warnings_count = warnings.len(),
                "Successfully {} key file",
                action
            );

            // Convert internal types to command types
            let response_validation = ValidationStatus {
                is_valid: validation_status.is_valid,
                is_duplicate: validation_status.is_duplicate,
                original_metadata: validation_status.original_metadata.map(|m| KeyMetadata {
                    label: m.label,
                    created_at: m.created_at,
                    public_key: m.public_key,
                }),
            };

            Ok(ImportKeyFileResponse {
                key_reference: key_ref,
                validation_status: response_validation,
                import_warnings: warnings,
            })
        }
        Err(e) => {
            error!(
                file_path = %request.file_path,
                error = %e,
                "Failed to import key file"
            );

            // Map error types to appropriate error codes and guidance
            let error_str = e.to_string();
            let (code, recovery_guidance) = match e {
                crate::services::key_management::shared::application::services::ImportError::FileNotFound(_) => (
                    ErrorCode::FileNotFound,
                    Some("Check that the file path is correct and the file exists".to_string()),
                ),
                crate::services::key_management::shared::application::services::ImportError::WrongPassphrase => (
                    ErrorCode::DecryptionFailed,
                    Some("Provide the correct passphrase for this encrypted key file".to_string()),
                ),
                crate::services::key_management::shared::application::services::ImportError::InvalidFormat(_) => (
                    ErrorCode::InvalidInput,
                    Some("Ensure the file is a valid age-encrypted key file (.enc)".to_string()),
                ),
                crate::services::key_management::shared::application::services::ImportError::InvalidKeyData(_) => (
                    ErrorCode::InvalidInput,
                    Some("The key file appears to be corrupted or invalid".to_string()),
                ),
                crate::services::key_management::shared::application::services::ImportError::DecryptionFailed(_) => (
                    ErrorCode::DecryptionFailed,
                    Some("Unable to decrypt the key file. Check the passphrase if required".to_string()),
                ),
                crate::services::key_management::shared::application::services::ImportError::SecurityValidationFailed(_) => (
                    ErrorCode::InvalidFileFormat,
                    Some("The key file failed security validation checks".to_string()),
                ),
                _ => (
                    ErrorCode::UnknownError,
                    Some("An unexpected error occurred during import".to_string()),
                ),
            };

            Err(Box::new(CommandError {
                code,
                message: format!("Failed to import key file: {}", e),
                details: Some(error_str),
                recovery_guidance,
                user_actionable: true,
                trace_id: None,
                span_id: None,
            }))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = ImportKeyFileRequest {
            file_path: "".to_string(),
            passphrase: None,
            override_label: None,
            attach_to_vault: None,
            validate_only: false,
        };
        assert!(request.file_path.is_empty());

        let request = ImportKeyFileRequest {
            file_path: "/path/to/key.enc".to_string(),
            passphrase: Some("password123".to_string()),
            override_label: Some("My Imported Key".to_string()),
            attach_to_vault: Some("vault-123".to_string()),
            validate_only: true,
        };
        assert!(!request.file_path.is_empty());
        assert!(request.passphrase.is_some());
        assert!(request.validate_only);
    }

    #[test]
    fn test_file_extension_check() {
        let valid_extensions = vec!["key.enc", "backup.agekey.enc", "test.enc"];

        for path in valid_extensions {
            assert!(path.ends_with(".enc") || path.ends_with(".agekey.enc"));
        }

        let invalid_extensions = vec!["key.txt", "backup.pem", "test"];

        for path in invalid_extensions {
            assert!(!path.ends_with(".enc") && !path.ends_with(".agekey.enc"));
        }
    }
}
