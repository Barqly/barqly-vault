use crate::services::key_management::passphrase::infrastructure::{
    PassphraseKeyRepository, StorageError, encrypt_private_key, generate_keypair,
};
use crate::services::shared::infrastructure::sanitize_label;
use crate::services::vault::VaultMetadata;
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

        // Sanitize label for use as key_id
        let sanitized = sanitize_label(label).map_err(|e| {
            GenerationError::KeyGenerationFailed(format!("Failed to sanitize label: {}", e))
        })?;

        let encrypted_key = encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        )?;

        let saved_path = PassphraseKeyRepository::save_encrypted_key(
            &sanitized.sanitized,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
        )?;

        PassphraseKeyRepository::register_key(
            sanitized.sanitized.clone(), // key_id - sanitized
            label.to_string(),           // label - original display label
            keypair.public_key.to_string(),
            format!("{}.agekey.enc", sanitized.sanitized), // filename - sanitized with .agekey.enc extension
        )?;

        Ok(GeneratedKey {
            public_key: keypair.public_key.to_string(),
            key_id: sanitized.sanitized, // Use sanitized label as key_id
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

        // Sanitize label for use as key_id
        let sanitized = sanitize_label(label).map_err(|e| {
            GenerationError::KeyGenerationFailed(format!("Failed to sanitize label: {}", e))
        })?;

        let encrypted_key = encrypt_private_key(
            &keypair.private_key,
            SecretString::from(passphrase.to_string()),
        )?;

        let saved_path = crate::services::key_management::shared::save_encrypted_key_with_metadata(
            &sanitized.sanitized,
            &encrypted_key,
            Some(&keypair.public_key.to_string()),
            metadata,
        )
        .map_err(|e| StorageError::KeySaveFailed(e.to_string()))?;

        PassphraseKeyRepository::register_key(
            sanitized.sanitized.clone(), // key_id - sanitized
            label.to_string(),           // label - original display label
            keypair.public_key.to_string(),
            format!("{}.agekey.enc", sanitized.sanitized), // filename - sanitized with .agekey.enc extension
        )?;

        Ok(GeneratedKey {
            public_key: keypair.public_key.to_string(),
            key_id: sanitized.sanitized, // Use sanitized label as key_id
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
