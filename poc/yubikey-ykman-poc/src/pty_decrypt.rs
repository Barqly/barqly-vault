use crate::errors::{Result, YubiKeyError};
use crate::get_age_plugin_path;
use crate::manifest::YubiKeyManifest;
use crate::{log_pty, log_pty_raw, log_age, log_cmd};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{BufRead, BufReader, Read, Write};
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use log::{debug, info, warn, trace};

const TOUCH_TIMEOUT: Duration = Duration::from_secs(60);
const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);

#[derive(Debug, Clone)]
enum DecryptState {
    WaitingForPin,
    PinSent,
    WaitingForTouch,
    Decrypting,
    Complete,
    Failed(String),
}

fn process_pty_line(line: &str, tx: &mpsc::Sender<DecryptState>) {
    log_pty!("Processing line for state detection: {}", line);

    // State detection (adapted for decryption)
    if line.contains("Enter PIN") || line.contains("PIN:") {
        log_pty!("Detected PIN prompt, sending WaitingForPin state");
        let _ = tx.send(DecryptState::WaitingForPin);
    } else if line.contains("Touch your YubiKey") || line.contains("touch") {
        log_pty!("Detected touch prompt, sending WaitingForTouch state");
        let _ = tx.send(DecryptState::WaitingForTouch);
    } else if line.contains("Decrypting") || line.contains("age:") {
        log_pty!("Detected decryption in progress");
        let _ = tx.send(DecryptState::Decrypting);
    } else if line.contains("error") || line.contains("failed") || line.contains("Error") {
        log_pty!("Detected error: {}", line);
        let _ = tx.send(DecryptState::Failed(line.to_string()));
    }
}

