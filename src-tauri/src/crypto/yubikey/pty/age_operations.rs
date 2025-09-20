/// Age-specific PTY operations for YubiKey
/// Handles identity generation and decryption with age-plugin-yubikey
use super::core::{get_age_plugin_path, run_age_plugin_yubikey, PtyError, Result};
use log::{info, warn};
use std::fs;
use std::path::Path;

/// Generate age identity via PTY with YubiKey
pub fn generate_age_identity_pty(pin: &str, touch_policy: &str, slot_name: &str) -> Result<String> {
    info!("Generating age identity with touch_policy={touch_policy}, slot_name={slot_name}");

    // Let age-plugin-yubikey choose the first available retired slot
    // Don't specify --slot to use default behavior
    let args = vec![
        "-g".to_string(),
        "--touch-policy".to_string(),
        touch_policy.to_string(),
        "--name".to_string(),
        slot_name.to_string(),
    ];

    let output = run_age_plugin_yubikey(args, Some(pin), true)?;

    // Extract the age recipient from output
    // Looking for line that starts with "age1yubikey"
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("age1yubikey") {
            info!("Generated age recipient: {trimmed}");
            return Ok(trimmed.to_string());
        }
    }

    // If no recipient found in direct output, check for "Recipient:" prefix
    for line in output.lines() {
        if line.contains("Recipient:") && line.contains("age1yubikey") {
            if let Some(recipient) = line.split("Recipient:").nth(1) {
                let recipient = recipient.trim();
                info!("Generated age recipient: {recipient}");
                return Ok(recipient.to_string());
            }
        }
    }

    Err(PtyError::PtyOperation(
        "Failed to extract age recipient from output".to_string(),
    ))
}

/// List existing YubiKey identities
pub fn list_yubikey_identities() -> Result<Vec<String>> {
    use std::process::Command;

    info!("Listing YubiKey identities with age-plugin-yubikey --list");

    // Use the bundled age-plugin-yubikey binary
    let age_path = super::core::get_age_plugin_path();
    info!("Using age-plugin-yubikey from: {:?}", age_path);

    // Check if the binary exists and is executable
    if !age_path.exists() {
        warn!("age-plugin-yubikey binary not found at: {:?}", age_path);
        return Ok(Vec::new());
    }

    // Execute age-plugin-yubikey --list directly
    info!("Executing command: {:?} --list", age_path);
    let output_result = Command::new(&age_path)
        .arg("--list")
        .output();

    let output = match output_result {
        Ok(cmd_output) => {
            let stdout = String::from_utf8_lossy(&cmd_output.stdout);
            let stderr = String::from_utf8_lossy(&cmd_output.stderr);

            info!("Command exit status: {}", cmd_output.status.success());
            info!("STDOUT ({} bytes): {}", stdout.len(), stdout);
            if !stderr.is_empty() {
                info!("STDERR: {}", stderr);
            }

            stdout.to_string()
        }
        Err(e) => {
            warn!("Failed to execute age-plugin-yubikey: {}", e);
            warn!("Binary path was: {:?}", age_path);
            // Return empty list to avoid breaking the flow
            return Ok(Vec::new());
        }
    };

    let mut identities = Vec::new();
    for (idx, line) in output.lines().enumerate() {
        let trimmed = line.trim();

        // Skip comment lines
        if trimmed.starts_with("#") || trimmed.is_empty() {
            continue;
        }

        info!("Parsing line {}: '{}'", idx, trimmed);

        // The actual recipient line starts with age1yubikey (no #)
        if trimmed.starts_with("age1yubikey") {
            info!("Found identity on line {}: {}", idx, trimmed);
            identities.push(trimmed.to_string());
        }
    }

    info!("Found {} YubiKey identities total", identities.len());
    for (i, id) in identities.iter().enumerate() {
        info!("Identity {}: {}", i, id);
    }

    Ok(identities)
}

