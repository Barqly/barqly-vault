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
    debug_assert!(!encrypted_key.is_empty(), "Encrypted key cannot be empty");
    debug_assert!(
        !passphrase.expose_secret().is_empty(),
        "Passphrase cannot be empty"
    );

    // Create decryptor
    let decryptor = age::Decryptor::new(encrypted_key)
        .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))?;

    let mut decrypted = Vec::new();

    // In age 0.11, use scrypt::Identity for passphrase decryption
    let identity = age::scrypt::Identity::new(passphrase.clone());
    let mut reader = decryptor
        .decrypt(std::iter::once(&identity as &dyn age::Identity))
        .map_err(|_| CryptoError::WrongPassphrase)?;

    // Read decrypted data
    std::io::copy(&mut reader, &mut decrypted).map_err(CryptoError::IoError)?;

    // Convert to string and validate it's a valid age key
    let private_key_str =
        String::from_utf8(decrypted).map_err(|e| CryptoError::InvalidKeyFormat(e.to_string()))?;

    // Validate the key format
    if !private_key_str.starts_with("AGE-SECRET-KEY-") {
        return Err(CryptoError::InvalidKeyFormat(
            "Decrypted data is not a valid age private key".to_string(),
        ));
    }

    // Parse to validate it's a proper age key
    Identity::from_str(&private_key_str)
        .map_err(|e| CryptoError::InvalidKeyFormat(e.to_string()))?;

    Ok(PrivateKey::from(SecretString::from(private_key_str)))
}
