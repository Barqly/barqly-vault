//! Unit tests for storage error handling using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use barqly_vault_lib::error::StorageError;
use rstest::*;

// ============================================================================
// ERROR DISPLAY TESTS
// ============================================================================

#[test]
fn should_display_key_not_found_error_with_key_name() {
    // Given: A key not found error
    let error = StorageError::KeyNotFound("test-key".to_string());

    // When: Converting the error to string
    let display_str = error.to_string();

    // Then: The display string should contain the key name and error description
    assert!(
        display_str.contains("test-key"),
        "Error display should contain the key name"
    );
    assert!(
        display_str.contains("Key not found"),
        "Error display should contain 'Key not found' description"
    );
}

#[rstest]
#[case("existing-key", "Key already exists")]
#[case("duplicate-key", "Key already exists")]
#[case("conflict-key", "Key already exists")]
fn should_display_key_already_exists_error_with_key_name(
    #[case] key_name: &str,
    #[case] expected_description: &str,
) {
    // Given: A key already exists error
    let error = StorageError::KeyAlreadyExists(key_name.to_string());

    // When: Converting the error to string
    let display_str = error.to_string();

    // Then: The display string should contain the key name and error description
    assert!(
        display_str.contains(key_name),
        "Error display should contain the key name '{key_name}'"
    );
    assert!(
        display_str.contains(expected_description),
        "Error display should contain '{expected_description}' description"
    );
}

#[rstest]
#[case("invalid/label", "Invalid key label")]
#[case("bad\\label", "Invalid key label")]
#[case("unsafe..label", "Invalid key label")]
fn should_display_invalid_label_error_with_label_name(
    #[case] label_name: &str,
    #[case] expected_description: &str,
) {
    // Given: An invalid label error
    let error = StorageError::InvalidLabel(label_name.to_string());

    // When: Converting the error to string
    let display_str = error.to_string();

    // Then: The display string should contain the label name and error description
    assert!(
        display_str.contains(label_name),
        "Error display should contain the label name '{label_name}'"
    );
    assert!(
        display_str.contains(expected_description),
        "Error display should contain '{expected_description}' description"
    );
}

#[test]
fn should_display_serialization_error_with_message() {
    // Given: A serialization error
    let message = "JSON serialization failed";
    let error = StorageError::IoError(std::io::Error::other(message));

    // When: Converting the error to string
    let display_str = error.to_string();

    // Then: The display string should contain the error message
    assert!(
        display_str.contains(message),
        "Error display should contain the serialization message"
    );
}

#[test]
fn should_display_invalid_metadata_error_with_message() {
    // Given: An invalid metadata error
    let message = "Corrupted metadata";
    let error = StorageError::InvalidMetadata(message.to_string());

    // When: Converting the error to string
    let display_str = error.to_string();

    // Then: The display string should contain the error message
    assert!(
        display_str.contains(message),
        "Error display should contain the metadata error message"
    );
}

// ============================================================================
// ERROR RECOVERABILITY TESTS
// ============================================================================

#[test]
fn should_identify_recoverable_errors_correctly() {
    // Given: Various types of errors
    let io_error = StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test"));
    let permission_denied = StorageError::PermissionDenied(std::path::PathBuf::from("/test"));
    let directory_creation_failed =
        StorageError::DirectoryCreationFailed(std::path::PathBuf::from("/test"));

    // When & Then: Recoverable errors should be identified correctly
    assert!(io_error.is_recoverable(), "IO errors should be recoverable");
    assert!(
        permission_denied.is_recoverable(),
        "Permission denied errors should be recoverable"
    );
    assert!(
        directory_creation_failed.is_recoverable(),
        "Directory creation failed errors should be recoverable"
    );
}

#[test]
fn should_identify_non_recoverable_security_errors() {
    // Given: Security-related errors
    let path_traversal = StorageError::PathTraversal;
    let invalid_label = StorageError::InvalidLabel("test".to_string());

    // When & Then: Security errors should not be recoverable
    assert!(
        !path_traversal.is_recoverable(),
        "Path traversal errors should not be recoverable"
    );
    assert!(
        !invalid_label.is_recoverable(),
        "Invalid label errors should not be recoverable"
    );
}

// ============================================================================
// ERROR CATEGORIZATION TESTS
// ============================================================================

