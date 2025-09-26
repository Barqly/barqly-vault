//! Streamlined YubiKey API v3 - Centralized Architecture with YubiKeyManager
//!
//! This module provides a clean command interface that leverages the centralized
//! YubiKeyManager for all operations, replacing scattered PTY calls with unified service orchestration.

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::key_management::yubikey::YubiKeyManager;
use crate::prelude::*;
// KeyRegistry operations now handled by YubiKeyManager
// PIN validation now handled by Pin domain object
// tauri removed - command attribute disabled

/// YubiKey state classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum YubiKeyState {
    New,        // Default PIN, no age recipient
    Reused,     // Custom PIN, no Barqly recipient
    Registered, // Has age recipient and manifest entry
    Orphaned,   // Has age recipient but no manifest (needs recovery)
}

/// PIN status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "lowercase")]
pub enum PinStatus {
    Default, // Still using 123456
    Set,     // Custom PIN configured
}

/// YubiKey state information
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<u8>, // Retired slot number (1-20)
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
}

/// YubiKey initialization result for streamlined API
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct StreamlinedYubiKeyInitResult {
    pub serial: String,
    pub slot: u8, // Retired slot number
    pub recipient: String,
    pub identity_tag: String,
    pub label: String,
    pub recovery_code: String, // One-time display to user
}

/// List YubiKeys with intelligent state detection (Refactored with YubiKeyManager)
// Command attribute removed - now using consolidated yubikey_device_commands.rs
// #[tauri::command]
// #[specta::specta]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    info!("Listing YubiKeys with state detection using YubiKeyManager");

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Get list of connected devices using centralized service
    let devices = manager.list_connected_devices().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list YubiKey devices: {e}"),
        )
    })?;

    if devices.is_empty() {
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
        debug!("YubiKey {} in registry: {}", serial.redacted(), in_registry);

        // Check if YubiKey has identity - first check common slots
        let mut has_identity = false;
        let mut identity_result = None;
        let mut identity_tag = None;

        // Check for any existing identity on the YubiKey (single call, any slot)
        match manager.has_identity(serial).await {
            Ok(true) => {
                has_identity = true;
                // Get the existing identity
                if let Ok(Some(identity)) = manager.get_existing_identity(serial).await {
                    identity_result = Some(identity.to_recipient());
                    identity_tag = Some(identity.identity_tag().to_string());
                    info!(
                        "YubiKey {} HAS identity: {}",
                        serial.redacted(),
                        identity.to_recipient()
                    );
                }
            }
            Ok(false) => {
                debug!("YubiKey {} has no identity", serial.redacted());
            }
            Err(e) => {
                debug!(
                    "Error checking identity for YubiKey {}: {}",
                    serial.redacted(),
                    e
                );
            }
        }

        if !has_identity {
            info!(
                "YubiKey {} has NO identity in common slots",
                serial.redacted()
            );
        }

        // Determine state based on registry and identity presence
        let state = match (in_registry, has_identity) {
            (true, true) => {
                info!(
                    "YubiKey {} state: Registered (in registry + has identity)",
                    serial.redacted()
                );
                YubiKeyState::Registered
            }
            (false, true) => {
                info!(
                    "YubiKey {} state: Orphaned (has identity but not in registry)",
                    serial.redacted()
                );
                YubiKeyState::Orphaned
            }
            (true, false) => {
                warn!(
                    "YubiKey {} in registry but no identity found - marking as Reused",
                    serial.redacted()
                );
                YubiKeyState::Reused
            }
            (false, false) => {
                // Check PIN status using centralized service
                let has_default_pin = manager.has_default_pin(serial).await.unwrap_or(true);
                if has_default_pin {
                    info!(
                        "YubiKey {} state: New (default PIN, no identity)",
                        serial.redacted()
                    );
                    YubiKeyState::New
                } else {
                    info!(
                        "YubiKey {} state: Reused (custom PIN, no identity)",
                        serial.redacted()
                    );
                    YubiKeyState::Reused
                }
            }
        };

        // Determine PIN status using centralized service
        let pin_status = if has_identity || in_registry {
            PinStatus::Set
        } else {
            // Actually check if using default PIN
            match manager.has_default_pin(serial).await {
                Ok(true) => PinStatus::Default,
                Ok(false) => PinStatus::Set,
                Err(_) => PinStatus::Default, // Assume default on error
            }
        };

        yubikeys.push(YubiKeyStateInfo {
            serial: serial.value().to_string(),
            state,
            slot: registry_entry.as_ref().map(|(_, _device)| {
                // Default slot for YubiKey age-plugin usage
                1u8
            }),
            recipient: identity_result.or({
                // Device metadata recipients not yet implemented
                None
            }),
            identity_tag: identity_tag.or({
                // Device metadata identity tags not yet implemented
                None
            }),
            label: registry_entry
                .as_ref()
                .map(|(_, device)| device.name.clone())
                .or_else(|| {
                    if has_identity {
                        Some(format!(
                            "YubiKey-{}",
                            &serial.value()[..4.min(serial.value().len())]
                        ))
                    } else {
                        Some(device.name.clone())
                    }
                }),
            pin_status,
        });
    }

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    Ok(yubikeys)
}

