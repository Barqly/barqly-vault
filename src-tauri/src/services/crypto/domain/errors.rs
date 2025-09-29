#[derive(Debug)]
pub enum CryptoError {
    EncryptionFailed(String),
    DecryptionFailed(String),
    InvalidKey(String),
    InvalidInput(String),
    FileNotFound(String),
    DirectoryNotFound(String),
    PermissionDenied(String),
    FileTooLarge(String),
    UnsupportedFormat(String),
    OperationInProgress,
    IoError(String),
    ConfigurationError(String),
}

impl std::fmt::Display for CryptoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::EncryptionFailed(msg) => write!(f, "Encryption failed: {}", msg),
            Self::DecryptionFailed(msg) => write!(f, "Decryption failed: {}", msg),
            Self::InvalidKey(key) => write!(f, "Invalid key: '{}'", key),
            Self::InvalidInput(msg) => write!(f, "Invalid input: {}", msg),
            Self::FileNotFound(path) => write!(f, "File not found: '{}'", path),
            Self::DirectoryNotFound(path) => write!(f, "Directory not found: '{}'", path),
            Self::PermissionDenied(path) => write!(f, "Permission denied: '{}'", path),
            Self::FileTooLarge(details) => write!(f, "File too large: {}", details),
            Self::UnsupportedFormat(format) => write!(f, "Unsupported format: '{}'", format),
            Self::OperationInProgress => write!(f, "Another operation is already in progress"),
            Self::IoError(msg) => write!(f, "IO error: {}", msg),
            Self::ConfigurationError(msg) => write!(f, "Configuration error: {}", msg),
        }
    }
}

impl std::error::Error for CryptoError {}

pub type CryptoResult<T> = std::result::Result<T, CryptoError>;
