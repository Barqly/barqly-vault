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
use crate::commands::vault_yubikey_helpers::{
    create_yubikey_manager, load_vault, register_yubikey_in_vault,
    check_duplicate_yubikey_in_vault, generate_recovery_placeholder
};
use crate::key_management::yubikey::domain::models::{Pin, Serial};
use crate::models::{KeyState};
use crate::prelude::*;
use crate::storage::{KeyRegistry, vault_store};
// use tauri::command; // Using #[tauri::command] instead

// Type definitions for YubiKey vault operations
use serde::{Deserialize, Serialize};

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
    pub key_reference: crate::models::KeyReference,
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
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
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
        input.serial.clone(),
        input.label.clone(),
        identity,
        device,
        recovery_code_hash,
        KeyState::Active,
    ).await?;

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
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());

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
        input.serial.clone(),
        input.label,
        identity,
        device,
        recovery_placeholder,
        KeyState::Registered,
    ).await?;

    info!("Successfully registered YubiKey for vault");

    Ok(YubiKeyVaultResult {
        success: true,
        key_reference,
        recovery_code_hash,
    })
}

/// List available YubiKeys for vault registration
/// Delegates to YubiKeyManager and filters for vault compatibility
#[tauri::command]
#[specta::specta]
pub async fn list_available_yubikeys_for_vault(
    vault_id: String,
) -> CommandResponse<Vec<AvailableYubiKey>> {
    info!("Listing available YubiKeys for vault: {}", vault_id);

    // Get vault and collect already registered serials
    let vault = load_vault(&vault_id).await?;
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

    // List available devices
    let manager = create_yubikey_manager().await?;
    let devices = manager.list_connected_devices().await.map_err(|e| {
        Box::new(
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to list YubiKey devices: {e}"),
            )
            .with_recovery_guidance("Check YubiKey connections"),
        )
    })?;

    // Filter and categorize available devices
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

    info!(
        "Found {} available YubiKeys for vault {}",
        available.len(),
        vault_id
    );

    Ok(available)
}

/// Check which KeyMenuBar display positions are available in a vault
/// This is a legacy display helper - frontend should handle positioning
#[tauri::command]
#[specta::specta]
pub async fn check_keymenubar_positions_available(vault_id: String) -> CommandResponse<Vec<bool>> {
    info!("Checking KeyMenuBar positions for vault: {}", vault_id);

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
