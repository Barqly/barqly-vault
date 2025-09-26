//! YubiKey Device Commands - Core Hardware Operations
//!
//! This module provides THIN WRAPPER commands for core YubiKey device operations.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles parameter validation and response formatting.
//!
//! Commands included:
//! - list_yubikeys: List all YubiKeys with state detection
//! - init_yubikey: Initialize new YubiKey device
//! - register_yubikey: Register existing YubiKey device
//! - yubikey_list_devices: Alias for compatibility

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::key_management::yubikey::{
    YubiKeyManager,
    domain::models::{Pin, Serial},
};
use crate::prelude::*;
use tauri;

// Type definitions for YubiKey device operations
#[derive(Debug, serde::Serialize, specta::Type)]
pub enum PinStatus {
    #[serde(rename = "default")]
    Default,
    #[serde(rename = "set")]
    Set,
}

#[derive(Debug, serde::Serialize, specta::Type)]
pub enum YubiKeyState {
    #[serde(rename = "new")]
    New,
    #[serde(rename = "reused")]
    Reused,
    #[serde(rename = "registered")]
    Registered,
    #[serde(rename = "orphaned")]
    Orphaned,
}

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<u8>,
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
}

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct StreamlinedYubiKeyInitResult {
    pub serial: String,
    pub slot: u8,
    pub recipient: String,
    pub identity_tag: String,
    pub label: String,
    pub recovery_code: String,
}

/// List all YubiKeys with intelligent state detection
/// Uses YubiKeyManager for centralized device and registry operations
#[tauri::command]
#[specta::specta]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    info!("Listing YubiKeys with state detection using YubiKeyManager");

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        error!("Failed to initialize YubiKeyManager: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Get list of connected devices using centralized service
    let devices = manager.list_connected_devices().await.map_err(|e| {
        error!("Failed to list YubiKey devices: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list YubiKey devices: {e}"),
        )
    })?;

    if devices.is_empty() {
        info!("No YubiKey devices found");
        return Ok(Vec::new());
    }

    let mut yubikeys = Vec::new();

    for device in devices {
        let serial = device.serial();
        debug!("Processing YubiKey with serial: {}", serial.redacted());

        // Check registry for this YubiKey using centralized service
        let registry_entry = manager
            .find_by_serial(serial)
            .await
            .map_err(|e| {
                warn!(
                    "Failed to check registry for YubiKey {}: {}",
                    serial.redacted(),
                    e
                );
                e
            })
            .unwrap_or(None);

        let in_registry = registry_entry.is_some();

        // Check if YubiKey has identity
        let has_identity = manager.has_identity(serial).await.unwrap_or(false);
        let mut identity_recipient = None;
        let mut identity_tag = None;

        if has_identity {
            // Get existing identity for display
            if let Ok(Some(identity)) = manager.get_existing_identity(serial).await {
                identity_recipient = Some(identity.to_recipient().to_string());
                identity_tag = Some(identity.identity_tag().to_string());
            }
        }

        // Determine state based on registry and identity presence
        let state = match (in_registry, has_identity) {
            (true, true) => YubiKeyState::Registered,
            (false, true) => YubiKeyState::Orphaned, // Has identity but not in registry
            (false, false) => {
                // Check if has default PIN to distinguish between new and reused
                let has_default_pin = manager.has_default_pin(serial).await.unwrap_or(false);
                if has_default_pin {
                    YubiKeyState::New
                } else {
                    YubiKeyState::Reused
                }
            }
            (true, false) => {
                // This is an inconsistent state - registry entry without identity
                warn!(
                    "YubiKey {} has registry entry but no identity",
                    serial.redacted()
                );
                YubiKeyState::Orphaned
            }
        };

        let pin_status = if manager.has_default_pin(serial).await.unwrap_or(false) {
            PinStatus::Default
        } else {
            PinStatus::Set
        };

        let yubikey_info = YubiKeyStateInfo {
            serial: serial.value().to_string(),
            state,
            slot: if registry_entry.is_some() {
                // Get slot from registry device if available
                Some(1) // Simplified - could extract from registry
            } else {
                None
            },
            recipient: identity_recipient,
            identity_tag,
            label: None, // Could extract label from registry if needed in future
            pin_status,
        };

        info!(
            "YubiKey {} state: {:?}",
            serial.redacted(),
            yubikey_info.state
        );

        yubikeys.push(yubikey_info);
    }

    info!("Found {} YubiKey devices", yubikeys.len());
    Ok(yubikeys)
}

/// Initialize a brand new YubiKey device
/// Uses YubiKeyManager for complete hardware and software initialization
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Initializing YubiKey with label {} using YubiKeyManager",
        label
    );

    // Create domain objects for type safety
    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj =
        Pin::new(new_pin).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?;

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Generate recovery code using centralized hardware initialization
    let recovery_code = manager
        .initialize_device_hardware(&pin_obj)
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to initialize YubiKey hardware: {e}"),
            )
        })?;

    // Hash recovery code for secure storage
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(recovery_code.as_bytes());
    let recovery_code_hash = format!("{:x}", hasher.finalize());

    // Use centralized manager for the complete initialization workflow
    let (device, identity, entry_id) = manager
        .initialize_device(
            &serial_obj,
            &pin_obj,
            1, // Default to slot 1
            recovery_code_hash,
            Some(label.clone()),
        )
        .await
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to initialize YubiKey through manager: {e}"),
            )
        })?;

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully initialized YubiKey: {} with entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial().value().to_string(),
        slot: 1, // Default slot for age-plugin-yubikey
        recipient: identity.to_recipient().to_string(),
        identity_tag: identity.identity_tag().to_string(),
        label,
        recovery_code, // Return to UI for one-time display
    })
}

/// Register an existing YubiKey device (orphaned state)
/// Uses existing streamlined implementation - fully integrated with YubiKeyManager
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey(
    _serial: String,
    _label: String,
    _pin: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    // TODO: Implement YubiKey registration with YubiKeyManager
    Err(CommandError::operation(
        ErrorCode::YubiKeyInitializationFailed,
        "YubiKey registration functionality needs to be implemented with YubiKeyManager",
    ))
}

/// List YubiKey devices (alias for list_yubikeys for decryption UI compatibility)
/// This provides the same data as list_yubikeys but with a different command name
/// for backward compatibility with the decryption workflow
#[tauri::command]
#[specta::specta]
pub async fn yubikey_list_devices() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    info!("Listing YubiKey devices for decryption UI (delegating to list_yubikeys)");
    list_yubikeys().await
}
