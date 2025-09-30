//! Shared Infrastructure Module
//!
//! Provides shared infrastructure utilities used across multiple domains:
//! - path_management: Platform-specific directory management
//! - cache: LRU caching for performance
//! - errors: Common error types
//!
//! Domain-specific storage has been moved:
//! - Vault persistence → services::vault::infrastructure::persistence
//! - Key storage → services::key_management::shared::infrastructure::key_storage
//! - Key registry → services::key_management::shared::infrastructure::registry_persistence

pub mod cache;
pub mod errors;
pub mod path_management;

use std::path::PathBuf;

pub use cache::{CacheMetrics, StorageCache, get_cache};
pub use errors::StorageError;
pub use path_management::{get_key_file_path, get_key_metadata_path};

// Re-exports from new locations for backward compatibility
pub use crate::services::key_management::shared::infrastructure::{
    KeyInfo, delete_key, get_key_info, key_exists, list_keys, load_encrypted_key,
    save_encrypted_key, save_encrypted_key_with_metadata, save_yubikey_metadata,
};
pub use crate::services::key_management::shared::{KeyEntry, KeyRegistry, generate_key_id};
pub use crate::services::vault::{MetadataStorage, RecipientInfo, RecipientType, VaultMetadata};

/// Result type for storage operations
pub type Result<T> = std::result::Result<T, StorageError>;

/// Get the application directory path
pub fn get_application_directory() -> Result<PathBuf> {
    get_app_dir()
}

/// Get the keys directory path
pub fn get_keys_directory() -> Result<PathBuf> {
    get_keys_dir()
}

/// Get the logs directory path
pub fn get_logs_directory() -> Result<PathBuf> {
    get_logs_dir()
}

// Internal function imports
use path_management::{get_app_dir, get_keys_dir, get_logs_dir};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_application_directory_creation() {
        let app_dir = get_application_directory();
        assert!(app_dir.is_ok());
    }

    #[test]
    fn test_keys_directory_creation() {
        let keys_dir = get_keys_directory();
        assert!(keys_dir.is_ok());
    }

    #[test]
    fn test_logs_directory_creation() {
        let logs_dir = get_logs_directory();
        assert!(logs_dir.is_ok());
    }
}
