//! Basic key operations for vaults
//!
//! Commands for getting, adding, and removing keys from vaults.

use crate::key_management::yubikey::infrastructure::pty::ykman_operations::list_yubikeys;
use crate::models::{KeyReference, KeyState, KeyType};
use crate::prelude::*;
use crate::storage::{KeyRegistry, key_store, vault_store};
use chrono::Utc;

/// Input for getting vault keys
#[derive(Debug, Deserialize, specta::Type)]
pub struct GetVaultKeysRequest {
    pub vault_id: String,
    /// Include all keys regardless of availability (for decrypt operations)
    pub include_all: Option<bool>,
}

/// Response containing vault keys
#[derive(Debug, Serialize, specta::Type)]
pub struct GetVaultKeysResponse {
    pub vault_id: String,
    pub keys: Vec<KeyReference>,
}

/// Input for adding a key to vault
#[derive(Debug, Deserialize, specta::Type)]
pub struct AddKeyToVaultRequest {
    pub vault_id: String,
    pub key_type: String,               // "passphrase" or "yubikey"
    pub passphrase: Option<String>,     // For passphrase keys
    pub yubikey_serial: Option<String>, // For YubiKey
    pub label: String,
}

/// Response from adding key
#[derive(Debug, Serialize, specta::Type)]
pub struct AddKeyToVaultResponse {
    pub success: bool,
    pub key_reference: KeyReference,
}

/// Input for removing key from vault
#[derive(Debug, Deserialize, specta::Type)]
pub struct RemoveKeyFromVaultRequest {
    pub vault_id: String,
    pub key_id: String,
}

/// Response from removing key
#[derive(Debug, Serialize, specta::Type)]
pub struct RemoveKeyFromVaultResponse {
    pub success: bool,
}

/// Get all keys for a vault
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn get_vault_keys(input: GetVaultKeysRequest) -> CommandResponse<GetVaultKeysResponse> {
    debug!(vault_id = %input.vault_id, "get_vault_keys called");

    // Load the vault
    let vault = match vault_store::load_vault(&input.vault_id).await {
        Ok(v) => {
            debug!(keys_count = v.keys.len(), "Vault loaded successfully");
            v
        }
        Err(e) => {
            error!(vault_id = %input.vault_id, error = ?e, "Failed to load vault");
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

    // Load the key registry
    let registry = match KeyRegistry::load() {
        Ok(r) => r,
        Err(e) => {
            error!(error = ?e, "Failed to load key registry");
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

    // Convert key IDs to KeyReference objects with current state
    let mut key_references = Vec::new();
    for key_id in &vault.keys {
        if let Some(registry_entry) = registry.get_key(key_id) {
            // Determine current state based on key type and availability
            let state = match registry_entry {
                crate::storage::KeyEntry::Passphrase { key_filename, .. } => {
                    // Check if key file exists
                    let exists = key_store::key_exists(key_filename).unwrap_or(false);
                    if exists {
                        KeyState::Active
                    } else {
                        KeyState::Orphaned
                    }
                }
                crate::storage::KeyEntry::Yubikey { serial, .. } => {
                    // Check if YubiKey is inserted using ykman list
                    let devices = list_yubikeys().unwrap_or_default();
                    if devices.iter().any(|device_info| {
                        // Extract serial from device string (format: "YubiKey 5 NFC (5.4.3) Serial: 12345678")
                        device_info.contains("Serial:") && device_info.contains(serial)
                    }) {
                        KeyState::Active
                    } else {
                        KeyState::Registered
                    }
                }
            };

            let key_ref = KeyReference::from_registry_entry(key_id.clone(), registry_entry, state);
            key_references.push(key_ref);

            debug!(
                key_id = %key_id,
                key_label = %registry_entry.label(),
                key_state = ?state,
                "Converted registry entry to KeyReference"
            );
        } else {
            warn!(
                key_id = %key_id,
                vault_id = %input.vault_id,
                "Key ID referenced by vault not found in registry"
            );
            // Could create an "orphaned" reference or skip it
            // For now, skip missing keys
        }
    }

    info!(
        vault_id = %input.vault_id,
        keys_count = key_references.len(),
        "Returning vault keys from registry"
    );

    Ok(GetVaultKeysResponse {
        vault_id: input.vault_id,
        keys: key_references,
    })
}

/// Add a key to a vault
#[tauri::command]
#[specta::specta]
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
    let vault = match vault_store::load_vault(&input.vault_id).await {
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
                    }));
                }
            };

            // Load the key registry to count existing YubiKeys
            let registry = KeyRegistry::load().unwrap_or_default();

            // Determine slot index by counting existing YubiKeys in vault
            let yubikey_count = vault
                .keys
                .iter()
                .filter_map(|key_id| {
                    registry.get_key(key_id).and_then(|entry| match entry {
                        crate::storage::KeyEntry::Yubikey { .. } => Some(()),
                        _ => None,
                    })
                })
                .count();

            KeyType::Yubikey {
                serial: serial.clone(),
                slot_index: yubikey_count as u8,
                piv_slot: 82 + yubikey_count as u8, // Map to PIV retired slots
                firmware_version: None,             // TODO: Get firmware version from device
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

    let _key_reference = KeyReference {
        id: format!("{}_{}", input.vault_id, rand::random::<u32>()),
        key_type,
        label: input.label.trim().to_string(),
        state: KeyState::Active,
        created_at: Utc::now(),
        last_used: None,
    };

    // Add key to vault - but we need to create the actual key in the registry first
    // This approach is deprecated - should use the specialized add_key functions instead
    Err(Box::new(CommandError {
        code: ErrorCode::InvalidInput,
        message: "Use add_passphrase_key_to_vault or register_yubikey_for_vault instead"
            .to_string(),
        details: None,
        recovery_guidance: Some("This generic add_key function is deprecated".to_string()),
        user_actionable: true,
        trace_id: None,
        span_id: None,
    }))
}

/// Remove a key from a vault
#[tauri::command]
#[specta::specta]
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
