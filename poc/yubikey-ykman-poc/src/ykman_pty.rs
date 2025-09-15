use crate::errors::{Result, YubiKeyError};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};
use std::time::{Duration, Instant};
use std::thread;
use log::{debug, info};

const OPERATION_TIMEOUT: Duration = Duration::from_secs(10);

pub fn set_management_key_protected_pty(pin: &str, current_key: Option<&str>) -> Result<()> {
    info!("Setting protected TDES management key via PTY");
    
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to open PTY: {}", e)))?;
    
    let mut cmd = CommandBuilder::new("ykman");
    cmd.arg("piv");
    cmd.arg("access");
    cmd.arg("change-management-key");
    cmd.arg("-a");
    cmd.arg("TDES");
    cmd.arg("--protect");
    
    // Always generate a new random key for security
    cmd.arg("--generate");
    
    // If current key provided (factory default), use it for authentication
    if let Some(key) = current_key {
        debug!("Using factory default key for authentication (will be replaced)");
        cmd.arg("-m");
        cmd.arg(key);
    }
    
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to spawn ykman: {}", e)))?;
    
    // Reader thread for PTY output
    let mut reader = pair.master.try_clone_reader()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to clone reader: {}", e)))?;
    
    // Writer for sending PIN
    let mut writer = pair.master.take_writer()
        .map_err(|e| YubiKeyError::PtyError(format!("Failed to get writer: {}", e)))?;
    
    let start = Instant::now();
    let mut output_buffer = String::new();
    let mut pin_sent = false;
    let mut byte_buffer = [0u8; 1024];
    
    // Add small delay to let process start
    thread::sleep(Duration::from_millis(100));
    
    loop {
        if start.elapsed() > OPERATION_TIMEOUT {
            let _ = child.kill();
            return Err(YubiKeyError::OperationFailed("Management key change timed out".to_string()));
        }
        
        // Try non-blocking read
        match reader.read(&mut byte_buffer) {
            Ok(0) => {
                // EOF - check if process finished
                match child.try_wait() {
                    Ok(Some(status)) => {
                        if status.success() {
                            info!("Management key set to protected TDES");
                            return Ok(());
                        } else {
                            return Err(YubiKeyError::ManagementKeyError(
                                format!("Failed to set management key. Output: {}", output_buffer)
                            ));
                        }
                    }
                    Ok(None) => {
                        thread::sleep(Duration::from_millis(50));
                        continue;
                    }
                    Err(e) => {
                        return Err(YubiKeyError::PtyError(format!("Process error: {}", e)));
                    }
                }
            }
            Ok(n) => {
                let chunk = String::from_utf8_lossy(&byte_buffer[..n]);
                output_buffer.push_str(&chunk);
                debug!("PTY chunk: {}", chunk);
                
                // Look for PIN prompt in accumulated output
                if !pin_sent && (output_buffer.contains("Enter PIN") || 
                                 output_buffer.contains("PIN:") ||
                                 output_buffer.ends_with(":")) {
                    debug!("Detected PIN prompt, sending PIN");
                    writeln!(writer, "{}", pin)
                        .map_err(|e| YubiKeyError::PtyError(format!("Failed to send PIN: {}", e)))?;
                    writer.flush()
                        .map_err(|e| YubiKeyError::PtyError(format!("Failed to flush: {}", e)))?;
                    pin_sent = true;
                    output_buffer.clear(); // Clear after PIN sent
                }
                
                // Check for errors
                if output_buffer.contains("Error") || output_buffer.contains("Failed") {
                    let _ = child.kill();
                    return Err(YubiKeyError::ManagementKeyError(output_buffer));
                }
                
                // Check for success
                if output_buffer.contains("Management key changed") || 
                   output_buffer.contains("Success") ||
                   output_buffer.contains("Management key is stored on the YubiKey") {
                    info!("Management key successfully changed");
                    let _ = child.wait();
                    return Ok(());
                }
            }
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // No data available right now, wait a bit
                thread::sleep(Duration::from_millis(50));
                continue;
            }
            Err(e) => {
                debug!("Error reading PTY: {}", e);
                break;
            }
        }
    }
    
    // Final wait and status check
    match child.wait() {
        Ok(status) if status.success() => {
            info!("Management key set to protected TDES");
            Ok(())
        }
        _ => Err(YubiKeyError::ManagementKeyError(
            format!("Failed to set management key. Final output: {}", output_buffer)
        ))
    }
}