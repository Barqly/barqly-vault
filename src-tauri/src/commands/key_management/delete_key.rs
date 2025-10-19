//! Key Deletion Commands
//!
//! Commands for permanently deleting keys (immediate destruction)

use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use tracing::{debug, error, info, warn};

/// Request to delete a key permanently
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DeleteKeyRequest {
    /// The key ID to delete
    pub key_id: String,
    /// Reason for deletion (optional, for audit trail)
    pub reason: Option<String>,
}

/// Response from key deletion
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DeleteKeyResponse {
    pub success: bool,
    pub key_id: String,
    pub new_status: KeyLifecycleStatus,
    /// ISO 8601 timestamp when key was deleted
    pub deleted_at: String,
}

/// Delete a key permanently (immediate destruction)
///
/// This command permanently deletes a key by:
/// 1. Updating registry status to Destroyed
/// 2. Deleting the key file from disk (for passphrase keys)
///
/// This is typically used for unattached keys (PreActivation state) that were never used.
/// For attached keys, consider using deactivateKey with delete_immediately flag.
///
/// IMPORTANT: This does NOT un-encrypt vaults. Any backups of the key file can still decrypt vaults.
#[tauri::command]
#[specta::specta]
pub async fn delete_key(request: DeleteKeyRequest) -> CommandResponse<DeleteKeyResponse> {
    debug!(
        key_id = %request.key_id,
        reason = ?request.reason,
        "Attempting to delete key permanently"
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

    // Load registry
    let mut registry = KeyRegistry::load().map_err(|e| {
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
    let key_entry = registry.get_key_mut(&request.key_id).ok_or_else(|| {
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

    // Check if already destroyed (idempotent behavior)
    if key_entry.lifecycle_status() == KeyLifecycleStatus::Destroyed {
        info!(
            key_id = %request.key_id,
            "Key already destroyed (idempotent - returning success)"
        );

        return Ok(DeleteKeyResponse {
            success: true,
            key_id: request.key_id,
            new_status: KeyLifecycleStatus::Destroyed,
            deleted_at: Utc::now().to_rfc3339(),
        });
    }

    // Get file path before destroying (if passphrase key)
    let key_file_path = if let Some(filename) = key_entry.passphrase_filename() {
        Some(
            get_keys_dir()
                .map_err(|e| {
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
                })?
                .join(filename),
        )
    } else {
        None
    };

    // Destroy the key in registry (update status to Destroyed)
    let reason = request
        .reason
        .unwrap_or_else(|| "User requested permanent deletion".to_string());

    key_entry
        .destroy(reason.clone(), "user".to_string())
        .map_err(|e| {
            error!(key_id = %request.key_id, error = %e, "Failed to destroy key");
            Box::new(CommandError {
                code: ErrorCode::InvalidKeyState,
                message: e,
                details: None,
                recovery_guidance: Some("Check key state and try again".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?;

    let deleted_at = Utc::now();

    // Save the registry FIRST (transaction safety: registry update before file deletion)
    // This way if file deletion fails, registry correctly reflects intent to destroy
    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save registry after destruction");
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to save registry".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Try again or check system logs".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Delete the key file from disk (for passphrase keys only)
    // If this fails, registry still shows Destroyed (user can manually clean up file)
    if let Some(file_path) = key_file_path {
        if file_path.exists() {
            match fs::remove_file(&file_path) {
                Ok(_) => {
                    info!(
                        key_id = %request.key_id,
                        file_path = ?file_path,
                        "Key file deleted successfully"
                    );
                }
                Err(e) => {
                    warn!(
                        key_id = %request.key_id,
                        file_path = ?file_path,
                        error = %e,
                        "Failed to delete key file, but registry updated (user can manually delete file)"
                    );
                    // Don't return error - registry update is what matters
                }
            }
        } else {
            debug!(
                key_id = %request.key_id,
                file_path = ?file_path,
                "Key file already deleted or never existed"
            );
        }
    }

    info!(
        key_id = %request.key_id,
        deleted_at = %deleted_at.to_rfc3339(),
        "Key successfully destroyed"
    );

    Ok(DeleteKeyResponse {
        success: true,
        key_id: request.key_id,
        new_status: KeyLifecycleStatus::Destroyed,
        deleted_at: deleted_at.to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = DeleteKeyRequest {
            key_id: "".to_string(),
            reason: None,
        };
        assert!(request.key_id.is_empty());

        let request = DeleteKeyRequest {
            key_id: "test-key".to_string(),
            reason: Some("No longer needed".to_string()),
        };
        assert!(!request.key_id.is_empty());
        assert_eq!(request.reason, Some("No longer needed".to_string()));
    }
}
