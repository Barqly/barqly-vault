//! Basic key operations for vaults
//!
//! Commands for getting, adding, and removing keys from vaults.

use crate::models::KeyReference;
use crate::prelude::*;

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

    // Direct delegation to unified key API (no VaultManager for key operations)
    use crate::commands::key_management::unified_keys::{KeyListFilter, list_unified_keys};

    match list_unified_keys(KeyListFilter::ForVault(input.vault_id.clone())).await {
        Ok(unified_keys) => {
            // Convert from unified KeyInfo to vault KeyReference
            let key_refs: Vec<KeyReference> = unified_keys
                .into_iter()
                .map(|key_info| KeyReference {
                    id: key_info.id,
                    key_type: match key_info.key_type {
                        crate::commands::key_management::unified_keys::KeyType::Passphrase {
                            key_id,
                        } => crate::models::KeyType::Passphrase { key_id },
                        crate::commands::key_management::unified_keys::KeyType::YubiKey {
                            serial,
                            firmware_version,
                        } => crate::models::KeyType::Yubikey {
                            serial,
                            firmware_version,
                        },
                    },
                    label: key_info.label,
                    state: match key_info.state {
                        crate::models::KeyState::Active => crate::models::KeyState::Active,
                        crate::models::KeyState::Registered => crate::models::KeyState::Registered,
                        crate::models::KeyState::Orphaned => crate::models::KeyState::Orphaned,
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

/// Add a key to a vault
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id, key_type = %input.key_type))]
pub async fn add_key_to_vault(
    input: AddKeyToVaultRequest,
) -> CommandResponse<AddKeyToVaultResponse> {
    // This generic function is deprecated - use specialized functions instead
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
    // TODO: Move this to key_management domain
    // For now, implement directly without VaultManager to avoid duplication
    let mut vault = match crate::storage::vault_store::load_vault(&input.vault_id).await {
        Ok(v) => v,
        Err(_) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::VaultNotFound,
                message: format!("Vault '{}' not found", input.vault_id),
                details: None,
                recovery_guidance: Some("Check vault ID".to_string()),
                user_actionable: true,
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
            recovery_guidance: Some("Check key ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Save updated vault
    match crate::storage::vault_store::save_vault(&vault).await {
        Ok(_) => Ok(RemoveKeyFromVaultResponse { success: true }),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to save vault".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Check storage system".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}
