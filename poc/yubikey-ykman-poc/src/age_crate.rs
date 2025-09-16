use log::info;
use crate::errors::{Result, YubiKeyError};

/// Encrypt data using age CLI (age crate plugin support is limited)
pub fn encrypt_with_yubikey(data: &[u8], recipient: &str) -> Result<Vec<u8>> {
    use std::process::{Command, Stdio};
    use std::io::Write;

    info!("Encrypting data with recipient: {}", recipient);

    // For now, use CLI since plugin support in age crate is limited
    let mut child = Command::new("age")
        .args(&["-r", recipient])
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
        return Err(YubiKeyError::OperationFailed(format!("Encryption failed: {}", stderr)));
    }

    Ok(output.stdout)
}

/// Decrypt data using YubiKey via PTY
/// The age crate doesn't support interactive plugin prompts, so we use PTY
pub fn decrypt_with_yubikey(encrypted_data: &[u8], _identity_file: &str, pin: &str) -> Result<Vec<u8>> {
    info!("Using PTY-based decryption for YubiKey");
    crate::pty::decrypt_with_yubikey(encrypted_data, pin)
}

/// Decrypt using manifest
pub fn decrypt_with_manifest(
    encrypted_data: &[u8],
    manifest: &crate::manifest::YubiKeyManifest,
    pin: &str
) -> Result<Vec<u8>> {
    info!("Decrypting with YubiKey manifest");
    crate::pty_decrypt::decrypt_with_state_machine(manifest, encrypted_data, pin)
}