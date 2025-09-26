use crate::storage::{self, KeyEntry, KeyRegistry};
use chrono::Utc;
use std::path::PathBuf;

pub type Result<T> = std::result::Result<T, StorageError>;

#[derive(Debug)]
pub enum StorageError {
    RegistryLoadFailed(String),
    RegistrySaveFailed(String),
    KeyNotFound(String),
    KeyFileNotFound(String),
    KeyFileLoadFailed(String),
    KeySaveFailed(String),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::RegistryLoadFailed(msg) => write!(f, "Failed to load key registry: {}", msg),
            Self::RegistrySaveFailed(msg) => write!(f, "Failed to save key registry: {}", msg),
            Self::KeyNotFound(key_id) => write!(f, "Key '{}' not found in registry", key_id),
            Self::KeyFileNotFound(filename) => write!(f, "Key file '{}' not found", filename),
            Self::KeyFileLoadFailed(msg) => write!(f, "Failed to load key file: {}", msg),
            Self::KeySaveFailed(msg) => write!(f, "Failed to save key: {}", msg),
        }
    }
}

impl std::error::Error for StorageError {}

pub struct PassphraseKeyRepository;

impl PassphraseKeyRepository {
    pub fn save_encrypted_key(
        label: &str,
        encrypted_key: &[u8],
        public_key: Option<&str>,
    ) -> Result<PathBuf> {
        storage::save_encrypted_key(label, encrypted_key, public_key)
            .map_err(|e| StorageError::KeySaveFailed(e.to_string()))
    }

    pub fn load_encrypted_key(filename: &str) -> Result<Vec<u8>> {
        storage::key_store::load_encrypted_key(filename)
            .map_err(|e| StorageError::KeyFileLoadFailed(e.to_string()))
    }

    pub fn register_key(
        key_id: String,
        label: String,
        public_key: String,
        key_filename: String,
    ) -> Result<()> {
        let mut registry =
            KeyRegistry::load().map_err(|e| StorageError::RegistryLoadFailed(e.to_string()))?;

        let entry = KeyEntry::Passphrase {
            label,
            created_at: Utc::now(),
            last_used: None,
            public_key,
            key_filename,
        };

        registry
            .register_key(key_id, entry)
            .map_err(|e| StorageError::RegistrySaveFailed(e))?;

        registry
            .save()
            .map_err(|e| StorageError::RegistrySaveFailed(e.to_string()))?;

        Ok(())
    }

    pub fn get_key(key_id: &str) -> Result<KeyEntry> {
        let registry =
            KeyRegistry::load().map_err(|e| StorageError::RegistryLoadFailed(e.to_string()))?;

        registry
            .get_key(key_id)
            .cloned()
            .ok_or_else(|| StorageError::KeyNotFound(key_id.to_string()))
    }

    pub fn list_passphrase_keys() -> Result<Vec<(String, KeyEntry)>> {
        let registry =
            KeyRegistry::load().map_err(|e| StorageError::RegistryLoadFailed(e.to_string()))?;

        Ok(registry
            .passphrase_keys()
            .into_iter()
            .map(|(k, v)| (k.clone(), v.clone()))
            .collect())
    }
}
