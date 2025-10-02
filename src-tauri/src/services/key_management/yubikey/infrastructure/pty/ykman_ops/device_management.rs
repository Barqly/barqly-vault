/// Device management operations for YubiKey
/// Handles device info, listing, and firmware queries
use super::super::core::{PtyError, Result, run_ykman_command};
use crate::prelude::*;

/// Get YubiKey serial number
#[instrument]
pub fn get_yubikey_serial() -> Result<String> {
    debug!("Getting YubiKey serial number");

    let args = vec!["info".to_string()];
    let output = run_ykman_command(args, None)?;

    // Parse serial from output
    // Looking for line like "Serial: 12345678"
    for line in output.lines() {
        if line.contains("Serial:")
            && let Some(serial) = line.split("Serial:").nth(1)
        {
            let serial = serial.trim();
            debug!(serial = %redact_serial(serial), "Found YubiKey serial");
            return Ok(serial.to_string());
        }
    }

    Err(PtyError::PtyOperation(
        "Could not find serial in ykman output".to_string(),
    ))
}

/// Get YubiKey PIV info
#[instrument(skip(pin))]
pub fn get_piv_info(pin: &str) -> Result<String> {
    info!("Getting YubiKey PIV info");

    let args = vec!["piv".to_string(), "info".to_string()];

    let output = run_ykman_command(args, Some(pin))?;
    Ok(output)
}

/// Extract firmware version from PIV info output
#[instrument]
pub fn get_firmware_version(pin: &str) -> Result<String> {
    info!("Getting YubiKey firmware version");

    let piv_info = get_piv_info(pin)?;

    // Parse firmware version from PIV info output
    // Looking for line like "PIV version:              5.7.1"
    for line in piv_info.lines() {
        if line.contains("PIV version:")
            && let Some(version) = line.split("PIV version:").nth(1)
        {
            let version = version.trim();
            debug!(firmware_version = %version, "Found YubiKey firmware version");
            return Ok(version.to_string());
        }
    }

    warn!("Could not find firmware version in PIV info output");
    Err(PtyError::PtyOperation(
        "Could not find firmware version in ykman piv info output".to_string(),
    ))
}

/// List YubiKey devices
#[instrument]
pub fn list_yubikeys() -> Result<Vec<String>> {
    debug!("Listing YubiKey devices");

    let args = vec!["list".to_string()];
    let output = run_ykman_command(args, None)?;

    let mut devices = Vec::new();
    for line in output.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            devices.push(trimmed.to_string());
        }
    }

    debug!(device_count = devices.len(), "Found YubiKey devices");
    Ok(devices)
}

/// Reset YubiKey PIV (for testing and recovery)
/// WARNING: This erases ALL PIV data including keys and certificates
#[instrument]
pub fn reset_piv() -> Result<()> {
    warn!("Resetting YubiKey PIV - this will erase all PIV data!");

    let args = vec![
        "piv".to_string(),
        "reset".to_string(),
        "-f".to_string(), // Force flag
    ];

    run_ykman_command(args, None)?;

    info!("YubiKey PIV reset complete");
    Ok(())
}
