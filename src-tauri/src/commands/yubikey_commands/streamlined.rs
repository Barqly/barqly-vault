//! Streamlined YubiKey API v2 - Using PTY automation from POC
//!
//! This module implements the intelligent state detection and simplified API
//! using the proven PTY automation from the POC.

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::crypto::yubikey::manifest::YubiKeyManifest;
use crate::crypto::yubikey::pty::{
    age_operations::{generate_age_identity_pty, get_identity_for_serial, list_yubikey_identities},
    ykman_operations::{initialize_yubikey_with_recovery, list_yubikeys as list_yk_devices},
};
use age::secrecy::{ExposeSecret, SecretString};
use log::{debug, info, warn};
use serde::{Deserialize, Serialize};
use tauri::command;

/// YubiKey state classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum YubiKeyState {
    New,        // Default PIN, no age recipient
    Reused,     // Custom PIN, no Barqly recipient
    Registered, // Has age recipient and manifest entry
    Orphaned,   // Has age recipient but no manifest (needs recovery)
}

/// PIN status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PinStatus {
    Default, // Still using 123456
    Set,     // Custom PIN configured
}

/// YubiKey state information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyStateInfo {
    pub serial: String,
    pub state: YubiKeyState,
    pub slot: Option<u8>, // Retired slot number (1-20)
    pub recipient: Option<String>,
    pub identity_tag: Option<String>,
    pub label: Option<String>,
    pub pin_status: PinStatus,
}

/// YubiKey initialization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyInitResult {
    pub serial: String,
    pub slot: u8, // Retired slot number
    pub recipient: String,
    pub identity_tag: String,
    pub label: String,
    pub recovery_code: String, // One-time display to user
}

/// List YubiKeys with intelligent state detection
#[command]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    info!("Listing YubiKeys with state detection");

    // Load manifest first
    let manifest = YubiKeyManifest::load().unwrap_or_else(|e| {
        warn!("Failed to load YubiKey manifest: {e}");
        YubiKeyManifest::new()
    });

    // Get list of connected YubiKeys
    let devices = list_yk_devices().map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list YubiKey devices: {e}"),
        )
    })?;

    if devices.is_empty() {
        return Ok(Vec::new());
    }

    // Get existing age identities
    let identities = list_yubikey_identities().unwrap_or_else(|_| Vec::new());

    let mut yubikeys = Vec::new();

    for device in devices {
        // Extract serial from device string (format: "YubiKey 5 NFC (5.4.3) Serial: 12345678")
        let serial = extract_serial(&device);
        if serial.is_empty() {
            continue;
        }

        // Check manifest for this YubiKey
        let manifest_entry = manifest.find_by_serial(&serial);

        // Check if this YubiKey has an age identity
        let has_identity = identities.iter().any(|id| id.contains(&serial));

        // Determine state based on manifest and identity presence
        let state = match (manifest_entry.is_some(), has_identity) {
            (true, true) => YubiKeyState::Registered, // In manifest and has identity
            (false, true) => YubiKeyState::Orphaned,  // Has identity but not in manifest
            (true, false) => {
                // In manifest but no identity found - might be disconnected/reset
                warn!("YubiKey {serial} in manifest but no identity found");
                YubiKeyState::Reused
            }
            (false, false) => {
                // Check PIN status to determine if new or reused
                // For now, assume new (in production, would check with ykman)
                YubiKeyState::New
            }
        };

        // Simplified PIN status detection
        let pin_status = if has_identity || manifest_entry.is_some() {
            PinStatus::Set
        } else {
            PinStatus::Default
        };

        yubikeys.push(YubiKeyStateInfo {
            serial: serial.clone(),
            state,
            slot: manifest_entry.as_ref().map(|e| e.slot),
            recipient: manifest_entry
                .as_ref()
                .map(|e| e.recipient.clone())
                .or_else(|| identities.iter().find(|id| id.contains(&serial)).cloned()),
            identity_tag: manifest_entry.as_ref().map(|e| e.identity_tag.clone()),
            label: manifest_entry
                .as_ref()
                .map(|e| e.label.clone())
                .or_else(|| {
                    if has_identity {
                        Some(format!("YubiKey-{}", &serial[..4.min(serial.len())]))
                    } else {
                        None
                    }
                }),
            pin_status,
        });
    }

    Ok(yubikeys)
}

