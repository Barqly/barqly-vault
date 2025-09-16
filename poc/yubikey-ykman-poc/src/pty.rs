use crate::errors::{Result, YubiKeyError};
use crate::get_age_plugin_path;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{BufRead, BufReader, Write};
use std::process::Command;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use log::{debug, info, warn};
use crate::manifest::YubiKeyManifest;

const TOUCH_TIMEOUT: Duration = Duration::from_secs(30);
const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);

#[derive(Debug, Clone)]
enum PtyState {
    GeneratingKey,
    WaitingForTouch,
    Complete(String),
    Failed(String),
    TouchDetected,
}

/// List existing YubiKey identities
pub fn list_identities() -> Result<String> {
    let output = Command::new(&get_age_plugin_path())
        .arg("--list")
        .output()?;

    if !output.status.success() {
        return Ok(String::new()); // No identities
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    // Extract the age recipient (last line that starts with age1yubikey)
    for line in output_str.lines().rev() {
        if line.starts_with("age1yubikey") {
            return Ok(line.trim().to_string());
        }
    }

    Ok(String::new())
}

/// Generate age identity via PTY
pub fn generate_age_identity(pin: &str, touch_policy: &str, slot_name: &str) -> Result<String> {
    info!("Starting age-plugin-yubikey identity generation");

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;

    let mut cmd = CommandBuilder::new(get_age_plugin_path().to_str().unwrap());
    cmd.arg("-g");
    cmd.arg("--touch-policy");
    cmd.arg(touch_policy);
    cmd.arg("--name");
    cmd.arg(slot_name);

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn command: {}", e)))?;

    // Set up channels for communication
    let (tx, rx) = mpsc::channel::<PtyState>();

    // Reader thread for PTY output
    let reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        let mut buf_reader = BufReader::new(reader);
        let mut buffer = String::new();
        let mut recipient = String::new();

        loop {
            buffer.clear();
            match buf_reader.read_line(&mut buffer) {
                Ok(0) => {
                    // EOF - send complete if we have a recipient
                    if !recipient.is_empty() {
                        let _ = tx_reader.send(PtyState::Complete(recipient.clone()));
                    }
                    break;
                }
                Ok(_) => {
                    let line = buffer.trim();
                    debug!("PTY output: {}", line);

                    if line.starts_with("age1yubikey") {
                        // This is the recipient we need for encryption
                        recipient = line.to_string();
                        // Don't send Complete yet, wait for all output
                    } else if line.starts_with("AGE-PLUGIN-YUBIKEY") {
                        // This is the identity, we'll send complete after finding recipient
                        // or use this as fallback if no recipient found
                        if recipient.is_empty() {
                            // Store temporarily but don't complete yet
                            debug!("Found identity but still looking for recipient");
                        }
                    } else if line.contains("Recipient:") && line.contains("age1yubikey") {
                        // Some versions output "Recipient: age1yubikey..."
                        if let Some(rec_part) = line.split("Recipient:").nth(1) {
                            recipient = rec_part.trim().to_string();
                        }
                    } else if line.contains("Generating key") {
                        let _ = tx_reader.send(PtyState::GeneratingKey);
                    } else if line.contains("Touch your YubiKey") {
                        let _ = tx_reader.send(PtyState::WaitingForTouch);
                    } else if line.contains("error") || line.contains("failed") {
                        let _ = tx_reader.send(PtyState::Failed(line.to_string()));
                    }
                }
                Err(e) => {
                    warn!("Error reading PTY: {}", e);
                    break;
                }
            }
        }
    });

    // Get writer for sending PIN
    let mut writer = pair.master
        .take_writer()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to get writer: {}", e)))?;

    // State machine for handling the interaction
    let start = Instant::now();
    let mut pin_sent = false;
    let mut recipient = String::new();

    loop {
        if start.elapsed() > TOUCH_TIMEOUT {
            warn!("Operation timed out");
            let _ = child.kill();
            return Err(YubiKeyError::TouchTimeout);
        }

        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(state) => {
                match state {
                    PtyState::GeneratingKey => {
                        info!("Key generation started");
                        if !pin_sent {
                            // Send PIN proactively after a small delay
                            thread::sleep(PIN_INJECT_DELAY);
                            debug!("Sending PIN to PTY");
                            writeln!(writer, "{}", pin)
                                .map_err(|e| YubiKeyError::PtyError(format!("Failed to send PIN: {}", e)))?;
                            writer.flush()
                                .map_err(|e| YubiKeyError::PtyError(format!("Failed to flush: {}", e)))?;
                            pin_sent = true;
                        }
                    }
                    PtyState::WaitingForTouch => {
                        info!("Waiting for YubiKey touch...");
                        // Optionally send a nudge to keep PTY alive
                        thread::sleep(Duration::from_secs(1));
                        let _ = writeln!(writer, "");
                    }
                    PtyState::Complete(rec) => {
                        info!("Successfully generated age identity");
                        recipient = rec;
                        break;
                    }
                    PtyState::Failed(err) => {
                        warn!("Generation failed: {}", err);
                        let _ = child.kill();
                        return Err(YubiKeyError::OperationFailed(err));
                    }
                    _ => {}
                }
            }
            Err(_) => {
                // Check if process is still running
                match child.try_wait() {
                    Ok(Some(status)) => {
                        if !status.success() && recipient.is_empty() {
                            return Err(YubiKeyError::OperationFailed(
                                format!("Process exited with status: {:?}", status)
                            ));
                        }
                        if !recipient.is_empty() {
                            break;
                        }
                    }
                    Ok(None) => {
                        // Still running, continue
                    }
                    Err(e) => {
                        return Err(YubiKeyError::PtyError(format!("Failed to check process: {}", e)));
                    }
                }
            }
        }
    }

    // Clean up
    let _ = child.kill();
    let _ = child.wait();

    if recipient.is_empty() {
        return Err(YubiKeyError::UnexpectedOutput("No age recipient generated".to_string()));
    }

    Ok(recipient)
}

