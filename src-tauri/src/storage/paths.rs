//! Cross-platform path handling for Barqly Vault storage.
//!
//! This module provides platform-specific directory paths using the `directories` crate:
//! - **macOS**: `~/Library/Application Support/barqly-vault/`
//! - **Windows**: `%APPDATA%\barqly-vault\`
//! - **Linux**: `~/.config/barqly-vault/`

use crate::constants::*;
use crate::storage::errors::StorageError;
use directories::ProjectDirs;
use std::path::{Path, PathBuf};

/// Get the platform-specific application directory
///
/// Returns the main application directory where Barqly Vault stores its data.
/// The directory is created if it doesn't exist.
///
/// # Returns
/// - **macOS**: `~/Library/Application Support/barqly-vault/`
/// - **Windows**: `%APPDATA%\barqly-vault\`
/// - **Linux**: `~/.config/barqly-vault/`
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_app_dir() -> Result<PathBuf, StorageError> {
    let project_dirs = ProjectDirs::from("com", "barqly", "vault")
        .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("unknown")))?;

    let config_dir = project_dirs.config_dir();
    ensure_dir_exists(config_dir)?;

    Ok(config_dir.to_path_buf())
}

/// Get the keys subdirectory
///
/// Returns the directory where encrypted keys are stored.
/// The directory is created if it doesn't exist.
///
/// # Returns
/// Platform-specific path to the keys directory
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_keys_dir() -> Result<PathBuf, StorageError> {
    let app_dir = get_app_dir()?;
    let keys_dir = app_dir.join("keys");
    ensure_dir_exists(&keys_dir)?;
    Ok(keys_dir)
}

/// Get the logs directory
///
/// Returns the directory where application logs are stored.
/// The directory is created if it doesn't exist.
///
/// # Returns
/// Platform-specific path to the logs directory
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_logs_dir() -> Result<PathBuf, StorageError> {
    let app_dir = get_app_dir()?;
    let logs_dir = app_dir.join("logs");
    ensure_dir_exists(&logs_dir)?;
    Ok(logs_dir)
}

/// Get the config directory
///
/// Returns the directory where configuration files are stored.
/// The directory is created if it doesn't exist.
///
/// # Returns
/// Platform-specific path to the config directory
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_config_dir() -> Result<PathBuf, StorageError> {
    let app_dir = get_app_dir()?;
    let config_dir = app_dir.join("config");
    ensure_dir_exists(&config_dir)?;
    Ok(config_dir)
}

/// Ensure a directory exists with proper permissions
///
/// Creates the directory if it doesn't exist and sets appropriate permissions.
///
/// # Arguments
/// * `path` - The directory path to ensure exists
///
/// # Security
/// - Sets restrictive permissions (700) on Unix systems
/// - Validates path doesn't contain symlinks (basic check)
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if permissions cannot be set
fn ensure_dir_exists(path: &Path) -> Result<(), StorageError> {
    if !path.exists() {
        std::fs::create_dir_all(path)
            .map_err(|_e| StorageError::DirectoryCreationFailed(path.to_path_buf()))?;
    }

    // Set restrictive permissions on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let metadata = std::fs::metadata(path)
            .map_err(|_e| StorageError::PermissionDenied(path.to_path_buf()))?;

        // Only set permissions if they're not already restrictive
        if metadata.permissions().mode() & 0o777 != 0o700 {
            let mut perms = metadata.permissions();
            perms.set_mode(0o700);
            std::fs::set_permissions(path, perms)
                .map_err(|_e| StorageError::PermissionDenied(path.to_path_buf()))?;
        }
    }

    Ok(())
}

/// Validate that a path is safe for file operations
///
/// Checks for path traversal attempts and other security issues.
///
/// # Arguments
/// * `path` - The path to validate
///
/// # Returns
/// `true` if the path is safe, `false` otherwise
pub fn is_safe_path(path: &Path) -> bool {
    let path_str = path.to_string_lossy();

    // Check for path traversal attempts
    if path_str.contains("..") || path_str.contains("\\") || path_str.contains("//") {
        return false;
    }

    // Check for absolute paths (relative to current directory)
    if path.is_absolute() {
        return false;
    }

    // Check for null bytes or other dangerous characters
    if path_str.contains('\0') {
        return false;
    }

    true
}

/// Get the path to a key file by label
///
/// # Arguments
/// * `label` - The key label
///
/// # Returns
/// The full path to the key file
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label contains unsafe characters
pub fn get_key_file_path(label: &str) -> Result<PathBuf, StorageError> {
    // Validate the label
    if !is_safe_label(label) {
        return Err(StorageError::InvalidLabel(label.to_string()));
    }

    let keys_dir = get_keys_dir()?;
    let filename = format!("barqly-{label}.agekey.enc");
    let key_path = keys_dir.join(filename);

    Ok(key_path)
}

/// Get the path to a key metadata file by label
///
/// # Arguments
/// * `label` - The key label
///
/// # Returns
/// The full path to the key metadata file
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label contains unsafe characters
pub fn get_key_metadata_path(label: &str) -> Result<PathBuf, StorageError> {
    // Validate the label
    if !is_safe_label(label) {
        return Err(StorageError::InvalidLabel(label.to_string()));
    }

    let keys_dir = get_keys_dir()?;
    let filename = format!("barqly-{label}.agekey.meta");
    let meta_path = keys_dir.join(filename);

    Ok(meta_path)
}

/// Check if a label is safe for file operations
///
/// # Arguments
/// * `label` - The label to validate
///
/// # Returns
/// `true` if the label is safe, `false` otherwise
fn is_safe_label(label: &str) -> bool {
    // Check for path separators
    if label.contains('/') || label.contains('\\') {
        return false;
    }

    // Check for path traversal
    if label.contains("..") {
        return false;
    }

    // Check for null bytes
    if label.contains('\0') {
        return false;
    }

    // Check for other potentially dangerous characters
    if label.contains('*') || label.contains('?') || label.contains('"') {
        return false;
    }

    // Check length (reasonable limit)
    if label.len() > MAX_KEY_LABEL_LENGTH {
        return false;
    }

    // Check if it's not empty
    if label.trim().is_empty() {
        return false;
    }

    true
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_safe_label_validation() {
        assert!(is_safe_label("normal-key"));
        assert!(is_safe_label("my_key_123"));
        assert!(is_safe_label("key-with-dashes"));

        // Unsafe labels
        assert!(!is_safe_label("key/with/slashes"));
        assert!(!is_safe_label("key\\with\\backslashes"));
        assert!(!is_safe_label("key..with..dots"));
        assert!(!is_safe_label(""));
        assert!(!is_safe_label("   "));
    }

    #[test]
    fn test_key_file_path_generation() {
        let path = get_key_file_path("test-key");
        assert!(path.is_ok());

        let path = path.unwrap();
        assert!(path
            .to_string_lossy()
            .contains("barqly-test-key.agekey.enc"));
    }

    #[test]
    fn test_key_metadata_path_generation() {
        let path = get_key_metadata_path("test-key");
        assert!(path.is_ok());

        let path = path.unwrap();
        assert!(path
            .to_string_lossy()
            .contains("barqly-test-key.agekey.meta"));
    }

    #[test]
    fn test_unsafe_label_rejection() {
        assert!(get_key_file_path("key/with/slash").is_err());
        assert!(get_key_file_path("key\\with\\backslash").is_err());
        assert!(get_key_file_path("key..with..dots").is_err());
    }
}
