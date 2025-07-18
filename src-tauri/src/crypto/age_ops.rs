use age::x25519::{Identity, Recipient};
use std::io::Write;

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
    // Parse recipient as age::x25519::Recipient
    let recipient_key =
        Recipient::from_str(recipient.as_str()).map_err(|_e| CryptoError::InvalidRecipient)?;

    // Create a writer to collect encrypted bytes
    let mut encrypted = Vec::new();

    // Create age::Encryptor with recipient
    let encryptor = age::Encryptor::with_recipients(vec![Box::new(recipient_key)])
        .ok_or_else(|| CryptoError::EncryptionFailed("Failed to create encryptor".to_string()))?;

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
    // Parse private_key as age::x25519::Identity
    let identity = Identity::from_str(private_key.expose_secret())
        .map_err(|e| CryptoError::InvalidKeyFormat(e.to_string()))?;

    // Create age::Decryptor
    let decryptor = age::Decryptor::new(encrypted_data)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    let mut decrypted = Vec::new();

    match decryptor {
        age::Decryptor::Recipients(decryptor) => {
            // Decrypt with the identity
            let mut reader = decryptor
                .decrypt(iter::once(&identity as &dyn age::Identity))
                .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

            // Read decrypted data
            std::io::copy(&mut reader, &mut decrypted).map_err(CryptoError::IoError)?;
        }
        _ => {
            return Err(CryptoError::DecryptionFailed(
                "Encrypted data is not recipient-encrypted".to_string(),
            ));
        }
    }

    Ok(decrypted)
}

use std::iter;
use std::str::FromStr;