/// Decrypt data using YubiKey with state machine pattern (like key generation)
/// This duplicates the successful key generation flow exactly
pub fn decrypt_with_state_machine(
    manifest: &YubiKeyManifest,
    encrypted_data: &[u8],
    pin: &str,
) -> Result<Vec<u8>> {
    info!("Starting YubiKey decryption with state machine pattern");
    log_age!("Starting decryption process for manifest with serial: {}", manifest.yubikey.serial);

    // Create tmp directory if it doesn't exist
    use crate::TMP_DIR;
    let cwd = std::env::current_dir()?;
    let tmp_dir = cwd.join(TMP_DIR);
    let _ = std::fs::create_dir_all(&tmp_dir);

    // Write encrypted data to temp file (using absolute path)
    let temp_encrypted = tmp_dir.join(format!("yubikey_decrypt_{}.age", std::process::id()));
    let temp_encrypted_str = temp_encrypted.display().to_string();
    std::fs::write(&temp_encrypted, encrypted_data)?;
    log_age!("Written encrypted data to: {} ({} bytes)", temp_encrypted_str, encrypted_data.len());

    // Create identity file from manifest (using absolute path)
    let temp_identity_path = tmp_dir.join(format!("yubikey_identity_{}.txt", manifest.yubikey.serial));
    let temp_identity_str = temp_identity_path.display().to_string();
    let content = format!(
        "#       Serial: {}, Slot: {}\n#   PIN policy: {}\n# Touch policy: {}\n#    Recipient: {}\n{}\n",
        manifest.yubikey.serial,
        manifest.yubikey.slot,
        manifest.yubikey.pin_policy,
        manifest.yubikey.touch_policy,
        manifest.age.recipient,
        manifest.age.identity
    );
    std::fs::write(&temp_identity_path, content)?;
    log_age!("Created identity file at: {}", temp_identity_str);

    // Create output file path (using absolute path)
    let temp_output = tmp_dir.join(format!("yubikey_decrypt_{}.txt", std::process::id()));
    let temp_output_str = temp_output.display().to_string();
    log_age!("Output will be written to: {}", temp_output_str);

    // Set up PTY (exactly like key generation)
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

    // Use age binary based on configuration
    use crate::USE_AGE_CRATE;
    let age_path = if USE_AGE_CRATE {
        // Use system age (would be from crate if it supported plugins)
        if std::path::Path::new("/usr/local/bin/age").exists() {
            "/usr/local/bin/age"
        } else {
            "age"
        }
    } else {
        // Explicitly use homebrew age
        if std::path::Path::new("/opt/homebrew/bin/age").exists() {
            "/opt/homebrew/bin/age"
        } else if std::path::Path::new("/usr/local/bin/age").exists() {
            "/usr/local/bin/age"
        } else {
            "age"
        }
    };

    log_age!("Using age binary at: {}", age_path);
    log_age!("Environment PATH: {}", new_path);
    log_age!("Temp identity file: {}", temp_identity_str);
    log_age!("Encrypted file: {}", temp_encrypted_str);

    let mut cmd = CommandBuilder::new(age_path);
    cmd.arg("-d");
    cmd.arg("-i");
    cmd.arg(&temp_identity_str);
    cmd.arg("-o");  // Output flag
    cmd.arg(&temp_output_str);  // Output file
    cmd.arg(&temp_encrypted_str);
    cmd.env("PATH", new_path);
    cmd.env("AGE_DEBUG", "1");  // Enable age debug output
    cmd.env("RUST_LOG", "trace");  // Enable plugin debug output
    // Don't set PIN in env - we'll send it interactively like in key gen

    log_cmd!(age_path, vec!["-d", "-i", &temp_identity_str, "-o", &temp_output_str, &temp_encrypted_str]);

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn age: {}", e)))?;

    info!("Age decryption process started with PID");
    log_pty!("PTY master/slave pair created successfully");

    // Get writer early to ensure we can send input
    let mut writer = pair.master
        .take_writer()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to get writer: {}", e)))?;

    // Set up channels for communication (exactly like key generation)
    let (tx, rx) = mpsc::channel::<DecryptState>();

    // Reader thread for PTY output (exactly like key generation)
    let reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        log_pty!("PTY reader thread started");
        let mut buf_reader = BufReader::new(reader);
        let mut buffer = String::new();
        let mut raw_buffer = [0u8; 1024];

        loop {
            // Try to read raw bytes for debugging
            match buf_reader.get_mut().read(&mut raw_buffer) {
                Ok(0) => {
                    log_pty!("PTY reader reached EOF (raw read)");
                    break;
                }
                Ok(n) => {
                    let raw_data = &raw_buffer[..n];
                    log_pty_raw!(raw_data);

                    // Process as string
                    if let Ok(text) = std::str::from_utf8(raw_data) {
                        for line in text.lines() {
                            log_pty!("PTY output line: {}", line);
                            process_pty_line(line, &tx_reader);
                        }
                        // Handle partial lines
                        if !text.ends_with('\n') {
                            if let Some(partial) = text.lines().last() {
                                log_pty!("PTY partial line: {}", partial);
                                process_pty_line(partial, &tx_reader);
                            }
                        }
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    // Non-blocking read, no data available
                    thread::sleep(Duration::from_millis(10));
                    continue;
                }
                Err(e) => {
                    log_pty!("PTY read error: {}", e);
                    break;
                }
            }

            // Original line-based reading as fallback
            buffer.clear();
            match buf_reader.read_line(&mut buffer) {
                Ok(0) => {
                    log_pty!("PTY reader reached EOF (line read)");
                    break;
                }
                Ok(_) => {
                    let line = buffer.trim();
                    log_pty!("PTY line output: {}", line);
                    process_pty_line(line, &tx_reader);
                }
                Err(e) => {
                    log_pty!("PTY line read error: {}", e);
                    break;
                }
            }
        }
        log_pty!("PTY reader thread exiting");
    });

    // Show touch prompt
    println!("\n╔════════════════════════════════════════════╗");
    println!("║   🔐 TOUCH YOUR YUBIKEY NOW TO DECRYPT!   ║");
    println!("╚════════════════════════════════════════════╝\n");

    // State machine for handling the interaction (exactly like key generation)
    let start = Instant::now();
    let mut pin_sent = false;
    let mut current_state = DecryptState::WaitingForPin;

    loop {
        if start.elapsed() > TOUCH_TIMEOUT {
            warn!("Operation timed out after {} seconds", TOUCH_TIMEOUT.as_secs());
            let _ = child.kill();
            // Don't clean up temp files on timeout - keep for debugging
            log_age!("TIMEOUT: Files kept for debugging at: {}, {}", temp_encrypted_str, temp_identity_str);
            return Err(YubiKeyError::TouchTimeout);
        }

        // Check for state updates from reader thread
        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(state) => {
                debug!("Received state from reader: {:?}", state);
                debug!("State transition: {:?} -> {:?}", current_state, state);
                current_state = state.clone();

                match state {
                    DecryptState::WaitingForPin => {
                        if !pin_sent {
                            // Send PIN after a small delay (like in key gen)
                            thread::sleep(PIN_INJECT_DELAY);
                            debug!("Sending PIN to PTY");
                            writeln!(writer, "{}", pin)
                                .map_err(|e| YubiKeyError::PtyError(format!("Failed to send PIN: {}", e)))?;
                            writer.flush()
                                .map_err(|e| YubiKeyError::PtyError(format!("Failed to flush: {}", e)))?;
                            pin_sent = true;
                            current_state = DecryptState::PinSent;
                        }
                    }
                    DecryptState::WaitingForTouch => {
                        info!("Waiting for YubiKey touch...");
                        // Send periodic nudges to keep PTY alive (exactly like key gen)
                        thread::sleep(Duration::from_secs(1));
                        let _ = writeln!(writer, "");
                        let _ = writer.flush();
                    }
                    DecryptState::Decrypting => {
                        info!("Decryption in progress...");
                    }
                    DecryptState::Failed(err) => {
                        warn!("Decryption failed: {}", err);
                        let _ = child.kill();
                        // Don't clean up temp files on failure - keep for debugging
                        log_age!("FAILED: Files kept for debugging at: {}, {}", temp_encrypted_str, temp_identity_str);
                        return Err(YubiKeyError::OperationFailed(err));
                    }
                    _ => {}
                }
            }
            Err(e) => {
                // No state update, check process status
                debug!("No state update received: {:?}", e);
                match child.try_wait() {
                    Ok(Some(status)) => {
                        debug!("Process exited with status: {:?}", status);

                        if status.success() {
                            // Read the decrypted output from file
                            match std::fs::read(&temp_output) {
                                Ok(decrypted_data) => {
                                    // Clean up temp files after successful decryption
                                    let _ = std::fs::remove_file(&temp_encrypted);
                                    let _ = std::fs::remove_file(&temp_identity_path);
                                    let _ = std::fs::remove_file(&temp_output);
                                    log_age!("SUCCESS! Cleaned up temp files");
                                    info!("Decryption successful, got {} bytes", decrypted_data.len());
                                    return Ok(decrypted_data);
                                }
                                Err(e) => {
                                    // Don't clean up temp files on error - keep for debugging
                                    log_age!("ERROR: Failed to read output file: {}", temp_output_str);
                                    return Err(YubiKeyError::OperationFailed(
                                        format!("Failed to read decrypted output: {}", e)
                                    ));
                                }
                            }
                        } else {
                            // Don't clean up temp files on error - keep for debugging
                            log_age!("ERROR: Process failed. Files kept at: {}, {}", temp_encrypted_str, temp_identity_str);
                            return Err(YubiKeyError::OperationFailed(
                                format!("Process exited with status: {:?}", status)
                            ));
                        }
                    }
                    Ok(None) => {
                        // Still running, send periodic nudges if waiting for touch
                        if matches!(current_state, DecryptState::WaitingForTouch) {
                            // Send empty line to keep PTY alive
                            let _ = writeln!(writer, "");
                            let _ = writer.flush();
                        }
                    }
                    Err(e) => {
                        // Don't clean up temp files on error - keep for debugging
                        log_age!("ERROR: Process check failed. Files kept for debugging");
                        return Err(YubiKeyError::PtyError(format!("Failed to check process: {}", e)));
                    }
                }
            }
        }
    }
}