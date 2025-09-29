use crate::services::key_management::passphrase::domain::{
    ValidationResult, calculate_strength_score,
};
use crate::services::key_management::passphrase::infrastructure::{
    PassphraseKeyRepository, StorageError, decrypt_private_key,
};
use age::secrecy::SecretString;

pub type Result<T> = std::result::Result<T, ValidationError>;

#[derive(Debug)]
pub enum ValidationError {
    Storage(StorageError),
    InvalidPassphrase,
}

impl From<StorageError> for ValidationError {
    fn from(err: StorageError) -> Self {
        Self::Storage(err)
    }
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Storage(err) => write!(f, "Storage error: {}", err),
            Self::InvalidPassphrase => write!(f, "Invalid passphrase"),
        }
    }
}

impl std::error::Error for ValidationError {}

pub struct ValidationService;

impl ValidationService {
    pub fn new() -> Self {
        Self
    }

    pub fn validate_strength(&self, passphrase: &str) -> ValidationResult {
        calculate_strength_score(passphrase)
    }

    pub fn verify_key_passphrase(&self, key_id: &str, passphrase: &str) -> Result<bool> {
        let key_entry = PassphraseKeyRepository::get_key(key_id)?;

        match key_entry {
            crate::storage::KeyEntry::Passphrase { key_filename, .. } => {
                let encrypted_key = PassphraseKeyRepository::load_encrypted_key(&key_filename)?;

                let passphrase_secret = SecretString::from(passphrase.to_string());
                match decrypt_private_key(&encrypted_key, passphrase_secret) {
                    Ok(_) => Ok(true),
                    Err(_) => Ok(false),
                }
            }
            _ => Err(ValidationError::InvalidPassphrase),
        }
    }
}

impl Default for ValidationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_strength_weak() {
        let service = ValidationService::new();
        let result = service.validate_strength("weak");
        assert!(!result.is_valid);
        assert!(result.score < 30);
    }

    #[test]
    fn test_validate_strength_strong() {
        let service = ValidationService::new();
        let result = service.validate_strength("MySecure#Pass2024!");
        assert!(result.is_valid);
        assert!(result.score > 70);
    }
}
