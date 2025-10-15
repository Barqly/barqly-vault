//! Key Attachment Commands
//!
//! Commands for attaching orphaned keys to vaults (R2 API)

use crate::services::key_management::shared::application::manager::KeyManager;
use crate::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

/// Request to attach a key to a vault
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AttachKeyToVaultRequest {
    /// The key ID to attach
    pub key_id: String,
    /// The vault ID to attach to
    pub vault_id: String,
}

/// Response from key attachment
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct AttachKeyToVaultResponse {
    pub success: bool,
    pub message: String,
    pub key_id: String,
    pub vault_id: String,
}

/// Attach an orphaned key to a vault
///
/// This command allows attaching any orphaned key (passphrase or YubiKey) to a vault.
/// It validates the key state, checks vault limits, and updates both registry and manifest.
#[tauri::command]
#[specta::specta]
pub async fn attach_key_to_vault(
    request: AttachKeyToVaultRequest,
) -> CommandResponse<AttachKeyToVaultResponse> {
    debug!(
        key_id = %request.key_id,
        vault_id = %request.vault_id,
        "Attempting to attach key to vault"
    );

    // Validate input
    if request.key_id.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Key ID cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid key ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    if request.vault_id.is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Vault ID cannot be empty".to_string(),
            details: None,
            recovery_guidance: Some("Provide a valid vault ID".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Use KeyManager to attach the key
    let manager = KeyManager::new();

    match manager
        .attach_key_to_vault(&request.key_id, &request.vault_id)
        .await
    {
        Ok(()) => {
            info!(
                key_id = %request.key_id,
                vault_id = %request.vault_id,
                "Successfully attached key to vault"
            );

            Ok(AttachKeyToVaultResponse {
                success: true,
                message: format!("Key '{}' successfully attached to vault", request.key_id),
                key_id: request.key_id,
                vault_id: request.vault_id,
            })
        }
        Err(e) => {
            error!(
                key_id = %request.key_id,
                vault_id = %request.vault_id,
                error = %e,
                "Failed to attach key to vault"
            );

            // Determine error type and user guidance
            let error_str = e.to_string();
            let (code, recovery_guidance) = if error_str.contains("not found") {
                (
                    ErrorCode::KeyNotFound,
                    Some("Verify the key ID and vault ID are correct".to_string()),
                )
            } else if error_str.contains("maximum number of keys") {
                (
                    ErrorCode::VaultKeyLimitExceeded,
                    Some("Remove an existing key before adding a new one".to_string()),
                )
            } else if error_str.contains("already attached") {
                (
                    ErrorCode::KeyAlreadyExists,
                    Some("This key is already attached to the vault".to_string()),
                )
            } else if error_str.contains("cannot be attached") {
                (
                    ErrorCode::InvalidKeyState,
                    Some("Key is in a state that doesn't allow attachment".to_string()),
                )
            } else {
                (
                    ErrorCode::UnknownError,
                    Some("Check key and vault status and try again".to_string()),
                )
            };

            Err(Box::new(CommandError {
                code,
                message: format!("Failed to attach key: {}", e),
                details: Some(error_str),
                recovery_guidance,
                user_actionable: true,
                trace_id: None,
                span_id: None,
            }))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        let request = AttachKeyToVaultRequest {
            key_id: "".to_string(),
            vault_id: "vault-123".to_string(),
        };
        assert!(request.key_id.is_empty());

        let request = AttachKeyToVaultRequest {
            key_id: "key-123".to_string(),
            vault_id: "".to_string(),
        };
        assert!(request.vault_id.is_empty());

        let request = AttachKeyToVaultRequest {
            key_id: "key-123".to_string(),
            vault_id: "vault-123".to_string(),
        };
        assert!(!request.key_id.is_empty());
        assert!(!request.vault_id.is_empty());
    }
}
