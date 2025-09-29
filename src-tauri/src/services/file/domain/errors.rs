#[derive(Debug)]
pub enum FileError {
    InvalidPath(String),
    FileNotFound(String),
    DirectoryNotFound(String),
    PermissionDenied(String),
    FileTooLarge(String),
    TooManyFiles(String),
    UnsupportedFormat(String),
    ArchiveCreationFailed(String),
    ManifestCreationFailed(String),
    ValidationFailed(String),
    IoError(String),
}

impl std::fmt::Display for FileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPath(path) => write!(f, "Invalid file path: '{}'", path),
            Self::FileNotFound(path) => write!(f, "File not found: '{}'", path),
            Self::DirectoryNotFound(path) => write!(f, "Directory not found: '{}'", path),
            Self::PermissionDenied(path) => write!(f, "Permission denied: '{}'", path),
            Self::FileTooLarge(details) => write!(f, "File too large: {}", details),
            Self::TooManyFiles(details) => write!(f, "Too many files: {}", details),
            Self::UnsupportedFormat(format) => write!(f, "Unsupported file format: '{}'", format),
            Self::ArchiveCreationFailed(msg) => write!(f, "Archive creation failed: {}", msg),
            Self::ManifestCreationFailed(msg) => write!(f, "Manifest creation failed: {}", msg),
            Self::ValidationFailed(msg) => write!(f, "File validation failed: {}", msg),
            Self::IoError(msg) => write!(f, "IO error: {}", msg),
        }
    }
}

impl std::error::Error for FileError {}

pub type FileResult<T> = std::result::Result<T, FileError>;
