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
use crate::prelude::*;
use crate::services::key_management::shared::domain::models::KeyState;
use crate::services::key_management::shared::{KeyEntry, KeyManager};
use crate::services::vault;
use serde::{Deserialize, Serialize};

// Re-export domain types for commands
pub use crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo;
pub use crate::services::key_management::shared::domain::models::KeyType;
pub use crate::services::key_management::shared::domain::models::key_reference::{
    KeyInfo, KeyListFilter, YubiKeyInfo,
};
pub use crate::services::key_management::yubikey::domain::models::{
    available_yubikey::AvailableYubiKey,
    state::{PinStatus, YubiKeyState},
    yubikey_state_info::YubiKeyStateInfo,
};

// Conversion functions to transform Layer 2 types to unified types

/// Convert PassphraseKeyInfo to unified KeyInfo
pub fn convert_passphrase_to_unified(
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
pub fn convert_yubikey_to_unified(
    yubikey_key: YubiKeyStateInfo,
    vault_id: Option<String>,
) -> KeyInfo {
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
            firmware_version: yubikey_key.firmware_version.clone(), // Real firmware version from registry/device
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
pub fn convert_available_yubikey_to_unified(
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
            pin_status: PinStatus::Custom, // Simplified for available keys
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

    let manager = KeyManager::new();
    manager
        .list_keys(filter)
        .await
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))
}

/// Simple test command to verify the unified API works
#[tauri::command]
#[specta::specta]
pub async fn test_unified_keys() -> Result<String, CommandError> {
    Ok("Unified key API is working!".to_string())
}

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
    pub keys: Vec<crate::services::key_management::shared::domain::models::KeyReference>,
}

/// Get all keys for a vault - wrapper around unified API
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn get_vault_keys(input: GetVaultKeysRequest) -> CommandResponse<GetVaultKeysResponse> {
    debug!(vault_id = %input.vault_id, "get_vault_keys called");

    // Delegate to unified API for actual implementation
    match list_unified_keys(KeyListFilter::ForVault(input.vault_id.clone())).await {
        Ok(unified_keys) => {
            // Convert from unified KeyInfo to vault KeyReference
            let key_refs: Vec<crate::services::key_management::shared::domain::models::KeyReference> = unified_keys
                .into_iter()
                .map(|key_info| crate::services::key_management::shared::domain::models::KeyReference {
                    id: key_info.id,
                    key_type: match key_info.key_type {
                        KeyType::Passphrase { key_id } => {
                            crate::services::key_management::shared::domain::models::KeyType::Passphrase { key_id }
                        }
                        KeyType::YubiKey {
                            serial,
                            firmware_version,
                        } => crate::services::key_management::shared::domain::models::KeyType::YubiKey {
                            serial,
                            firmware_version,
                        },
                    },
                    label: key_info.label,
                    state: match key_info.state {
                        crate::services::key_management::shared::domain::models::KeyState::Active => crate::services::key_management::shared::domain::models::KeyState::Active,
                        crate::services::key_management::shared::domain::models::KeyState::Registered => crate::services::key_management::shared::domain::models::KeyState::Registered,
                        crate::services::key_management::shared::domain::models::KeyState::Orphaned => crate::services::key_management::shared::domain::models::KeyState::Orphaned,
                    },
                    created_at: chrono::DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                        .unwrap()
                        .with_timezone(&chrono::Utc), // TODO: Get real timestamp
                    last_used: None,
                })
                .collect();

            info!(
                vault_id = %input.vault_id,
                keys_count = key_refs.len(),
                "Returning vault keys from unified API"
            );
            Ok(GetVaultKeysResponse {
                vault_id: input.vault_id,
                keys: key_refs,
            })
        }
        Err(e) => {
            error!(vault_id = %input.vault_id, error = ?e, "Failed to get vault keys");
            Err(Box::new(CommandError {
                code: ErrorCode::VaultNotFound,
                message: format!("Failed to get vault keys: {:?}", e),
                details: None,
                recovery_guidance: Some("Check vault ID and try again".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            }))
        }
    }
}

// Key management operations moved from vault/ domain to proper key_management/ domain

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

/// Remove a key from a vault - delegates to KeyRegistryService
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_id = %input.key_id))]
pub async fn remove_key_from_vault(
    input: RemoveKeyFromVaultRequest,
) -> CommandResponse<RemoveKeyFromVaultResponse> {
    info!(
        vault_id = %input.vault_id,
        key_id = %input.key_id,
        "Removing key from vault"
    );

    let manager = KeyManager::new();

    manager
        .detach_key_from_vault(&input.key_id, &input.vault_id)
        .await
        .map(|_| RemoveKeyFromVaultResponse { success: true })
        .map_err(|e| {
            error!(
                vault_id = %input.vault_id,
                key_id = %input.key_id,
                error = %e,
                "Failed to remove key from vault"
            );
            Box::new(CommandError {
                code: ErrorCode::InternalError,
                message: format!("Failed to remove key from vault: {}", e),
                details: None,
                recovery_guidance: Some("Check vault and key IDs".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            })
        })
}

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

/// Update a key's label - delegates to KeyRegistryService
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_id = %input.key_id))]
pub async fn update_key_label(
    input: UpdateKeyLabelRequest,
) -> CommandResponse<UpdateKeyLabelResponse> {
    // Validate input
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

    info!(
        vault_id = %input.vault_id,
        key_id = %input.key_id,
        new_label = %input.new_label,
        "Updating key label"
    );

    let manager = KeyManager::new();

    // Get existing key entry
    let mut entry = manager.get_key(&input.key_id).map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::KeyNotFound,
            message: format!("Key not found: {}", e),
            details: None,
            recovery_guidance: Some("Check key ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Update label based on key type
    match &mut entry {
        KeyEntry::Passphrase { label, .. } => {
            *label = input.new_label.trim().to_string();
        }
        KeyEntry::Yubikey { label, .. } => {
            *label = input.new_label.trim().to_string();
        }
    }

    // Save updated entry
    manager.update_key(&input.key_id, entry).map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: format!("Failed to update key label: {}", e),
            details: None,
            recovery_guidance: Some("Try again or check system logs".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    // Update vault timestamp
    let mut vault = vault::load_vault(&input.vault_id).await.map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::VaultNotFound,
            message: format!("Vault not found: {}", e),
            details: None,
            recovery_guidance: Some("Check vault ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })
    })?;

    vault.updated_at = chrono::Utc::now();
    vault::save_vault(&vault).await.map_err(|e| {
        Box::new(CommandError {
            code: ErrorCode::InternalError,
            message: format!("Failed to save vault: {}", e),
            details: None,
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })
    })?;

    Ok(UpdateKeyLabelResponse { success: true })
}
