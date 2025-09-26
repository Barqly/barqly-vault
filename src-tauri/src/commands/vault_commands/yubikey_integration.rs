//! YubiKey vault integration commands
//!
//! This module provides THIN WRAPPER commands for YubiKey-vault integration.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles vault-specific concerns like registry updates.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::key_management::yubikey::{
    application::manager::YubiKeyManager,
    domain::models::{Pin, Serial},
};
use crate::models::{KeyReference, KeyState, KeyType};
use crate::prelude::*;
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
// use tauri::command; // Unused after command consolidation

// Removed display slot logic - frontend handles display order based on manifest

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
    pub key_reference: KeyReference,
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
// OLD IMPLEMENTATION - DEPRECATED
// #[command]
// #[specta::specta]
// #[instrument(skip(input))]
pub async fn init_yubikey_for_vault_old(
    input: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    info!(
        serial = %redact_serial(&input.serial),
        vault_id = input.vault_id,
        "init_yubikey_for_vault called"
    );

    // Validate vault exists
    let mut vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load registry to check for existing YubiKey in this vault
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    if vault.keys.iter().any(|key_id| {
        matches!(
            registry.get_key(key_id),
            Some(crate::storage::KeyEntry::Yubikey { serial, .. }) if serial == &input.serial
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

    // ALL YubiKey logic delegated to DDD YubiKeyManager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to create YubiKey manager: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connection and system state"),
        )
    })?;

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

    // Generate recovery code hash for storage
    let recovery_placeholder = format!("{:x}", Sha256::digest(b"vault-recovery"));

    // Delegate ALL YubiKey operations to YubiKeyManager
    let slot = 1u8; // Default PIV slot for key generation

    info!(
        "About to call manager.initialize_device with serial={}, slot={}",
        redact_serial(&input.serial),
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

    // VAULT-SPECIFIC LOGIC: Add to registry and vault
    let mut registry = registry; // We already loaded it
    let key_registry_id = registry.add_yubikey_entry(
        input.label.clone(),
        input.serial.clone(),
        1u8,  // YubiKey retired slot number (not UI display slot)
        82u8, // PIV slot 82 (first retired slot)
        identity.to_recipient().to_string(),
        identity.identity_tag().to_string(),
        device.firmware_version.clone(),
        recovery_code_hash.clone(),
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
        key_type: KeyType::Yubikey {
            serial: input.serial.clone(),
            firmware_version: device.firmware_version.clone(),
        },
        label: input.label,
        state: KeyState::Active,
        created_at: Utc::now(),
        last_used: None,
    };

    Ok(YubiKeyVaultResult {
        success: true,
        key_reference,
        recovery_code_hash,
    })
}

/// Register an existing YubiKey with a vault
// #[command]
// #[specta::specta]
// #[instrument(skip(input))]
pub async fn register_yubikey_for_vault_old(
    input: RegisterYubiKeyForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    debug!(
        serial = %redact_serial(&input.serial),
        vault_id = input.vault_id,
        "register_yubikey_for_vault called"
    );

    // Removed display index validation - backend no longer handles UI positioning

    // Get the vault
    let mut vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load registry to check for conflicts
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());

    // Removed display index conflict checking - backend no longer handles UI positioning

    // ALL YubiKey logic delegated to DDD YubiKeyManager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to create YubiKey manager: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connection"),
        )
    })?;

    let serial = Serial::new(input.serial.clone()).map_err(|e| {
        Box::new(
            CommandError::validation(format!("Invalid serial format: {e}"))
                .with_recovery_guidance("Ensure serial number is valid"),
        )
    })?;

    // Check if YubiKey exists and get its state via YubiKeyManager
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

    // Check if YubiKey has an identity (not NEW)
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

    // For ORPHANED YubiKeys, we need to get the existing identity
    // This is still YubiKey logic but necessary for registration
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

    // VAULT-SPECIFIC LOGIC: Add to registry
    let mut registry = registry; // We already loaded it
    let recovery_placeholder = format!("{:x}", Sha256::digest(b"registered-key"));
    let key_registry_id = registry.add_yubikey_entry(
        input.label.clone(),
        input.serial.clone(),
        1u8,  // YubiKey retired slot number (not UI display slot)
        82u8, // PIV slot 82 (first retired slot)
        identity.to_recipient().to_string(),
        identity.identity_tag().to_string(),
        device.firmware_version.clone(),
        recovery_placeholder.clone(),
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
        key_type: KeyType::Yubikey {
            serial: input.serial.clone(),
            firmware_version: device.firmware_version.clone(),
        },
        label: input.label,
        state: KeyState::Registered,
        created_at: Utc::now(),
        last_used: None,
    };

    Ok(YubiKeyVaultResult {
        success: true,
        key_reference,
        recovery_code_hash: recovery_placeholder,
    })
}

/// List available YubiKeys for vault registration
// #[tauri::command]
// #[specta::specta]
// #[instrument]
pub async fn list_available_yubikeys_for_vault_old(
    vault_id: String,
) -> CommandResponse<Vec<AvailableYubiKey>> {
    debug!(
        vault_id = vault_id,
        "list_available_yubikeys_for_vault called"
    );

    // Get vault and registry to filter out already registered YubiKeys
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let vault_serials: std::collections::HashSet<String> = vault
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

    // ALL YubiKey detection logic delegated to DDD YubiKeyManager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to create YubiKey manager: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connection"),
        )
    })?;

    let devices = manager.list_connected_devices().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to list YubiKey devices: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connections"),
        )
    })?;

    // Filter out devices already in this vault and check identity status
    let mut available = Vec::new();
    for device in devices {
        let serial_str = device.serial().value().to_string();

        // Skip if already in vault
        if vault_serials.contains(&serial_str) {
            continue;
        }

        // Check if device has identity
        let has_identity = manager.has_identity(device.serial()).await.unwrap_or(false);

        available.push(AvailableYubiKey {
            serial: serial_str,
            state: if has_identity {
                "orphaned".to_string()
            } else {
                "new".to_string()
            },
            slot: None,                        // Will be assigned during registration
            recipient: None,                   // TODO: Get from identity if exists
            identity_tag: None,                // TODO: Get from identity if exists
            label: None,                       // No label until registered
            pin_status: "unknown".to_string(), // Simplified for now
        });
    }

    debug!(
        available_count = available.len(),
        vault_id = vault_id,
        "Returning available YubiKeys for vault"
    );

    Ok(available)
}

/// Check which KeyMenuBar display positions are available in a vault
// #[tauri::command]
// #[specta::specta]
// #[instrument]
pub async fn check_keymenubar_positions_available_old(
    vault_id: String,
) -> CommandResponse<Vec<bool>> {
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());

    // Check positions 0, 1, 2 for YubiKeys (position after passphrase slot)
    let mut available = vec![true, true, true];

    for key_id in &vault.keys {
        if let Some(entry) = registry.get_key(key_id)
            && let crate::storage::KeyEntry::Yubikey { slot, .. } = entry
            && *slot < 3
        {
            available[*slot as usize] = false;
        }
    }

    Ok(available)
}
