/// Core PTY functionality for YubiKey operations
/// Provides low-level PTY command execution
use crate::logging::{log_debug, log_info, log_warn};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
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

const TOUCH_TIMEOUT: Duration = Duration::from_secs(30);
const PIN_INJECT_DELAY: Duration = Duration::from_millis(300);
const COMMAND_TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Debug, Clone)]
pub enum PtyState {
    WaitingForPin,
    GeneratingKey,
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
        log_info(&format!("Using bundled age-plugin-yubikey at: {:?}", bundled));
        return bundled;
    }

    // Fall back to system binary
    log_info(&format!("Bundled age-plugin-yubikey not found at {:?}, using system binary", bundled));
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

/// Run age-plugin-yubikey command with optional PIN injection
pub fn run_age_plugin_yubikey(
    args: Vec<String>,
    pin: Option<&str>,
    expect_touch: bool,
) -> Result<String> {
    let age_path = get_age_plugin_path();
    log_info(&format!("Running age-plugin-yubikey from: {:?}", age_path));
    log_info(&format!("Command: age-plugin-yubikey {}", args.join(" ")));
    log_info(&format!("PIN provided: {}, Expect touch: {}", pin.is_some(), expect_touch));
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
    log_debug(&format!("Building command: {}", age_plugin_path));

    let mut cmd = CommandBuilder::new(age_plugin_path);
    for arg in &args {
        log_debug(&format!("  Adding arg: {}", arg));
        cmd.arg(arg);
    }

    log_info("Spawning PTY command...");
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| {
            log_warn(&format!("Failed to spawn age-plugin-yubikey: {}", e));
            PtyError::PtyOperation(format!("Failed to spawn command: {e}"))
        })?;
    log_info("PTY command spawned successfully");

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

                    // Check for PIN prompt - age-plugin-yubikey uses "Enter PIN for YubiKey"
                    if line.contains("Enter PIN") || line.contains("PIN:") || line.contains("PIN for") {
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
                PtyState::WaitingForPin if pin.is_some() && !pin_sent => {
                    log_info(&format!("PIN prompt detected, injecting PIN: {} (length: {})",
                        if pin.unwrap() == "123456" { "DEFAULT" } else { "CUSTOM" },
                        pin.unwrap().len()));
                    thread::sleep(PIN_INJECT_DELAY);
                    writeln!(writer, "{}", pin.unwrap())?;
                    writer.flush()?;
                    pin_sent = true;
                    log_info("PIN successfully sent to age-plugin-yubikey");
                }
                PtyState::WaitingForTouch => {
                    log_info("Touch your YubiKey now...");
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
    log_info(&format!("age-plugin-yubikey command completed, result length: {}", result.len()));
    if result.is_empty() {
        log_warn(&format!("age-plugin-yubikey returned empty result for args: {:?}", args));
    }
    Ok(result)
}

/// Run ykman command through PTY
pub fn run_ykman_command(args: Vec<String>, pin: Option<&str>) -> Result<String> {
    log_info(&format!("Running ykman command: ykman {}", args.join(" ")));
    log_debug(&format!("PIN provided: {}", pin.is_some()));

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
        log_debug(&format!("ykman output: {}", line));
        output.push_str(&line);
        output.push('\n');

        if pin.is_some() && (line.contains("PIN:") || line.contains("Enter PIN")) {
            log_info(&format!("PIN prompt detected, injecting PIN"));
            thread::sleep(PIN_INJECT_DELAY);
            writeln!(writer, "{}", pin.unwrap())?;
            writer.flush()?;
            log_info("PIN injected successfully");
        }
    }

    let status = child.wait()?;
    if !status.success() {
        log_warn(&format!("ykman command failed with output: {}", output));
        return Err(PtyError::PtyOperation(format!("ykman failed: {output}")));
    }

    log_info(&format!("ykman command succeeded, output length: {} bytes", output.len()));
    Ok(output)
}
