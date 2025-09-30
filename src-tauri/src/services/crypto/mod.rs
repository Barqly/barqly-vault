pub mod application;
pub mod domain;
pub mod infrastructure;

pub use application::CryptoManager;
pub use domain::{CryptoError, CryptoResult};

// Re-export infrastructure for convenience (replaces root crate::crypto)
pub use infrastructure::{
    KeyPair, PrivateKey, PublicKey, decrypt_data, decrypt_data_cli, decrypt_data_yubikey_cli,
    encrypt_data, encrypt_data_multi_recipient,
};
