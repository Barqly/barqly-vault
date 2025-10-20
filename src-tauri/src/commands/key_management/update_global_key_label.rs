//! Global Key Label Update Commands
//!
//! Commands for updating key labels in the global registry (for unattached keys only)
//! For unattached keys, performs full rename: label, key_id, filename, and disk file

use crate::services::key_management::shared::infrastructure::KeyRegistry;
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use crate::services::shared::infrastructure::sanitize_label;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use std::fs;
use tracing::{debug, error, info, warn};

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
    /// The new key ID (may be different from request if full rename occurred)
    pub key_id: String,
    /// The new label
    pub updated_label: String,
}

/// Update a key's label in the global registry
///
/// For UNATTACHED keys, performs FULL rename:
/// - Registry HashMap key (key_id): Derived from sanitized new label
/// - Display label: New label (original with spaces)
/// - Filename field (key_filename): Derived from sanitized new label
/// - Disk file: Renamed to match new filename
///
/// This matches the Create/Import pattern where all three components are derived
/// from the label.
///
/// **CRITICAL SAFETY:** Only allows updates for UNATTACHED keys.
///
/// Any key attached to a vault has its key_id embedded in the vault manifest.
/// Changing key_id would break manifest lookups.
///
/// **Allowed:**
/// - Unattached keys only (vault_associations = [])
///
/// **Blocked:**
/// - ANY attached key (vault_associations.length > 0)
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

    // Get the key entry (need to clone because we'll remove and re-insert)
    let key_entry = registry
        .get_key(&request.key_id)
        .ok_or_else(|| {
            Box::new(CommandError {
                code: ErrorCode::KeyNotFound,
                message: format!("Key '{}' not found", request.key_id),
                details: None,
                recovery_guidance: Some("Verify the key ID is correct".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })?
        .clone();

    let current_label = key_entry.label().to_string();
    let vault_associations = key_entry.vault_associations();

    // CRITICAL SAFETY CHECK: Only allow for UNATTACHED keys
    if !vault_associations.is_empty() {
        error!(
            key_id = %request.key_id,
            current_label = %current_label,
            vault_count = vault_associations.len(),
            vaults = ?vault_associations,
            "Cannot rename attached key - key_id is referenced in vault manifests"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidKeyState,
            message: "Cannot rename keys that are attached to vaults".to_string(),
            details: Some(format!(
                "Key '{}' is attached to {} vault(s). Its key_id is referenced in vault manifests. Renaming would break lookups.",
                current_label,
                vault_associations.len()
            )),
            recovery_guidance: Some(
                "Only unattached keys can be renamed. Detach this key from all vaults first."
                    .to_string(),
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

    // FULL RENAME: Sanitize new label to derive new key_id and filename
    // This matches Create/Import pattern where all components derive from label
    let sanitized = sanitize_label(trimmed_label).map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: format!("Failed to sanitize label: {}", e),
            details: None,
            recovery_guidance: Some(
                "Use only alphanumeric characters, spaces, hyphens, and underscores".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    let new_key_id = sanitized.sanitized.clone();
    let old_key_id = request.key_id.clone();

    // Collision Check 1: key_id collision (unless renaming to same sanitized form)
    if new_key_id != old_key_id && registry.contains_key(&new_key_id) {
        error!(
            old_key_id = %old_key_id,
            new_key_id = %new_key_id,
            "Rename blocked: new key_id already exists in registry"
        );
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: format!("A key with name '{}' already exists", sanitized.sanitized),
            details: Some(format!(
                "Renaming would create duplicate key_id: {}",
                new_key_id
            )),
            recovery_guidance: Some(
                "Choose a different label that doesn't conflict with existing keys".to_string(),
            ),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // For passphrase keys: Handle filename and file rename
    let file_rename_performed = if let Some(old_filename) = key_entry.passphrase_filename() {
        let new_filename = format!("{}.agekey.enc", new_key_id);

        // Collision Check 2: filename collision (unless same name)
        if old_filename != new_filename {
            let keys_dir = get_keys_dir().map_err(|e| {
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

            let old_file_path = keys_dir.join(old_filename);
            let new_file_path = keys_dir.join(&new_filename);

            // Check if new filename already exists
            if new_file_path.exists() && new_file_path != old_file_path {
                error!(
                    old_filename = %old_filename,
                    new_filename = %new_filename,
                    "Rename blocked: new filename already exists on disk"
                );
                return Err(Box::new(CommandError {
                    code: ErrorCode::InvalidInput,
                    message: format!("A key file named '{}' already exists", new_filename),
                    details: Some(
                        "Choose a different label to avoid filename collision".to_string(),
                    ),
                    recovery_guidance: Some(
                        "Try a different label that doesn't conflict with existing key files"
                            .to_string(),
                    ),
                    user_actionable: true,
                    trace_id: None,
                    span_id: None,
                }));
            }

            debug!(
                old_filename = %old_filename,
                new_filename = %new_filename,
                "Passphrase key detected - will perform file rename"
            );

            true
        } else {
            false
        }
    } else {
        // YubiKey - no file to rename
        debug!("YubiKey detected - no file rename needed");
        false
    };

    // TRANSACTION STEP 1: Update registry (registry-first for safety)
    // Remove old entry and insert with new key_id

    let mut updated_entry = key_entry.clone();

    // Update fields in the entry
    match &mut updated_entry {
        crate::services::key_management::shared::infrastructure::KeyEntry::Passphrase {
            label,
            key_filename,
            ..
        } => {
            *label = trimmed_label.to_string();
            *key_filename = format!("{}.agekey.enc", new_key_id);
            debug!(
                old_label = %current_label,
                new_label = %trimmed_label,
                old_filename = %key_entry.passphrase_filename().unwrap_or(""),
                new_filename = %key_filename,
                "Updated passphrase key entry fields"
            );
        }
        crate::services::key_management::shared::infrastructure::KeyEntry::Yubikey {
            label,
            ..
        } => {
            *label = trimmed_label.to_string();
            debug!(
                old_label = %current_label,
                new_label = %trimmed_label,
                "Updated YubiKey entry label"
            );
        }
    }

    // Remove old entry and insert with new key_id
    registry.remove_key(&old_key_id).map_err(|e| {
        error!(
            old_key_id = %old_key_id,
            error = %e,
            "Failed to remove old registry entry"
        );
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: "Failed to update registry".to_string(),
            details: Some(e),
            recovery_guidance: Some("Try again or check system logs".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    registry
        .register_key(new_key_id.clone(), updated_entry)
        .map_err(|e| {
            error!(
                new_key_id = %new_key_id,
                error = %e,
                "Failed to register key with new key_id"
            );
            Box::new(CommandError {
                code: ErrorCode::InternalError,
                message: "Failed to update registry".to_string(),
                details: Some(e),
                recovery_guidance: Some("Try again or check system logs".to_string()),
                user_actionable: false,
                trace_id: None,
                span_id: None,
            })
        })?;

    // TRANSACTION STEP 2: Save registry
    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save registry after rename");
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
        old_key_id = %old_key_id,
        new_key_id = %new_key_id,
        old_label = %current_label,
        new_label = %trimmed_label,
        "Registry updated successfully with new key_id"
    );

    // TRANSACTION STEP 3: Rename file on disk (if passphrase key)
    // If this fails, registry is already updated (shows intent)
    // User can manually rename file or re-export/re-import if needed
    if file_rename_performed {
        let keys_dir = get_keys_dir().map_err(|e| {
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

        let old_filename = key_entry.passphrase_filename().unwrap(); // Safe: checked above
        let new_filename = format!("{}.agekey.enc", new_key_id);

        let old_file_path = keys_dir.join(old_filename);
        let new_file_path = keys_dir.join(&new_filename);

        match fs::rename(&old_file_path, &new_file_path) {
            Ok(_) => {
                info!(
                    old_filename = %old_filename,
                    new_filename = %new_filename,
                    "Key file renamed successfully on disk"
                );
            }
            Err(e) => {
                warn!(
                    old_filename = %old_filename,
                    new_filename = %new_filename,
                    error = %e,
                    "File rename failed, but registry updated. User can manually rename file or re-export key."
                );
                // Don't return error - registry update succeeded (shows intent)
                // File rename is best-effort
            }
        }
    }

    info!(
        old_key_id = %old_key_id,
        new_key_id = %new_key_id,
        old_label = %current_label,
        new_label = %trimmed_label,
        "Key rename completed successfully"
    );

    Ok(UpdateGlobalKeyLabelResponse {
        success: true,
        key_id: new_key_id, // Return NEW key_id so frontend can update
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
