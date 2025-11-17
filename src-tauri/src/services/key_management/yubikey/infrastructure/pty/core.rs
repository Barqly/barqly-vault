/// Core PTY functionality for YubiKey operations
/// Provides low-level PTY command execution
use crate::prelude::*;
use portable_pty::{CommandBuilder, PtySize, native_pty_system};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::Command;
use std::sync::mpsc;
use std::thread;
use std::time::{Duration, Instant};
use thiserror::Error;

// Windows-specific process creation flags to hide console windows
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Error)]
pub enum PtyError {
    #[error("PTY operation failed: {0}")]
    PtyOperation(String),

    #[error("Command timeout after {0} seconds")]
    Timeout(u64),

    #[error("PIN operation failed: {0}")]
    PinFailed(String),

    #[error("Touch timeout - YubiKey was not touched within timeout period")]
    TouchTimeout,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

pub type Result<T> = std::result::Result<T, PtyError>;

// PTY operation timeouts
pub const TOUCH_TIMEOUT: Duration = Duration::from_secs(30);
pub const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);
pub const COMMAND_TIMEOUT: Duration = Duration::from_secs(60);

// PTY terminal dimensions
pub const PTY_ROWS: u16 = 24;

// Windows ConPTY strictly enforces column wrapping which breaks multi-line parsing
// Use wider columns to prevent age-plugin-yubikey output from wrapping
#[cfg(target_os = "windows")]
pub const PTY_COLS: u16 = 240;

// macOS/Linux PTY doesn't enforce strict wrapping, standard width works
#[cfg(not(target_os = "windows"))]
pub const PTY_COLS: u16 = 80;

#[derive(Debug, Clone)]
pub enum PtyState {
    WaitingForPin,
    GeneratingKey, // Add this state for age-plugin-yubikey
    WaitingForTouch,
    TouchDetected,
    DeviceStatusReport, // Windows ConPTY sends ESC[6n query, needs ESC[row;colR response
    Complete(String),
    Failed(String),
}

/// Get path to age-plugin-yubikey binary
pub fn get_age_plugin_path() -> PathBuf {
    use crate::services::shared::infrastructure::binary_resolver;

    binary_resolver::get_age_plugin_path().unwrap_or_else(|err| {
        error!("Failed to resolve age-plugin-yubikey: {}", err);
        // Fallback to legacy path for backward compatibility
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/age-plugin-yubikey"
            } else if cfg!(target_os = "linux") {
                "linux/age-plugin-yubikey"
            } else {
                "windows/age-plugin-yubikey.exe"
            })
    })
}

/// Get path to ykman binary (bundled only - no fallbacks)
pub fn get_ykman_path() -> PathBuf {
    use crate::services::shared::infrastructure::binary_resolver;

    binary_resolver::get_ykman_path().unwrap_or_else(|err| {
        error!("Failed to resolve ykman: {}", err);
        // Fallback to legacy path for backward compatibility
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/ykman"
            } else if cfg!(target_os = "linux") {
                "linux/ykman"
            } else {
                "windows/ykman.exe"
            })
    })
}

/// Get path to age binary (bundled only - no fallbacks)
pub fn get_age_path() -> PathBuf {
    use crate::services::shared::infrastructure::binary_resolver;

    binary_resolver::get_age_path().unwrap_or_else(|err| {
        error!("Failed to resolve age: {}", err);
        // Fallback to legacy path for backward compatibility
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/age"
            } else if cfg!(target_os = "linux") {
                "linux/age"
            } else {
                "windows/age.exe"
            })
    })
}

