/// Age encryption operations for YubiKey
/// Handles encryption for YubiKey recipients
use super::super::core::{PtyError, Result, run_age_plugin_yubikey};
use crate::prelude::*;
use std::path::Path;

/// Encrypt data for YubiKey recipient
/// Note: Encryption doesn't require serial as it uses the recipient public key
/// However, for consistency and future verification, we could add serial validation
#[instrument(skip(recipient))]
pub fn encrypt_for_yubikey(input_file: &Path, output_file: &Path, recipient: &str) -> Result<()> {
    info!(
        input_file = ?input_file,
        output_file = ?output_file,
        recipient = %redact_key(recipient),
        "Encrypting file for YubiKey recipient"
    );

    // age encryption doesn't require PIN or touch, only the recipient
    let args = vec![
        "--encrypt".to_string(),
        "--recipient".to_string(),
        recipient.to_string(),
        "-o".to_string(),
        output_file.to_str().unwrap().to_string(),
        input_file.to_str().unwrap().to_string(),
    ];

    run_age_plugin_yubikey(args, None, false)?;

    if !output_file.exists() {
        return Err(PtyError::PtyOperation(
            "Encryption succeeded but output file not found".to_string(),
        ));
    }

    Ok(())
}
