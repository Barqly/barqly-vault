//! Crypto Infrastructure Layer
//!
//! Provides technical implementations for cryptographic operations using the age encryption standard.

pub mod age_operations;
pub mod crypto_errors;
pub mod multi_recipient_encryption;

// Re-export main operations
pub use age_operations::{
    decrypt_data, decrypt_data_cli, decrypt_data_yubikey_cli, encrypt_data,
    encrypt_data_multi_recipient,
};

// Re-export types
pub use age_operations::{KeyPair, PrivateKey, PublicKey};

// Re-export infrastructure errors and Result type
pub use crypto_errors::CryptoError;
pub type Result<T> = std::result::Result<T, CryptoError>;

// Re-export multi-recipient types and operations
pub use multi_recipient_encryption::{
    DecryptionResult, EncryptionResult, MultiRecipientCrypto, MultiRecipientDecryptParams,
    MultiRecipientEncryptParams,
};
