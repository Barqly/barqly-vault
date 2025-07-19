//! Path validation and security checks

use crate::file_ops::{FileOpsError, Result};
use std::path::{Path, PathBuf};
use tracing::{info, warn};

/// Validate a list of paths for security and accessibility
pub fn validate_paths(paths: &[&Path]) -> Result<()> {
    for path in paths {
        validate_single_path(path)?;
    }
    Ok(())
}

/// Validate a single path for security and accessibility
pub fn validate_single_path(path: &Path) -> Result<()> {
    // Check if path exists
    if !path.exists() {
        return Err(FileOpsError::PathValidationFailed {
            path: path.to_path_buf(),
            reason: "Path does not exist".to_string(),
        });
    }

    // Check for symlinks (security risk)
    if path.is_symlink() {
        return Err(FileOpsError::SymlinkDetected {
            path: path.to_path_buf(),
        });
    }

    // Check for directory traversal attempts
    if contains_traversal_attempt(path) {
        return Err(FileOpsError::PathValidationFailed {
            path: path.to_path_buf(),
            reason: "Directory traversal attempt detected".to_string(),
        });
    }

    // Check permissions
    if !is_readable(path) {
        return Err(FileOpsError::PermissionDenied {
            path: path.to_path_buf(),
        });
    }

    // Check for hidden files (optional warning)
    if is_hidden_file(path) {
        warn!("Hidden file detected: {}", path.display());
    }

    Ok(())
}

/// Validate file size against maximum allowed size
pub fn validate_file_size(path: &Path, max_size: u64) -> Result<()> {
    let metadata = std::fs::metadata(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let file_size = metadata.len();

    if file_size > max_size {
        return Err(FileOpsError::FileTooLarge {
            path: path.to_path_buf(),
            size: file_size,
            max: max_size,
        });
    }

    // Warn if file is large but still within limits
    if file_size > max_size / 2 {
        warn!(
            "Large file detected: {} ({:.1} MB)",
            path.display(),
            file_size as f64 / (1024.0 * 1024.0)
        );
    }

    Ok(())
}

/// Check if path contains directory traversal attempts
fn contains_traversal_attempt(path: &Path) -> bool {
    let path_str = path.to_string_lossy();

    // Check for common traversal patterns
    let traversal_patterns = ["..", "\\..", "/..", "..\\", "..//", "\\..\\", "//.."];

    for pattern in &traversal_patterns {
        if path_str.contains(pattern) {
            return true;
        }
    }

    // Check for encoded traversal attempts
    let encoded_patterns = [
        "%2e%2e",    // URL encoded ".."
        "..%2f",     // URL encoded ".."
        "%2e%2e%2f", // URL encoded "../"
    ];

    for pattern in &encoded_patterns {
        if path_str.contains(pattern) {
            return true;
        }
    }

    false
}

/// Check if a path is readable
fn is_readable(path: &Path) -> bool {
    if path.is_file() {
        std::fs::File::open(path).is_ok()
    } else if path.is_dir() {
        std::fs::read_dir(path).is_ok()
    } else {
        false
    }
}

/// Check if a file is hidden
fn is_hidden_file(path: &Path) -> bool {
    if let Some(file_name) = path.file_name() {
        let name = file_name.to_string_lossy();

        // Unix hidden files
        if name.starts_with('.') {
            return true;
        }

        // Windows hidden files
        #[cfg(windows)]
        {
            if let Ok(metadata) = std::fs::metadata(path) {
                use std::os::windows::fs::MetadataExt;
                return (metadata.file_attributes() & 0x2) != 0; // FILE_ATTRIBUTE_HIDDEN
            }
        }
    }

    false
}

/// Normalize a path for cross-platform compatibility
pub fn normalize_path(path: &Path) -> Result<PathBuf> {
    let canonical = path
        .canonicalize()
        .map_err(|e| FileOpsError::CrossPlatformPathError {
            message: format!("Failed to canonicalize path: {}", e),
        })?;

    // Convert to platform-specific format
    let normalized = canonical.to_path_buf();

    info!(
        "Normalized path: {} -> {}",
        path.display(),
        normalized.display()
    );
    Ok(normalized)
}

/// Get relative path from base directory
pub fn get_relative_path(path: &Path, base: &Path) -> Result<PathBuf> {
    path.strip_prefix(base)
        .map(|p| p.to_path_buf())
        .map_err(|e| FileOpsError::CrossPlatformPathError {
            message: format!("Failed to get relative path: {}", e),
        })
}

/// Validate archive path for security
pub fn validate_archive_path(path: &Path) -> Result<()> {
    // Check if path is absolute
    if !path.is_absolute() {
        return Err(FileOpsError::PathValidationFailed {
            path: path.to_path_buf(),
            reason: "Archive path must be absolute".to_string(),
        });
    }

    // Check if parent directory exists and is writable
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(FileOpsError::PathValidationFailed {
                path: path.to_path_buf(),
                reason: "Parent directory does not exist".to_string(),
            });
        }

        if !is_writable(parent) {
            return Err(FileOpsError::PermissionDenied {
                path: parent.to_path_buf(),
            });
        }
    }

    // Check if file already exists
    if path.exists() {
        warn!("Archive file already exists: {}", path.display());
    }

    Ok(())
}

/// Check if a path is writable
fn is_writable(path: &Path) -> bool {
    if path.is_dir() {
        // Try to create a temporary file to test write permissions
        let temp_file = path.join(".write_test");
        match std::fs::File::create(&temp_file) {
            Ok(_) => {
                let _ = std::fs::remove_file(&temp_file);
                true
            }
            Err(_) => false,
        }
    } else {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::{tempdir, NamedTempFile};

    #[test]
    fn test_validate_paths() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test.txt");
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(b"test").unwrap();

        let paths = vec![file_path.as_path()];
        assert!(validate_paths(&paths).is_ok());
    }

    #[test]
    fn test_validate_nonexistent_path() {
        let path = Path::new("/nonexistent/path");
        let result = validate_single_path(path);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            FileOpsError::PathValidationFailed { .. }
        ));
    }

    #[test]
    fn test_validate_file_size() {
        let temp_file = NamedTempFile::new().unwrap();
        temp_file.as_file().write_all(b"small content").unwrap();

        let max_size = 1000;
        assert!(validate_file_size(temp_file.path(), max_size).is_ok());
    }

    #[test]
    fn test_validate_large_file() {
        let temp_file = NamedTempFile::new().unwrap();
        let large_content = vec![b'a'; 2000];
        temp_file.as_file().write_all(&large_content).unwrap();

        let max_size = 1000;
        let result = validate_file_size(temp_file.path(), max_size);
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            FileOpsError::FileTooLarge { .. }
        ));
    }

    #[test]
    fn test_traversal_detection() {
        let traversal_paths = [
            "file/../other",
            "file\\..\\other",
            "file/..%2fother",
            "file%2e%2e/other",
        ];

        for path_str in &traversal_paths {
            let path = Path::new(path_str);
            assert!(
                contains_traversal_attempt(path),
                "Failed to detect traversal in: {}",
                path_str
            );
        }
    }

    #[test]
    fn test_normal_paths() {
        let normal_paths = [
            "file.txt",
            "folder/file.txt",
            "folder\\file.txt",
            "folder/subfolder/file.txt",
        ];

        for path_str in &normal_paths {
            let path = Path::new(path_str);
            assert!(
                !contains_traversal_attempt(path),
                "False positive for: {}",
                path_str
            );
        }
    }
}
