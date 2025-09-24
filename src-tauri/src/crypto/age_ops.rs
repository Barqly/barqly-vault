use age::x25519::Identity;
use std::io::Write;
use std::iter;
use std::str::FromStr;
use std::process::{Command, Stdio};

use super::{CryptoError, PrivateKey, PublicKey, Result};
use crate::prelude::*;
use crate::key_management::yubikey::infrastructure::pty::core::get_age_path;

/// Parse a recipient string that could be either x25519 or plugin-based
fn parse_recipient(recipient_str: &str) -> Result<Box<dyn age::Recipient + Send>> {
    // Try x25519 parsing first (for passphrase-based keys)
    if let Ok(x25519_recipient) = age::x25519::Recipient::from_str(recipient_str) {
        debug!("Successfully parsed as x25519 recipient");
        return Ok(Box::new(x25519_recipient));
    }

    // For YubiKey recipients (age1yubikey...), we need to handle them as plugin recipients
    // Since we can't directly parse plugin recipients, we'll fall back to using the age command
    // For now, let's just handle x25519 recipients and let the calling code deal with YubiKey recipients

    error!(
        recipient_key = %recipient_str,
        "Failed to parse recipient - only x25519 recipients supported in this function"
    );
    Err(CryptoError::InvalidRecipient)
}

/// Encrypt data using a public key
///
/// # Arguments
/// * `data` - The data to encrypt
/// * `recipient` - The public key of the recipient
///
/// # Returns
/// Encrypted bytes in age format
///
/// # Security
/// - Uses age's streaming encryption
/// - Suitable for large files
#[instrument(skip(data, recipient), fields(data_size = data.len(), recipient_key = %recipient.as_str()))]
pub fn encrypt_data(data: &[u8], recipient: &PublicKey) -> Result<Vec<u8>> {
    debug_assert!(!recipient.as_str().is_empty(), "Public key cannot be empty");

    trace!(
        data_size = data.len(),
        recipient_prefix = &recipient.as_str()[..std::cmp::min(20, recipient.as_str().len())],
        "Starting age encryption operation"
    );

    // Parse recipient using helper function that handles both x25519 and plugin recipients
    let recipient_key = parse_recipient(recipient.as_str())?;

    debug!("Successfully parsed recipient public key");

    // Create a writer to collect encrypted bytes
    let mut encrypted = Vec::new();

    // Create age::Encryptor with recipient (age 0.11 expects an iterator of references)
    let recipients: Vec<Box<dyn age::Recipient + Send>> = vec![recipient_key];
    let encryptor = age::Encryptor::with_recipients(
        recipients.iter().map(|r| r.as_ref() as &dyn age::Recipient),
    )
    .expect("at least one recipient");

    debug!("Age encryptor created successfully");

    // Create writer (use armor(false) for binary output)
    let mut writer = encryptor.wrap_output(&mut encrypted).map_err(|e| {
        error!(
            error = %e,
            "Failed to create age encryption writer"
        );
        CryptoError::EncryptionFailed(e.to_string())
    })?;

    trace!("Starting streaming encryption of data");

    // Stream encrypt the data
    writer.write_all(data).map_err(|e| {
        error!(
            error = %e,
            data_size = data.len(),
            "Failed to write data to age encryption stream"
        );
        CryptoError::IoError(e)
    })?;

    debug!("Data written to encryption stream successfully");

    // Finish encryption
    writer.finish().map_err(|e| {
        error!(
            error = %e,
            "Failed to finalize age encryption"
        );
        CryptoError::EncryptionFailed(e.to_string())
    })?;

    debug!(
        original_size = data.len(),
        encrypted_size = encrypted.len(),
        "Age encryption completed successfully"
    );

    Ok(encrypted)
}

/// Encrypt data using multiple public keys (multi-recipient)
///
/// # Arguments
/// * `data` - The data to encrypt
/// * `recipients` - Vector of public keys for all recipients
///
/// # Returns
/// Encrypted bytes in age format that can be decrypted by any of the recipients
///
/// # Security
/// - Uses age CLI with multi-recipient encryption
/// - Each recipient can decrypt the data independently
/// - Supports both x25519 (passphrase) and plugin (YubiKey) recipients
/// - Suitable for large files
#[instrument(skip(data, recipients), fields(data_size = data.len(), recipient_count = recipients.len()))]
pub fn encrypt_data_multi_recipient(data: &[u8], recipients: &[PublicKey]) -> Result<Vec<u8>> {
    // Use the CLI approach for multi-recipient encryption to support both
    // x25519 and plugin recipients in the same operation
    encrypt_data_multi_recipient_cli(data, recipients)
}