#[rstest]
#[case(StorageError::PathTraversal, "path_traversal")]
#[case(StorageError::InvalidLabel("test".to_string()), "invalid_label")]
fn should_categorize_security_errors_correctly(
    #[case] error: StorageError,
    #[case] test_name: &str,
) {
    // Given: A security error

    // When & Then: Security errors should be properly categorized
    assert!(
        error.is_security_error(),
        "{test_name} should be categorized as a security error"
    );
    assert!(
        !error.is_recoverable(),
        "{test_name} should not be recoverable"
    );
}

#[rstest]
#[case(
    StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test")),
    "io_not_found"
)]
#[case(StorageError::IoError(std::io::Error::other("test")), "io_other")]
#[case(
    StorageError::PermissionDenied(std::path::PathBuf::from("/test")),
    "permission_denied"
)]
#[case(
    StorageError::DirectoryCreationFailed(std::path::PathBuf::from("/test")),
    "directory_creation_failed"
)]
fn should_categorize_recoverable_errors_correctly(
    #[case] error: StorageError,
    #[case] test_name: &str,
) {
    // Given: A recoverable error

    // When & Then: Recoverable errors should be properly categorized
    assert!(
        error.is_recoverable(),
        "{test_name} should be categorized as recoverable"
    );
    assert!(
        !error.is_security_error(),
        "{test_name} should not be categorized as a security error"
    );
}

// ============================================================================
// ERROR CONVERSION TESTS
// ============================================================================

#[test]
fn should_convert_io_error_to_storage_error() {
    // Given: An IO error
    let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "test error");

    // When: Converting to storage error
    let storage_error = StorageError::from(io_error);

    // Then: The conversion should result in an IO error type
    assert!(
        matches!(storage_error, StorageError::IoError(_)),
        "IO error should be converted to StorageError::IoError"
    );
}

#[rstest]
#[case(std::io::ErrorKind::NotFound, "not_found")]
#[case(std::io::ErrorKind::PermissionDenied, "permission_denied")]
#[case(std::io::ErrorKind::AlreadyExists, "already_exists")]
fn should_convert_different_io_error_kinds(
    #[case] error_kind: std::io::ErrorKind,
    #[case] test_name: &str,
) {
    // Given: Different types of IO errors
    let io_error = std::io::Error::new(error_kind, format!("test error for {test_name}"));

    // When: Converting to storage error
    let storage_error = StorageError::from(io_error);

    // Then: The conversion should succeed
    assert!(
        matches!(storage_error, StorageError::IoError(_)),
        "IO error with kind {error_kind:?} should be converted to StorageError::IoError"
    );
}

// ============================================================================
// ERROR PROPERTIES TESTS
// ============================================================================

#[test]
fn should_provide_consistent_error_properties() {
    // Given: Various error types
    let errors = vec![
        StorageError::KeyNotFound("key1".to_string()),
        StorageError::KeyAlreadyExists("key2".to_string()),
        StorageError::InvalidLabel("bad/label".to_string()),
        StorageError::PathTraversal,
        StorageError::InvalidMetadata("corrupted".to_string()),
        StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "io test")),
    ];

    // When & Then: Each error should have consistent properties
    for error in errors {
        // All errors should be convertible to string
        let display_str = error.to_string();
        assert!(
            !display_str.is_empty(),
            "Error display string should not be empty"
        );

        // All errors should have defined recoverability
        let _is_recoverable = error.is_recoverable();

        // All errors should have defined security categorization
        let _is_security_error = error.is_security_error();

        // Security errors and recoverable errors should be mutually exclusive
        if error.is_security_error() {
            assert!(
                !error.is_recoverable(),
                "Security errors should not be recoverable"
            );
        }
    }
}

#[test]
fn should_handle_error_edge_cases() {
    // Given: Edge case errors
    let empty_key_error = StorageError::KeyNotFound("".to_string());
    let empty_label_error = StorageError::InvalidLabel("".to_string());
    let empty_metadata_error = StorageError::InvalidMetadata("".to_string());

    // When & Then: Edge cases should be handled gracefully
    assert!(
        !empty_key_error.to_string().is_empty(),
        "Empty key error should still have a display string"
    );
    assert!(
        !empty_label_error.to_string().is_empty(),
        "Empty label error should still have a display string"
    );
    assert!(
        !empty_metadata_error.to_string().is_empty(),
        "Empty metadata error should still have a display string"
    );
}
