/// Ykman-specific PTY operations for YubiKey management
/// Handles PIN changes, PUK changes, and management key operations
use super::core::{PtyError, Result, run_ykman_command};
use crate::prelude::*;

const DEFAULT_PIN: &str = "123456";
const DEFAULT_PUK: &str = "12345678";
const DEFAULT_MGMT_KEY: &str = "010203040506070801020304050607080102030405060708";

/// Check if YubiKey has default PIN
/// Uses 'ykman piv info' without PIN and parses output for default PIN warnings
#[instrument]
pub fn has_default_pin() -> Result<bool> {
    info!("Checking if YubiKey has default PIN by parsing piv info output");

    // Run 'ykman piv info' without PIN - this doesn't require authentication
    let args = vec!["piv".to_string(), "info".to_string()];

    let output = run_ykman_command(args, None)?;

    // Check output for default PIN/PUK warnings
    let has_default =
        output.contains("Using default PIN!") || output.contains("Using default PUK!");

    info!(
        has_default_credentials = has_default,
        output_preview = %output.lines().take(3).collect::<Vec<_>>().join(" | "),
        "Default PIN check result"
    );

    Ok(has_default)
}

/// Change YubiKey PIN via PTY
#[instrument(skip(old_pin, new_pin))]
pub fn change_pin_pty(old_pin: &str, new_pin: &str) -> Result<()> {
    info!(
        old_pin_type = if old_pin == DEFAULT_PIN {
            "DEFAULT"
        } else {
            "CUSTOM"
        },
        new_pin_type = if new_pin == DEFAULT_PIN {
            "DEFAULT"
        } else {
            "CUSTOM"
        },
        "Changing YubiKey PIN"
    );

    if new_pin.len() < 6 || new_pin.len() > 8 {
        return Err(PtyError::PinFailed(
            "PIN must be 6-8 characters".to_string(),
        ));
    }

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-pin".to_string(),
        "-P".to_string(),
        old_pin.to_string(),
        "-n".to_string(),
        new_pin.to_string(),
    ];

    debug!(command = %args.join(" "), "Executing ykman command");

    match run_ykman_command(args, Some(old_pin)) {
        Ok(output) => {
            info!(output_length = output.len(), "PIN change succeeded");
            Ok(())
        }
        Err(e) => {
            warn!(error = ?e, "PIN change failed");
            Err(e)
        }
    }
}

/// Change YubiKey PUK via PTY
#[instrument(skip(old_puk, new_puk))]
pub fn change_puk_pty(old_puk: &str, new_puk: &str) -> Result<()> {
    info!(
        old_puk_type = if old_puk == DEFAULT_PUK {
            "DEFAULT"
        } else {
            "CUSTOM"
        },
        new_puk_type = if new_puk == DEFAULT_PUK {
            "DEFAULT"
        } else {
            "CUSTOM"
        },
        "Changing YubiKey PUK"
    );

    if new_puk.len() < 6 || new_puk.len() > 8 {
        return Err(PtyError::PinFailed(
            "PUK must be 6-8 characters".to_string(),
        ));
    }

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-puk".to_string(),
        "-p".to_string(),
        old_puk.to_string(),
        "-n".to_string(),
        new_puk.to_string(),
    ];

    debug!(command = %args.join(" "), "Executing ykman command");

    match run_ykman_command(args, None) {
        Ok(output) => {
            info!(output_length = output.len(), "PUK change succeeded");
            Ok(())
        }
        Err(e) => {
            warn!(error = ?e, "PUK change failed");
            Err(e)
        }
    }
}

/// Change management key to TDES with protected mode
#[instrument(skip(pin))]
pub fn change_management_key_pty(pin: &str) -> Result<()> {
    info!("Changing management key to TDES with protected mode");

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-management-key".to_string(),
        "-a".to_string(),
        "tdes".to_string(),
        "-p".to_string(),
        "-g".to_string(),
        "-m".to_string(),
        DEFAULT_MGMT_KEY.to_string(), // Use default management key for authentication
        "-P".to_string(),
        pin.to_string(),
    ];

    debug!(command = %format!("piv access change-management-key -a tdes -p -g -m [REDACTED] -P [REDACTED]"), "Executing ykman command");

    match run_ykman_command(args, Some(pin)) {
        Ok(output) => {
            info!(
                output_length = output.len(),
                "Management key change succeeded"
            );
            Ok(())
        }
        Err(e) => {
            warn!(error = ?e, "Management key change failed");
            Err(e)
        }
    }
}

