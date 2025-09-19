//! # Storage Module
//!
//! Manages secure storage of encrypted keys and application data using platform-specific directories.
//!
//! ## Security Considerations
//! - Uses platform-specific secure directories (Application Support on macOS, etc.)
//! - Sets restrictive file permissions (600 on Unix systems)
//! - Validates file paths to prevent traversal attacks
//! - Implements secure deletion with overwriting
//!
//! ## Platform-Specific Paths
//! - **macOS**: `~/Library/Application Support/barqly-vault/`
//! - **Windows**: `%APPDATA%\barqly-vault\`
//! - **Linux**: `~/.config/barqly-vault/`
//!
//! ## Example
//! ```no_run
//! use barqly_vault_lib::storage;
//!
//! fn main() -> Result<(), Box<dyn std::error::Error>> {
//!     // Save an encrypted key
//!     let encrypted_key_bytes = b"encrypted-key-data";
//!     let key_path = storage::save_encrypted_key(
//!         "my-key",
//!         encrypted_key_bytes,
//!         Some("age1...")
//!     )?;
//!
//!     // List available keys
//!     let keys = storage::list_keys()?;
//!     for key in keys {
//!         println!("Key: {} (created: {})", key.label, key.created_at);
//!     }
//!     
//!     Ok(())
//! }
//! ```

pub mod cache;
pub mod errors;
pub mod key_store;
pub mod metadata_v2;
pub mod path_management;
pub mod vault_store;

use std::path::PathBuf;

pub use cache::{get_cache, CacheMetrics, StorageCache};
pub use errors::StorageError;
pub use key_store::{
    delete_key, get_key_info, key_exists, list_keys, load_encrypted_key, save_encrypted_key,
    save_encrypted_key_with_metadata, save_yubikey_metadata, KeyInfo,
};
pub use metadata_v2::{MetadataV2Storage, RecipientInfo, RecipientType, VaultMetadataV2};
pub use path_management::{get_key_file_path, get_key_metadata_path};

/// Result type for storage operations
pub type Result<T> = std::result::Result<T, StorageError>;

/// Get the application directory path
///
/// Returns the platform-specific application directory where Barqly Vault
/// stores its configuration, keys, and other data.
///
/// # Returns
/// - **macOS**: `~/Library/Application Support/barqly-vault/`
/// - **Windows**: `%APPDATA%\barqly-vault\`
/// - **Linux**: `~/.config/barqly-vault/`
///
/// # Errors
/// - `StorageError::IoError` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_application_directory() -> Result<PathBuf> {
    get_app_dir()
}

/// Get the keys directory path
///
/// Returns the subdirectory where encrypted keys are stored.
///
/// # Returns
/// Platform-specific path to the keys directory
///
/// # Errors
/// - `StorageError::IoError` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_keys_directory() -> Result<PathBuf> {
    get_keys_dir()
}

/// Get the logs directory path
///
/// Returns the subdirectory where application logs are stored.
///
/// # Returns
/// Platform-specific path to the logs directory
///
/// # Errors
/// - `StorageError::IoError` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_logs_directory() -> Result<PathBuf> {
    get_logs_dir()
}

// Internal function imports for the public API functions above
use path_management::{get_app_dir, get_keys_dir, get_logs_dir};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_application_directory_creation() {
        // This test verifies that we can get the application directory
        // In a real test environment, we'd mock the directories crate
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
