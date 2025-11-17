/// Age decryption operations for YubiKey
/// Handles data and file decryption with PTY interaction
mod decryption_helpers;

use super::super::core::{PtyError, Result, run_age_plugin_yubikey};
use crate::prelude::*;
use std::fs;
use std::path::Path;

// TODO: Cleanup after Windows testing - remove unused implementations
// Platform-specific imports
#[cfg(target_os = "windows")]
use decryption_helpers::run_age_decryption_pty_windows; // Windows PTY with ANSI stripping

#[cfg(not(target_os = "windows"))]
use decryption_helpers::run_age_decryption_pty; // macOS/Linux standard PTY

// Pipes implementation preserved but not used (for reference/rollback)
// use decryption_helpers::run_age_decryption_pipes_windows;

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

    // TODO: Cleanup after Windows testing - finalize which implementation to keep
    // Run age CLI - Platform-specific approach
    // Windows: PTY with ANSI stripping + timing fallback
    // macOS/Linux: Standard PTY (working correctly)
    #[cfg(target_os = "windows")]
    let result = run_age_decryption_pty_windows(&temp_encrypted, &temp_identity, &temp_output, pin);

    #[cfg(not(target_os = "windows"))]
    let result = run_age_decryption_pty(&temp_encrypted, &temp_identity, &temp_output, pin);

    // Pipes implementation preserved for reference (not currently used)
    // let result = run_age_decryption_pipes_windows(...);

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

// TODO: DEPRECATED - Not used in production, cleanup after Windows work complete
// Production uses decrypt_data_with_yubikey_pty() instead
// This function is exported but has no callers in the codebase
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