/// Initialize YubiKey with secure defaults (simplified for retired slots)
#[instrument(skip(new_pin, new_puk))]
pub fn initialize_yubikey(new_pin: &str, new_puk: &str) -> Result<()> {
    info!("Initializing YubiKey with secure defaults");
    debug!(
        new_pin_length = new_pin.len(),
        new_puk_length = new_puk.len(),
        "Credential lengths"
    );

    // Proceed with initialization (YubiKey should be in factory default state)
    info!("Starting YubiKey initialization from default state");

    // Step 1: Change PIN from default
    info!("Step 1: Changing PIN from default...");
    change_pin_pty(DEFAULT_PIN, new_pin)?;
    info!("Step 1 complete: PIN changed successfully");

    // Step 2: Change PUK from default
    info!("Step 2: Changing PUK from default...");
    change_puk_pty(DEFAULT_PUK, new_puk)?;
    info!("Step 2 complete: PUK changed successfully");

    // Step 3: Change management key to TDES with protected mode
    // NOTE: This is required even for retired slots because age-plugin-yubikey
    // checks the management key state and requires TDES+protected mode
    info!("Step 3: Changing management key to TDES with protected mode...");
    change_management_key_pty(new_pin)?;
    info!("Step 3 complete: Management key changed successfully");

    info!("YubiKey initialization complete");
    Ok(())
}

/// Initialize YubiKey with auto-generated recovery code
#[instrument(skip(new_pin))]
pub fn initialize_yubikey_with_recovery(new_pin: &str) -> Result<String> {
    use crate::storage::key_registry::generate_recovery_code;

    info!("Initializing YubiKey with auto-generated recovery code");

    // Generate Base58 recovery code for PUK
    let recovery_code = generate_recovery_code();
    log_sensitive!(dev_only: {
        debug!(
            recovery_code_preview = %&recovery_code[..4],
            recovery_code_length = recovery_code.len(),
            "Generated recovery code (PUK)"
        );
    });

    // Initialize with PIN and recovery code as PUK
    info!("Starting YubiKey initialization sequence...");
    match initialize_yubikey(new_pin, &recovery_code) {
        Ok(_) => {
            info!("YubiKey initialized with recovery code successfully");
            Ok(recovery_code)
        }
        Err(e) => {
            warn!(error = ?e, "Failed to initialize YubiKey");
            Err(e)
        }
    }
}

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

/// Verify YubiKey PIN by accepting the PIN without separate verification
///
/// Unlike passphrase-based keys, YubiKey PIN verification should NOT be performed separately
/// for the following reasons:
///
/// 1. **No idempotent PIN verification method exists**: YubiKey operations like `ykman piv info`
///    don't actually require or verify the PIN - they work without authentication.
///
/// 2. **YubiKey has a 3-attempt lockout mechanism**: Each failed PIN attempt counts against the
///    limit. Performing separate verification wastes attempts and reduces security.
///
/// 3. **PIN verification happens during actual decryption**: When age-plugin-yubikey performs
///    decryption operations, it will properly verify the PIN and provide appropriate error
///    feedback if the PIN is incorrect.
///
/// 4. **Contrast with passphrase approach**: For passphrase-based keys, there's no lockout
///    mechanism, so separate verification makes sense to provide immediate user feedback.
///
/// 5. **Better user experience**: Users get the full 3 PIN attempts for the actual decryption
///    operation, rather than wasting attempts on verification that provides no security benefit.
///
/// The actual PIN verification occurs when age-plugin-yubikey uses the private key for decryption.
/// If the PIN is incorrect, the decryption operation will fail with a clear error message.
#[instrument(skip(pin), fields(serial = %serial))]
pub fn verify_yubikey_pin(serial: &str, pin: &str) -> Result<bool> {
    info!(
        serial = %serial,
        pin_length = pin.len(),
        "Accepting YubiKey PIN - verification will occur during decryption"
    );

    // Always return true for YubiKey PIN verification
    // The actual PIN verification happens during decryption operations
    Ok(true)
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
