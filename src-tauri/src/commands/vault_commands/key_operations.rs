//! Basic key operations for vaults
//!
//! Commands for getting, adding, and removing keys from vaults.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::crypto::yubikey::list_yubikey_devices;
use crate::models::{KeyReference, KeyState, KeyType};
use crate::storage::{key_store, vault_store};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// Input for getting vault keys
#[derive(Debug, Deserialize)]
pub struct GetVaultKeysRequest {
    pub vault_id: String,
}

/// Response containing vault keys
#[derive(Debug, Serialize)]
pub struct GetVaultKeysResponse {
    pub vault_id: String,
    pub keys: Vec<KeyReference>,
}

/// Input for adding a key to vault
#[derive(Debug, Deserialize)]
pub struct AddKeyToVaultRequest {
    pub vault_id: String,
    pub key_type: String,               // "passphrase" or "yubikey"
    pub passphrase: Option<String>,     // For passphrase keys
    pub yubikey_serial: Option<String>, // For YubiKey
    pub label: String,
}

/// Response from adding key
#[derive(Debug, Serialize)]
pub struct AddKeyToVaultResponse {
    pub success: bool,
    pub key_reference: KeyReference,
}

/// Input for removing key from vault
#[derive(Debug, Deserialize)]
pub struct RemoveKeyFromVaultRequest {
    pub vault_id: String,
    pub key_id: String,
}

/// Response from removing key
#[derive(Debug, Serialize)]
pub struct RemoveKeyFromVaultResponse {
    pub success: bool,
}

/// Get all keys for a vault
#[tauri::command]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn get_vault_keys(input: GetVaultKeysRequest) -> CommandResponse<GetVaultKeysResponse> {
    crate::logging::log_debug(&format!("get_vault_keys called for vault: {}", input.vault_id));

    // Load the vault
    let vault = match vault_store::load_vault(&input.vault_id).await {
        Ok(v) => {
            crate::logging::log_debug(&format!("Vault loaded, has {} keys", v.keys.len()));
            v
        }
        Err(e) => {
            crate::logging::log_error(&format!("Failed to load vault {}: {:?}", input.vault_id, e));
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

    // Update key states based on availability
    let mut updated_keys = vault.keys.clone();
    for key in &mut updated_keys {
        match &key.key_type {
            KeyType::Passphrase { key_id } => {
                // Check if key file exists
                let exists = key_store::key_exists(key_id).unwrap_or(false);
                key.state = if exists {
                    KeyState::Active
                } else {
                    KeyState::Orphaned
                };
                crate::logging::log_debug(&format!(
                    "Passphrase key {} (id: {}) exists: {}, state: {:?}",
                    key.label, key_id, exists, key.state
                ));
            }
            KeyType::Yubikey { serial, .. } => {
                // Check if YubiKey is inserted
                let devices = list_yubikey_devices().unwrap_or_default();
                key.state = if devices.iter().any(|d| &d.serial == serial) {
                    KeyState::Active
                } else {
                    KeyState::Registered
                };
                crate::logging::log_debug(&format!(
                    "YubiKey {} (serial: {}) state: {:?}",
                    key.label, serial, key.state
                ));
            }
        }
    }

    crate::logging::log_info(&format!(
        "Returning {} keys for vault {}",
        updated_keys.len(),
        input.vault_id
    ));

    Ok(GetVaultKeysResponse {
        vault_id: input.vault_id,
        keys: updated_keys,
    })
}

/// Add a key to a vault
#[tauri::command]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_type = %input.key_type))]
pub async fn add_key_to_vault(
    input: AddKeyToVaultRequest,
) -> CommandResponse<AddKeyToVaultResponse> {
    // Validate input
    if input.label.trim().is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Key label cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a descriptive label for the key".to_string()),
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

    // Create key reference based on type
    let key_type = match input.key_type.as_str() {
        "passphrase" => {
            // For new passphrase keys, we need to generate the key first
            // This is a placeholder - actual key generation would happen elsewhere
            let key_id = match input.passphrase {
                Some(_) => {
                    // In real implementation, this would call generate_key
                    format!(
                        "key_{}",
                        bs58::encode(rand::random::<[u8; 8]>()).into_string()
                    )
                }
                None => {
                    return Err(Box::new(CommandError {
                        code: ErrorCode::InvalidInput,
                        message: "Passphrase required for passphrase key".to_string(),
                        details: None,
                        recovery_guidance: Some("Provide a passphrase".to_string()),
                        user_actionable: true,
                        trace_id: None,
                        span_id: None,
                    }));
                }
            };

            KeyType::Passphrase { key_id }
        }
        "yubikey" => {
            let serial = match input.yubikey_serial {
                Some(s) => s,
                None => {
                    return Err(Box::new(CommandError {
                        code: ErrorCode::InvalidInput,
                        message: "YubiKey serial required".to_string(),
                        details: None,
                        recovery_guidance: Some("Provide YubiKey serial number".to_string()),
                        user_actionable: true,
                        trace_id: None,
                        span_id: None,
                    }))
                }
            };

            // Determine slot index
            let yubikey_count = vault
                .keys
                .iter()
                .filter(|k| matches!(k.key_type, KeyType::Yubikey { .. }))
                .count();

            KeyType::Yubikey {
                serial: serial.clone(),
                slot_index: yubikey_count as u8,
                piv_slot: 82 + yubikey_count as u8, // Map to PIV retired slots
            }
        }
        _ => {
            return Err(Box::new(CommandError {
                code: ErrorCode::InvalidInput,
                message: format!("Invalid key type: {}", input.key_type),
                details: Some("Must be 'passphrase' or 'yubikey'".to_string()),
                recovery_guidance: None,
                user_actionable: true,
                trace_id: None,
                span_id: None,
            }));
        }
    };

    let key_reference = KeyReference {
        id: format!("{}_{}", input.vault_id, rand::random::<u32>()),
        key_type,
        label: input.label.trim().to_string(),
        state: KeyState::Active,
        created_at: Utc::now(),
        last_used: None,
    };

    // Add key to vault
    if let Err(e) = vault.add_key(key_reference.clone()) {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: e,
            details: None,
            recovery_guidance: None,
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Save updated vault
    match vault_store::save_vault(&vault).await {
        Ok(_) => Ok(AddKeyToVaultResponse {
            success: true,
            key_reference,
        }),
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

/// Remove a key from a vault
#[tauri::command]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_id = %input.key_id))]
pub async fn remove_key_from_vault(
    input: RemoveKeyFromVaultRequest,
) -> CommandResponse<RemoveKeyFromVaultResponse> {
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

    // Remove the key
    if let Err(e) = vault.remove_key(&input.key_id) {
        return Err(Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: e,
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        }));
    }

    // Save updated vault
    match vault_store::save_vault(&vault).await {
        Ok(_) => Ok(RemoveKeyFromVaultResponse { success: true }),
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
