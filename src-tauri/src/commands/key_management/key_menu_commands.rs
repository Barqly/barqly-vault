//! Key Menu Commands - UI-focused key display data
//!
//! This module provides a clean, structured API for key menu bar display,
//! eliminating display logic confusion and label mapping issues.

use crate::commands::key_management::yubikey::device_commands::list_yubikeys;
use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::prelude::*;
use crate::services::key_management::shared::{KeyEntry, KeyRegistry};
use crate::services::vault;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Key menu data optimized for UI display
#[derive(Debug, Serialize, specta::Type)]
pub struct KeyMenuInfo {
    /// UI display position (0=passphrase, 1-3=yubikeys)
    pub display_index: u8,
    /// Key type for UI logic
    pub key_type: String,
    /// User-friendly display label
    pub label: String,
    /// Internal key reference ID
    pub internal_id: String,
    /// Current key state
    pub state: String,
    /// Creation timestamp
    pub created_at: String,
    /// Type-specific metadata
    pub metadata: KeyMenuMetadata,
}

/// Type-specific metadata for different key types
#[derive(Debug, Serialize, specta::Type)]
#[serde(tag = "type")]
pub enum KeyMenuMetadata {
    Passphrase {
        public_key: String,
        key_filename: String,
    },
    YubiKey {
        serial: String,
        slot: u8,
        piv_slot: u8,
        recipient: String,
        identity_tag: String,
        firmware_version: String,
    },
}

/// Request for key menu data
#[derive(Debug, Deserialize, specta::Type)]
pub struct GetKeyMenuDataRequest {
    pub vault_id: String,
}

/// Response with structured key menu data
#[derive(Debug, Serialize, specta::Type)]
pub struct GetKeyMenuDataResponse {
    pub vault_id: String,
    pub keys: Vec<KeyMenuInfo>,
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
    let registry = KeyRegistry::load().map_err(|e| {
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
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::Orphaned => "registered",
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::Reused => "registered",
                        crate::commands::key_management::yubikey::device_commands::YubiKeyState::New => "registered",
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

    let mut key_menu_items = Vec::new();
    let mut yubikey_index = 1u8; // YubiKeys start at display index 1

    // Process keys in vault manifest order
    for key_id in &vault.keys {
        if let Some(registry_entry) = registry.get_key(key_id) {
            match registry_entry {
                KeyEntry::Passphrase {
                    label,
                    created_at,
                    public_key,
                    key_filename,
                    ..
                } => {
                    // Passphrase always gets display index 0
                    key_menu_items.push(KeyMenuInfo {
                        display_index: 0,
                        key_type: "passphrase".to_string(),
                        label: label.clone(),
                        internal_id: key_id.clone(),
                        state: "active".to_string(), // Passphrase keys are always active when in vault
                        created_at: created_at.to_rfc3339(),
                        metadata: KeyMenuMetadata::Passphrase {
                            public_key: public_key.clone(),
                            key_filename: key_filename.clone(),
                        },
                    });
                }
                KeyEntry::Yubikey {
                    label,
                    created_at,
                    serial,
                    slot,
                    piv_slot,
                    recipient,
                    identity_tag,
                    firmware_version,
                    ..
                } => {
                    // YubiKeys get sequential display indexes 1, 2, 3
                    if yubikey_index <= 3 {
                        key_menu_items.push(KeyMenuInfo {
                            display_index: yubikey_index,
                            key_type: "yubikey".to_string(),
                            label: label.clone(), // Use actual label from registry!
                            internal_id: key_id.clone(),
                            state: yubikey_states
                                .get(serial)
                                .unwrap_or(&"registered".to_string())
                                .clone(),
                            created_at: created_at.to_rfc3339(),
                            metadata: KeyMenuMetadata::YubiKey {
                                serial: serial.clone(),
                                slot: *slot,
                                piv_slot: *piv_slot,
                                recipient: recipient.clone(),
                                identity_tag: identity_tag.clone(),
                                firmware_version: firmware_version.clone().unwrap_or_default(),
                            },
                        });
                        yubikey_index += 1;
                    }
                }
            }
        } else {
            warn!(
                key_id = %key_id,
                vault_id = %input.vault_id,
                "Key ID in vault not found in registry - skipping"
            );
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
