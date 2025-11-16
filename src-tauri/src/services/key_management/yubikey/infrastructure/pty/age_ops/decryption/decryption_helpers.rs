/// Internal PTY helpers for age decryption operations
use super::super::super::core::{
    COMMAND_TIMEOUT, PIN_INJECT_DELAY, PtyError, PtyState, Result, get_age_path,
};
use crate::prelude::*;
use crate::services::key_management::yubikey::infrastructure::pty::yubikey_prompt_patterns;
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

    // Build PATH with platform-specific separator (: on Unix, ; on Windows)
    let current_path = std::env::var("PATH").unwrap_or_default();
    let paths =
        std::env::split_paths(&current_path).chain(std::iter::once(plugin_dir.to_path_buf()));
    let new_path = std::env::join_paths(paths)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_e| current_path.clone());

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
                                } else if yubikey_prompt_patterns::is_touch_prompt(&line) {
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
                            } else if yubikey_prompt_patterns::is_touch_prompt(remaining) {
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

// ============================================================================
// Windows-Specific PTY Implementation with ANSI Stripping
// ============================================================================
// NOTE: Windows ConPTY sends ANSI escape sequences instead of plain text.
// macOS gets: "Enter PIN for YubiKey..."
// Windows gets: ESC[6n (control sequence)
// Solution: Strip ANSI sequences + timing-based PIN injection fallback
// ============================================================================

/// Windows-specific: Run age decryption with PTY and ANSI sequence stripping
/// This handles Windows ConPTY's behavior of sending escape sequences instead of plain text
#[cfg(target_os = "windows")]
pub(super) fn run_age_decryption_pty_windows(
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
    debug!(age_path = %age_path.display(), "Using age binary (Windows PTY with ANSI stripping)");

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
    let paths =
        std::env::split_paths(&current_path).chain(std::iter::once(plugin_dir.to_path_buf()));
    let new_path = std::env::join_paths(paths)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_e| current_path.clone());

    // Build command
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
        "Executing age decryption command (Windows PTY)"
    );

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| {
        error!(error = %e, "Failed to spawn age CLI");
        PtyError::PtyOperation(format!("Failed to spawn age: {e}"))
    })?;

    debug!("Age CLI process spawned successfully (Windows PTY)");

    let (tx, rx) = mpsc::channel::<PtyState>();

    // Reader thread with ANSI stripping and raw byte logging
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to clone reader: {e}")))?;

    let tx_reader = tx.clone();
    thread::spawn(move || {
        use std::io::Read;

        let mut raw_buffer = [0u8; 4096]; // Larger buffer for Windows
        let mut accumulated_output = String::new();
        let mut accumulated_raw = Vec::new();

        loop {
            match reader.read(&mut raw_buffer) {
                Ok(0) => {
                    debug!(
                        final_accumulated_len = accumulated_output.len(),
                        "PTY reader reached EOF (Windows)"
                    );
                    break;
                }
                Ok(n) => {
                    let raw_data = &raw_buffer[..n];

                    // CRITICAL: Log raw bytes in hex to see EXACTLY what ConPTY sends
                    debug!(
                        raw_hex = ?raw_data.iter().map(|b| format!("{:02x}", b)).collect::<Vec<_>>(),
                        raw_len = n,
                        "Raw PTY bytes (Windows)"
                    );

                    // Convert to string and log before stripping
                    if let Ok(text) = std::str::from_utf8(raw_data) {
                        accumulated_output.push_str(text);
                        accumulated_raw.extend_from_slice(raw_data);
                        debug!(raw_text = %text, "Raw PTY text before stripping (Windows)");

                        // Try stripping ANSI sequences to extract clean text
                        let stripped_bytes = strip_ansi_escapes::strip(&accumulated_raw);
                        if let Ok(clean_text) = String::from_utf8(stripped_bytes) {
                            let trimmed = clean_text.trim();
                            if !trimmed.is_empty() {
                                debug!(clean_text = %trimmed, "Stripped text (Windows - after ANSI removal)");

                                // Pattern matching on clean text
                                if trimmed.contains("Enter PIN")
                                    || trimmed.contains("PIN:")
                                    || trimmed.contains("PIN for")
                                {
                                    info!("🔐 PIN prompt detected (after ANSI stripping)");
                                    let _ = tx_reader.send(PtyState::WaitingForPin);
                                } else if yubikey_prompt_patterns::is_touch_prompt(trimmed) {
                                    info!("👆 Touch prompt detected (after ANSI stripping)");
                                    let _ = tx_reader.send(PtyState::WaitingForTouch);
                                } else if trimmed.contains("error")
                                    || trimmed.contains("failed")
                                    || trimmed.contains("Error")
                                    || trimmed.contains("Failed")
                                {
                                    error!(error_line = %trimmed, "Age CLI error detected (Windows)");
                                    let _ = tx_reader.send(PtyState::Failed(trimmed.to_string()));
                                }
                            }
                        }

                        // Also check partial accumulated output (without stripping) for immediate patterns
                        let remaining = accumulated_output.trim();
                        if !remaining.is_empty() {
                            if remaining.contains("Enter PIN")
                                || remaining.contains("PIN:")
                                || remaining.contains("PIN for")
                            {
                                info!("🔐 PIN prompt detected (partial, Windows)");
                                let _ = tx_reader.send(PtyState::WaitingForPin);
                            } else if yubikey_prompt_patterns::is_touch_prompt(remaining) {
                                info!("👆 Touch prompt detected (partial, Windows)");
                                let _ = tx_reader.send(PtyState::WaitingForTouch);
                            }
                        }
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    continue;
                }
                Err(e) => {
                    debug!(error = %e, "PTY read error, exiting reader (Windows)");
                    break;
                }
            }
        }
        debug!(
            accumulated_len = accumulated_output.len(),
            accumulated_raw_len = accumulated_raw.len(),
            "PTY reader thread exiting (Windows)"
        );
    });

    let mut writer = pair
        .master
        .take_writer()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to get writer: {e}")))?;

    // CRITICAL: Proactively respond to expected Device Status Report (ESC[6n) query
    // ConPTY will send this query and block if we don't respond
    // Send cursor position response immediately to prevent blocking
    info!("Sending proactive DSR response to prevent ConPTY blocking (Windows)");
    write!(writer, "\x1b[1;1R")
        .map_err(|e| PtyError::PtyOperation(format!("Failed to write DSR response: {e}")))?;
    writer
        .flush()
        .map_err(|e| PtyError::PtyOperation(format!("Failed to flush DSR response: {e}")))?;
    debug!("Sent proactive cursor position response (ESC[1;1R) to ConPTY");

    let start = Instant::now();
    let mut pin_sent = false;
    let mut last_activity = Instant::now();

    info!("🔐 Touch your YubiKey when prompted to complete decryption!");

    loop {
        if start.elapsed() > COMMAND_TIMEOUT {
            warn!("Operation timed out (Windows PTY)");
            let _ = child.kill();
            return Err(PtyError::Timeout(COMMAND_TIMEOUT.as_secs()));
        }

        // WINDOWS ENHANCEMENT: Timing-based PIN injection fallback
        // If no PIN prompt detected after 300ms, inject PIN anyway
        // (user testing shows instant touch works, 300ms is safe initialization time)
        if !pin_sent && start.elapsed() > std::time::Duration::from_millis(300) {
            info!("No PIN prompt detected after 300ms, injecting PIN (timing fallback - Windows)");
            thread::sleep(PIN_INJECT_DELAY);
            writeln!(writer, "{}", pin)
                .map_err(|e| PtyError::PtyOperation(format!("Failed to send PIN: {e}")))?;
            writer
                .flush()
                .map_err(|e| PtyError::PtyOperation(format!("Failed to flush: {e}")))?;
            pin_sent = true;
            last_activity = Instant::now();
            debug!("PIN sent via timing fallback (Windows)");
        }

        match rx.recv_timeout(std::time::Duration::from_millis(100)) {
            Ok(state) => {
                last_activity = Instant::now();
                match state {
                    PtyState::WaitingForPin if !pin_sent => {
                        info!("PIN prompt detected, injecting PIN (Windows)");
                        thread::sleep(PIN_INJECT_DELAY);
                        writeln!(writer, "{}", pin).map_err(|e| {
                            PtyError::PtyOperation(format!("Failed to send PIN: {e}"))
                        })?;
                        writer
                            .flush()
                            .map_err(|e| PtyError::PtyOperation(format!("Failed to flush: {e}")))?;
                        pin_sent = true;
                        debug!("PIN sent successfully (Windows)");
                    }
                    PtyState::WaitingForTouch => {
                        info!("👆 Please touch your YubiKey to complete decryption... (Windows)");
                        thread::sleep(std::time::Duration::from_millis(500));
                    }
                    PtyState::Failed(err) => {
                        warn!(error = %err, "Decryption failed (Windows)");
                        let _ = child.kill();
                        return Err(PtyError::PtyOperation(err));
                    }
                    _ => {}
                }
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if process has exited
                match child.try_wait() {
                    Ok(Some(status)) => {
                        debug!(status = ?status, "Process exited (Windows)");
                        if status.success() {
                            info!("Age decryption completed successfully (Windows PTY)");
                            return Ok(());
                        } else {
                            return Err(PtyError::PtyOperation(
                                "Age CLI process failed (Windows)".to_string(),
                            ));
                        }
                    }
                    Ok(None) => {
                        // Still running
                        continue;
                    }
                    Err(e) => {
                        return Err(PtyError::PtyOperation(format!(
                            "Failed to check process (Windows): {e}"
                        )));
                    }
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
        }
    }

    let _ = child.wait();
    info!("Age CLI decryption process completed (Windows PTY)");
    Ok(())
}

// ============================================================================
// Windows-Specific Pipes Implementation
// ============================================================================
// NOTE: Windows ConPTY does not properly forward stderr text to PTY master.
// The "waiting on yubikey plugin..." message appears on screen but not in PTY reads.
// Solution: Use pipes with explicit stderr monitoring on Windows only.
// macOS/Linux continue using PTY (working correctly).
// ============================================================================

/// Windows-specific: Run age decryption with pipes and stderr monitoring
/// This is used ONLY on Windows because ConPTY doesn't forward stderr text properly.
/// The "waiting on yubikey plugin..." message goes to stderr but isn't captured by PTY.
#[cfg(target_os = "windows")]
pub(super) fn run_age_decryption_pipes_windows(
    encrypted_file: &Path,
    identity_file: &Path,
    output_file: &Path,
    pin: &str,
) -> Result<()> {
    use std::io::{BufRead, BufReader, Write};
    use std::os::windows::process::CommandExt;
    use std::process::{Command, Stdio};
    use std::sync::mpsc;
    use std::thread;
    use std::time::Instant;

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let age_path = get_age_path();
    debug!(age_path = %age_path.display(), "Using age binary (Windows pipes mode)");

    // Set up PATH for age-plugin-yubikey discovery
    let plugin_dir = age_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new("."));

    let current_path = std::env::var("PATH").unwrap_or_default();
    let paths =
        std::env::split_paths(&current_path).chain(std::iter::once(plugin_dir.to_path_buf()));
    let new_path = std::env::join_paths(paths)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_e| current_path.clone());

    debug!(
        command = %format!("age -d -i {} -o {} {}",
            identity_file.display(),
            output_file.display(),
            encrypted_file.display()
        ),
        "Executing age decryption command (Windows pipes)"
    );

    // Spawn age CLI with piped stdin/stdout/stderr
    let mut child = Command::new(&age_path)
        .arg("-d")
        .arg("-i")
        .arg(identity_file.to_str().unwrap())
        .arg("-o")
        .arg(output_file.to_str().unwrap())
        .arg(encrypted_file.to_str().unwrap())
        .env("PATH", new_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| {
            error!(error = %e, "Failed to spawn age CLI");
            PtyError::PtyOperation(format!("Failed to spawn age: {e}"))
        })?;

    debug!("Age CLI process spawned successfully (Windows pipes)");

    let (tx, rx) = mpsc::channel::<PtyState>();

    // Take stdin for PIN injection
    let mut stdin = child
        .stdin
        .take()
        .ok_or_else(|| PtyError::PtyOperation("Failed to get stdin".to_string()))?;

    // Stderr reader thread - monitors for "waiting on yubikey plugin..."
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| PtyError::PtyOperation("Failed to get stderr".to_string()))?;

    let tx_stderr = tx.clone();
    thread::spawn(move || {
        use std::io::Read;

        let mut stderr = stderr;
        let mut buffer = [0u8; 1024];
        let mut accumulated = String::new();

        loop {
            match stderr.read(&mut buffer) {
                Ok(0) => {
                    debug!("Stderr reached EOF");
                    break;
                }
                Ok(n) => {
                    // Convert bytes to string and accumulate
                    if let Ok(text) = std::str::from_utf8(&buffer[..n]) {
                        accumulated.push_str(text);
                        debug!(stderr_chunk = %text, chunk_size = n, "Raw stderr chunk received");

                        // Pattern matching on accumulated text (doesn't require complete lines)
                        if accumulated.contains("Enter PIN")
                            || accumulated.contains("PIN:")
                            || accumulated.contains("PIN for")
                        {
                            info!("🔐 PIN prompt detected (stderr)");
                            let _ = tx_stderr.send(PtyState::WaitingForPin);
                        } else if accumulated.contains("waiting on")
                            || yubikey_prompt_patterns::is_touch_prompt(&accumulated)
                        {
                            info!("👆 Touch prompt detected (stderr): {}", accumulated.trim());
                            let _ = tx_stderr.send(PtyState::WaitingForTouch);
                        } else if accumulated.contains("error")
                            || accumulated.contains("failed")
                            || accumulated.contains("Error")
                            || accumulated.contains("Failed")
                        {
                            error!(error_text = %accumulated.trim(), "Age CLI error detected (stderr)");
                            let _ =
                                tx_stderr.send(PtyState::Failed(accumulated.trim().to_string()));
                        }
                    } else {
                        debug!(bytes = n, "Non-UTF8 data in stderr, skipping");
                    }
                }
                Err(e) => {
                    debug!(error = %e, "Stderr read error, exiting reader");
                    break;
                }
            }
        }
        debug!(
            accumulated_length = accumulated.len(),
            "Stderr reader thread exiting"
        );
    });

    // Stdout reader thread - just consume output (actual decrypted data goes to file)
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| PtyError::PtyOperation("Failed to get stdout".to_string()))?;

    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(line) = line {
                if !line.is_empty() {
                    debug!(stdout_line = %line, "Age CLI stdout");
                }
            }
        }
        debug!("Stdout reader thread exiting");
    });

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
                    writeln!(stdin, "{}", pin)
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to send PIN: {e}")))?;
                    stdin
                        .flush()
                        .map_err(|e| PtyError::PtyOperation(format!("Failed to flush: {e}")))?;
                    pin_sent = true;
                    debug!("PIN sent successfully");
                }
                PtyState::WaitingForTouch => {
                    info!("👆 Please touch your YubiKey to complete decryption...");
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
                            info!("Age decryption completed successfully (Windows pipes)");
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
    info!("Age CLI decryption process completed (Windows pipes)");
    Ok(())
}
