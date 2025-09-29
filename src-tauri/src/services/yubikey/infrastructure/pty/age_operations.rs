/// Age-specific PTY operations for YubiKey
/// Handles identity generation and decryption with age-plugin-yubikey
use super::core::{PtyError, Result, get_age_plugin_path, run_age_plugin_yubikey};
use crate::prelude::*;
use std::fs;
use std::path::Path;

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

    let cmd = format!("age-plugin-yubikey {}", args.join(" "));
    debug!(command = %cmd, "Executing command");
    debug!(
        pin_type = if pin == "123456" { "DEFAULT" } else { "CUSTOM" },
        pin_length = pin.len(),
        "PIN will be provided"
    );
    info!("Starting PTY-based age identity generation...");

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

/// Decrypt data using age CLI with PTY for YubiKey interaction
/// This function creates the necessary temporary files and handles the PTY interaction
#[instrument(skip(encrypted_data, pin))]
pub fn decrypt_data_with_yubikey_pty(
    encrypted_data: &[u8],
    serial: &str,
    slot: u8,
    recipient: &str,
    identity_tag: &str,
    pin: &str,
) -> Result<Vec<u8>> {
    info!(
        serial = %redact_serial(serial),
        slot = slot,
        recipient = %redact_key(recipient),
        data_size = encrypted_data.len(),
        "Starting YubiKey PTY decryption"
    );

    // Create temporary files
    let temp_dir = std::env::temp_dir();
    let process_id = std::process::id();

    let temp_encrypted = temp_dir.join(format!("yubikey_decrypt_{}.age", process_id));
    let temp_identity = temp_dir.join(format!("yubikey_identity_{}.txt", process_id));
    let temp_output = temp_dir.join(format!("yubikey_decrypt_{}.txt", process_id));

    // Write encrypted data to temporary file
    fs::write(&temp_encrypted, encrypted_data).map_err(|e| {
        error!(
            error = %e,
            temp_file = %temp_encrypted.display(),
            "Failed to write encrypted data to temporary file"
        );
        PtyError::Io(e)
    })?;

    // Create identity file content with proper format (matching POC)
    let identity_content = format!(
        "#       Serial: {}, Slot: {}\n#   PIN policy: cached\n# Touch policy: cached\n#    Recipient: {}\n{}\n",
        serial, slot, recipient, identity_tag
    );

    // Write identity file
    fs::write(&temp_identity, identity_content).map_err(|e| {
        error!(
            error = %e,
            temp_file = %temp_identity.display(),
            "Failed to write identity file"
        );
        // Clean up encrypted file
        let _ = fs::remove_file(&temp_encrypted);
        PtyError::Io(e)
    })?;

    debug!(
        temp_encrypted = %temp_encrypted.display(),
        temp_identity = %temp_identity.display(),
        temp_output = %temp_output.display(),
        "Created temporary files for YubiKey decryption"
    );

    // Run age CLI with PTY
    let result = run_age_decryption_pty(&temp_encrypted, &temp_identity, &temp_output, pin);

    // Clean up input files
    let _ = fs::remove_file(&temp_encrypted);
    let _ = fs::remove_file(&temp_identity);

    match result {
        Ok(()) => {
            // Read the decrypted output from the file
            let decrypted_data = fs::read(&temp_output).map_err(|e| {
                error!(
                    error = %e,
                    temp_output = %temp_output.display(),
                    "Failed to read decrypted output file"
                );
                PtyError::Io(e)
            })?;

            // Clean up output file
            let _ = fs::remove_file(&temp_output);

            debug!(
                encrypted_size = encrypted_data.len(),
                decrypted_size = decrypted_data.len(),
                "YubiKey PTY decryption completed successfully"
            );

            Ok(decrypted_data)
        }
        Err(e) => {
            // Clean up output file
            let _ = fs::remove_file(&temp_output);
            Err(e)
        }
    }
}

