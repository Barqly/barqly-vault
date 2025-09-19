use crate::errors::{Result, YubiKeyError};
use crate::USE_AGE_CRATE;
use log::info;

/// Encrypt data using age - either via crate or homebrew CLI
pub fn encrypt_with_yubikey(data: &[u8], recipient: &str) -> Result<Vec<u8>> {
    info!("Encrypting data with recipient: {recipient}");

    if USE_AGE_CRATE {
        info!("Using age crate for encryption (falls back to CLI due to plugin limitations)");
        encrypt_with_cli(data, recipient)
    } else {
        info!("Using homebrew age CLI for encryption");
        encrypt_with_cli(data, recipient)
    }
}

/// Internal function to encrypt using CLI
fn encrypt_with_cli(data: &[u8], recipient: &str) -> Result<Vec<u8>> {
    use std::io::Write;
    use std::process::{Command, Stdio};

    // Determine which age binary to use
    let age_command = if USE_AGE_CRATE {
        "age" // System age (would be from crate if it supported plugins)
    } else {
        "/opt/homebrew/bin/age" // Explicitly use homebrew age
    };

    let mut child = Command::new(age_command)
        .args(["-r", recipient])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    // Write data to stdin
    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(data)?;
    }

    let output = child.wait_with_output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(YubiKeyError::OperationFailed(format!(
            "Encryption failed: {stderr}"
        )));
    }

    Ok(output.stdout)
}

/// Decrypt data using YubiKey via PTY
/// The age crate doesn't support interactive plugin prompts, so we use PTY
pub fn decrypt_with_yubikey(
    encrypted_data: &[u8],
    _identity_file: &str,
    pin: &str,
) -> Result<Vec<u8>> {
    if USE_AGE_CRATE {
        info!("Using PTY-based decryption for YubiKey (age crate mode)");
    } else {
        info!("Using PTY-based decryption for YubiKey (homebrew age mode)");
    }
    crate::pty::decrypt_with_yubikey(encrypted_data, pin)
}

/// Decrypt using manifest
pub fn decrypt_with_manifest(
    encrypted_data: &[u8],
    manifest: &crate::manifest::YubiKeyManifest,
    pin: &str,
) -> Result<Vec<u8>> {
    if USE_AGE_CRATE {
        info!("Decrypting with YubiKey manifest (age crate mode)");
    } else {
        info!("Decrypting with YubiKey manifest (homebrew age mode)");
    }
    crate::pty_decrypt::decrypt_with_state_machine(manifest, encrypted_data, pin)
}
