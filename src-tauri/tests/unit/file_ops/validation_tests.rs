//! Unit tests for file operations validation functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::services::file::infrastructure::file_operations::{
    FileOpsError, validate_file_size, validate_paths,
};
use rstest::*;
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::{NamedTempFile, tempdir};

// ============================================================================
// PATH VALIDATION TESTS
// ============================================================================

#[test]
fn should_validate_existing_paths_successfully() {
    // Given: A temporary directory with a test file
    let temp_dir = tempdir().unwrap();
    let file_path = temp_dir.path().join("test.txt");
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(b"test").unwrap();

    let paths = vec![file_path.as_path()];

    // When: Validating the paths
    let result = validate_paths(&paths);

    // Then: Validation should succeed
    TestAssertions::assert_ok(result, "Path validation should succeed for existing files");
}

#[test]
fn should_fail_validation_for_nonexistent_path() {
    // Given: A nonexistent path
    let path = Path::new("/nonexistent/path");

    // When: Validating the path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_single_path(path);

    // Then: Validation should fail with appropriate error
    assert!(
        result.is_err(),
        "Path validation should fail for nonexistent paths"
    );

    // And: The error should be PathValidationFailed
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::PathValidationFailed { .. }),
        "Error should be PathValidationFailed for nonexistent path"
    );
}

// ============================================================================
// FILE SIZE VALIDATION TESTS
// ============================================================================

#[rstest]
#[case(100, "small_file")]
#[case(500, "medium_file")]
#[case(1000, "large_file")]
fn should_validate_file_size_within_limits(#[case] content_size: usize, #[case] test_name: &str) {
    // Given: A temporary file with specific content size
    let temp_file = NamedTempFile::new().unwrap();
    let content = vec![b'a'; content_size];
    temp_file.as_file().write_all(&content).unwrap();

    let max_size = 1000;

    // When: Validating the file size
    let result = validate_file_size(temp_file.path(), max_size);

    // Then: Validation should succeed
    TestAssertions::assert_ok(
        result,
        &format!("File size validation should succeed for {test_name}"),
    );
}

#[test]
fn should_fail_validation_for_oversized_file() {
    // Given: A temporary file larger than the limit
    let temp_file = NamedTempFile::new().unwrap();
    let large_content = vec![b'a'; 2000];
    temp_file.as_file().write_all(&large_content).unwrap();

    let max_size = 1000;

    // When: Validating the file size
    let result = validate_file_size(temp_file.path(), max_size);

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "File size validation should fail for oversized files"
    );

    // And: The error should be FileTooLarge
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::FileTooLarge { .. }),
        "Error should be FileTooLarge for oversized file"
    );
}

#[test]
fn should_validate_file_size_at_exact_limit() {
    // Given: A temporary file at exactly the size limit
    let temp_file = NamedTempFile::new().unwrap();
    let content = vec![b'a'; 1000];
    temp_file.as_file().write_all(&content).unwrap();

    let max_size = 1000;

    // When: Validating the file size
    let result = validate_file_size(temp_file.path(), max_size);

    // Then: Validation should succeed
    TestAssertions::assert_ok(result, "File size validation should succeed at exact limit");
}

// ============================================================================
// PATH TRAVERSAL DETECTION TESTS
// ============================================================================

#[rstest]
#[case("file/../other", "unix_traversal")]
#[case("file\\..\\other", "windows_traversal")]
#[case("file/..%2fother", "url_encoded_traversal")]
#[case("file%2e%2e/other", "double_encoded_traversal")]
fn should_detect_path_traversal_attempts(#[case] path_str: &str, #[case] test_name: &str) {
    // Given: A path with traversal attempt
    let path = Path::new(path_str);

    // When: Validating the path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_single_path(path);

    // Then: Validation should fail
    TestAssertions::assert_err(result, &format!("Should detect traversal in {test_name}"));
}

#[rstest]
#[case("file.txt", "simple_file")]
#[case("folder/file.txt", "unix_path")]
#[case("folder\\file.txt", "windows_path")]
#[case("folder/subfolder/file.txt", "nested_path")]
fn should_allow_normal_paths_without_traversal(#[case] path_str: &str, #[case] test_name: &str) {
    // Given: A normal path without traversal
    let path = Path::new(path_str);

    // When: Validating the path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_single_path(path);

    // Then: If validation fails, it should not be due to traversal
    if let Err(err) = result {
        assert!(
            !matches!(
                err,
                FileOpsError::PathValidationFailed { reason, .. } if reason.contains("traversal")
            ),
            "Normal path should not fail due to traversal detection for {test_name}"
        );
    }
}