/// Get identity for specific YubiKey serial
pub fn get_identity_for_serial(serial: &str) -> Result<String> {
    info!("Getting identity for YubiKey serial: {serial}");

    let args = vec![
        "--identity".to_string(),
        "--serial".to_string(),
        serial.to_string(),
    ];

    let output = run_age_plugin_yubikey(args, None, false)?;

    // The identity output is the entire block starting with AGE-PLUGIN-YUBIKEY
    if output.contains("AGE-PLUGIN-YUBIKEY") {
        Ok(output.trim().to_string())
    } else {
        Err(PtyError::PtyOperation(format!(
            "No identity found for serial {serial}"
        )))
    }
}

/// Decrypt file with age-plugin-yubikey via PTY
pub fn decrypt_with_age_pty(
    encrypted_file: &Path,
    output_file: &Path,
    identity: &str,
    pin: &str,
) -> Result<()> {
    info!("Decrypting file with YubiKey: {encrypted_file:?} -> {output_file:?}");

    // First, write the identity to a temporary file
    let temp_identity =
        std::env::temp_dir().join(format!("yubikey-identity-{}.txt", std::process::id()));

    fs::write(&temp_identity, identity).map_err(PtyError::Io)?;

    // Use age command with the identity file
    let args = vec![
        "--decrypt".to_string(),
        "--identity".to_string(),
        temp_identity.to_str().unwrap().to_string(),
        "-o".to_string(),
        output_file.to_str().unwrap().to_string(),
        encrypted_file.to_str().unwrap().to_string(),
    ];

    // Run age with PIN injection and touch expectation
    let result = run_age_plugin_yubikey(args, Some(pin), true);

    // Clean up temp identity file
    let _ = fs::remove_file(&temp_identity);

    result?;

    if !output_file.exists() {
        return Err(PtyError::PtyOperation(
            "Decryption succeeded but output file not found".to_string(),
        ));
    }

    info!("Successfully decrypted file");
    Ok(())
}

/// Encrypt data for YubiKey recipient
pub fn encrypt_for_yubikey(input_file: &Path, output_file: &Path, recipient: &str) -> Result<()> {
    info!("Encrypting file for YubiKey recipient: {input_file:?} -> {output_file:?}");

    // age encryption doesn't require PIN or touch, only the recipient
    let args = vec![
        "--encrypt".to_string(),
        "--recipient".to_string(),
        recipient.to_string(),
        "-o".to_string(),
        output_file.to_str().unwrap().to_string(),
        input_file.to_str().unwrap().to_string(),
    ];

    run_age_plugin_yubikey(args, None, false)?;

    if !output_file.exists() {
        return Err(PtyError::PtyOperation(
            "Encryption succeeded but output file not found".to_string(),
        ));
    }

    info!("Successfully encrypted file for YubiKey");
    Ok(())
}

/// Check if a specific YubiKey has an age identity by serial number
pub fn check_yubikey_has_identity(serial: &str) -> Result<Option<String>> {
    use std::process::Command;

    info!("Checking if YubiKey {} has an identity", serial);

    let age_path = get_age_plugin_path();

    // Run age-plugin-yubikey --identity --serial <serial>
    let output = Command::new(&age_path)
        .arg("--identity")
        .arg("--serial")
        .arg(serial)
        .output()
        .map_err(|e| PtyError::Io(e))?;

    if !output.status.success() {
        // No identity for this serial
        info!("YubiKey {} has no identity", serial);
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Look for the recipient line (starts with "Recipient: age1yubikey")
    for line in stdout.lines() {
        if line.starts_with("Recipient: age1yubikey") {
            let recipient = line.trim_start_matches("Recipient: ").trim();
            info!("YubiKey {} has identity: {}", serial, recipient);
            return Ok(Some(recipient.to_string()));
        }
        // Also check for direct age1yubikey line (some versions may output differently)
        if line.trim().starts_with("age1yubikey") && !line.starts_with("#") {
            let recipient = line.trim();
            info!("YubiKey {} has identity: {}", serial, recipient);
            return Ok(Some(recipient.to_string()));
        }
    }

    info!("YubiKey {} identity format not recognized", serial);
    Ok(None)
}

/// Test YubiKey connection by listing identities
pub fn test_yubikey_connection() -> Result<bool> {
    match list_yubikey_identities() {
        Ok(identities) => Ok(!identities.is_empty()),
        Err(_) => Ok(false),
    }
}