/// Initialize a brand new YubiKey
#[command]
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    label: String,
) -> Result<YubiKeyInitResult, CommandError> {
    debug!("Initializing YubiKey with label {label}");

    // Wrap PIN in SecretString for security
    let pin = SecretString::from(new_pin);

    // Validate PIN
    let pin_str = pin.expose_secret();
    if pin_str.len() < 6 || pin_str.len() > 8 {
        return Err(CommandError::validation("PIN must be 6-8 digits"));
    }

    if !pin_str.chars().all(char::is_numeric) {
        return Err(CommandError::validation("PIN must contain only digits"));
    }

    // Initialize YubiKey with auto-generated recovery code
    let recovery_code = initialize_yubikey_with_recovery(pin_str).map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to initialize YubiKey: {e}"),
        )
    })?;

    // Generate age identity (uses first available retired slot)
    let recipient =
        generate_age_identity_pty(pin.expose_secret(), "cached", &label).map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to generate age identity: {e}"),
            )
        })?;

    // Get the identity tag for manifest
    let identity_tag = get_identity_for_serial(&serial)
        .unwrap_or_else(|_| format!("AGE-PLUGIN-YUBIKEY-{}", &serial[..6.min(serial.len())]));

    // Save to manifest
    let mut manifest = YubiKeyManifest::load().unwrap_or_else(|_| YubiKeyManifest::new());

    manifest
        .register_yubikey(
            serial.clone(),
            1, // Default to slot 1 (will be actual slot from age-plugin)
            recipient.clone(),
            identity_tag.clone(),
            label.clone(),
            &recovery_code,
        )
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to save YubiKey manifest: {e}"),
            )
        })?;

    debug!("Successfully initialized YubiKey");

    Ok(YubiKeyInitResult {
        serial,
        slot: 1, // Will be updated with actual slot from age-plugin-yubikey output
        recipient,
        identity_tag,
        label,
        recovery_code, // Return to UI for one-time display
    })
}

/// Register a reused YubiKey
#[command]
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: String,
) -> Result<YubiKeyInitResult, CommandError> {
    debug!("Registering reused YubiKey with label {label}");

    // Wrap PIN in SecretString for security
    let pin_secret = SecretString::from(pin);

    // Validate PIN
    let pin_str = pin_secret.expose_secret();
    if pin_str.len() < 6 || pin_str.len() > 8 {
        return Err(CommandError::validation("PIN must be 6-8 digits"));
    }

    if !pin_str.chars().all(char::is_numeric) {
        return Err(CommandError::validation("PIN must contain only digits"));
    }

    // Generate age identity (no init needed, YubiKey already configured)
    let recipient = generate_age_identity_pty(pin_str, "cached", &label).map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyInitializationFailed,
            format!("Failed to generate age identity: {e}"),
        )
    })?;

    // Get the identity tag for manifest
    let identity_tag = get_identity_for_serial(&serial)
        .unwrap_or_else(|_| format!("AGE-PLUGIN-YUBIKEY-{}", &serial[..6.min(serial.len())]));

    // For reused YubiKey, generate recovery code placeholder
    let recovery_code = "<existing>".to_string();

    // Save to manifest
    let mut manifest = YubiKeyManifest::load().unwrap_or_else(|_| YubiKeyManifest::new());

    manifest
        .register_yubikey(
            serial.clone(),
            1, // Default to slot 1
            recipient.clone(),
            identity_tag.clone(),
            label.clone(),
            &recovery_code,
        )
        .map_err(|e| {
            CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("Failed to save YubiKey manifest: {e}"),
            )
        })?;

    debug!("Successfully registered YubiKey");

    Ok(YubiKeyInitResult {
        serial,
        slot: 1,
        recipient,
        identity_tag,
        label,
        recovery_code: "".to_string(), // Don't expose for reused keys
    })
}

/// Get identities for a specific YubiKey
#[command]
pub async fn get_identities(serial: String) -> Result<Vec<String>, CommandError> {
    info!("Getting identities for YubiKey {serial}");

    let identities = list_yubikey_identities().map_err(|e| {
        CommandError::operation(
            ErrorCode::YubiKeyCommunicationError,
            format!("Failed to list identities: {e}"),
        )
    })?;

    // Filter identities for this serial
    let filtered: Vec<String> = identities
        .into_iter()
        .filter(|id| id.contains(&serial))
        .collect();

    if filtered.is_empty() {
        return Err(CommandError::operation(
            ErrorCode::YubiKeyNotFound,
            format!("No identities found for YubiKey {serial}"),
        ));
    }

    Ok(filtered)
}

// Helper function to extract serial from ykman output
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