/// Initialize a brand new YubiKey (Refactored with YubiKeyManager)
// Command attribute removed - now using consolidated yubikey_device_commands.rs
// #[tauri::command]
// #[specta::specta]
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
    use crate::key_management::yubikey::domain::models::{Pin, Serial};
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
        serial: device.serial.value().to_string(),
        slot: 1, // Default slot for age-plugin-yubikey
        recipient: identity.to_recipient(),
        identity_tag: identity.identity_tag().to_string(),
        label,
        recovery_code, // Return to UI for one-time display
    })
}

/// Register a reused YubiKey (Refactored with YubiKeyManager)
// Command attribute removed - now using consolidated yubikey_device_commands.rs
// #[tauri::command]
// #[specta::specta]
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    info!(
        "Registering reused YubiKey with label {} using YubiKeyManager",
        label
    );

    // Create domain objects for type safety
    use crate::key_management::yubikey::domain::models::{Pin, Serial};
    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    let pin_obj =
        Pin::new(pin).map_err(|e| CommandError::validation(format!("Invalid PIN: {e}")))?;

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // For reused YubiKey, use placeholder recovery code hash
    let recovery_code = "<existing>";
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(recovery_code.as_bytes());
    let recovery_code_hash = format!("{:x}", hasher.finalize());

    // Use centralized manager for registration workflow (reused key = no hardware init)
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
                format!("Failed to register YubiKey through manager: {e}"),
            )
        })?;

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    info!(
        "Successfully registered reused YubiKey: {} with entry ID: {}",
        serial_obj.redacted(),
        entry_id
    );

    Ok(StreamlinedYubiKeyInitResult {
        serial: device.serial.value().to_string(),
        slot: 1, // Default slot for age-plugin-yubikey
        recipient: identity.to_recipient(),
        identity_tag: identity.identity_tag().to_string(),
        label,
        recovery_code: "".to_string(), // Don't expose for reused keys
    })
}

/// Get identities for a specific YubiKey (Refactored with YubiKeyManager)
// Command attribute removed - now using consolidated yubikey_device_commands.rs
// #[tauri::command]
// #[specta::specta]
pub async fn get_identities(serial: String) -> Result<Vec<String>, CommandError> {
    info!(
        "Getting identities for YubiKey {} using YubiKeyManager",
        serial
    );

    // Create domain object for type safety
    use crate::key_management::yubikey::domain::models::Serial;
    let serial_obj = Serial::new(serial.clone())
        .map_err(|e| CommandError::validation(format!("Invalid serial format: {e}")))?;

    // Initialize YubiKey manager
    let manager = YubiKeyManager::new().await.map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to initialize YubiKey manager: {e}"),
        )
    })?;

    // Check for any identities on the YubiKey (single call, any slot)
    let mut identities = Vec::new();
    match manager.get_existing_identity(&serial_obj).await {
        Ok(Some(identity)) => {
            // Convert YubiKeyIdentity to string format for backward compatibility
            let identity_string = format!("{}:{}", serial_obj.value(), identity.identity_tag());
            identities.push(identity_string);
            debug!("Found identity: {}", identity.identity_tag());
        }
        Ok(None) => {
            debug!("No identity found on YubiKey {}", serial_obj.redacted());
        }
        Err(e) => {
            debug!(
                "Error checking identities for YubiKey {}: {}",
                serial_obj.redacted(),
                e
            );
        }
    }

    // Shutdown manager gracefully
    if let Err(e) = manager.shutdown().await {
        warn!("Failed to shutdown YubiKey manager: {}", e);
    }

    if identities.is_empty() {
        return Err(CommandError::operation(
            ErrorCode::YubiKeyNotFound,
            format!("No identities found for YubiKey {}", serial_obj.redacted()),
        ));
    }

    info!(
        "Found {} identities for YubiKey {}",
        identities.len(),
        serial_obj.redacted()
    );
    Ok(identities)
}

// Helper function to extract serial from ykman output
#[allow(dead_code)]
fn extract_serial(device_str: &str) -> String {
    if let Some(pos) = device_str.find("Serial:") {
        let serial_part = &device_str[pos + 7..];
        serial_part
            .split_whitespace()
            .next()
            .unwrap_or("")
            .to_string()
    } else {
        String::new()
    }
}
