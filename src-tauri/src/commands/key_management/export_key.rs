//! Key Export Commands
//!
//! Commands for exporting passphrase key files to user-selected locations

use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use std::fs;
use tracing::{debug, error, info};

/// Request to export a key to a destination path
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ExportKeyRequest {
    /// The key ID to export
    pub key_id: String,
    /// The full destination path where the key file should be copied
    pub destination_path: String,
}

/// Response from key export
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ExportKeyResponse {
    pub success: bool,
    /// The path where the file was exported
    pub exported_file: String,
    /// Size of the exported file in bytes
    pub file_size: u64,
}

/// Export a passphrase key file to a user-selected destination
///
/// This command copies the encrypted key file (.agekey.enc) from the app's keys directory
/// to a location chosen by the user (typically via file picker dialog in the frontend).
///
/// **Important:** This API assumes the key is a passphrase key. The frontend should only
/// show the Export button for passphrase keys, not YubiKey keys (which don't have .enc files).
#[tauri::command]
#[specta::specta]
pub async fn export_key(request: ExportKeyRequest) -> CommandResponse<ExportKeyResponse> {
    debug!(
        key_id = %request.key_id,
        destination = %request.destination_path,
        "Attempting to export key"
    );

    // Validate input
    if request.key_id.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Key ID cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid key ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    if request.destination_path.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Destination path cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid destination path".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Load registry
    let registry = KeyRegistry::load().map_err(|e| {
        error!(error = %e, "Failed to load key registry");
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to load key registry".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Check system logs or try again".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Get the key entry
    let key_entry = registry.get_key(&request.key_id).ok_or_else(|| {
        Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: format!("Key '{}' not found", request.key_id),
            details: None,
            recovery_guidance: Some("Verify the key ID is correct".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Verify this is a passphrase key (has a filename)
    let key_filename = key_entry.passphrase_filename().ok_or_else(|| {
        Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Cannot export this key type".to_string(),
            details: Some(
                "Only passphrase keys can be exported. YubiKey keys are hardware-based."
                    .to_string(),
            ),
            recovery_guidance: Some("Export is only available for passphrase keys".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Resolve source path
    let keys_dir = get_keys_dir().map_err(|e| {
        error!(error = %e, "Failed to get keys directory");
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to get keys directory".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    let source_path = keys_dir.join(key_filename);

    // Verify source file exists
    if !source_path.exists() {
        error!(
            key_id = %request.key_id,
            source_path = ?source_path,
            "Key file not found at expected location"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: "Key file not found on disk".to_string(),
            details: Some(format!("Expected at: {}", source_path.display())),
            recovery_guidance: Some(
                "The key file may have been manually deleted. Check the keys directory."
                    .to_string(),
            ),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        }));
    }

    // Get source file size
    let metadata = fs::metadata(&source_path).map_err(|e| {
        error!(error = %e, source_path = ?source_path, "Failed to read file metadata");
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to read key file metadata".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Check file permissions".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    let file_size = metadata.len();

    // Copy file to destination (atomic operation)
    fs::copy(&source_path, &request.destination_path).map_err(|e| {
        error!(
            error = %e,
            source = ?source_path,
            dest = %request.destination_path,
            "Failed to copy key file to destination"
        );
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to export key file".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some(
                "Check destination path is writable and has sufficient disk space".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    info!(
        key_id = %request.key_id,
        destination = %request.destination_path,
        file_size = file_size,
        "Key successfully exported"
    );

    Ok(ExportKeyResponse {
        success: true,
        exported_file: request.destination_path.clone(),
        file_size,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = ExportKeyRequest {
            key_id: "".to_string(),
            destination_path: "/tmp/test.enc".to_string(),
        };
        assert!(request.key_id.is_empty());

        let request = ExportKeyRequest {
            key_id: "test-key".to_string(),
            destination_path: "".to_string(),
        };
        assert!(request.destination_path.is_empty());

        let request = ExportKeyRequest {
            key_id: "test-key".to_string(),
            destination_path: "/tmp/exported-key.agekey.enc".to_string(),
        };
        assert!(!request.key_id.is_empty());
        assert!(!request.destination_path.is_empty());
    }
}
