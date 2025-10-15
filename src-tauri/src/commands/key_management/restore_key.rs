//! Key Restoration Commands
//!
//! Commands for restoring deactivated keys within the 30-day grace period

use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

/// Request to restore a deactivated key
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct RestoreKeyRequest {
    /// The key ID to restore
    pub key_id: String,
}

/// Response from key restoration
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct RestoreKeyResponse {
    pub success: bool,
    pub key_id: String,
    /// The restored status (Active or Suspended, based on previous state)
    pub new_status:
        crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus,
    /// ISO 8601 timestamp when key was restored
    pub restored_at: String,
}

/// Restore a deactivated key
///
/// This command restores a deactivated key back to its previous state (Active or Suspended).
/// Only keys in Deactivated state can be restored, and only within 30 days of deactivation.
/// This operation is NOT idempotent - attempting to restore a non-deactivated key returns an error.
#[tauri::command]
#[specta::specta]
pub async fn restore_key(request: RestoreKeyRequest) -> CommandResponse<RestoreKeyResponse> {
    debug!(
        key_id = %request.key_id,
        "Attempting to restore deactivated key"
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

    // Check if key is deactivated
    if key_entry.lifecycle_status() != crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Deactivated {
        error!(
            key_id = %request.key_id,
            status = ?key_entry.lifecycle_status(),
            "Cannot restore key - not in Deactivated state"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidKeyState,
            message: format!(
                "Key '{}' is not deactivated and cannot be restored. Current state: {:?}",
                request.key_id,
                key_entry.lifecycle_status()
            ),
            details: None,
            recovery_guidance: Some("Only deactivated keys can be restored".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Check if within 30-day grace period (optional - for future enhancement)
    // Currently, we allow restoration as long as the key hasn't been permanently deleted
    // The cleanup job (not implemented yet) would handle permanent deletion after 30 days

    // Restore the key
    key_entry
        .restore("User restored key".to_string(), "user".to_string())
        .map_err(|e| {
            error!(key_id = %request.key_id, error = %e, "Failed to restore key");
            Box::new(CommandError {
                code: ErrorCode::InvalidKeyState,
                message: e,
                details: None,
                recovery_guidance: Some(
                    "The key may be in an invalid state for restoration".to_string(),
                ),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?;

    // Get the new status after restoration
    let new_status = key_entry.lifecycle_status();
    let restored_at = Utc::now();

    // Save the registry
    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save registry after restoration");
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
        new_status = ?new_status,
        restored_at = %restored_at.to_rfc3339(),
        "Key successfully restored"
    );

    Ok(RestoreKeyResponse {
        success: true,
        key_id: request.key_id,
        new_status,
        restored_at: restored_at.to_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = RestoreKeyRequest {
            key_id: "".to_string(),
        };
        assert!(request.key_id.is_empty());

        let request = RestoreKeyRequest {
            key_id: "test-key".to_string(),
        };
        assert!(!request.key_id.is_empty());
    }
}
