//! Key Menu Commands - UI-focused key display data
//!
//! This module provides a clean, structured API for key menu bar display,
//! eliminating display logic confusion and label mapping issues.

use crate::commands::key_management::yubikey::device_commands::list_yubikeys;
use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::prelude::*;
use crate::services::key_management::shared::KeyEntry;
use crate::services::key_management::shared::domain::models::{
    KeyType, VaultKey, key_lifecycle::KeyLifecycleStatus,
};
use crate::services::vault;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Request for key menu data
#[derive(Debug, Deserialize, specta::Type)]
pub struct GetKeyMenuDataRequest {
    pub vault_id: String,
}

/// Response with structured key menu data
#[derive(Debug, Serialize, specta::Type)]
pub struct GetKeyMenuDataResponse {
    pub vault_id: String,
    pub keys: Vec<VaultKey>,
}

/// Get structured key menu data for UI display
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn get_key_menu_data(
    input: GetKeyMenuDataRequest,
) -> CommandResponse<GetKeyMenuDataResponse> {
    info!(vault_id = %input.vault_id, "Getting key menu data for UI");

    // Load vault to get key order
    let vault = vault::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(CommandError::operation(
            ErrorCode::VaultNotFound,
            e.to_string(),
        ))
    })?;

    // Load key registry to get actual labels and metadata
    let registry = crate::services::key_management::shared::KeyManager::new()
        .load_registry()
        .map_err(|e| {
            Box::new(CommandError::operation(
                ErrorCode::StorageFailed,
                e.to_string(),
            ))
        })?;

    // Get real-time YubiKey states using existing architecture
    let yubikey_states: HashMap<String, String> = match list_yubikeys().await {
        Ok(yubikeys) => {
            yubikeys
                .into_iter()
                .map(|yk| {
                    let state = match yk.state {
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::Registered => "active",
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::Orphaned => "suspended",
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::Reused => "pre_activation",
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::New => "pre_activation",
                    };
                    (yk.serial, state.to_string())
                })
                .collect()
        }
        Err(e) => {
            warn!("Failed to get YubiKey states: {:?}", e);
            HashMap::new()
        }
    };

    use crate::services::vault::infrastructure::persistence::metadata::RecipientType;

    let mut key_menu_items = Vec::new();

    // Process recipients in vault metadata
    for recipient in vault.recipients() {
        match &recipient.recipient_type {
            RecipientType::Passphrase { .. } => {
                // Use the key_id from recipient (registry reference)
                let key_id = &recipient.key_id;

                if let Some(KeyEntry::Passphrase {
                    label, created_at, ..
                }) = registry.get_key(key_id)
                {
                    // Build VaultKey for passphrase
                    key_menu_items.push(VaultKey {
                        id: key_id.to_string(),
                        label: label.clone(),
                        lifecycle_status: KeyLifecycleStatus::Active, // Passphrase keys are always active when in vault
                        key_type: KeyType::Passphrase {
                            key_id: key_id.to_string(),
                        },
                        created_at: *created_at,
                        last_used: None,
                    });
                }
            }
            RecipientType::YubiKey {
                serial,
                firmware_version,
                ..
            } => {
                // Use the key_id from recipient (registry reference)
                let key_id = &recipient.key_id;

                if let Some(KeyEntry::Yubikey {
                    label, created_at, ..
                }) = registry.get_key(key_id)
                {
                    // Map YubiKey state to KeyLifecycleStatus
                    let lifecycle_status = match yubikey_states.get(serial.as_str()) {
                        Some(state_str) => match state_str.as_str() {
                            "active" => KeyLifecycleStatus::Active,
                            "suspended" => KeyLifecycleStatus::Suspended,
                            "pre_activation" => KeyLifecycleStatus::PreActivation,
                            _ => KeyLifecycleStatus::PreActivation,
                        },
                        None => KeyLifecycleStatus::PreActivation,
                    };

                    // Build VaultKey for YubiKey
                    key_menu_items.push(VaultKey {
                        id: key_id.to_string(),
                        label: label.clone(),
                        lifecycle_status,
                        key_type: KeyType::YubiKey {
                            serial: serial.clone(),
                            firmware_version: firmware_version.clone(),
                        },
                        created_at: *created_at,
                        last_used: None,
                    });
                } else {
                    // If not found by key_id, create entry from recipient data
                    let lifecycle_status = match yubikey_states.get(serial.as_str()) {
                        Some(state_str) => match state_str.as_str() {
                            "active" => KeyLifecycleStatus::Active,
                            "suspended" => KeyLifecycleStatus::Suspended,
                            "pre_activation" => KeyLifecycleStatus::PreActivation,
                            _ => KeyLifecycleStatus::PreActivation,
                        },
                        None => KeyLifecycleStatus::PreActivation,
                    };

                    key_menu_items.push(VaultKey {
                        id: key_id.to_string(),
                        label: recipient.label.clone(),
                        lifecycle_status,
                        key_type: KeyType::YubiKey {
                            serial: serial.clone(),
                            firmware_version: firmware_version.clone(),
                        },
                        created_at: recipient.created_at,
                        last_used: None,
                    });
                }
            }
        }
    }

    info!(
        vault_id = %input.vault_id,
        keys_count = key_menu_items.len(),
        "Key menu data prepared successfully"
    );

    Ok(GetKeyMenuDataResponse {
        vault_id: input.vault_id,
        keys: key_menu_items,
    })
}
