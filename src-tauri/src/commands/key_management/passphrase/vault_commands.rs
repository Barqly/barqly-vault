use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::services::key_management::passphrase::PassphraseManager;
use crate::services::key_management::shared::KeyRegistry;
use crate::services::key_management::shared::domain::models::KeyReference;
use chrono::{DateTime, Utc};
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

#[derive(Debug, Serialize, specta::Type)]
pub struct PassphraseKeyInfo {
    pub id: String,
    pub label: String,
    pub public_key: String,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub is_available: bool,
}

#[derive(Debug, Serialize, specta::Type)]
pub struct ListPassphraseKeysResponse {
    pub keys: Vec<PassphraseKeyInfo>,
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

#[tauri::command]
#[specta::specta]
pub async fn list_passphrase_keys_for_vault(
    vault_id: String,
) -> CommandResponse<ListPassphraseKeysResponse> {
    // Use VaultManager for vault operations (not direct vault_store)
    let manager = crate::services::vault::VaultManager::new();
    let vault = manager.get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let registry = KeyRegistry::load().map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::ConfigurationError, e.to_string())
                .with_recovery_guidance("Check system configuration"),
        )
    })?;

    let mut passphrase_keys = Vec::new();

    for key_id in &vault.keys {
        if let Some(crate::services::key_management::shared::KeyEntry::Passphrase {
            label,
            created_at,
            last_used,
            public_key,
            ..
        }) = registry.get_key(key_id)
        {
            passphrase_keys.push(PassphraseKeyInfo {
                id: key_id.clone(),
                label: label.clone(),
                public_key: public_key.clone(),
                created_at: *created_at,
                last_used: *last_used,
                is_available: true, // Passphrase keys are always available
            });
        }
    }

    Ok(ListPassphraseKeysResponse {
        keys: passphrase_keys,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn list_available_passphrase_keys_for_vault(
    vault_id: String,
) -> CommandResponse<ListPassphraseKeysResponse> {
    // First verify vault exists
    // Use VaultManager for vault operations (not direct vault_store)
    let manager = crate::services::vault::VaultManager::new();
    let vault = manager.get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let registry = KeyRegistry::load().map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::ConfigurationError, e.to_string())
                .with_recovery_guidance("Check system configuration"),
        )
    })?;

    // Get all passphrase keys that are NOT in this vault
    let vault_key_ids: std::collections::HashSet<String> = vault.keys.iter().cloned().collect();
    let mut available_keys = Vec::new();

    for (key_id, entry) in registry.keys.iter() {
        if let crate::services::key_management::shared::KeyEntry::Passphrase {
            label,
            created_at,
            last_used,
            public_key,
            ..
        } = entry
        {
            // Only include if not already in this vault
            if !vault_key_ids.contains(key_id) {
                available_keys.push(PassphraseKeyInfo {
                    id: key_id.clone(),
                    label: label.clone(),
                    public_key: public_key.clone(),
                    created_at: *created_at,
                    last_used: *last_used,
                    is_available: true, // Passphrase keys are always available
                });
            }
        }
    }

    Ok(ListPassphraseKeysResponse {
        keys: available_keys,
    })
}
