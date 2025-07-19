//! Unit tests for file operations validation functions
//!
//! Tests individual validation functions in isolation:
//! - Path validation
//! - File size validation
//! - Security checks
//! - Cross-platform path handling

use barqly_vault_lib::file_ops::{validate_file_size, validate_paths, FileOpsError};
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::{tempdir, NamedTempFile};

#[test]
fn test_validate_paths_with_valid_paths() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let file_path = temp_dir.path().join("test.txt");
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(b"test").unwrap();

    let paths = vec![file_path.as_path()];

    // Act
    let result = validate_paths(&paths);

    // Assert
    assert!(result.is_ok());
}

#[test]
fn test_validate_nonexistent_path() {
    // Arrange
    let path = Path::new("/nonexistent/path");

    // Act
    let result = barqly_vault_lib::file_ops::validation::validate_single_path(path);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::PathValidationFailed { .. }
    ));
}

#[test]
fn test_validate_file_size_with_small_file() {
    // Arrange
    let temp_file = NamedTempFile::new().unwrap();
    temp_file.as_file().write_all(b"small content").unwrap();

    let max_size = 1000;

    // Act
    let result = validate_file_size(temp_file.path(), max_size);

    // Assert
    assert!(result.is_ok());
}

#[test]
fn test_validate_file_size_with_large_file() {
    // Arrange
    let temp_file = NamedTempFile::new().unwrap();
    let large_content = vec![b'a'; 2000];
    temp_file.as_file().write_all(&large_content).unwrap();

    let max_size = 1000;

    // Act
    let result = validate_file_size(temp_file.path(), max_size);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::FileTooLarge { .. }
    ));
}

#[test]
fn test_validate_file_size_with_exact_size() {
    // Arrange
    let temp_file = NamedTempFile::new().unwrap();
    let content = vec![b'a'; 1000];
    temp_file.as_file().write_all(&content).unwrap();

    let max_size = 1000;

    // Act
    let result = validate_file_size(temp_file.path(), max_size);

    // Assert
    assert!(result.is_ok());
}

#[test]
fn test_traversal_detection_through_public_api() {
    // Test traversal detection through the public validate_single_path function
    let traversal_paths = [
        "file/../other",
        "file\\..\\other",
        "file/..%2fother",
        "file%2e%2e/other",
    ];

    // Act & Assert - These should fail validation
    for path_str in &traversal_paths {
        let path = Path::new(path_str);
        let result = barqly_vault_lib::file_ops::validation::validate_single_path(path);
        assert!(result.is_err(), "Should detect traversal in: {}", path_str);
    }
}

#[test]
fn test_normal_paths_pass_validation() {
    // Test that normal paths pass validation
    let normal_paths = [
        "file.txt",
        "folder/file.txt",
        "folder\\file.txt",
        "folder/subfolder/file.txt",
    ];

    // Act & Assert - These should pass validation (if files exist)
    for path_str in &normal_paths {
        let path = Path::new(path_str);
        // Note: These will fail because files don't exist, but they shouldn't fail due to traversal
        let result = barqly_vault_lib::file_ops::validation::validate_single_path(path);
        // The result depends on whether the file exists, but it shouldn't be a traversal error
        if result.is_err() {
            assert!(!matches!(
                result.unwrap_err(),
                FileOpsError::PathValidationFailed { reason, .. } if reason.contains("traversal")
            ));
        }
    }
}

#[test]
fn test_path_normalization() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let test_file = temp_dir.path().join("test.txt");
    fs::write(&test_file, b"test").unwrap();

    // Test with an existing file path
    let existing_path = test_file;

    // Act
    let result = barqly_vault_lib::file_ops::validation::normalize_path(&existing_path);

    // Assert
    assert!(result.is_ok());
    let normalized = result.unwrap();
    assert!(normalized.is_absolute());
}

#[test]
fn test_get_relative_path() {
    // Arrange
    let base_path = Path::new("/base/directory");
    let full_path = Path::new("/base/directory/subfolder/file.txt");

    // Act
    let result = barqly_vault_lib::file_ops::validation::get_relative_path(full_path, base_path);

    // Assert
    assert!(result.is_ok());
    let relative = result.unwrap();
    assert_eq!(relative, Path::new("subfolder/file.txt"));
}

#[test]
fn test_get_relative_path_fails_for_unrelated_paths() {
    // Arrange
    let base_path = Path::new("/base/directory");
    let unrelated_path = Path::new("/different/directory/file.txt");

    // Act
    let result =
        barqly_vault_lib::file_ops::validation::get_relative_path(unrelated_path, base_path);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::CrossPlatformPathError { .. }
    ));
}

#[test]
fn test_validate_archive_path() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("archive.tar.gz");

    // Act
    let result = barqly_vault_lib::file_ops::validation::validate_archive_path(&archive_path);

    // Assert
    assert!(result.is_ok());
}

#[test]
fn test_validate_archive_path_fails_for_relative_path() {
    // Arrange
    let relative_path = Path::new("relative/archive.tar.gz");

    // Act
    let result = barqly_vault_lib::file_ops::validation::validate_archive_path(relative_path);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::PathValidationFailed { .. }
    ));
}

#[test]
fn test_validate_archive_path_fails_for_nonexistent_parent() {
    // Arrange
    let nonexistent_path = Path::new("/nonexistent/directory/archive.tar.gz");

    // Act
    let result = barqly_vault_lib::file_ops::validation::validate_archive_path(nonexistent_path);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::PathValidationFailed { .. }
    ));
}
