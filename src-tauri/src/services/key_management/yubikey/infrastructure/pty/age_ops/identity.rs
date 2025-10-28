/// Age identity management operations for YubiKey
/// Handles identity generation, listing, and verification
use super::super::core::{PtyError, Result, get_age_plugin_path, run_age_plugin_yubikey};
use crate::prelude::*;

/// Generate age identity via PTY with YubiKey
/// IMPORTANT: serial parameter ensures operation happens on correct YubiKey
#[instrument(skip(pin))]
pub fn generate_age_identity_pty(
    serial: &str,
    pin: &str,
    touch_policy: &str,
    slot_name: &str,
) -> Result<String> {
    info!(
        serial = %redact_serial(serial),
        touch_policy = touch_policy,
        slot_name = slot_name,
        "Generating age identity for YubiKey"
    );

    // Explicitly use retired slot 82 (RETIRED1) to ensure we don't use special slots 9a-9d
    // CRITICAL: Include --serial to ensure we use the correct YubiKey
    let args = vec![
        "-g".to_string(),
        "--serial".to_string(),
        serial.to_string(),
        "--slot".to_string(),
        "1".to_string(), // Use slot 1 for age-plugin-yubikey
        "--touch-policy".to_string(),
        touch_policy.to_string(),
        "--name".to_string(),
        slot_name.to_string(),
    ];

    // Security: Don't build command string - args may contain sensitive data
    debug!(command = %cmd, "Executing command");
    debug!(
        pin_type = if pin == "123456" { "DEFAULT" } else { "CUSTOM" },
        pin_length = pin.len(),
        "PIN will be provided"
    );

    let output = match run_age_plugin_yubikey(args, Some(pin), true) {
        Ok(output) => {
            info!(
                output_length = output.len(),
                "age-plugin-yubikey command succeeded"
            );
            output
        }
        Err(e) => {
            warn!(error = ?e, "age-plugin-yubikey command failed");
            return Err(e);
        }
    };

    // Extract the age recipient from output
    // Looking for line that starts with "age1yubikey"
    for line in output.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("age1yubikey") {
            info!(recipient = %redact_key(trimmed), "Generated age recipient");
            return Ok(trimmed.to_string());
        }
    }

    // If no recipient found in direct output, check for "Recipient:" prefix
    for line in output.lines() {
        if line.contains("Recipient:")
            && line.contains("age1yubikey")
            && let Some(recipient) = line.split("Recipient:").nth(1)
        {
            let recipient = recipient.trim();
            info!(recipient = %redact_key(recipient), "Generated age recipient");
            return Ok(recipient.to_string());
        }
    }

    Err(PtyError::PtyOperation(
        "Failed to extract age recipient from output".to_string(),
    ))
}

