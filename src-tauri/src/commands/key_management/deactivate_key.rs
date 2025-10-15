//! Key Deactivation Commands
//!
//! Commands for deactivating keys with a 30-day grace period before permanent deletion

use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use chrono::Duration;
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

/// Request to deactivate a key
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct DeactivateKeyRequest {
    /// The key ID to deactivate
    pub key_id: String,
    /// Reason for deactivation (optional, for audit trail)
    pub reason: Option<String>,
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
    pub deletion_scheduled_at: String,
}

/// Deactivate a key (start 30-day grace period)
///
/// This command transitions a key from Active or Suspended state to Deactivated.
/// The key will be permanently deleted after 30 days unless restored.
/// This operation is idempotent - deactivating an already deactivated key returns success.
#[tauri::command]
#[specta::specta]
pub async fn deactivate_key(
    request: DeactivateKeyRequest,
) -> CommandResponse<DeactivateKeyResponse> {
    debug!(
        key_id = %request.key_id,
        reason = ?request.reason,
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

    // Check if already deactivated (idempotent)
    if key_entry.lifecycle_status() == crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Deactivated
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
            new_status: crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Deactivated,
            deactivated_at: deactivated_at.to_rfc3339(),
            deletion_scheduled_at: deletion_scheduled.to_rfc3339(),
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
        "Key successfully deactivated"
    );

    Ok(DeactivateKeyResponse {
        success: true,
        key_id: request.key_id,
        new_status: crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Deactivated,
        deactivated_at: deactivated_at.to_rfc3339(),
        deletion_scheduled_at: deletion_scheduled.to_rfc3339(),
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
        };
        assert!(request.key_id.is_empty());

        let request = DeactivateKeyRequest {
            key_id: "test-key".to_string(),
            reason: Some("No longer needed".to_string()),
        };
        assert!(!request.key_id.is_empty());
        assert_eq!(request.reason, Some("No longer needed".to_string()));
    }
}
