//! Key label and YubiKey management commands
//!
//! Commands for updating key labels and checking YubiKey availability.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::crypto::yubikey::list_yubikey_devices;
use crate::storage::vault_store;
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

/// Input for checking YubiKey availability
#[derive(Debug, Deserialize, specta::Type)]
pub struct CheckYubiKeyAvailabilityRequest {
    pub serial: String,
}

/// Response from YubiKey availability check
#[derive(Debug, Serialize, specta::Type)]
pub struct CheckYubiKeyAvailabilityResponse {
    pub is_inserted: bool,
    pub is_configured: bool,
    pub needs_recovery: bool,
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

    // Find and update the key
    let key_found = vault
        .keys
        .iter_mut()
        .find(|k| k.id == input.key_id)
        .map(|k| {
            k.label = input.new_label.trim().to_string();
            true
        })
        .unwrap_or(false);

    if !key_found {
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

/// Check YubiKey availability
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(serial = %input.serial))]
pub async fn check_yubikey_availability(
    input: CheckYubiKeyAvailabilityRequest,
) -> CommandResponse<CheckYubiKeyAvailabilityResponse> {
    let devices = list_yubikey_devices().unwrap_or_default();
    let is_inserted = devices.iter().any(|d| d.serial == input.serial);

    // TODO: Check actual configuration state from YubiKey
    let is_configured = is_inserted; // Simplified for now
    let needs_recovery = false; // Simplified for now

    Ok(CheckYubiKeyAvailabilityResponse {
        is_inserted,
        is_configured,
        needs_recovery,
    })
}
