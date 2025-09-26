//! # Crypto Module
//!
//! Provides secure encryption operations using the age encryption standard.
//!
//! ## Security Considerations
//! - All private keys are automatically zeroed on drop
//! - Passphrases use constant-time comparison
//! - Uses audited age encryption library
//!
//! ## Public API
//! The following functions are available for external use:
//! - `encrypt_data()` - Encrypt data with a public key
//! - `decrypt_data()` - Decrypt data with a private key
//!
//! For passphrase key operations, use `crate::key_management::passphrase` module.
//!
//! ## Example
//! ```no_run
//! use barqly_vault_lib::crypto;
//! use barqly_vault_lib::key_management::passphrase;
//!
//! let keypair = passphrase::generate_keypair().unwrap();
//! let encrypted = crypto::encrypt_data(b"secret", &keypair.public_key).unwrap();
//! ```

pub mod age_ops;
pub mod errors;
pub mod multi_recipient;

use age::secrecy::{ExposeSecret, SecretString};
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

// ============================================================================
// PUBLIC API - Functions available for external use
// ============================================================================

pub use age_ops::decrypt_data;
pub use age_ops::decrypt_data_cli;
pub use age_ops::decrypt_data_yubikey_cli;
pub use age_ops::encrypt_data;
pub use age_ops::encrypt_data_multi_recipient;
