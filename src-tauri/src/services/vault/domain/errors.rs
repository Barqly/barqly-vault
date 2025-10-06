#[derive(Debug)]
pub enum VaultError {
    NotFound(String),
    AlreadyExists(String),
    InvalidName(String),
    StorageError(String),
    KeyLimitExceeded(String),
    KeyNotFound(String),
    InvalidOperation(String),
    OperationFailed(String),
}

impl std::fmt::Display for VaultError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound(id) => write!(f, "Vault '{}' not found", id),
            Self::AlreadyExists(name) => write!(f, "Vault '{}' already exists", name),
            Self::InvalidName(name) => write!(f, "Invalid vault name: '{}'", name),
            Self::StorageError(msg) => write!(f, "Storage error: {}", msg),
            Self::KeyLimitExceeded(vault) => write!(f, "Key limit exceeded for vault '{}'", vault),
            Self::KeyNotFound(key) => write!(f, "Key '{}' not found in vault", key),
            Self::InvalidOperation(msg) => write!(f, "Invalid operation: {}", msg),
            Self::OperationFailed(msg) => write!(f, "Operation failed: {}", msg),
        }
    }
}

impl std::error::Error for VaultError {}

pub type VaultResult<T> = std::result::Result<T, VaultError>;