/// Decrypt data using a private key
///
/// # Security
/// - Validates age format before decryption
/// - Returns specific error for wrong key
#[instrument(skip(encrypted_data, private_key), fields(encrypted_size = encrypted_data.len()))]
pub fn decrypt_data(encrypted_data: &[u8], private_key: &PrivateKey) -> Result<Vec<u8>> {
    debug_assert!(
        !private_key.expose_secret().is_empty(),
        "Private key cannot be empty"
    );

    trace!(
        encrypted_size = encrypted_data.len(),
        "Starting age decryption operation"
    );

    // Parse private_key as age::x25519::Identity
    let identity = Identity::from_str(private_key.expose_secret()).map_err(|e| {
        error!(
            error = %e,
            "Failed to parse private key for age decryption"
        );
        CryptoError::InvalidKeyFormat(e.to_string())
    })?;

    debug!("Successfully parsed private key for decryption");

    // Create age::Decryptor
    let decryptor = age::Decryptor::new(encrypted_data).map_err(|e| {
        error!(
            error = %e,
            encrypted_size = encrypted_data.len(),
            "Failed to create age decryptor - invalid encrypted data format"
        );
        CryptoError::DecryptionFailed(e.to_string())
    })?;

    debug!("Age decryptor created successfully");

    let mut decrypted = Vec::new();

    trace!("Starting age decryption with private key");

    // In age 0.11, decrypt directly without matching on enum variants
    let mut reader = decryptor
        .decrypt(iter::once(&identity as &dyn age::Identity))
        .map_err(|e| {
            debug!(
                error = %e,
                "Age decryption failed - likely wrong private key or corrupted data"
            );
            CryptoError::DecryptionFailed(e.to_string())
        })?;

    debug!("Age decryption stream created successfully");

    // Read decrypted data
    std::io::copy(&mut reader, &mut decrypted).map_err(|e| {
        error!(
            error = %e,
            "Failed to read decrypted data from age stream"
        );
        CryptoError::IoError(e)
    })?;

    debug!(
        encrypted_size = encrypted_data.len(),
        decrypted_size = decrypted.len(),
        "Age decryption completed successfully"
    );

    Ok(decrypted)
}

