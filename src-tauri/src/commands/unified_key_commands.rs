//! Unified Key Management Commands
//!
//! This module provides a consolidated API for listing and managing keys across
//! all key types (passphrase, YubiKey, future hardware tokens).
//!
//! Design Philosophy:
//! - Single source of truth for key listing logic
//! - Consistent availability detection across all UI contexts
//! - Future-proof for new key types (HSM, Smart Cards, etc.)
//! - Simplified frontend integration with unified data structures

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::commands::yubikey::device_commands::{PinStatus, YubiKeyState};
use crate::key_management::yubikey::{YubiKeyManager, domain::models::Serial};
use crate::models::KeyState;
use crate::prelude::*;
use crate::storage::{KeyRegistry, vault_store};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// Filter options for key listing operations
#[derive(Debug, Deserialize, Serialize, specta::Type)]
#[serde(tag = "type", content = "value")]
pub enum KeyListFilter {
    /// All registered keys across all vaults
    All,
    /// Keys registered to a specific vault
    ForVault(String),
    /// Keys NOT in a specific vault but available to add
    AvailableForVault(String),
    /// Only currently connected/available keys (for decryption UI)
    ConnectedOnly,
}

/// Key type classification for unified API
#[derive(Debug, Serialize, specta::Type)]
#[serde(tag = "type", content = "data")]
pub enum KeyType {
    /// Passphrase-based key
    Passphrase { key_id: String },
    /// YubiKey hardware token
    YubiKey {
        serial: String,
        firmware_version: Option<String>,
    },
}

/// Unified key information structure
#[derive(Debug, Serialize, specta::Type)]
pub struct KeyInfo {
    /// Unique identifier for this key
    pub id: String,
    /// User-friendly label
    pub label: String,
    /// Type-specific information
    pub key_type: KeyType,
    /// Age recipient string for encryption
    pub recipient: String,
    /// Whether key is currently available (green vs blue in UI)
    pub is_available: bool,
    /// Which vault this key belongs to (if any)
    pub vault_id: Option<String>,
    /// Current state in relation to vaults
    pub state: KeyState,
    /// Additional metadata for YubiKey keys
    pub yubikey_info: Option<YubiKeyInfo>,
}

/// YubiKey-specific information for unified API
#[derive(Debug, Serialize, specta::Type)]
pub struct YubiKeyInfo {
    pub slot: Option<u8>,
    pub identity_tag: Option<String>,
    pub pin_status: PinStatus,
    pub yubikey_state: YubiKeyState,
}

/// List keys with flexible filtering options - unified API
#[tauri::command]
#[specta::specta]
pub async fn list_unified_keys(filter: KeyListFilter) -> Result<Vec<KeyInfo>, CommandError> {
    info!("Listing keys with filter: {:?}", filter);

    match filter {
        KeyListFilter::All => list_all_keys().await,
        KeyListFilter::ForVault(vault_id) => list_vault_keys(vault_id).await,
        KeyListFilter::AvailableForVault(vault_id) => list_available_for_vault(vault_id).await,
        KeyListFilter::ConnectedOnly => list_connected_keys().await,
    }
}

/// Simple test command to verify the unified API works
#[tauri::command]
#[specta::specta]
pub async fn test_unified_keys() -> Result<String, CommandError> {
    Ok("Unified key API is working!".to_string())
}

/// Implementation: List all registered keys across all vaults
async fn list_all_keys() -> Result<Vec<KeyInfo>, CommandError> {
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let mut keys = Vec::new();

    // Get all passphrase keys
    keys.extend(get_passphrase_keys(&registry, None).await?);

    // Get all YubiKey keys with availability status
    keys.extend(get_yubikey_keys(&registry, None, false).await?);

    Ok(keys)
}

/// Implementation: List keys for a specific vault
async fn list_vault_keys(vault_id: String) -> Result<Vec<KeyInfo>, CommandError> {
    let vault = vault_store::get_vault(&vault_id)
        .await
        .map_err(|e| CommandError::operation(ErrorCode::VaultNotFound, e.to_string()))?;

    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let mut keys = Vec::new();

    // Filter to only keys in this vault
    for key_id in &vault.keys {
        if let Some(entry) = registry.get_key(key_id) {
            match entry {
                crate::storage::KeyEntry::Passphrase { label, .. } => {
                    keys.push(KeyInfo {
                        id: key_id.clone(),
                        label: label.clone(),
                        key_type: KeyType::Passphrase {
                            key_id: key_id.clone(),
                        },
                        recipient: "passphrase".to_string(), // TODO: Get actual recipient
                        is_available: true,                  // Passphrase keys always available
                        vault_id: Some(vault_id.clone()),
                        state: KeyState::Active,
                        yubikey_info: None,
                    });
                }
                crate::storage::KeyEntry::Yubikey { label, serial, .. } => {
                    let is_connected = check_yubikey_connected(serial).await;
                    keys.push(KeyInfo {
                        id: key_id.clone(),
                        label: label.clone(),
                        key_type: KeyType::YubiKey {
                            serial: serial.clone(),
                            firmware_version: None, // TODO: Get from registry
                        },
                        recipient: "yubikey".to_string(), // TODO: Get actual recipient
                        is_available: is_connected,
                        vault_id: Some(vault_id.clone()),
                        state: if is_connected {
                            KeyState::Active
                        } else {
                            KeyState::Registered
                        },
                        yubikey_info: Some(YubiKeyInfo {
                            slot: None,                 // TODO: Get from registry
                            identity_tag: None,         // TODO: Get from registry
                            pin_status: PinStatus::Set, // TODO: Check actual PIN status
                            yubikey_state: YubiKeyState::Registered,
                        }),
                    });
                }
            }
        }
    }

    Ok(keys)
}

