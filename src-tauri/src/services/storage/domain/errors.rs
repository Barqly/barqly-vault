#[derive(Debug)]
pub enum StorageError {
    ConfigurationNotFound(String),
    ConfigurationInvalid(String),
    ConfigurationSaveFailed(String),
    CacheError(String),
    KeyListingFailed(String),
    KeyDeletionFailed(String),
    PermissionDenied(String),
    IoError(String),
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ConfigurationNotFound(path) => write!(f, "Configuration not found: '{}'", path),
            Self::ConfigurationInvalid(msg) => write!(f, "Invalid configuration: {}", msg),
            Self::ConfigurationSaveFailed(msg) => {
                write!(f, "Failed to save configuration: {}", msg)
            }
            Self::CacheError(msg) => write!(f, "Cache error: {}", msg),
            Self::KeyListingFailed(msg) => write!(f, "Key listing failed: {}", msg),
            Self::KeyDeletionFailed(msg) => write!(f, "Key deletion failed: {}", msg),
            Self::PermissionDenied(path) => write!(f, "Permission denied: '{}'", path),
            Self::IoError(msg) => write!(f, "IO error: {}", msg),
        }
    }
}

impl std::error::Error for StorageError {}

pub type StorageResult<T> = std::result::Result<T, StorageError>;
