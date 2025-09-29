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

    // Simple delegation to VaultManager (eliminates 80+ LOC of duplicate logic)
    let manager = crate::services::vault::VaultManager::new();
    match manager.get_vault_keys(&input.vault_id).await {
        Ok(keys) => {
            info!(
                vault_id = %input.vault_id,
                keys_count = keys.len(),
                "Returning vault keys from VaultManager"
            );
            Ok(GetVaultKeysResponse {
                vault_id: input.vault_id,
                keys,
            })
        }
        Err(e) => {
            error!(vault_id = %input.vault_id, error = ?e, "Failed to get vault keys");
            Err(Box::new(CommandError {
                code: ErrorCode::VaultNotFound,
                message: e.to_string(),
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
    // Simple delegation to VaultManager
    let manager = crate::services::vault::VaultManager::new();
    match manager
        .remove_key_from_vault(&input.vault_id, &input.key_id)
        .await
    {
        Ok(_) => Ok(RemoveKeyFromVaultResponse { success: true }),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::vault::domain::VaultError::NotFound(_) => ErrorCode::VaultNotFound,
                crate::services::vault::domain::VaultError::KeyNotFound(_) => {
                    ErrorCode::KeyNotFound
                }
                _ => ErrorCode::StorageFailed,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check vault and key IDs".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}