/// Implementation: List keys available to add to a vault (not currently in vault)
async fn list_available_for_vault(vault_id: String) -> Result<Vec<KeyInfo>, CommandError> {
    let vault = vault_store::get_vault(&vault_id)
        .await
        .map_err(|e| CommandError::operation(ErrorCode::VaultNotFound, e.to_string()))?;

    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());

    // Get vault's current key serials for filtering
    let vault_yubikey_serials: HashSet<String> = vault
        .keys
        .iter()
        .filter_map(|key_id| {
            if let Some(crate::storage::KeyEntry::Yubikey { serial, .. }) = registry.get_key(key_id)
            {
                Some(serial.clone())
            } else {
                None
            }
        })
        .collect();

    let mut available_keys = Vec::new();

    // Get connected YubiKeys not in this vault
    if let Ok(manager) = YubiKeyManager::new().await
        && let Ok(devices) = manager.list_connected_devices().await
    {
        for device in devices {
            let serial_str = device.serial().value().to_string();

            // Skip if already in this vault
            if vault_yubikey_serials.contains(&serial_str) {
                continue;
            }

            // Check if device has identity
            let has_identity = manager.has_identity(device.serial()).await.unwrap_or(false);

            available_keys.push(KeyInfo {
                id: format!("available_{}", serial_str), // Temp ID for available keys
                label: format!("YubiKey {}", &serial_str[..8.min(serial_str.len())]),
                key_type: KeyType::YubiKey {
                    serial: serial_str,
                    firmware_version: device.firmware_version.clone(),
                },
                recipient: "pending".to_string(), // Will be generated on registration
                is_available: true,
                vault_id: None,            // Not yet in vault
                state: KeyState::Orphaned, // Available to add
                yubikey_info: Some(YubiKeyInfo {
                    slot: None,
                    identity_tag: None,
                    pin_status: if manager
                        .has_default_pin(device.serial())
                        .await
                        .unwrap_or(false)
                    {
                        PinStatus::Default
                    } else {
                        PinStatus::Set
                    },
                    yubikey_state: if has_identity {
                        YubiKeyState::Orphaned
                    } else {
                        YubiKeyState::New
                    },
                }),
            });
        }
    }

    Ok(available_keys)
}

/// Implementation: List only currently connected/available keys
async fn list_connected_keys() -> Result<Vec<KeyInfo>, CommandError> {
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let mut connected_keys = Vec::new();

    // Passphrase keys are always "connected"
    connected_keys.extend(get_passphrase_keys(&registry, None).await?);

    // Only connected YubiKeys
    connected_keys.extend(get_yubikey_keys(&registry, None, true).await?);

    Ok(connected_keys)
}

/// Helper: Get passphrase keys from registry
async fn get_passphrase_keys(
    registry: &KeyRegistry,
    vault_filter: Option<&str>,
) -> Result<Vec<KeyInfo>, CommandError> {
    let mut keys = Vec::new();

    for (key_id, entry) in &registry.keys {
        if let crate::storage::KeyEntry::Passphrase { label, .. } = entry {
            // TODO: Implement vault filtering for passphrase keys
            keys.push(KeyInfo {
                id: key_id.clone(),
                label: label.clone(),
                key_type: KeyType::Passphrase {
                    key_id: key_id.clone(),
                },
                recipient: "passphrase".to_string(), // TODO: Get actual recipient
                is_available: true,                  // Passphrase keys always available
                vault_id: vault_filter.map(|s| s.to_string()),
                state: KeyState::Active,
                yubikey_info: None,
            });
        }
    }

    Ok(keys)
}

/// Helper: Get YubiKey keys from registry with availability checking
async fn get_yubikey_keys(
    registry: &KeyRegistry,
    vault_filter: Option<&str>,
    connected_only: bool,
) -> Result<Vec<KeyInfo>, CommandError> {
    let mut keys = Vec::new();

    for (key_id, entry) in &registry.keys {
        if let crate::storage::KeyEntry::Yubikey { label, serial, .. } = entry {
            let is_connected = check_yubikey_connected(serial).await;

            // Skip disconnected keys if connected_only filter
            if connected_only && !is_connected {
                continue;
            }

            keys.push(KeyInfo {
                id: key_id.clone(),
                label: label.clone(),
                key_type: KeyType::YubiKey {
                    serial: serial.clone(),
                    firmware_version: None, // TODO: Get from registry
                },
                recipient: "yubikey".to_string(), // TODO: Get actual recipient
                is_available: is_connected,
                vault_id: vault_filter.map(|s| s.to_string()),
                state: if is_connected {
                    KeyState::Active
                } else {
                    KeyState::Registered
                },
                yubikey_info: Some(YubiKeyInfo {
                    slot: None,                 // TODO: Get from registry
                    identity_tag: None,         // TODO: Get from registry
                    pin_status: PinStatus::Set, // TODO: Check actual PIN status
                    yubikey_state: YubiKeyState::Registered,
                }),
            });
        }
    }

    Ok(keys)
}

/// Helper: Check if YubiKey with given serial is currently connected
async fn check_yubikey_connected(serial: &str) -> bool {
    if let Ok(manager) = YubiKeyManager::new().await {
        if let Ok(serial_obj) = Serial::new(serial.to_string()) {
            manager
                .detect_device(&serial_obj)
                .await
                .unwrap_or(None)
                .is_some()
        } else {
            false
        }
    } else {
        false
    }
}