/// Decrypt data using YubiKey with manifest - USING -o FLAG
pub fn decrypt_with_manifest(manifest: &YubiKeyManifest, encrypted_data: &[u8], pin: &str) -> Result<Vec<u8>> {
    info!("Starting YubiKey decryption with manifest (using -o flag)");

    // Write encrypted data to temp file
    // Create tmp directory if it doesn't exist
    let _ = std::fs::create_dir_all("tmp");
    let temp_encrypted = format!("tmp/yubikey_decrypt_{}.age", std::process::id());
    std::fs::write(&temp_encrypted, encrypted_data)?;

    // Create identity file from manifest
    let temp_identity = manifest.create_temp_identity_file()?;

    // Output file for decrypted data
    let temp_output = format!("tmp/yubikey_decrypted_{}.txt", std::process::id());

    // Set up PTY
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;

    // Set PATH for plugin
    let age_plugin_path = get_age_plugin_path();
    let bundled_bin_dir = age_plugin_path.parent().unwrap();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", bundled_bin_dir.display(), current_path);

    // Use age binary
    let age_path = if std::path::Path::new("/opt/homebrew/bin/age").exists() {
        "/opt/homebrew/bin/age"
    } else if std::path::Path::new("/usr/local/bin/age").exists() {
        "/usr/local/bin/age"
    } else {
        "age"
    };

    let mut cmd = CommandBuilder::new(age_path);
    cmd.arg("-d");
    cmd.arg("-i");
    cmd.arg(&temp_identity);
    cmd.arg("-o");  // Output flag
    cmd.arg(&temp_output);  // Output file
    cmd.arg(&temp_encrypted);
    cmd.env("PATH", new_path);
    // Set PIN in environment for the plugin
    cmd.env("AGE_PLUGIN_YUBIKEY_PIN", pin);

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn age: {}", e)))?;

    info!("Age decryption process started");

    // IMMEDIATELY show touch prompt since we know it will be needed
    // (manifest shows touch_policy: cached)
    println!("\n╔════════════════════════════════════════════╗");
    println!("║   🔐 TOUCH YOUR YUBIKEY NOW TO DECRYPT!   ║");
    println!("╚════════════════════════════════════════════════╝\n");

    // Create a reader thread to consume PTY output (prevents blocking)
    // This is critical - without this, the plugin blocks trying to write status messages
    let reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;

    let (tx, rx) = mpsc::channel();
    thread::spawn(move || {
        use std::io::{BufRead, BufReader};
        let mut buf_reader = BufReader::new(reader);
        let mut buffer = String::new();

        loop {
            buffer.clear();
            match buf_reader.read_line(&mut buffer) {
                Ok(0) => {
                    debug!("PTY reader reached EOF");
                    break;
                }
                Ok(_) => {
                    let line = buffer.trim();
                    debug!("PTY output: {}", line);

                    // Send the line to main thread for processing
                    let _ = tx.send(line.to_string());
                }
                Err(e) => {
                    debug!("PTY read error: {}", e);
                    break;
                }
            }
        }
        debug!("PTY reader thread exiting");
    });

    // Get writer for sending periodic nudges (like in key generation)
    let mut writer = pair.master
        .take_writer()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to get writer: {}", e)))?;

    // Since we're using -o flag, we don't need to capture stdout
    // Just wait for the process to complete and read the output file
    let start = Instant::now();
    let timeout = Duration::from_secs(60); // Give user time to touch
    let mut last_nudge = Instant::now();
    let mut pin_sent = false;

    loop {
        if start.elapsed() > timeout {
            debug!("Timeout reached, killing child process");
            let _ = child.kill();
            let _ = std::fs::remove_file(&temp_encrypted);
            let _ = std::fs::remove_file(&temp_identity);
            let _ = std::fs::remove_file(&temp_output);
            return Err(YubiKeyError::TouchTimeout);
        }

        // Check process status
        match child.try_wait() {
            Ok(Some(status)) => {
                debug!("Process exited with status: {:?}", status);
                // Process ended
                if status.success() {
                    // Read the decrypted output from file
                    match std::fs::read(&temp_output) {
                        Ok(decrypted_data) => {
                            // Clean up temp files
                            let _ = std::fs::remove_file(&temp_encrypted);
                            let _ = std::fs::remove_file(&temp_identity);
                            let _ = std::fs::remove_file(&temp_output);

                            info!("Decryption successful, got {} bytes", decrypted_data.len());
                            return Ok(decrypted_data);
                        }
                        Err(e) => {
                            // Clean up temp files
                            let _ = std::fs::remove_file(&temp_encrypted);
                            let _ = std::fs::remove_file(&temp_identity);
                            let _ = std::fs::remove_file(&temp_output);

                            return Err(YubiKeyError::OperationFailed(
                                format!("Failed to read decrypted output file: {}", e)
                            ));
                        }
                    }
                } else {
                    // Process failed - try to read any error output from PTY
                    let mut error_output = Vec::new();
                    if let Ok(mut reader) = pair.master.try_clone_reader() {
                        use std::io::Read;
                        let mut buffer = [0u8; 1024];
                        // Non-blocking read to get any error messages
                        if let Ok(n) = reader.read(&mut buffer) {
                            error_output.extend_from_slice(&buffer[..n]);
                        }
                    }

                    // Clean up temp files
                    let _ = std::fs::remove_file(&temp_encrypted);
                    let _ = std::fs::remove_file(&temp_identity);
                    let _ = std::fs::remove_file(&temp_output);

                    let error_msg = if !error_output.is_empty() {
                        String::from_utf8_lossy(&error_output).to_string()
                    } else {
                        format!("Process exited with status: {:?}", status)
                    };

                    return Err(YubiKeyError::OperationFailed(
                        format!("Decryption failed: {}", error_msg)
                    ));
                }
            }
            Ok(None) => {
                // Process still running - check if we need to send PIN
                // Check the latest output from reader thread
                if let Ok(msg) = rx.try_recv() {
                    if msg.contains("Enter PIN") && !pin_sent {
                        // Send the actual PIN, not empty line
                        debug!("PIN prompt detected, sending PIN: {}", pin);
                        let _ = writeln!(writer, "{}", pin);
                        let _ = writer.flush();
                        pin_sent = true;
                        // Don't send nudges right after PIN
                        last_nudge = Instant::now();
                    } else if msg.contains("Touch detected") || msg.contains("Decrypting") {
                        info!("Touch detected! Waiting for decryption to complete...");
                    } else if msg.contains("Touch your YubiKey") {
                        debug!("YubiKey waiting for touch");
                    }
                }

                // Check if output file exists (process might be done but PTY keeping it alive)
                if std::path::Path::new(&temp_output).exists() {
                    debug!("Output file exists while process running, checking size...");
                    if let Ok(metadata) = std::fs::metadata(&temp_output) {
                        debug!("Output file size: {} bytes", metadata.len());

                        // If file has content, the decryption likely succeeded
                        if metadata.len() > 0 {
                            // Give it a moment to ensure the file is fully written
                            thread::sleep(Duration::from_millis(200));
                            // Process should exit soon, but we can continue waiting
                        }
                    }
                }
                thread::sleep(Duration::from_millis(100));
            }
            Err(e) => {
                let _ = std::fs::remove_file(&temp_encrypted);
                let _ = std::fs::remove_file(&temp_identity);
                let _ = std::fs::remove_file(&temp_output);
                return Err(YubiKeyError::PtyError(format!("Process error: {}", e)));
            }
        }
    }
}

