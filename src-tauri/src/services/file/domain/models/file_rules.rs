use super::super::errors::{FileError, FileResult};
use crate::constants::*;
use std::path::Path;

/// Business rules for file operations
pub struct FileRules;

impl FileRules {
    /// Validate file paths for security and business constraints
    pub fn validate_file_paths(paths: &[String]) -> FileResult<()> {
        if paths.is_empty() {
            return Err(FileError::ValidationFailed("No files selected".to_string()));
        }

        if paths.len() > MAX_FILES_PER_OPERATION {
            return Err(FileError::TooManyFiles(format!(
                "Cannot process more than {} files",
                MAX_FILES_PER_OPERATION
            )));
        }

        for path in paths {
            Self::validate_single_path(path)?;
        }

        Ok(())
    }

    /// Validate a single file path
    pub fn validate_single_path(path: &str) -> FileResult<()> {
        let path_obj = Path::new(path);

        // Check for directory traversal attempts
        if crate::file_ops::contains_traversal_attempt(path_obj) {
            return Err(FileError::InvalidPath(
                "Path contains traversal attempt".to_string(),
            ));
        }

        // Check if path exists
        if !path_obj.exists() {
            return Err(FileError::FileNotFound(path.to_string()));
        }

        Ok(())
    }

    /// Validate file size constraints
    pub fn validate_file_size(file_size: u64, path: &str) -> FileResult<()> {
        if file_size > MAX_FILE_SIZE {
            return Err(FileError::FileTooLarge(format!(
                "File '{}' is {} bytes, maximum is {} bytes",
                path, file_size, MAX_FILE_SIZE
            )));
        }
        Ok(())
    }

    /// Validate total archive size
    pub fn validate_total_size(total_size: u64) -> FileResult<()> {
        if total_size > MAX_TOTAL_ARCHIVE_SIZE {
            return Err(FileError::FileTooLarge(format!(
                "Total size {} bytes exceeds maximum {} bytes",
                total_size, MAX_TOTAL_ARCHIVE_SIZE
            )));
        }
        Ok(())
    }

    /// Check if file extension is supported
    pub fn is_supported_format(path: &str) -> bool {
        // For now, support all file types
        // Could be extended with specific format restrictions
        !path.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_empty_paths() {
        assert!(FileRules::validate_file_paths(&[]).is_err());
    }

    #[test]
    fn test_validate_file_size_limits() {
        assert!(FileRules::validate_file_size(1024, "test.txt").is_ok());
        assert!(FileRules::validate_file_size(MAX_FILE_SIZE + 1, "huge.txt").is_err());
    }

    #[test]
    fn test_validate_total_size_limits() {
        assert!(FileRules::validate_total_size(1024).is_ok());
        assert!(FileRules::validate_total_size(MAX_TOTAL_ARCHIVE_SIZE + 1).is_err());
    }
}
