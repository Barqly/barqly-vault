//! Cross-platform path handling for Barqly Vault storage.
//!
//! This module provides platform-specific directory paths using the `directories` crate:
//! - **macOS**: `~/Library/Application Support/barqly-vault/`
//! - **Windows**: `%APPDATA%\barqly-vault\`
//! - **Linux**: `~/.config/barqly-vault/`

mod directories;
mod key_paths;
mod user_vaults;
mod validation;

// Re-export all public functions to maintain API compatibility
pub use directories::{
    get_app_dir, get_backups_dir, get_config_dir, get_keys_dir, get_logs_dir,
    get_manifest_backups_dir, get_vaults_manifest_dir,
};
pub use key_paths::{get_key_file_path, get_key_metadata_path};
pub use user_vaults::{
    SanitizedVaultName, generate_backup_timestamp, get_manifest_backup_path,
    get_recovery_directory, get_vault_file_path, get_vault_manifest_path, get_vault_recovery_path,
    get_vaults_directory, sanitize_vault_name, validate_vault_name,
};
pub use validation::is_safe_path;

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn test_app_dir_creation() {
        let app_dir = get_app_dir();
        assert!(app_dir.is_ok());

        let app_dir = app_dir.unwrap();
        assert!(app_dir.exists());
        assert!(app_dir.is_dir());
    }

    #[test]
    fn test_keys_dir_creation() {
        let keys_dir = get_keys_dir();
        assert!(keys_dir.is_ok());

        let keys_dir = keys_dir.unwrap();
        assert!(keys_dir.exists());
        assert!(keys_dir.is_dir());
    }

    #[test]
    fn test_logs_dir_creation() {
        let logs_dir = get_logs_dir();
        assert!(logs_dir.is_ok());

        let logs_dir = logs_dir.unwrap();
        assert!(logs_dir.exists());
        assert!(logs_dir.is_dir());
    }

    #[test]
    fn test_safe_path_validation() {
        assert!(is_safe_path(Path::new("normal-file.txt")));
        assert!(is_safe_path(Path::new("folder/file.txt")));

        // Unsafe paths
        assert!(!is_safe_path(Path::new("../file.txt")));
        assert!(!is_safe_path(Path::new("file/../file.txt")));
        assert!(!is_safe_path(Path::new("/absolute/path")));
    }

    #[test]
    fn test_key_file_path_generation() {
        let path = get_key_file_path("test-key");
        assert!(path.is_ok());

        let path = path.unwrap();
        assert!(path.to_string_lossy().contains("test-key.agekey.enc"));
    }

    #[test]
    fn test_key_metadata_path_generation() {
        let path = get_key_metadata_path("test-key");
        assert!(path.is_ok());

        let path = path.unwrap();
        assert!(path.to_string_lossy().contains("test-key.agekey.meta"));
    }

    #[test]
    fn test_unsafe_label_rejection() {
        assert!(get_key_file_path("key/with/slash").is_err());
        assert!(get_key_file_path("key\\with\\backslash").is_err());
        assert!(get_key_file_path("key..with..dots").is_err());
    }
}