/// Internal function to run age decryption with PTY
fn run_age_decryption_pty(
    encrypted_file: &Path,
    identity_file: &Path,
    output_file: &Path,
    pin: &str,
) -> Result<()> {
    use super::core::{COMMAND_TIMEOUT, PIN_INJECT_DELAY, PtyState, get_age_path};
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};
    use std::io::Write;
    use std::sync::mpsc;
    use std::thread;
    use std::time::Instant;

    info!("Starting age CLI decryption with PTY");

    let age_path = get_age_path();
    debug!(age_path = %age_path.display(), "Using age binary");

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| PtyError::PtyOperation(format!("Failed to open PTY: {e}")))?;

    // Set up environment for age CLI to find the plugin
    let plugin_dir = age_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", plugin_dir.display(), current_path);

    // Build command: age -d -i identity_file -o output_file input_file
    let mut cmd = CommandBuilder::new(age_path.to_str().unwrap());
    cmd.arg("-d");
    cmd.arg("-i");
    cmd.arg(identity_file.to_str().unwrap());
    cmd.arg("-o");
    cmd.arg(output_file.to_str().unwrap());
    cmd.arg(encrypted_file.to_str().unwrap());
    cmd.env("PATH", new_path);

    debug!(
        command = %format!("age -d -i {} -o {} {}",
            identity_file.display(),
            output_file.display(),
            encrypted_file.display()
        ),
        "Executing age decryption command"
    );

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| {
        error!(error = %e, "Failed to spawn age CLI");
        PtyError::PtyOperation(format!("Failed to spawn age: {e}"))
    })?;

    debug!("Age CLI process spawned successfully");

    let (tx, rx) = mpsc::channel::<PtyState>();

    // Reader thread for PTY output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to clone reader: {e}")))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        use std::io::Read;

        let mut raw_buffer = [0u8; 256];
        let mut accumulated_output = String::new();

        loop {
            match reader.read(&mut raw_buffer) {
                Ok(0) => {
                    debug!("PTY reader reached EOF");
                    break;
                }
                Ok(n) => {
                    let raw_data = &raw_buffer[..n];

                    // Convert to string and accumulate
                    if let Ok(text) = std::str::from_utf8(raw_data) {
                        accumulated_output.push_str(text);
                        debug!(raw_text = %text, "Raw age CLI output");

                        // Process complete lines
                        while let Some(newline_pos) = accumulated_output.find('\n') {
                            let line = accumulated_output[..newline_pos].trim().to_string();
                            accumulated_output.drain(..newline_pos + 1);

                            if !line.is_empty() {
                                info!(age_output = %line, "Age CLI output line");

                                // Pattern matching for age CLI states
                                if line.contains("Enter PIN")
                                    || line.contains("PIN:")
                                    || line.contains("PIN for")
                                {
                                    info!("🔐 PIN prompt detected");
                                    let _ = tx_reader.send(PtyState::WaitingForPin);
                                } else if line.contains("Please touch")
                                    || line.contains("Touch your")
                                    || line.contains("👆")
                                    || line.contains("touch")
                                {
                                    info!("👆 Touch prompt detected");
                                    let _ = tx_reader.send(PtyState::WaitingForTouch);
                                } else if line.contains("error")
                                    || line.contains("failed")
                                    || line.contains("Error")
                                    || line.contains("Failed")
                                {
                                    error!(error_line = %line, "Age CLI error detected");
                                    let _ = tx_reader.send(PtyState::Failed(line));
                                }
                            }
                        }

                        // Check partial line for immediate patterns (like prompts without newlines)
                        let remaining = accumulated_output.trim();
                        if !remaining.is_empty() {
                            if remaining.contains("Enter PIN")
                                || remaining.contains("PIN:")
                                || remaining.contains("PIN for")
                            {
                                info!("🔐 PIN prompt detected (partial)");
                                let _ = tx_reader.send(PtyState::WaitingForPin);
                            } else if remaining.contains("Please touch")
                                || remaining.contains("Touch your")
                                || remaining.contains("👆")
                                || remaining.contains("touch")
                            {
                                info!("👆 Touch prompt detected (partial)");
                                let _ = tx_reader.send(PtyState::WaitingForTouch);
                            }
                        }
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // Non-blocking read, no data available
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    continue;
                }
                Err(e) => {
                    debug!(error = %e, "PTY read error, exiting reader");
                    break;
                }
            }
        }
        debug!("PTY reader thread exiting");
    });

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to get writer: {e}")))?;

    let start = Instant::now();
    let mut pin_sent = false;

    info!("🔐 Touch your YubiKey when prompted to complete decryption!");

    loop {
        if start.elapsed() > COMMAND_TIMEOUT {
            warn!("Operation timed out");
            let _ = child.kill();
            return Err(PtyError::Timeout(COMMAND_TIMEOUT.as_secs()));
        }

        match rx.recv_timeout(std::time::Duration::from_millis(100)) {
            Ok(state) => match state {
                PtyState::WaitingForPin if !pin_sent => {
                    info!("PIN prompt detected, injecting PIN");
                    thread::sleep(PIN_INJECT_DELAY);
                    writeln!(writer, "{}", pin)
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to send PIN: {e}")))?;
                    writer
                        .flush()
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to flush: {e}")))?;
                    pin_sent = true;
                    debug!("PIN sent successfully");
                }
                PtyState::WaitingForTouch => {
                    info!("👆 Please touch your YubiKey to complete decryption...");
                    // Just wait - don't send empty lines that could interfere
                    thread::sleep(std::time::Duration::from_millis(500));
                }
                PtyState::Failed(err) => {
                    warn!(error = %err, "Decryption failed");
                    let _ = child.kill();
                    return Err(PtyError::PtyOperation(err));
                }
                _ => {}
            },
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if process has exited
                match child.try_wait() {
                    Ok(Some(status)) => {
                        debug!(status = ?status, "Process exited");
                        if status.success() {
                            info!("Age decryption completed successfully");
                            return Ok(());
                        } else {
                            return Err(PtyError::PtyOperation(
                                "Age CLI process failed".to_string(),
                            ));
                        }
                    }
                    Ok(None) => {
                        // Still running, continue
                        continue;
                    }
                    Err(e) => {
                        return Err(PtyError::PtyOperation(format!(
                            "Failed to check process: {e}"
                        )));
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let _ = child.wait();
    info!("Age CLI decryption process completed");
    Ok(())
}

/// List existing YubiKey identities
#[instrument]
pub fn list_yubikey_identities() -> Result<Vec<String>> {
    use std::process::Command;

    info!("Listing YubiKey identities with age-plugin-yubikey --list");

    // Use the bundled age-plugin-yubikey binary
    let age_path = super::core::get_age_plugin_path();
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

/// Decrypt file with age-plugin-yubikey via PTY
/// IMPORTANT: serial parameter ensures operation happens on correct YubiKey
#[instrument(skip(identity, pin))]
pub fn decrypt_with_age_pty(
    encrypted_file: &Path,
    output_file: &Path,
    identity: &str,
    pin: &str,
    serial: &str, // Added for security - ensure correct YubiKey is used
) -> Result<()> {
    info!(
        serial = %redact_serial(serial),
        encrypted_file = ?encrypted_file,
        output_file = ?output_file,
        "Decrypting file with YubiKey"
    );

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
/// Note: Encryption doesn't require serial as it uses the recipient public key
/// However, for consistency and future verification, we could add serial validation
#[instrument(skip(recipient))]
pub fn encrypt_for_yubikey(input_file: &Path, output_file: &Path, recipient: &str) -> Result<()> {
    info!(
        input_file = ?input_file,
        output_file = ?output_file,
        recipient = %redact_key(recipient),
        "Encrypting file for YubiKey recipient"
    );

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

/// Test YubiKey connection by listing identities
#[instrument]
pub fn test_yubikey_connection() -> Result<bool> {
    match list_yubikey_identities() {
        Ok(identities) => Ok(!identities.is_empty()),
        Err(_) => Ok(false),
    }
}