/// Run age-plugin-yubikey command with optional PIN injection
pub fn run_age_plugin_yubikey(
    args: Vec<String>,
    pin: Option<&str>,
    expect_touch: bool,
) -> Result<String> {
    let age_path = get_age_plugin_path();
    info!(
        command_path = %age_path.display(),
        args = %args.join(" "),
        pin_provided = pin.is_some(),
        expect_touch = expect_touch,
        "Starting age-plugin-yubikey command"
    );
    // Already logged above, remove duplicate

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: PTY_ROWS,
            cols: PTY_COLS,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| PtyError::PtyOperation(format!("Failed to open PTY: {e}")))?;

    let age_plugin_path = age_path.to_str().unwrap();
    debug!(command = %age_plugin_path, "Building PTY command");

    let mut cmd = CommandBuilder::new(age_plugin_path);
    for arg in &args {
        debug!(arg = %arg, "Adding command argument");
        cmd.arg(arg);
    }

    debug!("Spawning PTY command");
    let mut child = pair.slave.spawn_command(cmd).map_err(|e| {
        error!(error = %e, "Failed to spawn age-plugin-yubikey");
        PtyError::PtyOperation(format!("Failed to spawn command: {e}"))
    })?;

    let (tx, rx) = mpsc::channel::<PtyState>();

    // Reader thread
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to clone reader: {e}")))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        let mut buf_reader = BufReader::new(reader);
        let mut buffer = String::new();
        let mut output = String::new();

        loop {
            buffer.clear();
            match buf_reader.read_line(&mut buffer) {
                Ok(0) => {
                    // PTY reader reached EOF
                    break;
                }
                Ok(_n) => {
                    let line = buffer.trim();
                    output.push_str(&buffer);

                    // Critical: age-plugin-yubikey shows "Generating key" before expecting PIN
                    if line.contains("Generating key") {
                        let _ = tx_reader.send(PtyState::GeneratingKey);
                    } else if line.contains("Enter PIN")
                        || line.contains("PIN:")
                        || line.contains("PIN for")
                    {
                        let _ = tx_reader.send(PtyState::WaitingForPin);
                    } else if super::yubikey_prompt_patterns::is_touch_prompt(line) {
                        let _ = tx_reader.send(PtyState::WaitingForTouch);
                    } else if line.contains("AGE-PLUGIN-YUBIKEY-") {
                        // Identity tag found - this is the completion signal for generation
                        debug!(identity_tag = %line, "Found identity tag, generation complete");
                        let _ = tx_reader.send(PtyState::Complete(output.clone()));
                    } else if line.contains("age1yubikey") {
                        // Don't terminate early - identity tag comes after recipient
                        debug!(recipient_line = %line, "Found recipient line, continuing to read");
                    } else if line.contains("error") || line.contains("failed") {
                        let _ = tx_reader.send(PtyState::Failed(line.to_string()));
                    }
                }
                Err(_e) => {
                    // Error reading PTY - silent break
                    break;
                }
            }
        }

        let _ = tx_reader.send(PtyState::Complete(output));
    });

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to get writer: {e}")))?;

    let start = Instant::now();
    let mut pin_sent = false;
    let mut result = String::new();

    loop {
        if start.elapsed() > COMMAND_TIMEOUT {
            let _ = child.kill();
            return Err(PtyError::Timeout(COMMAND_TIMEOUT.as_secs()));
        }

        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(state) => match state {
                PtyState::GeneratingKey if pin.is_some() && !pin_sent => {
                    info!(
                        pin = %redact_pin(pin.unwrap()),
                        pin_length = pin.unwrap().len(),
                        "'Generating key' detected, proactively injecting PIN"
                    );
                    thread::sleep(PIN_INJECT_DELAY);
                    writeln!(writer, "{}", pin.unwrap())?;
                    writer.flush()?;
                    pin_sent = true;
                }
                PtyState::WaitingForPin if pin.is_some() && !pin_sent => {
                    info!(
                        pin = %redact_pin(pin.unwrap()),
                        pin_length = pin.unwrap().len(),
                        "PIN prompt detected, injecting PIN"
                    );
                    thread::sleep(PIN_INJECT_DELAY);
                    writeln!(writer, "{}", pin.unwrap())?;
                    writer.flush()?;
                    pin_sent = true;
                }
                PtyState::WaitingForTouch => {
                    info!("Touch your YubiKey now...");
                    if expect_touch && start.elapsed() > TOUCH_TIMEOUT {
                        let _ = child.kill();
                        return Err(PtyError::TouchTimeout);
                    }
                }
                PtyState::Complete(output) => {
                    result = output;
                    break;
                }
                PtyState::Failed(error) => {
                    return Err(PtyError::PtyOperation(error));
                }
                _ => {}
            },
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if process has exited
                match child.try_wait() {
                    Ok(Some(status)) => {
                        if !status.success() {
                            return Err(PtyError::PtyOperation("Command failed".to_string()));
                        }
                        break;
                    }
                    _ => continue,
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let _ = child.wait();
    info!(
        result_length = result.len(),
        "age-plugin-yubikey command completed"
    );
    if result.is_empty() {
        warn!(args = ?args, "age-plugin-yubikey returned empty result");
    }
    Ok(result)
}

// ============================================================================
// Windows-Specific Implementation with DSR Response and CRLF
// ============================================================================
// NOTE: Windows ConPTY requires:
// 1. DSR response (ESC[1;1R) when it sends ESC[6n query
// 2. CRLF (\r\n) line endings for PIN input (canonical mode)
// macOS/Linux use original function above (working correctly)
// ============================================================================

/// Windows-specific: Run age-plugin-yubikey with ConPTY DSR handling and CRLF
#[cfg(target_os = "windows")]
pub fn run_age_plugin_yubikey_windows(
    args: Vec<String>,
    pin: Option<&str>,
    expect_touch: bool,
) -> Result<String> {
    use std::io::Read;

    let age_path = get_age_plugin_path();
    info!(
        command_path = %age_path.display(),
        args = %args.join(" "),
        pin_provided = pin.is_some(),
        expect_touch = expect_touch,
        "Starting age-plugin-yubikey command (Windows with DSR/CRLF)"
    );

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: PTY_ROWS,
            cols: PTY_COLS,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| PtyError::PtyOperation(format!("Failed to open PTY: {e}")))?;

    let age_plugin_path = age_path.to_str().unwrap();
    debug!(command = %age_plugin_path, "Building PTY command (Windows)");

    let mut cmd = CommandBuilder::new(age_plugin_path);
    for arg in &args {
        debug!(arg = %arg, "Adding command argument");
        cmd.arg(arg);
    }

    debug!("Spawning PTY command (Windows)");
    let mut child = pair.slave.spawn_command(cmd).map_err(|e| {
        error!(error = %e, "Failed to spawn age-plugin-yubikey");
        PtyError::PtyOperation(format!("Failed to spawn command: {e}"))
    })?;

    let (tx, rx) = mpsc::channel::<PtyState>();

    // Reader thread with raw read for DSR detection and ANSI stripping
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to clone reader: {e}")))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        let mut reader = reader;
        let mut raw_buffer = [0u8; 4096];
        let mut clean_output = String::new(); // Stripped text for parser (accumulated from chunks)

        loop {
            match reader.read(&mut raw_buffer) {
                Ok(0) => break,
                Ok(n) => {
                    let raw_data = &raw_buffer[..n];

                    // Log raw bytes for Windows debugging
                    debug!(
                        raw_hex = ?raw_data.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>(),
                        raw_len = n,
                        "Raw PTY bytes (Windows key gen)"
                    );

                    // Detect DSR query
                    if raw_data.windows(4).any(|w| w == b"\x1b[6n") {
                        debug!("Device Status Report query (ESC[6n) detected (Windows key gen)");
                        let _ = tx_reader.send(PtyState::DeviceStatusReport);
                    }

                    // Strip ANSI from THIS chunk only
                    let chunk_stripped = strip_ansi_escapes::strip(raw_data);
                    if let Ok(chunk_clean) = String::from_utf8(chunk_stripped) {
                        clean_output.push_str(&chunk_clean); // APPEND!

                        // Check patterns in this chunk
                        if chunk_clean.contains("Generating key") {
                            debug!("Generating key detected");
                            let _ = tx_reader.send(PtyState::GeneratingKey);
                        } else if chunk_clean.contains("Enter PIN") || chunk_clean.contains("PIN:")
                        {
                            debug!("PIN prompt detected");
                            let _ = tx_reader.send(PtyState::WaitingForPin);
                        } else if super::yubikey_prompt_patterns::is_touch_prompt(&chunk_clean) {
                            debug!("Touch prompt detected");
                            let _ = tx_reader.send(PtyState::WaitingForTouch);
                        } else if chunk_clean.contains("AGE-PLUGIN-YUBIKEY-") {
                            debug!(output_length = clean_output.len(), "Identity tag found");
                            let _ = tx_reader.send(PtyState::Complete(clean_output.clone()));
                        } else if chunk_clean.contains("error") || chunk_clean.contains("failed") {
                            debug!("Error detected");
                            let _ = tx_reader.send(PtyState::Failed(chunk_clean.to_string()));
                        }
                    } else {
                        debug!("Failed to convert stripped chunk to UTF-8, skipping");
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(50));
                    continue;
                }
                Err(_) => break,
            }
        }

        debug!(
            final_output_length = clean_output.len(),
            "Reader thread exiting"
        );
        let _ = tx_reader.send(PtyState::Complete(clean_output));
    });

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to get writer: {e}")))?;

    let start = Instant::now();
    let mut pin_sent = false;
    let mut result = String::new();

    loop {
        if start.elapsed() > COMMAND_TIMEOUT {
            let _ = child.kill();
            return Err(PtyError::Timeout(COMMAND_TIMEOUT.as_secs()));
        }

        match rx.recv_timeout(Duration::from_millis(100)) {
            Ok(state) => match state {
                PtyState::DeviceStatusReport => {
                    debug!("Responding to DSR query (Windows key gen)");
                    write!(writer, "\x1b[1;1R")
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to send DSR: {e}")))?;
                    writer
                        .flush()
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to flush DSR: {e}")))?;
                    debug!("Sent DSR response (Windows key gen)");
                }
                PtyState::GeneratingKey if pin.is_some() && !pin_sent => {
                    info!(
                        pin = %redact_pin(pin.unwrap()),
                        pin_length = pin.unwrap().len(),
                        "'Generating key' detected, injecting PIN (Windows)"
                    );
                    thread::sleep(PIN_INJECT_DELAY);
                    // CRITICAL: Windows CRLF line ending
                    write!(writer, "{}\r\n", pin.unwrap())
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to send PIN: {e}")))?;
                    writer.flush()?;
                    pin_sent = true;
                    debug!("PIN sent for key generation (Windows CRLF)");
                }
                PtyState::WaitingForPin if pin.is_some() && !pin_sent => {
                    info!(
                        pin = %redact_pin(pin.unwrap()),
                        pin_length = pin.unwrap().len(),
                        "PIN prompt detected, injecting PIN (Windows)"
                    );
                    thread::sleep(PIN_INJECT_DELAY);
                    // CRITICAL: Windows CRLF line ending
                    write!(writer, "{}\r\n", pin.unwrap())
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to send PIN: {e}")))?;
                    writer.flush()?;
                    pin_sent = true;
                    debug!("PIN sent successfully (Windows CRLF)");
                }
                PtyState::WaitingForTouch => {
                    info!("Touch your YubiKey now... (Windows)");
                    if expect_touch && start.elapsed() > TOUCH_TIMEOUT {
                        let _ = child.kill();
                        return Err(PtyError::TouchTimeout);
                    }
                }
                PtyState::Complete(output) => {
                    result = output;
                    break;
                }
                PtyState::Failed(error) => {
                    return Err(PtyError::PtyOperation(error));
                }
                _ => {}
            },
            Err(mpsc::RecvTimeoutError::Timeout) => match child.try_wait() {
                Ok(Some(status)) => {
                    if !status.success() {
                        return Err(PtyError::PtyOperation(
                            "Command failed (Windows)".to_string(),
                        ));
                    }
                    break;
                }
                _ => continue,
            },
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let _ = child.wait();
    info!(
        result_length = result.len(),
        "age-plugin-yubikey command completed (Windows)"
    );
    if result.is_empty() {
        warn!(args = ?args, "age-plugin-yubikey returned empty result (Windows)");
    }
    Ok(result)
}

/// Run ykman command through PTY
pub fn run_ykman_command(args: Vec<String>, pin: Option<&str>) -> Result<String> {
    // Security: No logging when PIN is in scope - maximum security

    let output = if pin.is_some() {
        // Use PTY for interactive commands
        run_ykman_pty(args, pin)?
    } else {
        // Use simple command execution for non-interactive commands
        let mut cmd = Command::new(get_ykman_path());
        cmd.args(args);

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let output = cmd.output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(PtyError::PtyOperation(format!("ykman failed: {stderr}")));
        }

        String::from_utf8_lossy(&output.stdout).to_string()
    };

    Ok(output)
}

