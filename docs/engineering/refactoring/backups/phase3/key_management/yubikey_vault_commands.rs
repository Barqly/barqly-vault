//! Vault YubiKey Integration Commands
//!
//! This module provides THIN WRAPPER commands for YubiKey-vault integration.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles vault-specific concerns like registry updates.
//!
//! Commands included:
//! - init_yubikey_for_vault: Initialize YubiKey and add to vault
//! - register_yubikey_for_vault: Register existing YubiKey to vault
//! - list_available_yubikeys_for_vault: List YubiKeys available for vault
//! - check_keymenubar_positions_available: Check vault display positions

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::prelude::*;
use crate::services::key_management::shared::KeyRegistry;
use crate::services::key_management::shared::domain::models::{KeyReference, KeyState, KeyType};
use crate::services::key_management::yubikey::YubiKeyManager;
use crate::services::key_management::yubikey::domain::models::{Pin, Serial};
use crate::services::vault;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri;

// Helper functions for vault operations
/// Parameters for registering a YubiKey in vault
struct RegisterYubiKeyParams {
    serial: String,
    label: String,
    identity: crate::services::key_management::yubikey::domain::models::YubiKeyIdentity,
    device: crate::services::key_management::yubikey::domain::models::YubiKeyDevice,
    recovery_code_hash: String,
    key_state: KeyState,
}

/// Helper to initialize YubiKeyManager with proper error handling
async fn create_yubikey_manager() -> Result<YubiKeyManager, Box<CommandError>> {
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
async fn load_vault(
    vault_id: &str,
) -> Result<crate::services::vault::domain::models::Vault, Box<CommandError>> {
    vault::get_vault(vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })
}