/// Encrypt data using CLI approach for multi-recipient support
///
/// This function uses the age CLI to support both x25519 and plugin recipients
/// (like YubiKey) in the same encryption operation, which the age library cannot do.
///
/// # Arguments
/// * `data` - The data to encrypt
/// * `recipients` - Vector of public keys for all recipients (mixed x25519 and plugin)
///
/// # Returns
/// Encrypted bytes in age format that can be decrypted by any of the recipients
///
/// # Security
/// - Uses age CLI with multi-recipient encryption
/// - Each recipient can decrypt the data independently
/// - Supports both x25519 (passphrase) and plugin (YubiKey) recipients
/// - Suitable for large files
#[instrument(skip(data, recipients), fields(data_size = data.len(), recipient_count = recipients.len()))]
pub fn encrypt_data_multi_recipient_cli(data: &[u8], recipients: &[PublicKey]) -> Result<Vec<u8>> {
    debug_assert!(!recipients.is_empty(), "Must have at least one recipient");

    trace!(
        data_size = data.len(),
        recipient_count = recipients.len(),
        "Starting age CLI multi-recipient encryption operation"
    );

    // Get the age binary path
    let age_path = get_age_path();

    debug!(
        age_path = %age_path.display(),
        "Using age binary for multi-recipient encryption"
    );

    // Build command arguments with all recipients
    let mut args = Vec::new();

    for (i, recipient) in recipients.iter().enumerate() {
        let recipient_str = recipient.as_str();
        debug!(
            recipient_index = i,
            recipient_key = %recipient_str,
            "Adding recipient to age CLI command"
        );

        args.push("-r".to_string());
        args.push(recipient_str.to_string());
    }

    debug!(
        args_count = args.len(),
        "Age CLI command arguments prepared"
    );

    // Set up environment for age CLI to find the plugin
    let plugin_dir = age_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", plugin_dir.display(), current_path);

    debug!(
        plugin_dir = %plugin_dir.display(),
        new_path = %new_path,
        "Setting up PATH for age CLI to find age-plugin-yubikey"
    );

    // Spawn age command with stdin/stdout pipes and updated PATH
    let mut child = Command::new(&age_path)
        .args(&args)
        .env("PATH", new_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            error!(
                error = %e,
                age_path = %age_path.display(),
                "Failed to spawn age CLI process"
            );
            CryptoError::EncryptionFailed(format!("Failed to start age CLI: {e}"))
        })?;

    debug!("Age CLI process spawned successfully");

    // Write data to stdin
    if let Some(mut stdin) = child.stdin.take() {
        trace!("Writing data to age CLI stdin");
        stdin.write_all(data).map_err(|e| {
            error!(
                error = %e,
                data_size = data.len(),
                "Failed to write data to age CLI stdin"
            );
            CryptoError::IoError(e)
        })?;

        // Close stdin to signal end of input
        drop(stdin);
        debug!("Data written to age CLI stdin and closed");
    } else {
        error!("Failed to get stdin handle for age CLI process");
        return Err(CryptoError::EncryptionFailed("Could not write to age CLI".to_string()));
    }

    // Wait for process and collect output
    let output = child.wait_with_output().map_err(|e| {
        error!(
            error = %e,
            "Failed to wait for age CLI process completion"
        );
        CryptoError::EncryptionFailed(format!("Age CLI process failed: {e}"))
    })?;

    debug!(
        exit_status = %output.status,
        stdout_size = output.stdout.len(),
        stderr_size = output.stderr.len(),
        "Age CLI process completed"
    );

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!(
            exit_code = output.status.code(),
            stderr = %stderr,
            "Age CLI encryption failed"
        );
        return Err(CryptoError::EncryptionFailed(format!(
            "Age CLI failed with exit code {:?}: {}",
            output.status.code(),
            stderr
        )));
    }

    debug!(
        original_size = data.len(),
        encrypted_size = output.stdout.len(),
        recipient_count = recipients.len(),
        "Age CLI multi-recipient encryption completed successfully"
    );

    Ok(output.stdout)
}

/// Decrypt data using CLI approach for YubiKey support with PTY interaction
///
/// This function uses the age CLI with PTY interaction to support YubiKey
/// touch and PIN entry that the age library cannot handle directly.
///
/// # Arguments
/// * `encrypted_data` - The encrypted data to decrypt
/// * `key_entry` - The YubiKey key entry from the registry
/// * `pin` - The YubiKey PIN for authentication
///
/// # Returns
/// Decrypted bytes
///
/// # Security
/// - Uses PTY for interactive PIN and touch handling
/// - Creates temporary identity file with proper format
/// - Cleans up temporary files after operation
#[instrument(skip(encrypted_data, pin), fields(encrypted_size = encrypted_data.len()))]
pub fn decrypt_data_yubikey_cli(
    encrypted_data: &[u8],
    key_entry: &crate::storage::KeyEntry,
    pin: &str
) -> Result<Vec<u8>> {
    debug_assert!(!encrypted_data.is_empty(), "Encrypted data cannot be empty");
    debug_assert!(!pin.is_empty(), "PIN cannot be empty");

    // Extract YubiKey details from key entry
    let (serial, slot, recipient, identity_tag) = match key_entry {
        crate::storage::KeyEntry::Yubikey {
            serial,
            slot,
            recipient,
            identity_tag,
            ..
        } => (serial, slot, recipient, identity_tag),
        _ => {
            error!("Invalid key entry type for YubiKey decryption");
            return Err(CryptoError::DecryptionFailed("Expected YubiKey key entry".to_string()));
        }
    };

    trace!(
        encrypted_size = encrypted_data.len(),
        serial = %serial,
        slot = %slot,
        "Starting YubiKey PTY decryption operation"
    );

    // Use the existing PTY-based decryption function
    crate::key_management::yubikey::infrastructure::pty::age_operations::decrypt_data_with_yubikey_pty(
        encrypted_data,
        serial,
        *slot,
        recipient,
        identity_tag,
        pin,
    )
    .map_err(|e| {
        error!(
            error = %e,
            "YubiKey PTY decryption failed"
        );
        CryptoError::DecryptionFailed(format!("YubiKey decryption failed: {e}"))
    })
}

