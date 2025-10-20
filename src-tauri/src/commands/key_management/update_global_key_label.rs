//! Global Key Label Update Commands
//!
//! Commands for updating key labels in the global registry (for unattached keys only)

use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

/// Request to update a key's label in the global registry
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct UpdateGlobalKeyLabelRequest {
    /// The key ID to update
    pub key_id: String,
    /// The new label for the key
    pub new_label: String,
}

/// Response from global key label update
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct UpdateGlobalKeyLabelResponse {
    pub success: bool,
    /// The key ID that was updated
    pub key_id: String,
    /// The new label
    pub updated_label: String,
}

/// Update a key's label in the global registry
///
/// This command updates the label for keys in the global registry.
/// **CRITICAL SAFETY:** Only allows updates for UNATTACHED keys.
///
/// Any key attached to a vault (regardless of lifecycle state) has its label
/// embedded in the vault manifest. Renaming would cause registry ↔ manifest
/// desynchronization.
///
/// **Label embedding happens at ATTACHMENT time, not encryption time!**
///
/// **Allowed:**
/// - Unattached keys only (vault_associations = [])
///
/// **Blocked:**
/// - ANY attached key (vault_associations.length > 0)
///   - Active keys (attached and in use)
///   - Suspended keys (was attached, label still in some manifests possibly)
///   - Deactivated keys (attached but deactivated, label still in manifests)
///
/// **Note:** This only updates the registry label, not vault manifests or filenames.
#[tauri::command]
#[specta::specta]
pub async fn update_global_key_label(
    request: UpdateGlobalKeyLabelRequest,
) -> CommandResponse<UpdateGlobalKeyLabelResponse> {
    debug!(
        key_id = %request.key_id,
        new_label = %request.new_label,
        "Attempting to update global key label"
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

    let trimmed_label = request.new_label.trim();
    if trimmed_label.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "New label cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid label (1-24 characters)".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    if trimmed_label.len() > 24 {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: format!(
                "Label is too long ({} characters, maximum 24)",
                trimmed_label.len()
            ),
            details: None,
            recovery_guidance: Some("Use a shorter label (up to 24 characters)".to_string()),
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

    let current_label = key_entry.label().to_string();
    let vault_associations = key_entry.vault_associations();

    // CRITICAL SAFETY CHECK: Only allow label updates for UNATTACHED keys
    // Any key attached to a vault has its label embedded in the vault manifest
    // Renaming would cause registry ↔ manifest desynchronization
    if !vault_associations.is_empty() {
        error!(
            key_id = %request.key_id,
            current_label = %current_label,
            vault_count = vault_associations.len(),
            vaults = ?vault_associations,
            "Cannot rename attached key - label is embedded in vault manifests"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidKeyState,
            message: "Cannot rename keys that are attached to vaults".to_string(),
            details: Some(format!(
                "Key '{}' is attached to {} vault(s). Its label is embedded in vault manifests. Renaming would cause synchronization issues.",
                current_label,
                vault_associations.len()
            )),
            recovery_guidance: Some(
                "Only unattached keys can be renamed. Detach this key from all vaults first, or delete it and create a new key with the desired label.".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Check if label is actually changing
    if trimmed_label == current_label {
        info!(
            key_id = %request.key_id,
            label = %current_label,
            "Label unchanged (idempotent - returning success)"
        );

        return Ok(UpdateGlobalKeyLabelResponse {
            success: true,
            key_id: request.key_id,
            updated_label: current_label,
        });
    }

    // Update the label in registry
    match key_entry {
        crate::services::key_management::shared::infrastructure::KeyEntry::Passphrase {
            label,
            ..
        } => {
            *label = trimmed_label.to_string();
        }
        crate::services::key_management::shared::infrastructure::KeyEntry::Yubikey {
            label,
            ..
        } => {
            *label = trimmed_label.to_string();
        }
    }

    // Save the registry
    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save registry after label update");
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
        old_label = %current_label,
        new_label = %trimmed_label,
        "Key label updated successfully in global registry"
    );

    Ok(UpdateGlobalKeyLabelResponse {
        success: true,
        key_id: request.key_id,
        updated_label: trimmed_label.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = UpdateGlobalKeyLabelRequest {
            key_id: "".to_string(),
            new_label: "New Label".to_string(),
        };
        assert!(request.key_id.is_empty());

        let request = UpdateGlobalKeyLabelRequest {
            key_id: "test-key".to_string(),
            new_label: "".to_string(),
        };
        assert!(request.new_label.is_empty());

        let request = UpdateGlobalKeyLabelRequest {
            key_id: "test-key".to_string(),
            new_label: "Valid Label".to_string(),
        };
        assert!(!request.key_id.is_empty());
        assert!(!request.new_label.is_empty());
    }
}
