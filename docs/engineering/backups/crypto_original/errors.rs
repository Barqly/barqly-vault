use thiserror::Error;

#[derive(Error, Debug)]
pub enum CryptoError {
    #[error("Invalid key format: {0}")]
    InvalidKeyFormat(String),

    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Wrong passphrase")]
    WrongPassphrase,

    #[error("Invalid recipient key")]
    InvalidRecipient,

    #[error("Invalid key: {0}")]
    InvalidKey(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Age library error: {0}")]
    AgeError(String),
}