/// Decrypt data using CLI approach for YubiKey support (legacy function)
///
/// This function uses the age CLI to support plugin-based decryption (YubiKey)
/// that the age library cannot handle directly.
///
/// # Arguments
/// * `encrypted_data` - The encrypted data to decrypt
///
/// # Returns
/// Decrypted bytes
///
/// # Security
/// - Uses age CLI with stdin/stdout for data handling
/// - Supports plugin-based identities (like YubiKey)
/// - Suitable for large files
#[instrument(skip(encrypted_data), fields(encrypted_size = encrypted_data.len()))]
pub fn decrypt_data_cli(encrypted_data: &[u8]) -> Result<Vec<u8>> {
    debug_assert!(!encrypted_data.is_empty(), "Encrypted data cannot be empty");

    trace!(
        encrypted_size = encrypted_data.len(),
        "Starting age CLI decryption operation"
    );

    // Get the age binary path
    let age_path = get_age_path();

    debug!(
        age_path = %age_path.display(),
        "Using age binary for CLI decryption"
    );

    // Build command arguments for decryption
    let args = vec!["-d".to_string()]; // -d for decrypt

    debug!(
        args_count = args.len(),
        "Age CLI decryption arguments prepared"
    );

    // Set up environment for age CLI to find the plugin
    let plugin_dir = age_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let current_path = std::env::var("PATH").unwrap_or_default();
    let new_path = format!("{}:{}", plugin_dir.display(), current_path);

    debug!(
        plugin_dir = %plugin_dir.display(),
        new_path = %new_path,
        "Setting up PATH for age CLI to find age-plugin-yubikey"
    );

    // Spawn age command with stdin/stdout pipes and updated PATH
    let mut child = Command::new(&age_path)
        .args(&args)
        .env("PATH", new_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            error!(
                error = %e,
                age_path = %age_path.display(),
                "Failed to spawn age CLI process for decryption"
            );
            CryptoError::DecryptionFailed(format!("Failed to start age CLI: {e}"))
        })?;

    debug!("Age CLI decryption process spawned successfully");

    // Write encrypted data to stdin
    if let Some(mut stdin) = child.stdin.take() {
        trace!("Writing encrypted data to age CLI stdin");
        stdin.write_all(encrypted_data).map_err(|e| {
            error!(
                error = %e,
                encrypted_size = encrypted_data.len(),
                "Failed to write encrypted data to age CLI stdin"
            );
            CryptoError::IoError(e)
        })?;

        // Close stdin to signal end of input
        drop(stdin);
        debug!("Encrypted data written to age CLI stdin and closed");
    } else {
        error!("Failed to get stdin handle for age CLI decryption process");
        return Err(CryptoError::DecryptionFailed("Could not write to age CLI".to_string()));
    }

    // Wait for process and collect output
    let output = child.wait_with_output().map_err(|e| {
        error!(
            error = %e,
            "Failed to wait for age CLI decryption process completion"
        );
        CryptoError::DecryptionFailed(format!("Age CLI decryption process failed: {e}"))
    })?;

    debug!(
        exit_status = %output.status,
        stdout_size = output.stdout.len(),
        stderr_size = output.stderr.len(),
        "Age CLI decryption process completed"
    );

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        error!(
            exit_code = output.status.code(),
            stderr = %stderr,
            "Age CLI decryption failed"
        );
        return Err(CryptoError::DecryptionFailed(format!(
            "Age CLI decryption failed with exit code {:?}: {}",
            output.status.code(),
            stderr
        )));
    }

    debug!(
        encrypted_size = encrypted_data.len(),
        decrypted_size = output.stdout.len(),
        "Age CLI decryption completed successfully"
    );

    Ok(output.stdout)
}
