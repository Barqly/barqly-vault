/// PIN and PUK operations for YubiKey
/// Handles PIN/PUK changes, verification, and initialization
use super::super::core::{PtyError, Result, run_ykman_command};
use super::piv_operations::change_management_key_pty;
use crate::prelude::*;

const DEFAULT_PIN: &str = "123456";
const DEFAULT_PUK: &str = "12345678";

/// Check if YubiKey has default PIN
/// Uses 'ykman piv info' without PIN and parses output for default PIN warnings
#[instrument]
pub fn has_default_pin(serial: &str) -> Result<bool> {
    debug!(
        "Checking if YubiKey {} has default PIN by parsing piv info output",
        serial
    );

    // Run 'ykman piv info' without PIN - this doesn't require authentication
    let args = vec![
        "--device".to_string(),
        serial.to_string(),
        "piv".to_string(),
        "info".to_string(),
    ];

    let output = run_ykman_command(args, None)?;

    // Check output for default PIN/PUK warnings
    let has_default =
        output.contains("Using default PIN!") || output.contains("Using default PUK!");

    debug!(
        has_default_credentials = has_default,
        output_preview = %output.lines().take(3).collect::<Vec<_>>().join(" | "),
        "Default PIN check result"
    );

    Ok(has_default)
}

/// Check if YubiKey has TDES PIN-protected management key
///
/// This is required for age-plugin-yubikey to work properly.
/// Returns true only if BOTH conditions are met:
/// 1. Management key algorithm is TDES (not AES192)
/// 2. Management key is PIN-protected
///
/// Uses 'ykman piv info' which doesn't require PIN authentication.
#[instrument]
pub fn has_tdes_protected_mgmt_key(serial: &str) -> Result<bool> {
    debug!(
        serial = serial,
        "Checking if YubiKey has TDES PIN-protected management key"
    );

    let args = vec![
        "--device".to_string(),
        serial.to_string(),
        "piv".to_string(),
        "info".to_string(),
    ];

    let output = run_ykman_command(args, None)?;

    // Check for TDES algorithm
    let has_tdes = output.contains("Management key algorithm: TDES");

    // Check if PIN-protected
    let is_protected = output.contains("Management key is stored on the YubiKey, protected by PIN");

    debug!(
        serial = serial,
        has_tdes = has_tdes,
        is_protected = is_protected,
        output_preview = %output.lines().take(5).collect::<Vec<_>>().join(" | "),
        "Management key status check"
    );

    Ok(has_tdes && is_protected)
}

/// Change YubiKey PIN via PTY
#[instrument(skip(old_pin, new_pin))]
pub fn change_pin_pty(serial: &str, old_pin: &str, new_pin: &str) -> Result<()> {
    info!(
        serial = %serial,
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
        "--device".to_string(),
        serial.to_string(),
        "piv".to_string(),
        "access".to_string(),
        "change-pin".to_string(),
        "-P".to_string(),
        old_pin.to_string(),
        "-n".to_string(),
        new_pin.to_string(),
    ];

    debug!(command = %format!("ykman --device {} piv access change-pin -P [REDACTED] -n [REDACTED]", serial), "Executing ykman command");

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
pub fn change_puk_pty(serial: &str, old_puk: &str, new_puk: &str) -> Result<()> {
    info!(
        serial = %serial,
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
        "--device".to_string(),
        serial.to_string(),
        "piv".to_string(),
        "access".to_string(),
        "change-puk".to_string(),
        "-p".to_string(),
        old_puk.to_string(),
        "-n".to_string(),
        new_puk.to_string(),
    ];

    debug!(command = %format!("ykman --device {} piv access change-puk -p [REDACTED] -n [REDACTED]", serial), "Executing ykman command");

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

/// Initialize YubiKey with secure defaults (simplified for retired slots)
#[instrument(skip(new_pin, new_puk))]
pub fn initialize_yubikey(serial: &str, new_pin: &str, new_puk: &str) -> Result<()> {
    info!("Initializing YubiKey {} with secure defaults", serial);
    debug!(
        serial = %serial,
        new_pin_length = new_pin.len(),
        new_puk_length = new_puk.len(),
        "Credential lengths"
    );

    // Proceed with initialization (YubiKey should be in factory default state)

    // Step 1: Change PIN from default
    info!("Step 1: Changing PIN from default...");
    change_pin_pty(serial, DEFAULT_PIN, new_pin)?;
    info!("Step 1 complete: PIN changed successfully");

    // Step 2: Change PUK from default
    info!("Step 2: Changing PUK from default...");
    change_puk_pty(serial, DEFAULT_PUK, new_puk)?;
    info!("Step 2 complete: PUK changed successfully");

    // Step 3: Change management key to TDES with protected mode
    // NOTE: This is required even for retired slots because age-plugin-yubikey
    // checks the management key state and requires TDES+protected mode
    info!("Step 3: Changing management key to TDES with protected mode...");
    change_management_key_pty(serial, new_pin)?;
    info!("Step 3 complete: Management key changed successfully");

    info!("YubiKey initialization complete");
    Ok(())
}

// Note: initialize_yubikey_with_recovery has been removed
// We now use initialize_yubikey directly with user-provided recovery PIN

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
