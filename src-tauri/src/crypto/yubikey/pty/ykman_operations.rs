/// Ykman-specific PTY operations for YubiKey management
/// Handles PIN changes, PUK changes, and management key operations
use super::core::{run_ykman_command, PtyError, Result};
use crate::logging::{log_debug, log_info, log_warn};

const DEFAULT_PIN: &str = "123456";
const DEFAULT_PUK: &str = "12345678";
#[allow(dead_code)]
const DEFAULT_MGMT_KEY: &str = "010203040506070801020304050607080102030405060708";

/// Check if YubiKey has default PIN
pub fn has_default_pin() -> Result<bool> {
    log_info("Checking if YubiKey has default PIN");

    // Try to access PIV info with default PIN
    let args = vec![
        "piv".to_string(),
        "info".to_string(),
        "-p".to_string(),
        DEFAULT_PIN.to_string(),
    ];

    match run_ykman_command(args, Some(DEFAULT_PIN)) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Change YubiKey PIN via PTY
pub fn change_pin_pty(old_pin: &str, new_pin: &str) -> Result<()> {
    log_info(&format!("Changing YubiKey PIN from {} to {}",
        if old_pin == DEFAULT_PIN { "DEFAULT" } else { "CUSTOM" },
        if new_pin == DEFAULT_PIN { "DEFAULT" } else { "CUSTOM" }
    ));

    if new_pin.len() < 6 || new_pin.len() > 8 {
        return Err(PtyError::PinFailed(
            "PIN must be 6-8 characters".to_string(),
        ));
    }

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-pin".to_string(),
        "--pin".to_string(),
        old_pin.to_string(),
        "--new-pin".to_string(),
        new_pin.to_string(),
    ];

    log_debug(&format!("Executing: ykman {}", args.join(" ")));

    match run_ykman_command(args, Some(old_pin)) {
        Ok(output) => {
            log_info(&format!("PIN change succeeded. Output: {}", output));
            Ok(())
        }
        Err(e) => {
            log_warn(&format!("PIN change failed: {:?}", e));
            Err(e)
        }
    }
}

/// Change YubiKey PUK via PTY
pub fn change_puk_pty(old_puk: &str, new_puk: &str) -> Result<()> {
    log_info(&format!("Changing YubiKey PUK from {} to {}",
        if old_puk == DEFAULT_PUK { "DEFAULT" } else { "CUSTOM" },
        if new_puk == DEFAULT_PUK { "DEFAULT" } else { "CUSTOM" }
    ));

    if new_puk.len() < 6 || new_puk.len() > 8 {
        return Err(PtyError::PinFailed(
            "PUK must be 6-8 characters".to_string(),
        ));
    }

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-puk".to_string(),
        "--puk".to_string(),
        old_puk.to_string(),
        "--new-puk".to_string(),
        new_puk.to_string(),
    ];

    log_debug(&format!("Executing: ykman {}", args.join(" ")));

    match run_ykman_command(args, None) {
        Ok(output) => {
            log_info(&format!("PUK change succeeded. Output: {}", output));
            Ok(())
        }
        Err(e) => {
            log_warn(&format!("PUK change failed: {:?}", e));
            Err(e)
        }
    }
}

/// Change management key to TDES with protected mode
pub fn change_management_key_pty(pin: &str) -> Result<()> {
    log_info("Changing management key to TDES with protected mode");

    let args = vec![
        "piv".to_string(),
        "access".to_string(),
        "change-management-key".to_string(),
        "--algorithm".to_string(),
        "TDES".to_string(),
        "--protect".to_string(),
        "--pin".to_string(),
        pin.to_string(),
    ];

    log_debug(&format!("Executing: ykman {}", args.join(" ")));

    match run_ykman_command(args, Some(pin)) {
        Ok(output) => {
            log_info(&format!("Management key change succeeded. Output: {}", output));
            Ok(())
        }
        Err(e) => {
            log_warn(&format!("Management key change failed: {:?}", e));
            Err(e)
        }
    }
}

