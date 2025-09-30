//! Security validation for key files
//!
//! This module provides security checks and validation for key files
//! including permission verification and integrity checks.

use crate::storage::errors::StorageError;
use std::fs;
use std::path::Path;

/// Validate key file security
///
/// # Arguments
/// * `key_path` - Path to the key file to validate
///
/// # Security
/// - Checks file permissions on Unix systems (should be 600)
/// - Ensures file exists and is readable
///
/// # Errors
/// - `StorageError::FileCorruption` if permissions are unsafe
/// - `StorageError::IoError` if file operations fail
pub(crate) fn validate_key_file(key_path: &Path) -> Result<(), StorageError> {
    // Check file permissions on Unix systems
    #[cfg(unix)]
    {
        check_file_permissions(key_path)?;
    }

    Ok(())
}

/// Check file permissions on Unix systems
///
/// # Arguments
/// * `path` - Path to the file to check
///
/// # Security
/// Ensures file has restrictive permissions (600) to prevent unauthorized access
///
/// # Errors
/// - `StorageError::FileCorruption` if permissions are too permissive
/// - `StorageError::IoError` if unable to read file metadata
#[cfg(unix)]
pub(crate) fn check_file_permissions(path: &Path) -> Result<(), StorageError> {
    use std::os::unix::fs::PermissionsExt;

    let metadata = fs::metadata(path).map_err(StorageError::IoError)?;
    let mode = metadata.permissions().mode();

    // Check if permissions are too permissive (should be 600)
    if mode & 0o777 != 0o600 {
        return Err(StorageError::FileCorruption(format!(
            "Key file has unsafe permissions: {mode:o}"
        )));
    }

    Ok(())
}

/// Stub for non-Unix systems
#[cfg(not(unix))]
pub(crate) fn check_file_permissions(_path: &Path) -> Result<(), StorageError> {
    // Permission checks are only implemented for Unix systems
    Ok(())
}
