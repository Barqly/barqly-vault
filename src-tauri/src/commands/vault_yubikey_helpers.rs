//! Helper functions for vault-specific YubiKey operations
//!
//! This module contains reusable logic for vault operations to keep
//! the main command functions thin and focused.

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::key_management::yubikey::YubiKeyManager;
use crate::models::{KeyReference, KeyState, KeyType};
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;
use sha2::{Digest, Sha256};

/// Helper to initialize YubiKeyManager with proper error handling
pub async fn create_yubikey_manager() -> Result<YubiKeyManager, Box<CommandError>> {
    YubiKeyManager::new().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to create YubiKey manager: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connection and system state"),
        )
    })
}

/// Helper to validate vault exists and load it
pub async fn load_vault(vault_id: &str) -> Result<crate::models::Vault, Box<CommandError>> {
    vault_store::get_vault(vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })
}

/// Parameters for registering a YubiKey in vault
pub struct RegisterYubiKeyParams {
    pub serial: String,
    pub label: String,
    pub identity: crate::key_management::yubikey::domain::models::YubiKeyIdentity,
    pub device: crate::key_management::yubikey::domain::models::YubiKeyDevice,
    pub recovery_code_hash: String,
    pub key_state: KeyState,
}

/// Helper to add YubiKey entry to registry and vault
pub async fn register_yubikey_in_vault(
    mut vault: crate::models::Vault,
    mut registry: KeyRegistry,
    params: RegisterYubiKeyParams,
) -> Result<(KeyReference, String), Box<CommandError>> {
    let key_registry_id = registry.add_yubikey_entry(
        params.label.clone(),
        params.serial.clone(),
        1u8,  // YubiKey retired slot number (not UI display slot)
        82u8, // PIV slot 82 (first retired slot)
        params.identity.to_recipient().to_string(),
        params.identity.identity_tag().to_string(),
        params.device.firmware_version.clone(),
        params.recovery_code_hash.clone(),
    );

    registry.save().map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save key registry"),
        )
    })?;

    // Add key ID to vault
    vault.add_key_id(key_registry_id.clone()).map_err(|e| {
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

    let key_reference = KeyReference {
        id: key_registry_id,
        label: params.label,
        state: params.key_state,
        key_type: KeyType::Yubikey {
            serial: params.serial,
            firmware_version: params.device.firmware_version.clone(),
        },
        created_at: Utc::now(),
        last_used: None,
    };

    Ok((key_reference, params.recovery_code_hash))
}

/// Helper to check for duplicate YubiKey in vault
pub fn check_duplicate_yubikey_in_vault(
    vault: &crate::models::Vault,
    registry: &KeyRegistry,
    serial: &str,
) -> Result<(), Box<CommandError>> {
    if vault.keys.iter().any(|key_id| {
        matches!(
            registry.get_key(key_id),
            Some(crate::storage::KeyEntry::Yubikey { serial: existing_serial, .. })
            if existing_serial == serial
        )
    }) {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey is already registered in this vault",
            )
            .with_recovery_guidance("Use a different YubiKey or remove the existing one"),
        ));
    }
    Ok(())
}

/// Helper to generate recovery code placeholder
pub fn generate_recovery_placeholder(key: &str) -> String {
    format!("{:x}", Sha256::digest(key.as_bytes()))
}
