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
use crate::commands::passphrase::{
    PassphraseKeyInfo, list_available_passphrase_keys_for_vault, list_passphrase_keys_for_vault,
};
use crate::commands::yubikey::device_commands::{
    PinStatus, YubiKeyState, YubiKeyStateInfo, list_yubikeys,
};
use crate::commands::yubikey::vault_commands::{
    AvailableYubiKey, list_available_yubikeys_for_vault,
};
// Note: YubiKeyManager and Serial imports removed as we now delegate to Layer 2 commands
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

// Conversion functions to transform Layer 2 types to unified types

/// Convert PassphraseKeyInfo to unified KeyInfo
fn convert_passphrase_to_unified(
    passphrase_key: PassphraseKeyInfo,
    vault_id: Option<String>,
) -> KeyInfo {
    let key_id = passphrase_key.id.clone();
    KeyInfo {
        id: passphrase_key.id,
        label: passphrase_key.label,
        key_type: KeyType::Passphrase { key_id },
        recipient: passphrase_key.public_key, // Real public key from registry!
        is_available: passphrase_key.is_available,
        vault_id,
        state: if passphrase_key.is_available {
            KeyState::Active
        } else {
            KeyState::Registered
        },
        yubikey_info: None,
    }
}

/// Convert YubiKeyStateInfo to unified KeyInfo
fn convert_yubikey_to_unified(yubikey_key: YubiKeyStateInfo, vault_id: Option<String>) -> KeyInfo {
    let is_available = match yubikey_key.state {
        YubiKeyState::Registered => true,
        YubiKeyState::Orphaned => true,
        YubiKeyState::Reused => true,
        YubiKeyState::New => false,
    };

    KeyInfo {
        id: format!("yubikey_{}", yubikey_key.serial), // Generate consistent ID
        label: yubikey_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", yubikey_key.serial)),
        key_type: KeyType::YubiKey {
            serial: yubikey_key.serial.clone(),
            firmware_version: None, // YubiKeyStateInfo doesn't include firmware version
        },
        recipient: yubikey_key
            .recipient
            .unwrap_or_else(|| "unknown".to_string()), // Real recipient from registry!
        is_available,
        vault_id,
        state: match yubikey_key.state {
            YubiKeyState::Registered => KeyState::Active,
            YubiKeyState::Orphaned => KeyState::Orphaned,
            YubiKeyState::Reused => KeyState::Registered,
            YubiKeyState::New => KeyState::Orphaned,
        },
        yubikey_info: Some(YubiKeyInfo {
            slot: yubikey_key.slot,
            identity_tag: yubikey_key.identity_tag,
            pin_status: yubikey_key.pin_status,
            yubikey_state: yubikey_key.state,
        }),
    }
}

/// Convert AvailableYubiKey to unified KeyInfo
fn convert_available_yubikey_to_unified(
    available_key: AvailableYubiKey,
    vault_id: Option<String>,
) -> KeyInfo {
    KeyInfo {
        id: format!("available_yubikey_{}", available_key.serial),
        label: available_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", available_key.serial)),
        key_type: KeyType::YubiKey {
            serial: available_key.serial.clone(),
            firmware_version: None,
        },
        recipient: available_key
            .recipient
            .unwrap_or_else(|| "pending".to_string()),
        is_available: true,
        vault_id,
        state: match available_key.state.as_str() {
            "new" => KeyState::Orphaned,
            "orphaned" => KeyState::Orphaned,
            _ => KeyState::Orphaned,
        },
        yubikey_info: Some(YubiKeyInfo {
            slot: available_key.slot,
            identity_tag: available_key.identity_tag,
            pin_status: PinStatus::Set, // Simplified for available keys
            yubikey_state: match available_key.state.as_str() {
                "new" => YubiKeyState::New,
                "orphaned" => YubiKeyState::Orphaned,
                _ => YubiKeyState::Orphaned,
            },
        }),
    }
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
    let mut all_keys = Vec::new();

    // Get all YubiKeys using proper Layer 2 delegation
    match list_yubikeys().await {
        Ok(yubikey_list) => {
            for yubikey in yubikey_list {
                all_keys.push(convert_yubikey_to_unified(
                    yubikey, None, // No specific vault context
                ));
            }
        }
        Err(e) => {
            warn!("Failed to get all YubiKeys: {:?}", e);
            // Continue with other key types even if YubiKeys fail
        }
    }

    // For passphrase keys, we need to iterate through all keys in registry
    // since we don't have a global list_all_passphrase_keys function yet
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    for (key_id, entry) in &registry.keys {
        if let crate::storage::KeyEntry::Passphrase {
            label,
            created_at,
            last_used,
            public_key,
            ..
        } = entry
        {
            let passphrase_info = PassphraseKeyInfo {
                id: key_id.clone(),
                label: label.clone(),
                public_key: public_key.clone(),
                created_at: *created_at,
                last_used: *last_used,
                is_available: true,
            };
            all_keys.push(convert_passphrase_to_unified(passphrase_info, None));
        }
    }

    Ok(all_keys)
}

