use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::key_management::passphrase::PassphraseManager;
use crate::models::KeyReference;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, specta::Type)]
pub struct AddPassphraseKeyRequest {
    pub vault_id: String,
    pub label: String,
    pub passphrase: String,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct AddPassphraseKeyResponse {
    pub key_reference: KeyReference,
    pub public_key: String,
}

#[tauri::command]
#[specta::specta]
pub async fn add_passphrase_key_to_vault(
    input: AddPassphraseKeyRequest,
) -> CommandResponse<AddPassphraseKeyResponse> {
    let manager = PassphraseManager::new();

    let generated = manager
        .generate_key(&input.label, &input.passphrase)
        .map_err(|e| {
            Box::new(
                CommandError::operation(ErrorCode::EncryptionFailed, e.to_string())
                    .with_recovery_guidance("Check passphrase strength and try again"),
            )
        })?;

    let key_reference = manager
        .add_key_to_vault(
            &input.vault_id,
            generated.key_id.clone(),
            input.label,
            generated.public_key.clone(),
        )
        .await
        .map_err(|e| {
            Box::new(
                CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                    .with_recovery_guidance("Ensure the vault exists"),
            )
        })?;

    Ok(AddPassphraseKeyResponse {
        key_reference,
        public_key: generated.public_key,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn validate_vault_passphrase_key(vault_id: String) -> CommandResponse<bool> {
    let manager = PassphraseManager::new();

    manager
        .validate_vault_has_passphrase_key(&vault_id)
        .await
        .map_err(|e| {
            Box::new(
                CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                    .with_recovery_guidance("Ensure the vault exists"),
            )
        })
}