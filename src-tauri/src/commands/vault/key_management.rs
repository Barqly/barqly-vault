//! Key label and YubiKey management commands
//!
//! Commands for updating key labels and checking YubiKey availability.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// Input for updating key label
#[derive(Debug, Deserialize, specta::Type)]
pub struct UpdateKeyLabelRequest {
    pub vault_id: String,
    pub key_id: String,
    pub new_label: String,
}

/// Response from updating key label
#[derive(Debug, Serialize, specta::Type)]
pub struct UpdateKeyLabelResponse {
    pub success: bool,
}

/// Update a key's label
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_id = %input.key_id))]
pub async fn update_key_label(
    input: UpdateKeyLabelRequest,
) -> CommandResponse<UpdateKeyLabelResponse> {
    if input.new_label.trim().is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "New label cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid label".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Load the vault
    let mut vault = match vault_store::load_vault(&input.vault_id).await {
        Ok(v) => v,
        Err(_) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::KeyNotFound,
                message: format!("Vault '{}' not found", input.vault_id),
                details: None,
                recovery_guidance: None,
                user_actionable: false,
                trace_id: None,
                span_id: None,
            }));
        }
    };

    // Check if key exists in vault
    if !vault.keys.contains(&input.key_id) {
        return Err(Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: "Key not found in vault".to_string(),
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        }));
    }

    // Load key registry and update the key label
    let mut registry = match KeyRegistry::load() {
        Ok(r) => r,
        Err(e) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::StorageFailed,
                message: "Failed to load key registry".to_string(),
                details: Some(e.to_string()),
                recovery_guidance: None,
                user_actionable: false,
                trace_id: None,
                span_id: None,
            }));
        }
    };

    // Update the key label in the registry
    if let Some(entry) = registry.get_key_mut(&input.key_id) {
        match entry {
            crate::storage::KeyEntry::Passphrase { label, .. } => {
                *label = input.new_label.trim().to_string();
            }
            crate::storage::KeyEntry::Yubikey { label, .. } => {
                *label = input.new_label.trim().to_string();
            }
        }
    } else {
        return Err(Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: "Key not found in registry".to_string(),
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        }));
    }

    // Save updated registry
    if let Err(e) = registry.save() {
        return Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to save key registry".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        }));
    }

    // Save updated vault
    vault.updated_at = Utc::now();
    match vault_store::save_vault(&vault).await {
        Ok(_) => Ok(UpdateKeyLabelResponse { success: true }),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to save vault".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}
