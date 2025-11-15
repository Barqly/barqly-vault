/// Age decryption operations for YubiKey
/// Handles data and file decryption with PTY interaction
mod decryption_helpers;

use super::super::core::{PtyError, Result, run_age_plugin_yubikey};
use crate::prelude::*;
use decryption_helpers::run_age_decryption_pty;
use std::fs;
use std::path::Path;

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

    Ok(())
}

// ============================================================================
// TESTING: Pipes-based approach (no PTY) - Testing if this works on all platforms
// TODO: If successful, this may replace PTY approach above
// ============================================================================

/// EXPERIMENTAL: Decrypt data using age CLI with stdin/stdout pipes (no PTY)
/// Testing if we can eliminate PTY dependency and use simpler pipes approach
#[instrument(skip(encrypted_data, pin))]
pub fn decrypt_data_with_yubikey_pipes(
    encrypted_data: &[u8],
    serial: &str,
    slot: u8,
    recipient: &str,
    identity_tag: &str,
    pin: &str,
) -> Result<Vec<u8>> {
    use std::io::Write;
    use std::process::{Command, Stdio};
    use std::sync::Arc;

    info!(
        serial = %redact_serial(serial),
        slot = slot,
        recipient = %redact_key(recipient),
        data_size = encrypted_data.len(),
        "TESTING: YubiKey decryption with pipes (no PTY)"
    );

    // Get age binary path
    let age_path = super::super::core::get_age_path();

    // Create temporary identity file
    let temp_dir = std::env::temp_dir();
    let temp_identity = temp_dir.join(format!("yubikey_identity_pipes_{}.txt", std::process::id()));

    let identity_content = format!(
        "#       Serial: {}, Slot: {}\n#   PIN policy: cached\n# Touch policy: cached\n#    Recipient: {}\n{}\n",
        serial, slot, recipient, identity_tag
    );

    fs::write(&temp_identity, &identity_content).map_err(|e| {
        error!(error = %e, "Failed to write identity file");
        PtyError::Io(e)
    })?;

    // Set up PATH for plugin discovery
    let plugin_dir = age_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let current_path = std::env::var("PATH").unwrap_or_default();
    let paths = std::env::split_paths(&current_path)
        .chain(std::iter::once(plugin_dir.to_path_buf()));
    let new_path = std::env::join_paths(paths)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| current_path);

    // Spawn age CLI with pipes (similar to encryption pattern)
    let mut child = Command::new(&age_path)
        .arg("-d")
        .arg("-i")
        .arg(temp_identity.to_str().unwrap())
        .env("PATH", new_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            let _ = fs::remove_file(&temp_identity);
            error!(error = %e, "Failed to spawn age CLI");
            PtyError::PtyOperation(format!("Failed to spawn age: {e}"))
        })?;

    // Write encrypted data to stdin in separate thread (prevent deadlock)
    let stdin = child.stdin.take().ok_or_else(|| {
        let _ = fs::remove_file(&temp_identity);
        PtyError::PtyOperation("Failed to get stdin".to_string())
    })?;

    let data_arc = Arc::new(encrypted_data.to_vec());
    let data_for_thread = Arc::clone(&data_arc);

    let stdin_thread = std::thread::spawn(move || -> Result<()> {
        let mut stdin = stdin;
        stdin.write_all(&data_for_thread).map_err(|e| {
            error!(error = %e, "Failed to write to age stdin");
            PtyError::Io(e)
        })?;
        drop(stdin);
        Ok(())
    });

    // Read output while stdin writes concurrently
    let output = child.wait_with_output().map_err(|e| {
        let _ = fs::remove_file(&temp_identity);
        error!(error = %e, "Failed to wait for age process");
        PtyError::PtyOperation(format!("Age process failed: {e}"))
    })?;

    // Clean up identity file
    let _ = fs::remove_file(&temp_identity);

    // Ensure stdin thread completed
    stdin_thread
        .join()
        .map_err(|_| PtyError::PtyOperation("Stdin thread panicked".to_string()))?
        .map_err(|e| {
            error!(error = ?e, "Stdin thread failed");
            e
        })?;

    // Check success
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!(stderr = %stderr, "Age decryption failed");
        return Err(PtyError::PtyOperation(format!("Decryption failed: {}", stderr)));
    }

    debug!(
        encrypted_size = encrypted_data.len(),
        decrypted_size = output.stdout.len(),
        "TESTING: Pipes-based decryption succeeded!"
    );

    Ok(output.stdout)
}
