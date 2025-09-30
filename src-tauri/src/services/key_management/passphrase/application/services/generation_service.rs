use crate::services::key_management::passphrase::infrastructure::{
    PassphraseKeyRepository, StorageError, encrypt_private_key, generate_keypair,
};
use crate::storage::VaultMetadata;
use age::secrecy::SecretString;
use std::path::PathBuf;

pub type Result<T> = std::result::Result<T, GenerationError>;

#[derive(Debug)]
pub enum GenerationError {
    Storage(StorageError),
    KeyGenerationFailed(String),
    EncryptionFailed(String),
}

impl From<StorageError> for GenerationError {
    fn from(err: StorageError) -> Self {
        Self::Storage(err)
    }
}

impl From<crate::services::crypto::infrastructure::CryptoError> for GenerationError {
    fn from(err: crate::services::crypto::infrastructure::CryptoError) -> Self {
        match err {
            crate::services::crypto::infrastructure::CryptoError::EncryptionFailed(msg) => {
                Self::EncryptionFailed(msg)
            }
            _ => Self::KeyGenerationFailed(err.to_string()),
        }
    }
}

impl std::fmt::Display for GenerationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Storage(err) => write!(f, "Storage error: {}", err),
            Self::KeyGenerationFailed(msg) => write!(f, "Key generation failed: {}", msg),
            Self::EncryptionFailed(msg) => write!(f, "Encryption failed: {}", msg),
        }
    }
}

impl std::error::Error for GenerationError {}

pub struct GeneratedKey {
    pub public_key: String,
    pub key_id: String,
    pub saved_path: PathBuf,
}

pub struct GenerationService;

impl GenerationService {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_passphrase_key(&self, label: &str, passphrase: &str) -> Result<GeneratedKey> {
        let keypair = generate_keypair()?;

        let encrypted_key = encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        )?;

        let saved_path = PassphraseKeyRepository::save_encrypted_key(
            label,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
        )?;

        PassphraseKeyRepository::register_key(
            label.to_string(),
            label.to_string(),
            keypair.public_key.to_string(),
            label.to_string(),
        )?;

        Ok(GeneratedKey {
            public_key: keypair.public_key.to_string(),
            key_id: label.to_string(),
            saved_path,
        })
    }

    pub fn generate_with_metadata(
        &self,
        label: &str,
        passphrase: &str,
        metadata: &VaultMetadata,
    ) -> Result<GeneratedKey> {
        let keypair = generate_keypair()?;

        let encrypted_key = encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        )?;

        let saved_path = crate::storage::save_encrypted_key_with_metadata(
            label,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
            metadata,
        )
        .map_err(|e| StorageError::KeySaveFailed(e.to_string()))?;

        PassphraseKeyRepository::register_key(
            label.to_string(),
            label.to_string(),
            keypair.public_key.to_string(),
            label.to_string(),
        )?;

        Ok(GeneratedKey {
            public_key: keypair.public_key.to_string(),
            key_id: label.to_string(),
            saved_path,
        })
    }
}

impl Default for GenerationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generation_service_creation() {
        let _service = GenerationService::new();
        assert!(std::mem::size_of_val(&_service) == 0);
    }
}
