//! Error types for file operations module

use std::path::PathBuf;
use thiserror::Error;

/// Error type for file operations
#[derive(Error, Debug)]
pub enum FileOpsError {
    /// Invalid file or folder selection
    #[error("Invalid selection: {message}")]
    InvalidSelection { message: String },

    /// File not found
    #[error("File not found: {path:?}")]
    FileNotFound { path: PathBuf },

    /// Directory not found
    #[error("Directory not found: {path:?}")]
    DirectoryNotFound { path: PathBuf },

    /// File too large
    #[error("File too large: {path:?} (size: {size} bytes, max: {max} bytes)")]
    FileTooLarge { path: PathBuf, size: u64, max: u64 },

    /// Archive too large
    #[error("Archive too large: {size} bytes (max: {max} bytes)")]
    ArchiveTooLarge { size: u64, max: u64 },

    /// Path validation failed
    #[error("Path validation failed: {path:?} - {reason}")]
    PathValidationFailed { path: PathBuf, reason: String },

    /// Symlink detected (security risk)
    #[error("Symlink detected (security risk): {path:?}")]
    SymlinkDetected { path: PathBuf },

    /// Permission denied
    #[error("Permission denied: {path:?}")]
    PermissionDenied { path: PathBuf },

    /// IO error
    #[error("IO error: {message}")]
    IoError {
        message: String,
        #[source]
        source: std::io::Error,
    },

    /// Archive creation failed
    #[error("Archive creation failed: {message}")]
    ArchiveCreationFailed { message: String },

    /// Archive extraction failed
    #[error("Archive extraction failed: {message}")]
    ArchiveExtractionFailed { message: String },

    /// Manifest creation failed
    #[error("Manifest creation failed: {message}")]
    ManifestCreationFailed { message: String },

    /// Manifest verification failed
    #[error("Manifest verification failed: {message}")]
    ManifestVerificationFailed { message: String },

    /// Staging area creation failed
    #[error("Staging area creation failed: {message}")]
    StagingAreaFailed { message: String },

    /// Hash calculation failed
    #[error("Hash calculation failed: {message}")]
    HashCalculationFailed { message: String },

    /// Invalid archive format
    #[error("Invalid archive format: {message}")]
    InvalidArchiveFormat { message: String },

    /// Cross-platform path error
    #[error("Cross-platform path error: {message}")]
    CrossPlatformPathError { message: String },
}

impl From<std::io::Error> for FileOpsError {
    fn from(err: std::io::Error) -> Self {
        FileOpsError::IoError {
            message: "IO operation failed".to_string(),
            source: err,
        }
    }
}

impl FileOpsError {
    /// Check if this is a user-friendly error that should be shown to the user
    pub fn is_user_friendly(&self) -> bool {
        matches!(
            self,
            FileOpsError::FileNotFound { .. }
                | FileOpsError::DirectoryNotFound { .. }
                | FileOpsError::FileTooLarge { .. }
                | FileOpsError::PermissionDenied { .. }
                | FileOpsError::InvalidSelection { .. }
        )
    }

    /// Get a user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            FileOpsError::FileNotFound { path } => {
                format!("File not found: {}", path.display())
            }
            FileOpsError::DirectoryNotFound { path } => {
                format!("Directory not found: {}", path.display())
            }
            FileOpsError::FileTooLarge { path, size, max } => {
                let size_mb = *size as f64 / (1024.0 * 1024.0);
                let max_mb = *max as f64 / (1024.0 * 1024.0);
                format!(
                    "File '{}' is too large ({:.1} MB). Maximum allowed size is {:.1} MB.",
                    path.display(),
                    size_mb,
                    max_mb
                )
            }
            FileOpsError::PermissionDenied { path } => {
                format!("Permission denied: {}", path.display())
            }
            FileOpsError::InvalidSelection { message } => {
                format!("Invalid selection: {message}")
            }
            FileOpsError::SymlinkDetected { path } => {
                format!("Security risk: Symlink detected at {}", path.display())
            }
            _ => self.to_string(),
        }
    }
}
