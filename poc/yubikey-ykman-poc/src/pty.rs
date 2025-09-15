use crate::errors::{Result, YubiKeyError};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{BufRead, BufReader, Write};
use std::process::Command;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use log::{debug, info, warn};

const TOUCH_TIMEOUT: Duration = Duration::from_secs(30);
const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);

#[derive(Debug, Clone)]
pub enum PtyState {
    Starting,
    WaitingForGeneration,
    GeneratingKey,
    WaitingForTouch,
    Complete(String),
    Failed(String),
}

/// List existing age identities on the YubiKey
pub fn list_identities() -> Result<String> {
    let output = Command::new("age-plugin-yubikey")
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
    
    let mut cmd = CommandBuilder::new("age-plugin-yubikey");
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
                Ok(0) => break, // EOF
                Ok(_) => {
                    let line = buffer.trim();
                    debug!("PTY output: {}", line);
                    
                    if line.starts_with("age1yubikey") || line.starts_with("AGE-PLUGIN-YUBIKEY") {
                        recipient = line.to_string();
                        let _ = tx_reader.send(PtyState::Complete(recipient.clone()));
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
    
    // Writer for sending PIN
    let mut writer = pair.master.take_writer()
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

/// Decrypt data using YubiKey with PIN and touch prompts
pub fn decrypt_with_yubikey(encrypted_data: &[u8], pin: &str) -> Result<Vec<u8>> {
    use std::io::Read;
    use std::process::{Command, Stdio};
    use std::io::Write;
    
    info!("Starting YubiKey decryption");
    
    // First write encrypted data to a temp file
    let temp_file = "/tmp/yubikey_decrypt_temp.age";
    std::fs::write(temp_file, encrypted_data)?;
    
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;
    
    // Use age with automatic plugin detection
    // Set PATH to ensure age can find the plugin
    let mut cmd = CommandBuilder::new("age");
    cmd.arg("-d");
    cmd.arg(temp_file);
    // Add cargo bin and brew directories to PATH so age can find age-plugin-yubikey
    let home = std::env::var("HOME").unwrap_or_else(|_| "/Users/nauman".to_string());
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:{}", home, current_path);
    debug!("Setting PATH for age decryption: {}", new_path);
    cmd.env("PATH", new_path);
    
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn age: {}", e)))?;
    
    // Reader for PTY output
    let mut reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;
    
    // Writer for PIN input
    let mut writer = pair.master.take_writer()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to get writer: {}", e)))?;
    
    let mut output = Vec::new();
    let mut buffer = String::new();
    let mut buf_reader = BufReader::new(reader);
    let mut pin_sent = false;
    let mut touch_prompted = false;
    
    let start = Instant::now();
    
    loop {
        if start.elapsed() > Duration::from_secs(60) {
            let _ = child.kill();
            let _ = std::fs::remove_file(temp_file);
            return Err(YubiKeyError::TouchTimeout);
        }
        
        buffer.clear();
        match buf_reader.read_line(&mut buffer) {
            Ok(0) => {
                // EOF - check if process finished
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let _ = std::fs::remove_file(temp_file);
                        if status.success() {
                            return Ok(output);
                        } else {
                            return Err(YubiKeyError::OperationFailed("Decryption failed".to_string()));
                        }
                    }
                    Ok(None) => {
                        thread::sleep(Duration::from_millis(50));
                        continue;
                    }
                    Err(e) => {
                        let _ = std::fs::remove_file(temp_file);
                        return Err(YubiKeyError::PtyError(format!("Process error: {}", e)));
                    }
                }
            }
            Ok(_) => {
                let line = buffer.trim();
                debug!("Decrypt PTY output: {}", line);
                
                // Look for PIN prompt
                if !pin_sent && (line.contains("Enter PIN") || line.contains("PIN:")) {
                    debug!("PIN prompt detected, sending PIN");
                    writeln!(writer, "{}", pin)?;
                    writer.flush()?;
                    pin_sent = true;
                }
                // Look for touch prompt - show message immediately
                else if !touch_prompted && (line.contains("touch") || line.contains("Touch")) {
                    // Show touch prompt to user (always visible, not debug)
                    println!("\n╔════════════════════════════════════════════╗");
                    println!("║   🔐 TOUCH YOUR YUBIKEY NOW TO DECRYPT!   ║");
                    println!("╚════════════════════════════════════════════╝");
                    touch_prompted = true;
                }
                // Capture decrypted output (after PIN sent, before any error)
                else if pin_sent && !line.is_empty() && 
                        !line.contains("Enter PIN") && 
                        !line.contains("touch") && 
                        !line.contains("Error") && 
                        !line.contains("Failed") {
                    output.extend_from_slice(line.as_bytes());
                    output.push(b'\n');
                }
                
                // Check for errors
                if line.contains("Error") || line.contains("Failed") {
                    let _ = child.kill();
                    let _ = std::fs::remove_file(temp_file);
                    return Err(YubiKeyError::OperationFailed(line.to_string()));
                }
            }
            Err(e) => {
                debug!("Error reading PTY: {}", e);
                break;
            }
        }
    }
    
    // Cleanup and final wait
    let _ = std::fs::remove_file(temp_file);
    match child.wait() {
        Ok(status) if status.success() => Ok(output),
        _ => Err(YubiKeyError::OperationFailed("Decryption failed".to_string()))
    }
}

pub fn decrypt_with_identity(identity_file: &str, encrypted_file: &str, pin: &str) -> Result<Vec<u8>> {
    info!("Decrypting file with age-plugin-yubikey");
    
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;
    
    let mut cmd = CommandBuilder::new("age");
    cmd.arg("-d");
    cmd.arg("-i");
    cmd.arg(identity_file);
    cmd.arg(encrypted_file);
    
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn command: {}", e)))?;
    
    // Similar state machine for decryption
    // Implementation would follow same pattern as generation
    // For POC, we'll focus on generation first
    
    Err(YubiKeyError::OperationFailed("Decryption not yet implemented in POC".to_string()))
}