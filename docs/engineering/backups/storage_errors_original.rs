//! Storage-specific error types for the Barqly Vault storage module.

use std::path::PathBuf;
use thiserror::Error;

/// Errors that can occur during storage operations
#[derive(Error, Debug)]
pub enum StorageError {
    /// Invalid key label provided
    #[error("Invalid key label: {0}")]
    InvalidLabel(String),

    /// Key not found in storage
    #[error("Key not found: {0}")]
    KeyNotFound(String),

    /// Key already exists in storage
    #[error("Key already exists: {0}")]
    KeyAlreadyExists(String),

    /// Permission denied for file or directory operation
    #[error("Permission denied: {0}")]
    PermissionDenied(PathBuf),

    /// Path traversal attempt detected
    #[error("Path traversal attempt detected")]
    PathTraversal,

    /// IO error during file operations
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    /// Serialization/deserialization error
    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    /// Invalid metadata format
    #[error("Invalid metadata format: {0}")]
    InvalidMetadata(String),

    /// Directory creation failed
    #[error("Failed to create directory: {0}")]
    DirectoryCreationFailed(PathBuf),

    /// File corruption detected
    #[error("File corruption detected: {0}")]
    FileCorruption(String),

    /// Invalid vault name provided
    #[error("Invalid vault name: {0}")]
    InvalidVaultName(String),
}

impl StorageError {
    /// Check if this is a recoverable error
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            StorageError::IoError(_)
                | StorageError::PermissionDenied(_)
                | StorageError::DirectoryCreationFailed(_)
        )
    }

    /// Check if this is a security-related error
    pub fn is_security_error(&self) -> bool {
        matches!(
            self,
            StorageError::PathTraversal
                | StorageError::InvalidLabel(_)
                | StorageError::FileCorruption(_)
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_recoverability() {
        let io_error =
            StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test"));
        assert!(io_error.is_recoverable());

        let security_error = StorageError::PathTraversal;
        assert!(!security_error.is_recoverable());
        assert!(security_error.is_security_error());
    }

    #[test]
    fn test_error_display() {
        let error = StorageError::InvalidLabel("test/key".to_string());
        let display = error.to_string();
        assert!(display.contains("Invalid key label"));
        assert!(display.contains("test/key"));
    }
}
