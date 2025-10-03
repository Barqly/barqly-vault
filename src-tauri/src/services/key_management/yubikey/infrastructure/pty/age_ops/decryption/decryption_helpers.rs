/// Internal PTY helpers for age decryption operations
use super::super::super::core::{
    COMMAND_TIMEOUT, PIN_INJECT_DELAY, PtyError, PtyState, Result, get_age_path,
};
use crate::prelude::*;
use std::path::Path;

/// Internal function to run age decryption with PTY
pub(super) fn run_age_decryption_pty(
    encrypted_file: &Path,
    identity_file: &Path,
    output_file: &Path,
    pin: &str,
) -> Result<()> {
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};
    use std::io::Write;
    use std::sync::mpsc;
    use std::thread;
    use std::time::Instant;

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
