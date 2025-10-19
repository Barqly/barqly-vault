//! Key Deactivation Commands
//!
//! Commands for deactivating keys with a 30-day grace period before permanent deletion

use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use tracing::{debug, error, info, warn};

/// Request to deactivate a key
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DeactivateKeyRequest {
    /// The key ID to deactivate
    pub key_id: String,
    /// Reason for deactivation (optional, for audit trail)
    pub reason: Option<String>,
    /// If true, immediately destroy the key (skip 30-day grace period)
    /// If false or None, use normal deactivation with 30-day grace period
    #[serde(default)]
    pub delete_immediately: Option<bool>,
}

/// Response from key deactivation
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DeactivateKeyResponse {
    pub success: bool,
    pub key_id: String,
    pub new_status:
        crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus,
    /// ISO 8601 timestamp when key was deactivated
    pub deactivated_at: String,
    /// ISO 8601 timestamp when key will be permanently deleted (deactivated_at + 30 days)
    /// None if delete_immediately was true
    pub deletion_scheduled_at: Option<String>,
}

/// Deactivate a key (with optional immediate deletion)
///
/// This command has two modes:
/// 1. Normal deactivation (delete_immediately=false): Transitions key to Deactivated with 30-day grace period
/// 2. Immediate destruction (delete_immediately=true): Transitions key directly to Destroyed, deletes key file
///
/// For attached keys (Active state), both modes are available based on user choice.
/// This operation is idempotent - deactivating an already deactivated key returns success.
#[tauri::command]
#[specta::specta]
pub async fn deactivate_key(
    request: DeactivateKeyRequest,
) -> CommandResponse<DeactivateKeyResponse> {
    let delete_immediately = request.delete_immediately.unwrap_or(false);

    debug!(
        key_id = %request.key_id,
        reason = ?request.reason,
        delete_immediately = delete_immediately,
        "Attempting to deactivate key"
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

    // BRANCH: Immediate deletion (delete_immediately=true)
    if delete_immediately {
        info!(
            key_id = %request.key_id,
            "Immediate deletion requested - destroying key"
        );

        // Check if already destroyed (idempotent)
        if key_entry.lifecycle_status() == KeyLifecycleStatus::Destroyed {
            info!(
                key_id = %request.key_id,
                "Key already destroyed (idempotent - returning success)"
            );

            return Ok(DeactivateKeyResponse {
                success: true,
                key_id: request.key_id,
                new_status: KeyLifecycleStatus::Destroyed,
                deactivated_at: Utc::now().to_rfc3339(),
                deletion_scheduled_at: None,
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

        // Destroy the key in registry
        let reason = request
            .reason
            .unwrap_or_else(|| "User requested immediate deletion".to_string());

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

        // Save registry FIRST (transaction safety)
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

        // Delete key file (if passphrase key)
        if let Some(file_path) = key_file_path
            && file_path.exists()
        {
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
                        "Failed to delete key file, but registry updated"
                    );
                    // Don't return error - registry update is what matters
                }
            }
        }

        info!(
            key_id = %request.key_id,
            deleted_at = %deleted_at.to_rfc3339(),
            "Key successfully destroyed immediately"
        );

        return Ok(DeactivateKeyResponse {
            success: true,
            key_id: request.key_id,
            new_status: KeyLifecycleStatus::Destroyed,
            deactivated_at: deleted_at.to_rfc3339(),
            deletion_scheduled_at: None,
        });
    }

    // BRANCH: Normal deactivation (delete_immediately=false)
    info!(
        key_id = %request.key_id,
        "Normal deactivation requested - 30-day grace period"
    );

    // Check if already deactivated (idempotent)
    if key_entry.lifecycle_status() == KeyLifecycleStatus::Deactivated
        && let Some(deactivated_at) = key_entry.deactivated_at()
    {
        let deletion_scheduled = deactivated_at + Duration::days(30);

        info!(
            key_id = %request.key_id,
            "Key already deactivated (idempotent - returning existing deactivation info)"
        );

        return Ok(DeactivateKeyResponse {
            success: true,
            key_id: request.key_id,
            new_status: KeyLifecycleStatus::Deactivated,
            deactivated_at: deactivated_at.to_rfc3339(),
            deletion_scheduled_at: Some(deletion_scheduled.to_rfc3339()),
        });
    }

    // Deactivate the key
    let reason = request
        .reason
        .unwrap_or_else(|| "User requested deactivation".to_string());
    key_entry
        .deactivate(reason.clone(), "user".to_string())
        .map_err(|e| {
            error!(key_id = %request.key_id, error = %e, "Failed to deactivate key");
            Box::new(CommandError {
                code: ErrorCode::InvalidKeyState,
                message: e,
                details: None,
                recovery_guidance: Some(
                    "Only Active or Suspended keys can be deactivated".to_string(),
                ),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?;

    // Get the deactivation timestamp (just set by deactivate())
    let deactivated_at = key_entry.deactivated_at().ok_or_else(|| {
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to get deactivation timestamp".to_string(),
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    let deletion_scheduled = deactivated_at + Duration::days(30);

    // Save the registry
    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save registry after deactivation");
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

    info!(
        key_id = %request.key_id,
        deactivated_at = %deactivated_at.to_rfc3339(),
        deletion_scheduled_at = %deletion_scheduled.to_rfc3339(),
        "Key successfully deactivated with 30-day grace period"
    );

    Ok(DeactivateKeyResponse {
        success: true,
        key_id: request.key_id,
        new_status: KeyLifecycleStatus::Deactivated,
        deactivated_at: deactivated_at.to_rfc3339(),
        deletion_scheduled_at: Some(deletion_scheduled.to_rfc3339()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = DeactivateKeyRequest {
            key_id: "".to_string(),
            reason: None,
            delete_immediately: None,
        };
        assert!(request.key_id.is_empty());

        let request = DeactivateKeyRequest {
            key_id: "test-key".to_string(),
            reason: Some("No longer needed".to_string()),
            delete_immediately: Some(false),
        };
        assert!(!request.key_id.is_empty());
        assert_eq!(request.reason, Some("No longer needed".to_string()));
        assert_eq!(request.delete_immediately, Some(false));
    }
}
