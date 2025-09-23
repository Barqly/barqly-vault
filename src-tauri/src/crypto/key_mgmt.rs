use age::secrecy::{ExposeSecret, SecretString};
use age::x25519::Identity;
use std::io::Write;
use std::str::FromStr;

use super::{CryptoError, KeyPair, PrivateKey, PublicKey, Result};

/// Generate a new age keypair
///
/// # Security
/// - Uses age's X25519 key generation
/// - Private key is immediately wrapped in SecretString
///
/// # Example
/// ```
/// use barqly_vault_lib::crypto::generate_keypair;
///
/// let keypair = generate_keypair().unwrap();
/// println!("Public key: {}", keypair.public_key.as_str());
/// ```
pub fn generate_keypair() -> Result<KeyPair> {
    // Generate X25519 identity
    let identity = Identity::generate();

    // Extract public key as string
    let public_key = identity.to_public().to_string();

    // Convert private key to string and wrap in SecretString
    let private_key_str = identity.to_string();
    let private_key = SecretString::from(private_key_str);

    Ok(KeyPair {
        public_key: PublicKey::from(public_key),
        private_key: PrivateKey::from(private_key),
    })
}

/// Encrypt a private key with a passphrase
///
/// # Arguments
/// * `private_key` - The private key to encrypt
/// * `passphrase` - The passphrase for encryption
///
/// # Returns
/// Encrypted bytes suitable for file storage
///
/// # Security
/// - Uses age's native passphrase encryption
/// - Passphrase is zeroized after use
pub fn encrypt_private_key(private_key: &PrivateKey, passphrase: SecretString) -> Result<Vec<u8>> {
    let private_key_str = private_key.expose_secret();

    // Create a writer to collect encrypted bytes
    let mut encrypted = Vec::new();

    // Create encryptor with scrypt passphrase (age 0.11 expects SecretString directly)
    let encryptor = age::Encryptor::with_user_passphrase(passphrase.clone());

    // Create writer
    let mut writer = encryptor
        .wrap_output(&mut encrypted)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    // Write the private key
    writer
        .write_all(private_key_str.as_bytes())
        .map_err(CryptoError::IoError)?;

    // Finish encryption
    writer
        .finish()
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    Ok(encrypted)
}

/// Decrypt a private key with a passphrase
///
/// # Security
/// - Validates passphrase before returning key
/// - Returns error on wrong passphrase
pub fn decrypt_private_key(encrypted_key: &[u8], passphrase: SecretString) -> Result<PrivateKey> {
    use crate::prelude::*;

    debug_assert!(!encrypted_key.is_empty(), "Encrypted key cannot be empty");
    debug_assert!(
        !passphrase.expose_secret().is_empty(),
        "Passphrase cannot be empty"
    );

    trace!(
        encrypted_key_size = encrypted_key.len(),
        "Starting private key decryption with provided passphrase"
    );

    // Create decryptor
    let decryptor = age::Decryptor::new(encrypted_key).map_err(|e| {
        error!(
            error = %e,
            encrypted_key_size = encrypted_key.len(),
            "Failed to create age decryptor - invalid encrypted key format"
        );
        CryptoError::DecryptionFailed(e.to_string())
    })?;

    debug!("Successfully created age decryptor, attempting passphrase validation");

    let mut decrypted = Vec::new();

    // In age 0.11, use scrypt::Identity for passphrase decryption
    let identity = age::scrypt::Identity::new(passphrase.clone());
    let mut reader = decryptor
        .decrypt(std::iter::once(&identity as &dyn age::Identity))
        .map_err(|e| {
            debug!("Passphrase validation failed during age decryption: {}", e);
            CryptoError::WrongPassphrase
        })?;

    debug!("Passphrase validation successful, reading decrypted private key data");

    // Read decrypted data
    std::io::copy(&mut reader, &mut decrypted).map_err(|e| {
        error!(
            error = %e,
            "IO error while reading decrypted private key data"
        );
        CryptoError::IoError(e)
    })?;

    debug!(
        decrypted_size = decrypted.len(),
        "Successfully read decrypted private key data"
    );

    // Convert to string and validate it's a valid age key
    let private_key_str = String::from_utf8(decrypted).map_err(|e| {
        error!(
            error = %e,
            "Decrypted private key data is not valid UTF-8"
        );
        CryptoError::InvalidKeyFormat(e.to_string())
    })?;

    // Validate the key format
    if !private_key_str.starts_with("AGE-SECRET-KEY-") {
        error!(
            key_prefix = &private_key_str[..std::cmp::min(20, private_key_str.len())],
            "Decrypted data is not a valid age private key - invalid prefix"
        );
        return Err(CryptoError::InvalidKeyFormat(
            "Decrypted data is not a valid age private key".to_string(),
        ));
    }

    debug!("Private key has valid AGE-SECRET-KEY prefix, validating key structure");

    // Parse to validate it's a proper age key
    Identity::from_str(&private_key_str).map_err(|e| {
        error!(
            error = %e,
            "Decrypted private key failed age Identity validation"
        );
        CryptoError::InvalidKeyFormat(e.to_string())
    })?;

    debug!("Private key successfully validated and ready for use");

    Ok(PrivateKey::from(SecretString::from(private_key_str)))
}
