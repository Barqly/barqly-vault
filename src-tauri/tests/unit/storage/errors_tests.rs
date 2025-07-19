//! Unit tests for storage error handling
//!
//! Tests individual error handling functions in isolation:
//! - Error creation and conversion
//! - Error recovery logic
//! - Error categorization

use barqly_vault_lib::storage::StorageError;

#[test]
fn test_error_display() {
    // Arrange
    let error = StorageError::KeyNotFound("test-key".to_string());

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains("test-key"));
    assert!(display_str.contains("not found"));
}

#[test]
fn test_error_recoverability() {
    // Test that recoverable errors are properly identified
    let io_error = StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test"));
    assert!(io_error.is_recoverable());

    // Test that security errors are properly identified
    let security_error = StorageError::PathTraversal;
    assert!(!security_error.is_recoverable());
    assert!(security_error.is_security_error());

    let invalid_label = StorageError::InvalidLabel("test".to_string());
    assert!(!invalid_label.is_recoverable());
    assert!(invalid_label.is_security_error());
}

#[test]
fn test_error_categorization() {
    // Test security errors
    let security_errors = [
        StorageError::PathTraversal,
        StorageError::InvalidLabel("test".to_string()),
    ];

    for error in &security_errors {
        assert!(error.is_security_error());
        assert!(!error.is_recoverable());
    }

    // Test recoverable errors
    let recoverable_errors = [
        StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test")),
        StorageError::IoError(std::io::Error::new(std::io::ErrorKind::Other, "test")),
    ];

    for error in &recoverable_errors {
        assert!(error.is_recoverable());
        assert!(!error.is_security_error());
    }
}

#[test]
fn test_error_from_io_error() {
    // Arrange
    let io_error = std::io::Error::new(std::io::ErrorKind::NotFound, "test error");

    // Act
    let storage_error = StorageError::from(io_error);

    // Assert
    assert!(matches!(storage_error, StorageError::IoError(_)));
}

#[test]
fn test_key_not_found_error() {
    // Arrange
    let label = "nonexistent-key";
    let error = StorageError::KeyNotFound(label.to_string());

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains(label));
    assert!(display_str.contains("not found"));
}

#[test]
fn test_key_already_exists_error() {
    // Arrange
    let label = "existing-key";
    let error = StorageError::KeyAlreadyExists(label.to_string());

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains(label));
    assert!(display_str.contains("already exists"));
}

#[test]
fn test_invalid_label_error() {
    // Arrange
    let label = "invalid/label";
    let error = StorageError::InvalidLabel(label.to_string());

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains(label));
    assert!(display_str.contains("invalid"));
}

#[test]
fn test_serialization_error() {
    // Arrange
    let message = "JSON serialization failed";
    let error = StorageError::IoError(std::io::Error::new(std::io::ErrorKind::Other, message));

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains(message));
}

#[test]
fn test_invalid_metadata_error() {
    // Arrange
    let message = "Corrupted metadata";
    let error = StorageError::InvalidMetadata(message.to_string());

    // Act
    let display_str = error.to_string();

    // Assert
    assert!(display_str.contains(message));
}