/// Internal: Run ykman with PTY for PIN injection
fn run_ykman_pty(args: Vec<String>, pin: Option<&str>) -> Result<String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: PTY_ROWS,
            cols: PTY_COLS,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| PtyError::PtyOperation(format!("Failed to open PTY: {e}")))?;

    let mut cmd = CommandBuilder::new(get_ykman_path().to_str().unwrap());
    for arg in args {
        cmd.arg(arg);
    }

    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| PtyError::PtyOperation(format!("Failed to spawn command: {e}")))?;

    // Similar PTY handling as age-plugin-yubikey
    // but adapted for ykman's output patterns

    let mut output = String::new();
    let reader = BufReader::new(
        pair.master
            .try_clone_reader()
            .map_err(|e| PtyError::PtyOperation(format!("Failed to clone reader: {e}")))?,
    );
    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to take writer: {e}")))?;

    for line in reader.lines() {
        let line = line?;
        debug!(output = %line, "ykman output line");
        output.push_str(&line);
        output.push('\n');

        if pin.is_some() && (line.contains("PIN:") || line.contains("Enter PIN")) {
            info!("PIN prompt detected, injecting redacted PIN");
            thread::sleep(PIN_INJECT_DELAY);
            writeln!(writer, "{}", pin.unwrap())?;
            writer.flush()?;
        }
    }

    let status = child.wait()?;
    if !status.success() {
        error!(output_length = output.len(), "ykman command failed");
        return Err(PtyError::PtyOperation(format!("ykman failed: {output}")));
    }

    info!(output_length = output.len(), "ykman command succeeded");
    Ok(output)
}
