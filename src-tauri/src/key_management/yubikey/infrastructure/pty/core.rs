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

pub const TOUCH_TIMEOUT: Duration = Duration::from_secs(30);
pub const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);
pub const COMMAND_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Clone)]
pub enum PtyState {
    WaitingForPin,
    GeneratingKey, // Add this state for age-plugin-yubikey
    WaitingForTouch,
    TouchDetected,
    Complete(String),
    Failed(String),
}

/// Get path to age-plugin-yubikey binary
pub fn get_age_plugin_path() -> PathBuf {
    // First try bundled binary
    let bundled =
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/age-plugin-yubikey"
            } else if cfg!(target_os = "linux") {
                "linux/age-plugin-yubikey"
            } else {
                "windows/age-plugin-yubikey.exe"
            });

    if bundled.exists() {
        info!(path = %bundled.display(), "Using bundled age-plugin-yubikey");
        return bundled;
    }

    // Fall back to system binary
    debug!(bundled_path = %bundled.display(), "Bundled age-plugin-yubikey not found, using system binary");
    PathBuf::from("age-plugin-yubikey")
}

/// Get path to ykman binary
pub fn get_ykman_path() -> PathBuf {
    // First try bundled binary
    let bundled =
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/ykman"
            } else if cfg!(target_os = "linux") {
                "linux/ykman"
            } else {
                "windows/ykman.exe"
            });

    if bundled.exists() {
        return bundled;
    }

    // Fall back to system binary
    PathBuf::from("ykman")
}

/// Get path to age binary
pub fn get_age_path() -> PathBuf {
    // First try bundled binary
    let bundled =
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("bin")
            .join(if cfg!(target_os = "macos") {
                "darwin/age"
            } else if cfg!(target_os = "linux") {
                "linux/age"
            } else {
                "windows/age.exe"
            });

    if bundled.exists() {
        info!(path = %bundled.display(), "Using bundled age CLI");
        return bundled;
    }

    // Fall back to system binary
    debug!(bundled_path = %bundled.display(), "Bundled age not found, using system binary");
    PathBuf::from("age")
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
            rows: 24,
            cols: 80,
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
    debug!("PTY command spawned successfully");

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
                    } else if line.contains("Touch your YubiKey") || line.contains("touch") {
                        let _ = tx_reader.send(PtyState::WaitingForTouch);
                    } else if line.contains("age1yubikey") {
                        let _ = tx_reader.send(PtyState::Complete(line.to_string()));
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
                    debug!("PIN successfully sent after 'Generating key' message");
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
                    debug!("PIN successfully sent to age-plugin-yubikey");
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

/// Run ykman command through PTY
pub fn run_ykman_command(args: Vec<String>, pin: Option<&str>) -> Result<String> {
    info!(
        command = %format!("ykman {}", args.join(" ")),
        pin_provided = pin.is_some(),
        "Running ykman command"
    );

    let output = if pin.is_some() {
        // Use PTY for interactive commands
        run_ykman_pty(args, pin)?
    } else {
        // Use simple command execution for non-interactive commands
        let output = Command::new(get_ykman_path()).args(args).output()?;

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
            rows: 24,
            cols: 80,
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
            debug!("PIN injected successfully");
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
