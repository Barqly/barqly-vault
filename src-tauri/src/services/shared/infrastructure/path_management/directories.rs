//! Directory management for Barqly Vault storage.
//!
//! This module now delegates to the centralized PathProvider to ensure
//! consistent directory paths across all platforms and application phases.
//!
//! ## Platform Paths
//! - **macOS**: `~/Library/Application Support/com.barqly.vault/`
//! - **Windows**: `%APPDATA%\com.barqly.vault\`
//! - **Linux**: `~/.config/com.barqly.vault/`

use super::provider::PathProvider;
use crate::error::StorageError;
use std::path::{Path, PathBuf};

/// Get the platform-specific application directory
///
/// Returns the main application directory where Barqly Vault stores its data.
/// The directory is created if it doesn't exist.
///
/// Uses the centralized PathProvider for consistent naming across platforms.
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
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let app_dir = provider.app_config_dir()?;
    provider.ensure_dir_exists(&app_dir)?;
    Ok(app_dir)
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
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let keys_dir = provider.keys_dir()?;
    provider.ensure_dir_exists(&keys_dir)?;
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
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let logs_dir = provider.logs_dir()?;
    provider.ensure_dir_exists(&logs_dir)?;
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
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let config_dir = provider.config_dir()?;
    provider.ensure_dir_exists(&config_dir)?;
    Ok(config_dir)
}

/// Get the vaults manifest directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/vaults/`
pub fn get_vaults_manifest_dir() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let vaults_dir = provider.vaults_manifest_dir()?;
    provider.ensure_dir_exists(&vaults_dir)?;
    Ok(vaults_dir)
}

/// Get the backups directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/backups/`
pub fn get_backups_dir() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let backups_dir = provider.backups_dir()?;
    provider.ensure_dir_exists(&backups_dir)?;
    Ok(backups_dir)
}

/// Get the manifest backups directory (non-sync storage)
///
/// Returns: `~/Library/Application Support/com.barqly.vault/backups/manifest/`
pub fn get_manifest_backups_dir() -> Result<PathBuf, StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    let manifest_backups = provider.manifest_backups_dir()?;
    provider.ensure_dir_exists(&manifest_backups)?;
    Ok(manifest_backups)
}

/// Ensure a directory exists with proper permissions
///
/// Creates the directory if it doesn't exist and sets appropriate permissions.
/// Delegates to PathProvider for consistent behavior.
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
#[allow(dead_code)]
pub(super) fn ensure_dir_exists(path: &Path) -> Result<(), StorageError> {
    let provider = PathProvider::global()?;
    let provider = provider
        .read()
        .map_err(|_| StorageError::InitializationFailed("PathProvider lock poisoned".into()))?;

    provider.ensure_dir_exists(path)
}
