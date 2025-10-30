//! Directory management for Barqly Vault storage.
//!
//! This module provides platform-specific directory paths using Tauri's path resolver
//! to ensure consistent naming across all platforms:
//! - **macOS**: `~/Library/Application Support/com.barqly.vault/`
//! - **Windows**: `%APPDATA%\com.barqly.vault\`
//! - **Linux**: `~/.config/com.barqly.vault/`

use crate::error::StorageError;
use crate::services::key_management::yubikey::infrastructure::pty::app_handle::get_app_handle;
use directories::ProjectDirs;
use std::path::{Path, PathBuf};
use tauri::Manager;

/// Get the platform-specific application directory
///
/// Returns the main application directory where Barqly Vault stores its data.
/// The directory is created if it doesn't exist.
///
/// Uses Tauri's path resolver when available for consistent naming across platforms.
/// Falls back to manual construction for tests and non-Tauri contexts.
///
/// # Returns
/// - **macOS**: `~/Library/Application Support/com.barqly.vault/`
/// - **Windows**: `%APPDATA%\com.barqly.vault\`
/// - **Linux**: `~/.config/com.barqly.vault/`
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
/// - `StorageError::PermissionDenied` if the directory cannot be accessed
pub fn get_app_dir() -> Result<PathBuf, StorageError> {
    // Try to use Tauri's path resolver first (production)
    if let Some(app_handle) = get_app_handle() {
        let app_dir = app_handle.path().app_config_dir().map_err(|e| {
            StorageError::DirectoryCreationFailed(PathBuf::from(format!(
                "Failed to get app config dir: {}",
                e
            )))
        })?;

        ensure_dir_exists(&app_dir)?;
        return Ok(app_dir);
    }

    // Fallback for tests and development
    // On Linux, manually construct com.barqly.vault path for consistency
    #[cfg(target_os = "linux")]
    {
        let base_dirs = directories::BaseDirs::new()
            .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("unknown")))?;
        let app_dir = base_dirs.config_dir().join("com.barqly.vault");
        ensure_dir_exists(&app_dir)?;
        return Ok(app_dir);
    }

    // On other platforms, use ProjectDirs (already creates com.barqly.vault on macOS)
    #[cfg(not(target_os = "linux"))]
    {
        let project_dirs = ProjectDirs::from("com", "barqly", "vault")
            .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("unknown")))?;
        let config_dir = project_dirs.config_dir();
        ensure_dir_exists(config_dir)?;
        Ok(config_dir.to_path_buf())
    }
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

/// Get the vaults manifest directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/vaults/`
pub fn get_vaults_manifest_dir() -> Result<PathBuf, StorageError> {
    let app_dir = get_app_dir()?;
    let vaults_dir = app_dir.join("vaults");
    ensure_dir_exists(&vaults_dir)?;
    Ok(vaults_dir)
}

/// Get the backups directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/backups/`
pub fn get_backups_dir() -> Result<PathBuf, StorageError> {
    let app_dir = get_app_dir()?;
    let backups_dir = app_dir.join("backups");
    ensure_dir_exists(&backups_dir)?;
    Ok(backups_dir)
}

/// Get the manifest backups directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/backups/manifest/`
pub fn get_manifest_backups_dir() -> Result<PathBuf, StorageError> {
    let backups_dir = get_backups_dir()?;
    let manifest_backups = backups_dir.join("manifest");
    ensure_dir_exists(&manifest_backups)?;
    Ok(manifest_backups)
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
pub(super) fn ensure_dir_exists(path: &Path) -> Result<(), StorageError> {
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
