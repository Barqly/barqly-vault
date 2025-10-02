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
use crate::prelude::*;
use crate::services::key_management::yubikey::{
    YubiKeyManager,
    domain::models::{Pin, Serial},
};
use tauri;

// Re-export domain types
pub use crate::services::key_management::yubikey::domain::models::{
    state::{PinStatus, YubiKeyState},
    yubikey_state_info::YubiKeyStateInfo,
};

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
    info!("Listing YubiKeys with state detection");

    // Delegate to YubiKeyManager - logic moved to service layer
    let manager = YubiKeyManager::new().await.map_err(|e| {
        error!("Failed to initialize YubiKeyManager: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    manager.list_yubikeys_with_state().await.map_err(|e| {
        error!("Failed to list YubiKeys: {}", e);
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list YubiKeys: {e}"),
        )
    })
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