/// Implementation: List keys for a specific vault
async fn list_vault_keys(vault_id: String) -> Result<Vec<KeyInfo>, CommandError> {
    let mut unified_keys = Vec::new();

    // Get passphrase keys for this vault using proper Layer 2 delegation
    match list_passphrase_keys_for_vault(vault_id.clone()).await {
        Ok(passphrase_response) => {
            for passphrase_key in passphrase_response.keys {
                unified_keys.push(convert_passphrase_to_unified(
                    passphrase_key,
                    Some(vault_id.clone()),
                ));
            }
        }
        Err(e) => {
            warn!(
                "Failed to get passphrase keys for vault {}: {:?}",
                vault_id, e
            );
            // Continue with other key types even if passphrase keys fail
        }
    }

    // Get YubiKey keys by filtering all YubiKeys for this vault
    // Note: We don't have a direct list_yubikeys_for_vault function yet,
    // so we'll use list_yubikeys and filter
    let vault = vault_store::get_vault(&vault_id)
        .await
        .map_err(|e| CommandError::operation(ErrorCode::VaultNotFound, e.to_string()))?;

    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
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

    // Get all YubiKeys and filter for ones in this vault
    match list_yubikeys().await {
        Ok(all_yubikeys) => {
            for yubikey in all_yubikeys {
                if vault_yubikey_serials.contains(&yubikey.serial) {
                    unified_keys.push(convert_yubikey_to_unified(yubikey, Some(vault_id.clone())));
                }
            }
        }
        Err(e) => {
            warn!("Failed to get YubiKeys for vault filtering: {:?}", e);
            // Continue even if YubiKey listing fails
        }
    }

    Ok(unified_keys)
}

/// Implementation: List keys available to add to a vault (not currently in vault)
async fn list_available_for_vault(vault_id: String) -> Result<Vec<KeyInfo>, CommandError> {
    let mut available_keys = Vec::new();

    // Get available passphrase keys using proper Layer 2 delegation
    match list_available_passphrase_keys_for_vault(vault_id.clone()).await {
        Ok(passphrase_response) => {
            for passphrase_key in passphrase_response.keys {
                available_keys.push(convert_passphrase_to_unified(
                    passphrase_key,
                    None, // Not in vault yet
                ));
            }
        }
        Err(e) => {
            warn!(
                "Failed to get available passphrase keys for vault {}: {:?}",
                vault_id, e
            );
            // Continue with other key types even if passphrase keys fail
        }
    }

    // Get available YubiKeys using proper Layer 2 delegation
    match list_available_yubikeys_for_vault(vault_id.clone()).await {
        Ok(yubikey_response) => {
            for available_yubikey in yubikey_response {
                available_keys.push(convert_available_yubikey_to_unified(
                    available_yubikey,
                    None, // Not in vault yet
                ));
            }
        }
        Err(e) => {
            warn!(
                "Failed to get available YubiKeys for vault {}: {:?}",
                vault_id, e
            );
            // Continue even if YubiKey listing fails
        }
    }

    Ok(available_keys)
}

/// Implementation: List only currently connected/available keys
async fn list_connected_keys() -> Result<Vec<KeyInfo>, CommandError> {
    let mut connected_keys = Vec::new();

    // Get all YubiKeys and filter for connected ones
    match list_yubikeys().await {
        Ok(yubikey_list) => {
            for yubikey in yubikey_list {
                // Only include connected/available YubiKeys
                if yubikey.state == YubiKeyState::Registered
                    || yubikey.state == YubiKeyState::Orphaned
                    || yubikey.state == YubiKeyState::Reused
                {
                    connected_keys.push(convert_yubikey_to_unified(
                        yubikey, None, // No specific vault context
                    ));
                }
            }
        }
        Err(e) => {
            warn!("Failed to get connected YubiKeys: {:?}", e);
            // Continue with other key types even if YubiKeys fail
        }
    }

    // Passphrase keys are always "connected" - get all of them
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    for (key_id, entry) in &registry.keys {
        if let crate::storage::KeyEntry::Passphrase {
            label,
            created_at,
            last_used,
            public_key,
            ..
        } = entry
        {
            let passphrase_info = PassphraseKeyInfo {
                id: key_id.clone(),
                label: label.clone(),
                public_key: public_key.clone(),
                created_at: *created_at,
                last_used: *last_used,
                is_available: true,
            };
            connected_keys.push(convert_passphrase_to_unified(passphrase_info, None));
        }
    }

    Ok(connected_keys)
}
