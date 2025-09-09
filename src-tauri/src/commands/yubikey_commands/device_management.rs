//! YubiKey device management commands using provider abstraction

use crate::commands::command_types::CommandError;
use crate::crypto::yubikey::{list_yubikey_devices, YubiIdentityProviderFactory, YubiKeyDevice};
use serde::{Deserialize, Serialize};
use tauri::command;

/// List all available YubiKey recipients using age-plugin-yubikey
///
/// Returns information about YubiKey recipients available through age-plugin-yubikey,
/// converted to the legacy YubiKeyDevice format for compatibility.
///
/// # Returns
/// Vector of YubiKeyDevice containing device information
///
/// # Errors
/// - `YubiKeyNotFound` if no devices are connected
/// - `PluginExecutionFailed` if age-plugin-yubikey fails
#[command]
pub async fn yubikey_list_devices() -> Result<Vec<YubiKeyDevice>, CommandError> {
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    match provider.list_recipients().await {
        Ok(recipients) => {
            let devices: Vec<YubiKeyDevice> = recipients
                .into_iter()
                .map(|recipient| YubiKeyDevice {
                    serial: recipient.serial,
                    model: "YubiKey (age-plugin-yubikey)".to_string(),
                    version: "age-plugin".to_string(),
                    status: crate::crypto::yubikey::detection::DeviceStatus::Ready,
                    available_slots: vec![recipient.slot],
                })
                .collect();

            // Log device discovery for debugging
            crate::logging::log_info(&format!(
                "Found {} YubiKey recipient(s) via age-plugin-yubikey",
                devices.len()
            ));

            for device in &devices {
                crate::logging::log_debug(&format!(
                    "YubiKey recipient: {} - {}",
                    device.serial, device.model
                ));
            }

            Ok(devices)
        }
        Err(e) => {
            crate::logging::log_warn(&format!("Failed to list YubiKey recipients: {e}"));
            // Fall back to legacy implementation for transition period
            match list_yubikey_devices() {
                Ok(devices) => Ok(devices),
                Err(_) => Ok(Vec::new()), // Return empty list rather than error
            }
        }
    }
}

/// Check if YubiKey devices are available using age-plugin-yubikey
///
/// Quick check to determine if YubiKey recipients are available through
/// age-plugin-yubikey without returning detailed device information.
///
/// # Returns
/// Boolean indicating if YubiKey devices are available
#[command]
pub async fn yubikey_devices_available() -> Result<bool, CommandError> {
    let provider = match YubiIdentityProviderFactory::create_default() {
        Ok(provider) => provider,
        Err(_) => return Ok(false), // Return false if provider creation fails
    };

    match provider.test_connectivity().await {
        Ok(_) => {
            // Test if we can list recipients
            match provider.list_recipients().await {
                Ok(recipients) => Ok(!recipients.is_empty()),
                Err(_) => Ok(false), // No recipients available
            }
        }
        Err(_) => Ok(false), // Connection test failed
    }
}

/// Get detailed information about a specific YubiKey device
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey device
///
/// # Returns
/// YubiKeyDevice with detailed information about the specified device
///
/// # Errors
/// - `YubiKeyNotFound` if the specified device is not found
/// - `YubiKeyCommunicationError` if unable to communicate with the device
#[command]
pub async fn yubikey_get_device_info(serial: String) -> Result<YubiKeyDevice, CommandError> {
    let device = crate::crypto::yubikey::detection::find_yubikey_by_serial(&serial)
        .map_err(CommandError::from)?;

    crate::logging::log_debug(&format!(
        "Retrieved info for YubiKey: {} - {}",
        device.serial, device.model
    ));

    Ok(device)
}

/// Test YubiKey connectivity using age-plugin-yubikey
///
/// # Arguments
/// * `serial` - The serial number of the YubiKey device to test
/// * `pin` - The PIN for the YubiKey device (used for validation only)
///
/// # Returns
/// Success indicator and any relevant status information
///
/// # Errors
/// - `YubiKeyNotFound` if the specified device is not found
/// - `PluginExecutionFailed` if age-plugin-yubikey fails
/// - `YubiKeyCommunicationError` if unable to communicate with the device
#[command]
pub async fn yubikey_test_connection(
    serial: String,
    pin: String,
) -> Result<YubiKeyConnectionTest, CommandError> {
    // Validate PIN format first
    let manager = crate::crypto::yubikey::YubiKeyManager::new();
    if let Err(e) = manager.validate_pin(&pin) {
        return Ok(YubiKeyConnectionTest {
            serial,
            status: YubiKeyConnectionStatus::Failed {
                reason: format!("Invalid PIN format: {e}"),
            },
            tested_at: chrono::Utc::now(),
        });
    }

    // Test provider connectivity
    let provider = YubiIdentityProviderFactory::create_default().map_err(CommandError::from)?;

    let status = match provider.test_connectivity().await {
        Ok(_) => {
            // Check if we can find recipients for this serial
            match provider.list_recipients().await {
                Ok(recipients) => {
                    let has_matching_recipient = recipients
                        .iter()
                        .any(|r| r.serial == serial || serial.is_empty());

                    if has_matching_recipient {
                        crate::logging::log_info(&format!(
                            "YubiKey {serial} age-plugin-yubikey connection test successful"
                        ));
                        YubiKeyConnectionStatus::Success
                    } else {
                        crate::logging::log_warn(&format!(
                            "YubiKey {serial} not found in age-plugin-yubikey recipients"
                        ));
                        YubiKeyConnectionStatus::Failed {
                            reason: "YubiKey not found in age-plugin-yubikey recipients"
                                .to_string(),
                        }
                    }
                }
                Err(e) => {
                    crate::logging::log_warn(&format!(
                        "YubiKey {serial} recipient listing failed: {e}"
                    ));
                    YubiKeyConnectionStatus::Failed {
                        reason: format!("Failed to list recipients: {e}"),
                    }
                }
            }
        }
        Err(e) => {
            crate::logging::log_warn(&format!(
                "YubiKey {serial} age-plugin-yubikey connectivity test failed: {e}"
            ));
            YubiKeyConnectionStatus::Failed {
                reason: format!("age-plugin-yubikey connectivity failed: {e}"),
            }
        }
    };

    Ok(YubiKeyConnectionTest {
        serial,
        status,
        tested_at: chrono::Utc::now(),
    })
}

/// Result of YubiKey connection test
#[derive(Debug, Serialize, Deserialize)]
pub struct YubiKeyConnectionTest {
    pub serial: String,
    pub status: YubiKeyConnectionStatus,
    pub tested_at: chrono::DateTime<chrono::Utc>,
}

/// Status of YubiKey connection test
#[derive(Debug, Serialize, Deserialize)]
pub enum YubiKeyConnectionStatus {
    Success,
    Failed { reason: String },
}