/// Initialize YubiKey with secure defaults (simplified for retired slots)
pub fn initialize_yubikey(new_pin: &str, new_puk: &str) -> Result<()> {
    log_info("Initializing YubiKey with secure defaults");
    log_debug(&format!("New PIN length: {}, New PUK length: {}", new_pin.len(), new_puk.len()));

    // No management key change needed for retired slots!
    // Just change PIN and PUK from defaults

    // Step 1: Change PIN from default
    log_info("Step 1: Changing PIN from default...");
    change_pin_pty(DEFAULT_PIN, new_pin)?;
    log_info("Step 1 complete: PIN changed successfully");

    // Step 2: Change PUK from default
    log_info("Step 2: Changing PUK from default...");
    change_puk_pty(DEFAULT_PUK, new_puk)?;
    log_info("Step 2 complete: PUK changed successfully");

    log_info("YubiKey initialization complete");
    Ok(())
}

/// Initialize YubiKey with auto-generated recovery code
pub fn initialize_yubikey_with_recovery(new_pin: &str) -> Result<String> {
    use crate::crypto::yubikey::manifest::generate_recovery_code;

    log_info("Initializing YubiKey with auto-generated recovery code");

    // Generate Base58 recovery code for PUK
    let recovery_code = generate_recovery_code();
    log_debug(&format!("Generated recovery code (PUK): {} (length: {})",
        &recovery_code[..4], recovery_code.len()));

    // Initialize with PIN and recovery code as PUK
    log_info("Starting YubiKey initialization sequence...");
    match initialize_yubikey(new_pin, &recovery_code) {
        Ok(_) => {
            log_info("YubiKey initialized with recovery code successfully");
            Ok(recovery_code)
        }
        Err(e) => {
            log_warn(&format!("Failed to initialize YubiKey: {:?}", e));
            Err(e)
        }
    }
}

/// Get YubiKey serial number
pub fn get_yubikey_serial() -> Result<String> {
    log_debug("Getting YubiKey serial number");

    let args = vec!["info".to_string()];
    let output = run_ykman_command(args, None)?;

    // Parse serial from output
    // Looking for line like "Serial: 12345678"
    for line in output.lines() {
        if line.contains("Serial:") {
            if let Some(serial) = line.split("Serial:").nth(1) {
                let serial = serial.trim();
                log_debug(&format!("Found YubiKey serial: {}", serial));
                return Ok(serial.to_string());
            }
        }
    }

    Err(PtyError::PtyOperation(
        "Could not find serial in ykman output".to_string(),
    ))
}

/// Get YubiKey PIV info
pub fn get_piv_info(pin: &str) -> Result<String> {
    log_info("Getting YubiKey PIV info");

    let args = vec!["piv".to_string(), "info".to_string()];

    let output = run_ykman_command(args, Some(pin))?;
    Ok(output)
}

/// List YubiKey devices
pub fn list_yubikeys() -> Result<Vec<String>> {
    log_debug("Listing YubiKey devices");

    let args = vec!["list".to_string()];
    let output = run_ykman_command(args, None)?;

    let mut devices = Vec::new();
    for line in output.lines() {
        let trimmed = line.trim();
        if !trimmed.is_empty() {
            devices.push(trimmed.to_string());
        }
    }

    log_debug(&format!("Found {} YubiKey devices", devices.len()));
    Ok(devices)
}

/// Reset YubiKey PIV (for testing)
#[cfg(test)]
pub fn reset_piv() -> Result<()> {
    log_warn("Resetting YubiKey PIV - this will erase all PIV data!");

    let args = vec![
        "piv".to_string(),
        "reset".to_string(),
        "-f".to_string(), // Force flag
    ];

    run_ykman_command(args, None)?;

    log_info("YubiKey PIV reset complete");
    Ok(())
}
