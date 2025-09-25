//! Passphrase key integration for vault system
//!
//! This module handles the integration between passphrase key generation
//! and the vault system, ensuring proper key creation and storage.

use crate::commands::crypto::{GenerateKeyInput, generate_key};
use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::models::{KeyReference, KeyState, KeyType};
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// Enhanced add key to vault request with passphrase support
#[derive(Debug, Deserialize, specta::Type)]
pub struct AddPassphraseKeyRequest {
    pub vault_id: String,
    pub label: String,
    pub passphrase: String,
}

/// Response after adding a passphrase key
#[derive(Debug, Serialize, specta::Type)]
pub struct AddPassphraseKeyResponse {
    pub key_reference: KeyReference,
    pub public_key: String,
}

/// Add a passphrase key to a vault with actual key generation
#[tauri::command]
#[specta::specta]
pub async fn add_passphrase_key_to_vault(
    input: AddPassphraseKeyRequest,
) -> CommandResponse<AddPassphraseKeyResponse> {
    // Validate vault exists
    let mut vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load key registry to check if vault already has a passphrase key
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let has_passphrase = vault.keys.iter().any(|key_id| {
        if let Some(entry) = registry.get_key(key_id) {
            matches!(entry, crate::storage::KeyEntry::Passphrase { .. })
        } else {
            false
        }
    });

    if has_passphrase {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "Vault already has a passphrase key",
            )
            .with_recovery_guidance(
                "Each vault can only have one passphrase key. Remove the existing one first.",
            ),
        ));
    }

    // Generate the actual encryption key
    let key_input = GenerateKeyInput {
        label: input.label.clone(),
        passphrase: input.passphrase,
    };

    let key_result = generate_key(key_input).await?;

    // Add key to registry first
    let mut registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let key_registry_id = generate_key_reference_id();

    let registry_entry = crate::storage::KeyEntry::Passphrase {
        label: input.label.clone(),
        created_at: Utc::now(),
        last_used: None,
        public_key: key_result.public_key.clone(),
        key_filename: input.label.clone(), // Store label only (path functions add .agekey.enc)
    };

    registry
        .register_key(key_registry_id.clone(), registry_entry)
        .map_err(|e| {
            Box::new(
                CommandError::operation(ErrorCode::StorageFailed, e)
                    .with_recovery_guidance("Failed to add key to registry"),
            )
        })?;

    registry.save().map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save key registry"),
        )
    })?;

    // Create key reference for response
    let key_reference = KeyReference {
        id: key_registry_id.clone(),
        key_type: KeyType::Passphrase {
            key_id: key_result.key_id.clone(),
        },
        label: input.label,
        state: KeyState::Active,
        created_at: Utc::now(),
        last_used: None,
    };

    // Add key ID to vault
    vault.add_key_id(key_registry_id).map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::InvalidInput, e)
                .with_recovery_guidance("Failed to add key to vault"),
        )
    })?;

    // Save updated vault
    vault_store::save_vault(&vault).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save vault"),
        )
    })?;

    Ok(AddPassphraseKeyResponse {
        key_reference,
        public_key: key_result.public_key,
    })
}

/// Check if a passphrase key exists and is valid
#[tauri::command]
#[specta::specta]
pub async fn validate_vault_passphrase_key(vault_id: String) -> CommandResponse<bool> {
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load key registry to check for active passphrase keys
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let has_active_passphrase = vault.keys.iter().any(|key_id| {
        if let Some(entry) = registry.get_key(key_id) {
            matches!(entry, crate::storage::KeyEntry::Passphrase { .. })
            // Note: All keys in registry are considered active by default
            // State tracking could be added later if needed
        } else {
            false
        }
    });

    Ok(has_active_passphrase)
}

/// Update the existing add_key_to_vault to use this for passphrases
pub async fn enhanced_add_key_to_vault(
    vault_id: String,
    key_type: String,
    label: String,
    metadata: Option<serde_json::Value>,
) -> CommandResponse<KeyReference> {
    // If it's a passphrase type with passphrase in metadata, use the integrated function
    if key_type == "passphrase" {
        if let Some(meta) = metadata
            && let Some(passphrase) = meta.get("passphrase").and_then(|p| p.as_str())
        {
            let request = AddPassphraseKeyRequest {
                vault_id,
                label,
                passphrase: passphrase.to_string(),
            };

            let result = add_passphrase_key_to_vault(request).await?;
            return Ok(result.key_reference);
        }

        return Err(Box::new(
            CommandError::validation("Passphrase required for passphrase key type")
                .with_recovery_guidance("Provide passphrase in metadata"),
        ));
    }

    // For YubiKey, return placeholder until YubiKey integration is complete
    let mut vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let key_ref = KeyReference {
        id: generate_key_reference_id(),
        key_type: KeyType::Yubikey {
            serial: metadata
                .as_ref()
                .and_then(|m| m.get("serial"))
                .and_then(|s| s.as_str())
                .unwrap_or("pending")
                .to_string(),
            firmware_version: None, // TODO: Get firmware version from device
        },
        label,
        state: KeyState::Registered,
        created_at: Utc::now(),
        last_used: None,
    };

    vault.add_key_id(key_ref.id.clone()).map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::InvalidInput, e)
                .with_recovery_guidance("Failed to add key to vault"),
        )
    })?;
    vault_store::save_vault(&vault).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save vault"),
        )
    })?;

    Ok(key_ref)
}

/// Generate a unique key reference ID
fn generate_key_reference_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..8).map(|_| rng.r#gen()).collect();
    format!("keyref_{}", bs58::encode(random_bytes).into_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_passphrase_key_generation_id() {
        let id1 = generate_key_reference_id();
        let id2 = generate_key_reference_id();

        assert!(id1.starts_with("keyref_"));
        assert!(id2.starts_with("keyref_"));
        assert_ne!(id1, id2);
    }
}

// Tests are in passphrase_integration_tests.rs
// Uncomment when ready to run integration tests
// #[cfg(test)]
// #[path = "passphrase_integration_tests.rs"]
// mod passphrase_integration_tests;
