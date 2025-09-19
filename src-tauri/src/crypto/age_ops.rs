use age::x25519::{Identity, Recipient};
use std::io::Write;
use std::iter;
use std::str::FromStr;

use super::{CryptoError, PrivateKey, PublicKey, Result};

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
pub fn encrypt_data(data: &[u8], recipient: &PublicKey) -> Result<Vec<u8>> {
    debug_assert!(!recipient.as_str().is_empty(), "Public key cannot be empty");

    // Parse recipient as age::x25519::Recipient
    let recipient_key =
        Recipient::from_str(recipient.as_str()).map_err(|_e| CryptoError::InvalidRecipient)?;

    // Create a writer to collect encrypted bytes
    let mut encrypted = Vec::new();

    // Create age::Encryptor with recipient (age 0.11 expects an iterator of references)
    let recipients: Vec<Box<dyn age::Recipient + Send>> = vec![Box::new(recipient_key)];
    let encryptor = age::Encryptor::with_recipients(
        recipients.iter().map(|r| r.as_ref() as &dyn age::Recipient),
    )
    .expect("at least one recipient");

    // Create writer (use armor(false) for binary output)
    let mut writer = encryptor
        .wrap_output(&mut encrypted)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    // Stream encrypt the data
    writer.write_all(data).map_err(CryptoError::IoError)?;

    // Finish encryption
    writer
        .finish()
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    Ok(encrypted)
}

/// Decrypt data using a private key
///
/// # Security
/// - Validates age format before decryption
/// - Returns specific error for wrong key
pub fn decrypt_data(encrypted_data: &[u8], private_key: &PrivateKey) -> Result<Vec<u8>> {
    debug_assert!(
        !private_key.expose_secret().is_empty(),
        "Private key cannot be empty"
    );

    // Parse private_key as age::x25519::Identity
    let identity = Identity::from_str(private_key.expose_secret())
        .map_err(|e| CryptoError::InvalidKeyFormat(e.to_string()))?;

    // Create age::Decryptor
    let decryptor = age::Decryptor::new(encrypted_data)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    let mut decrypted = Vec::new();

    // In age 0.11, decrypt directly without matching on enum variants
    let mut reader = decryptor
        .decrypt(iter::once(&identity as &dyn age::Identity))
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    // Read decrypted data
    std::io::copy(&mut reader, &mut decrypted).map_err(CryptoError::IoError)?;

    Ok(decrypted)
}
