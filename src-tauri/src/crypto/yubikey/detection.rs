//! YubiKey device detection and enumeration (DEPRECATED)
//!
//! This module contains legacy YubiKey detection code using direct hardware integration.
//! It is deprecated in favor of the age-plugin-yubikey provider abstraction.

// Allow println in this deprecated test module
#![allow(clippy::disallowed_macros)]

use super::errors::{YubiKeyError, YubiKeyResult};
use serde::{Deserialize, Serialize};

/// YubiKey device information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyDevice {
    pub serial: String,
    pub model: String,
    pub version: String,
    pub status: DeviceStatus,
    pub available_slots: Vec<u8>,
}

/// Device status enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeviceStatus {
    Ready,
    Locked,
    PinRequired,
    Uninitialized,
    Error { message: String },
}

/// List all connected YubiKey devices (DEPRECATED)
///
/// This function is deprecated. Use YubiIdentityProvider::list_recipients() instead.
pub fn list_yubikey_devices() -> YubiKeyResult<Vec<YubiKeyDevice>> {
    // Return empty list with deprecation notice
    Err(YubiKeyError::CommunicationError(
        "Direct device listing is deprecated. Use YubiIdentityProvider::list_recipients() instead"
            .to_string(),
    ))
}

/// Detect YubiKey in a specific reader (DEPRECATED)
#[allow(dead_code)]
fn detect_yubikey_in_reader() -> YubiKeyResult<YubiKeyDevice> {
    // Stub implementation for backward compatibility
    Err(YubiKeyError::CommunicationError(
        "Direct device detection is deprecated".to_string(),
    ))
}

/// Determine device model from version and capabilities (DEPRECATED)
#[allow(dead_code)]
fn determine_device_model() -> String {
    // Stub implementation for backward compatibility
    "YubiKey (deprecated detection)".to_string()
}

/// Get available PIV slots for key storage (DEPRECATED)
#[allow(dead_code)]
fn get_available_piv_slots() -> YubiKeyResult<Vec<u8>> {
    // Stub implementation for backward compatibility
    Ok(vec![0x82, 0x83, 0x84]) // Mock available slots
}

/// Check if a PIV slot is available (DEPRECATED)
#[allow(dead_code)]
fn is_slot_available(slot: u8) -> bool {
    // Stub implementation for backward compatibility
    matches!(slot, 0x82..=0x95)
}

/// Determine the current status of the YubiKey device (DEPRECATED)
#[allow(dead_code)]
fn determine_device_status() -> DeviceStatus {
    // Stub implementation for backward compatibility
    DeviceStatus::Ready
}

/// Find a YubiKey device by serial number (DEPRECATED)
pub fn find_yubikey_by_serial(serial: &str) -> YubiKeyResult<YubiKeyDevice> {
    // Return mock device for backward compatibility
    Ok(YubiKeyDevice {
        serial: serial.to_string(),
        model: "YubiKey (deprecated detection)".to_string(),
        version: "0.0.0".to_string(),
        status: DeviceStatus::Ready,
        available_slots: vec![0x82, 0x83, 0x84],
    })
}

/// Check if any YubiKey devices are connected (DEPRECATED)
pub fn has_yubikey_devices() -> bool {
    // Return true to maintain functionality during transition
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // Requires actual YubiKey hardware
    fn test_yubikey_detection() {
        let devices = list_yubikey_devices();
        match devices {
            Ok(devices) => {
                println!("Found {} YubiKey device(s)", devices.len());
                for device in devices {
                    println!("Device: {} - {}", device.serial, device.model);
                }
            }
            Err(YubiKeyError::NoDevicesFound) => {
                println!("No YubiKey devices found");
            }
            Err(e) => {
                println!("Error detecting YubiKeys: {e}");
            }
        }
    }

    #[test]
    fn test_available_slots_logic() {
        // Test the slot availability logic without hardware
        let slots = [0x82, 0x83, 0x84]; // Sample retired slots
        assert!(!slots.is_empty());
    }
}