/// List existing YubiKey identities
#[instrument]
pub fn list_yubikey_identities() -> Result<Vec<String>> {
    use std::process::Command;

    info!("Listing YubiKey identities with age-plugin-yubikey --list");

    // Use the bundled age-plugin-yubikey binary
    let age_path = get_age_plugin_path();
    debug!(age_path = ?age_path, "Using age-plugin-yubikey from");

    // Check if the binary exists and is executable
    if !age_path.exists() {
        warn!(age_path = ?age_path, "age-plugin-yubikey binary not found");
        return Ok(Vec::new());
    }

    // Execute age-plugin-yubikey --list directly
    debug!(command = ?age_path, args = "--list", "Executing command");
    let output_result = Command::new(&age_path).arg("--list").output();

    let output = match output_result {
        Ok(cmd_output) => {
            let stdout = String::from_utf8_lossy(&cmd_output.stdout);
            let stderr = String::from_utf8_lossy(&cmd_output.stderr);

            debug!(
                exit_status = cmd_output.status.success(),
                "Command exit status"
            );
            debug!(stdout_length = stdout.len(), "Command output");
            if !stderr.is_empty() {
                debug!(stderr = %stderr, "Command stderr");
            }

            stdout.to_string()
        }
        Err(e) => {
            warn!(error = %e, age_path = ?age_path, "Failed to execute age-plugin-yubikey");
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

        debug!(line_number = idx, line = trimmed, "Parsing line");

        // The actual recipient line starts with age1yubikey (no #)
        if trimmed.starts_with("age1yubikey") {
            debug!(line_number = idx, identity = %redact_key(trimmed), "Found identity");
            identities.push(trimmed.to_string());
        }
    }

    info!(
        identity_count = identities.len(),
        "Found YubiKey identities"
    );
    log_sensitive!(dev_only: {
        for (i, id) in identities.iter().enumerate() {
            debug!(index = i, identity = %redact_key(id), "Identity");
        }
    });

    Ok(identities)
}

/// Get identity for specific YubiKey serial
/// Uses direct Command execution (not PTY) since --identity doesn't need interactive input
#[instrument]
pub fn get_identity_for_serial(serial: &str) -> Result<String> {
    info!(serial = %redact_serial(serial), "Getting identity for YubiKey");

    use std::process::Command;

    let age_path = get_age_plugin_path();
    debug!(command_path = %age_path.display(), "Running age-plugin-yubikey --identity");

    let output = Command::new(&age_path)
        .arg("--identity")
        .arg("--serial")
        .arg(serial)
        .output()
        .map_err(|e| {
            PtyError::PtyOperation(format!("Failed to execute age-plugin-yubikey: {e}"))
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(PtyError::PtyOperation(format!(
            "age-plugin-yubikey --identity failed: {stderr}"
        )));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);

    debug!(
        serial = %redact_serial(serial),
        output_length = output_str.len(),
        output_lines = output_str.lines().count(),
        "Raw command output for identity retrieval"
    );

    // Parse the output to find the identity string
    // Format: AGE-PLUGIN-YUBIKEY-XXXXXXXXXX
    let mut identity_line = None;

    for line in output_str.lines() {
        let trimmed_line = line.trim();
        if trimmed_line.starts_with("AGE-PLUGIN-YUBIKEY-") {
            identity_line = Some(trimmed_line.to_string());
            break;
        }
    }

    match identity_line {
        Some(identity) => {
            info!(
                serial = %redact_serial(serial),
                identity_preview = %&identity[..std::cmp::min(25, identity.len())],
                "Successfully extracted YubiKey identity"
            );
            Ok(identity)
        }
        None => {
            error!(
                serial = %redact_serial(serial),
                output_length = output_str.len(),
                output_preview = %output_str.chars().take(200).collect::<String>(),
                "Identity output does not contain AGE-PLUGIN-YUBIKEY line"
            );
            Err(PtyError::PtyOperation(format!(
                "No identity found for serial {serial}"
            )))
        }
    }
}

/// Check if a specific YubiKey has an age identity by serial number
#[instrument]
pub fn check_yubikey_has_identity(serial: &str) -> Result<Option<String>> {
    use std::process::Command;

    info!(serial = %redact_serial(serial), "Checking if YubiKey has an identity");

    let age_path = get_age_plugin_path();

    // Run age-plugin-yubikey --identity --serial <serial>
    let output = Command::new(&age_path)
        .arg("--identity")
        .arg("--serial")
        .arg(serial)
        .output()
        .map_err(PtyError::Io)?;

    if !output.status.success() {
        // No identity for this serial
        info!(serial = %redact_serial(serial), "YubiKey has no identity");
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    debug!(
        serial = %redact_serial(serial),
        output_length = stdout.len(),
        "age-plugin-yubikey output"
    );

    // Look for the recipient line (may have comment prefix and spaces)
    for line in stdout.lines() {
        // Handle format: "#    Recipient: age1yubikey..."
        if line.contains("Recipient:") && line.contains("age1yubikey") {
            // Extract the age1yubikey recipient from the line
            if let Some(recipient_part) = line.split("age1yubikey").nth(1) {
                let recipient = format!("age1yubikey{}", recipient_part.trim());
                info!(
                    serial = %redact_serial(serial),
                    recipient = %redact_key(&recipient),
                    "Found recipient for YubiKey"
                );
                return Ok(Some(recipient));
            }
        }
        // Also check for direct age1yubikey line (without comment prefix)
        let trimmed = line.trim();
        if trimmed.starts_with("age1yubikey") && !line.trim_start().starts_with("#") {
            info!(
                serial = %redact_serial(serial),
                identity = %redact_key(trimmed),
                "Found identity for YubiKey (direct format)"
            );
            return Ok(Some(trimmed.to_string()));
        }
    }

    info!(serial = %redact_serial(serial), "YubiKey identity format not recognized from output");
    Ok(None)
}