// ============================================================================
// PATH NORMALIZATION TESTS
// ============================================================================

#[test]
fn should_normalize_existing_file_path() {
    // Given: A temporary directory with a test file
    let temp_dir = tempdir().unwrap();
    let test_file = temp_dir.path().join("test.txt");
    fs::write(&test_file, b"test").unwrap();

    // When: Normalizing the path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::normalize_path(&test_file);

    // Then: Normalization should succeed
    let normalized = TestAssertions::assert_ok(
        result,
        "Path normalization should succeed for existing file",
    );

    // And: The normalized path should be absolute
    assert!(
        normalized.is_absolute(),
        "Normalized path should be absolute"
    );
}

// ============================================================================
// RELATIVE PATH TESTS
// ============================================================================

#[test]
fn should_get_relative_path_for_nested_file() {
    // Given: A base path and a full path within it
    let base_path = Path::new("/base/directory");
    let full_path = Path::new("/base/directory/subfolder/file.txt");

    // When: Getting the relative path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::get_relative_path(full_path, base_path);

    // Then: The operation should succeed
    let relative = TestAssertions::assert_ok(
        result,
        "Getting relative path should succeed for nested file",
    );

    // And: The relative path should be correct
    assert_eq!(
        relative,
        Path::new("subfolder/file.txt"),
        "Relative path should be correctly calculated"
    );
}

#[test]
fn should_fail_getting_relative_path_for_unrelated_paths() {
    // Given: A base path and an unrelated path
    let base_path = Path::new("/base/directory");
    let unrelated_path = Path::new("/different/directory/file.txt");

    // When: Getting the relative path
    let result =
        barqly_vault_lib::services::file::infrastructure::file_operations::validation::get_relative_path(unrelated_path, base_path);

    // Then: The operation should fail
    assert!(
        result.is_err(),
        "Getting relative path should fail for unrelated paths"
    );

    // And: The error should be CrossPlatformPathError
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::CrossPlatformPathError { .. }),
        "Error should be CrossPlatformPathError for unrelated paths"
    );
}

// ============================================================================
// ARCHIVE PATH VALIDATION TESTS
// ============================================================================

#[test]
fn should_validate_archive_path_with_valid_directory() {
    // Given: A temporary directory and archive path
    let temp_dir = tempdir().unwrap();
    let archive_path = temp_dir.path().join("archive.tar.gz");

    // When: Validating the archive path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_archive_path(&archive_path);

    // Then: Validation should succeed
    TestAssertions::assert_ok(
        result,
        "Archive path validation should succeed for valid directory",
    );
}

#[test]
fn should_fail_validation_for_relative_archive_path() {
    // Given: A relative archive path
    let relative_path = Path::new("relative/archive.tar.gz");

    // When: Validating the archive path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_archive_path(relative_path);

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "Archive path validation should fail for relative paths"
    );

    // And: The error should be PathValidationFailed
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::PathValidationFailed { .. }),
        "Error should be PathValidationFailed for relative archive path"
    );
}

#[test]
fn should_fail_validation_for_nonexistent_parent_directory() {
    // Given: An archive path with nonexistent parent directory
    let nonexistent_path = Path::new("/nonexistent/directory/archive.tar.gz");

    // When: Validating the archive path
    let result = barqly_vault_lib::services::file::infrastructure::file_operations::validation::validate_archive_path(nonexistent_path);

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "Archive path validation should fail for nonexistent parent directory"
    );

    // And: The error should be PathValidationFailed
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::PathValidationFailed { .. }),
        "Error should be PathValidationFailed for nonexistent parent directory"
    );
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

#[test]
fn should_handle_empty_file_size_validation() {
    // Given: An empty temporary file
    let temp_file = NamedTempFile::new().unwrap();
    // File is already empty

    let max_size = 1000;

    // When: Validating the file size
    let result = validate_file_size(temp_file.path(), max_size);

    // Then: Validation should succeed
    TestAssertions::assert_ok(
        result,
        "File size validation should succeed for empty files",
    );
}

#[test]
fn should_handle_zero_max_size_validation() {
    // Given: A temporary file with content
    let temp_file = NamedTempFile::new().unwrap();
    temp_file.as_file().write_all(b"content").unwrap();

    let max_size = 0;

    // When: Validating the file size
    let result = validate_file_size(temp_file.path(), max_size);

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "File size validation should fail when max size is zero"
    );

    // And: The error should be FileTooLarge
    let err = result.unwrap_err();
    assert!(
        matches!(err, FileOpsError::FileTooLarge { .. }),
        "Error should be FileTooLarge when max size is zero"
    );
}