/// Test decryption WITHOUT PTY - using simple Command with pipes
pub fn decrypt_without_pty(manifest: &YubiKeyManifest, encrypted_data: &[u8]) -> Result<Vec<u8>> {
    use std::process::{Command, Stdio};

    info!("Testing decryption WITHOUT PTY (using pipes)");

    // Write encrypted data to temp file
    // Create tmp directory if it doesn't exist
    let _ = std::fs::create_dir_all("tmp");
    let temp_encrypted = format!("tmp/yubikey_decrypt_test_{}.age", std::process::id());
    std::fs::write(&temp_encrypted, encrypted_data)?;

    // Create identity file from manifest
    let temp_identity = manifest.create_temp_identity_file()?;

    // Set PATH for plugin
    let age_plugin_path = get_age_plugin_path();
    let bundled_bin_dir = age_plugin_path.parent().unwrap();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", bundled_bin_dir.display(), current_path);

    // Use age binary
    let age_path = if std::path::Path::new("/opt/homebrew/bin/age").exists() {
        "/opt/homebrew/bin/age"
    } else if std::path::Path::new("/usr/local/bin/age").exists() {
        "/usr/local/bin/age"
    } else {
        "age"
    };

    info!("Running age command WITHOUT PTY");
    println!("\n╔════════════════════════════════════════════╗");
    println!("║   🔐 TOUCH YOUR YUBIKEY WHEN IT BLINKS!   ║");
    println!("╚════════════════════════════════════════════╝");

    // Run age with simple pipes (no PTY)
    let output = Command::new(age_path)
        .args(&["-d", "-i", &temp_identity, &temp_encrypted])
        .env("PATH", new_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()?;

    // Cleanup
    let _ = std::fs::remove_file(&temp_encrypted);
    let _ = std::fs::remove_file(&temp_identity);

    if output.status.success() {
        info!("Decryption succeeded WITHOUT PTY!");
        Ok(output.stdout)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        warn!("Decryption failed: {}", stderr);
        Err(YubiKeyError::OperationFailed(format!("Decryption failed: {}", stderr)))
    }
}

/// Decrypt data using YubiKey with PIN and touch prompts
pub fn decrypt_with_yubikey(encrypted_data: &[u8], pin: &str) -> Result<Vec<u8>> {
    // Try to load manifest if available
    if let Ok(manifest) = YubiKeyManifest::load_from_file("yubikey-manifest.json") {
        // Use PTY method directly (non-PTY doesn't work with YubiKey PIN requirements)
        return decrypt_with_manifest(&manifest, encrypted_data, pin);
    }

    // Fallback to old method (should not reach here if manifest exists)
    Err(YubiKeyError::OperationFailed("No manifest found. Please run setup first.".to_string()))
}

// Keep old decrypt_with_identity function for compatibility
pub fn decrypt_with_identity(identity_file: &str, encrypted_file: &str, _pin: &str) -> Result<Vec<u8>> {
    use std::io::Read;

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;

    let age_plugin_path = get_age_plugin_path();
    let bundled_bin_dir = age_plugin_path.parent().unwrap();
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", bundled_bin_dir.display(), current_path);

    let mut cmd = CommandBuilder::new("age");
    cmd.arg("-d");
    cmd.arg("-i");
    cmd.arg(identity_file);
    cmd.arg(encrypted_file);
    cmd.env("PATH", new_path);

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn age: {}", e)))?;

    let mut reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;

    let mut output = Vec::new();
    reader.read_to_end(&mut output)?;

    Ok(output)
}