/// Helper to add YubiKey entry to registry and vault
async fn register_yubikey_in_vault(
    mut vault: crate::services::vault::domain::models::Vault,
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

    vault::save_vault(&vault).await.map_err(|e| {
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
fn check_duplicate_yubikey_in_vault(
    vault: &crate::services::vault::domain::models::Vault,
    registry: &KeyRegistry,
    serial: &str,
) -> Result<(), Box<CommandError>> {
    if vault.keys.iter().any(|key_id| {
        matches!(
            registry.get_key(key_id),
            Some(crate::services::key_management::shared::KeyEntry::Yubikey { serial: existing_serial, .. })
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
fn generate_recovery_placeholder(key: &str) -> String {
    format!("{:x}", Sha256::digest(key.as_bytes()))
}

// Type definitions for YubiKey vault operations

/// YubiKey initialization parameters for vault
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyInitForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
}

/// YubiKey registration parameters for vault
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct RegisterYubiKeyForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
}

/// Result from YubiKey operations
#[derive(Debug, Serialize, specta::Type)]
pub struct YubiKeyVaultResult {
    pub success: bool,
    pub key_reference: crate::services::key_management::shared::domain::models::KeyReference,
    pub recovery_code_hash: String,
}

/// Available YubiKey for vault registration - matches frontend YubiKeyStateInfo
#[derive(Debug, Serialize, specta::Type)]
pub struct AvailableYubiKey {
    pub serial: String,
    pub state: String, // "new", "orphaned", "registered", "reused"
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: String, // For now, simplified
}

/// Initialize a new YubiKey and add it to a vault
/// Delegates YubiKey operations to YubiKeyManager, handles vault integration
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey_for_vault(
    input: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    info!(
        "Initializing YubiKey for vault: {} -> {}",
        &input.serial[..8.min(input.serial.len())],
        input.vault_id
    );

    // Validate vault and check for duplicates
    let vault = load_vault(&input.vault_id).await?;
    let registry = crate::services::key_management::shared::KeyManager::new()
        .load_registry()
        .unwrap_or_else(|_| KeyRegistry::new());
    check_duplicate_yubikey_in_vault(&vault, &registry, &input.serial)?;

    // Initialize YubiKey manager and create domain objects
    let manager = create_yubikey_manager().await?;
    let serial = Serial::new(input.serial.clone()).map_err(|e| {
        Box::new(
            CommandError::validation(format!("Invalid serial format: {e}"))
                .with_recovery_guidance("Ensure serial number is valid"),
        )
    })?;

    let pin = Pin::new(input.pin.clone()).map_err(|e| {
        Box::new(
            CommandError::validation(format!("Invalid PIN format: {e}"))
                .with_recovery_guidance("Ensure PIN is valid"),
        )
    })?;

    // Initialize YubiKey device
    let recovery_placeholder = generate_recovery_placeholder("vault-recovery");
    let slot = 1u8; // Default PIV slot for key generation

    info!(
        "About to call manager.initialize_device with serial={}, slot={}",
        serial.redacted(),
        slot
    );

    let (device, identity, recovery_code_hash) = manager
        .initialize_device(
            &serial,
            &pin,
            slot,
            recovery_placeholder.clone(),
            Some(input.label.clone()),
        )
        .await
        .map_err(|e| {
            error!("initialize_device failed with error: {}", e);
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyInitializationFailed,
                    format!("Failed to initialize YubiKey: {e}"),
                )
                .with_recovery_guidance("Check YubiKey state and try again"),
            )
        })?;

    info!("initialize_device completed successfully");

    // Add to vault using helper
    let (key_reference, recovery_code_hash) = register_yubikey_in_vault(
        vault,
        registry,
        RegisterYubiKeyParams {
            serial: input.serial.clone(),
            label: input.label.clone(),
            identity,
            device,
            recovery_code_hash,
            key_state: KeyState::Active,
        },
    )
    .await?;

    info!("Successfully initialized YubiKey and added to vault");

    Ok(YubiKeyVaultResult {
        success: true,
        key_reference,
        recovery_code_hash,
    })
}

/// Register an existing YubiKey with a vault
/// Delegates YubiKey operations to YubiKeyManager, handles vault integration
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey_for_vault(
    input: RegisterYubiKeyForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    info!(
        "Registering YubiKey for vault: {} -> {}",
        &input.serial[..8.min(input.serial.len())],
        input.vault_id
    );

    // Validate vault exists
    let vault = load_vault(&input.vault_id).await?;
    let registry = crate::services::key_management::shared::KeyManager::new()
        .load_registry()
        .unwrap_or_else(|_| KeyRegistry::new());

    // Initialize YubiKey manager and validate device
    let manager = create_yubikey_manager().await?;
    let serial = Serial::new(input.serial.clone()).map_err(|e| {
        Box::new(
            CommandError::validation(format!("Invalid serial format: {e}"))
                .with_recovery_guidance("Ensure serial number is valid"),
        )
    })?;

    // Validate device exists and has identity
    let device = manager
        .detect_device(&serial)
        .await
        .map_err(|e| {
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyNotFound,
                    format!("Failed to detect YubiKey: {e}"),
                )
                .with_recovery_guidance("Ensure YubiKey is connected"),
            )
        })?
        .ok_or_else(|| {
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyNotFound,
                    "YubiKey not found or not connected",
                )
                .with_recovery_guidance("Ensure YubiKey is connected"),
            )
        })?;

    let has_identity = manager.has_identity(&serial).await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to check YubiKey identity: {e}"),
            )
            .with_recovery_guidance("Check YubiKey state"),
        )
    })?;

    if !has_identity {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey needs to be initialized first - it has no age identity",
            )
            .with_recovery_guidance("Use init_yubikey_for_vault for new YubiKeys"),
        ));
    }

    // Get existing identity
    let pin = Pin::new(input.pin.clone()).map_err(|e| {
        Box::new(
            CommandError::validation(format!("Invalid PIN format: {e}"))
                .with_recovery_guidance("Ensure PIN is valid"),
        )
    })?;

    let identity = manager
        .generate_identity(&serial, &pin, 1u8) // Get existing identity from slot 1
        .await
        .map_err(|e| {
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyInitializationFailed,
                    format!("Failed to get YubiKey identity: {e}"),
                )
                .with_recovery_guidance("Check YubiKey state and PIN"),
            )
        })?;

    // Add to vault using helper
    let recovery_placeholder = generate_recovery_placeholder("registered-key");
    let (key_reference, recovery_code_hash) = register_yubikey_in_vault(
        vault,
        registry,
        RegisterYubiKeyParams {
            serial: input.serial.clone(),
            label: input.label,
            identity,
            device,
            recovery_code_hash: recovery_placeholder,
            key_state: KeyState::Registered,
        },
    )
    .await?;

    info!("Successfully registered YubiKey for vault");

    Ok(YubiKeyVaultResult {
        success: true,
        key_reference,
        recovery_code_hash,
    })
}
