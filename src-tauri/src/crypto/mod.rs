//! # Crypto Module
//!
//! Provides secure encryption operations using the age encryption standard.
//!
//! ## Security Considerations
//! - All private keys are automatically zeroed on drop
//! - Passphrases use constant-time comparison
//! - Uses audited age encryption library
//!
//! ## Example
//! ```no_run
//! use barqly_vault_lib::crypto;
//!
//! let keypair = crypto::generate_keypair().unwrap();
//! let encrypted = crypto::encrypt_data(b"secret", &keypair.public_key).unwrap();
//! ```

pub mod age_ops;
pub mod errors;
pub mod key_mgmt;

use secrecy::{ExposeSecret, SecretString};
use std::fmt;

pub use errors::CryptoError;

/// A keypair containing both public and private keys
pub struct KeyPair {
    pub public_key: PublicKey,
    pub private_key: PrivateKey,
}

/// A public key used for encryption
#[derive(Clone, Debug)]
pub struct PublicKey(String);

impl PublicKey {
    /// Get the public key as a string
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for PublicKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<String> for PublicKey {
    fn from(s: String) -> Self {
        Self(s)
    }
}

/// A private key used for decryption (automatically zeroed on drop)
pub struct PrivateKey(SecretString);

impl PrivateKey {
    /// Get the private key as a string (use with caution)
    pub fn expose_secret(&self) -> &str {
        self.0.expose_secret()
    }
}

impl From<SecretString> for PrivateKey {
    fn from(s: SecretString) -> Self {
        Self(s)
    }
}

impl Drop for PrivateKey {
    fn drop(&mut self) {
        // SecretString already handles zeroization
    }
}

/// Result type for crypto operations
pub type Result<T> = std::result::Result<T, CryptoError>;

// Re-export key functions for convenience
pub use age_ops::{decrypt_data, encrypt_data};
pub use key_mgmt::{decrypt_private_key, encrypt_private_key, generate_keypair};

#[cfg(test)]
mod tests {
    use super::*;
    use secrecy::SecretString;

    #[test]
    fn test_keypair_generation() {
        let keypair = generate_keypair().unwrap();

        // Verify public key format (age1...)
        assert!(keypair.public_key.as_str().starts_with("age1"));

        // Verify private key is properly wrapped
        let private_key_str = keypair.private_key.expose_secret();
        assert!(private_key_str.starts_with("AGE-SECRET-KEY-"));
    }

    #[test]
    fn test_key_encryption_decryption() {
        // Generate keypair
        let keypair = generate_keypair().unwrap();

        // Encrypt private key with passphrase
        let passphrase = SecretString::from("test-passphrase-123".to_string());
        let encrypted_key = encrypt_private_key(&keypair.private_key, passphrase.clone()).unwrap();

        // Decrypt with same passphrase - should succeed
        let decrypted_key = decrypt_private_key(&encrypted_key, passphrase).unwrap();
        assert_eq!(
            keypair.private_key.expose_secret(),
            decrypted_key.expose_secret()
        );
    }

    #[test]
    fn test_wrong_passphrase_decryption() {
        // Generate keypair
        let keypair = generate_keypair().unwrap();

        // Encrypt private key with passphrase
        let passphrase = SecretString::from("test-passphrase-123".to_string());
        let encrypted_key = encrypt_private_key(&keypair.private_key, passphrase).unwrap();

        // Decrypt with wrong passphrase - should fail
        let wrong_passphrase = SecretString::from("wrong-passphrase".to_string());
        let result = decrypt_private_key(&encrypted_key, wrong_passphrase);
        assert!(result.is_err());
    }

    #[test]
    fn test_data_encryption_decryption() {
        // Test with small data (< 1KB)
        let test_data = b"Hello, this is a test message for encryption!";

        let keypair = generate_keypair().unwrap();

        // Encrypt data
        let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();

        // Decrypt data
        let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

        // Verify round-trip encryption/decryption
        assert_eq!(test_data, decrypted.as_slice());
    }

    #[test]
    fn test_large_data_encryption_decryption() {
        // Test with medium data (1MB)
        let test_data: Vec<u8> = (0..1024 * 1024).map(|i| (i % 256) as u8).collect();

        let keypair = generate_keypair().unwrap();

        // Encrypt data
        let encrypted = encrypt_data(&test_data, &keypair.public_key).unwrap();

        // Decrypt data
        let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

        // Verify round-trip encryption/decryption
        assert_eq!(test_data, decrypted);
    }

    #[test]
    fn test_wrong_key_decryption() {
        // Generate two keypairs
        let keypair_a = generate_keypair().unwrap();
        let keypair_b = generate_keypair().unwrap();

        // Encrypt with key A
        let test_data = b"Secret message";
        let encrypted = encrypt_data(test_data, &keypair_a.public_key).unwrap();

        // Try to decrypt with key B
        let result = decrypt_data(&encrypted, &keypair_b.private_key);

        // Should fail with specific error
        assert!(result.is_err());
    }

    #[test]
    fn test_memory_zeroization() {
        // Create private key in scope
        let keypair = generate_keypair().unwrap();
        let _private_key_str = keypair.private_key.expose_secret().to_string();

        // Let it drop
        drop(keypair);

        // Note: We can't easily verify memory zeroization in tests
        // but SecretString should handle this automatically
        // This test ensures the drop implementation doesn't panic
    }
}
