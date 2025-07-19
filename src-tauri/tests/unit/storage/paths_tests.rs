//! Unit tests for storage paths functions
//!
//! Tests individual path functions in isolation:
//! - Path generation
//! - Label validation
//! - Directory creation

use barqly_vault_lib::storage::{get_key_file_path, get_key_metadata_path, StorageError};

#[test]
fn test_safe_label_validation() {
    // Test valid labels
    assert!(get_key_file_path("normal-key").is_ok());
    assert!(get_key_file_path("my_key_123").is_ok());
    assert!(get_key_file_path("key-with-dashes").is_ok());

    // Test invalid labels
    assert!(get_key_file_path("key/with/slash").is_err());
    assert!(get_key_file_path("key\\with\\backslashes").is_err());
    assert!(get_key_file_path("key..with..dots").is_err());
    assert!(get_key_file_path("").is_err());
}

#[test]
fn test_key_file_path_generation() {
    // Arrange
    let label = "test-key";

    // Act
    let result = get_key_file_path(label);

    // Assert
    assert!(result.is_ok());
    let path = result.unwrap();
    assert!(path.to_string_lossy().contains("test-key"));
    assert!(path.to_string_lossy().ends_with(".agekey.enc"));
}

#[test]
fn test_key_metadata_path_generation() {
    // Arrange
    let label = "test-key";

    // Act
    let result = get_key_metadata_path(label);

    // Assert
    assert!(result.is_ok());
    let path = result.unwrap();
    assert!(path.to_string_lossy().contains("test-key"));
    assert!(path.to_string_lossy().ends_with(".agekey.meta"));
}

#[test]
fn test_invalid_label_characters() {
    // Test various invalid characters that are actually rejected by is_safe_label
    let invalid_labels = [
        "key*with*stars",
        "key?with?question",
        "key\"with\"quotes",
        "key/with/slashes",
        "key\\with\\backslashes",
        "key..with..dots",
    ];

    for label in &invalid_labels {
        let result = get_key_file_path(label);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::InvalidLabel(_)));
    }
}

#[test]
fn test_empty_and_whitespace_labels() {
    // Test empty and whitespace-only labels
    let invalid_labels = ["", "   ", "\t", "\n"];

    for label in &invalid_labels {
        let result = get_key_file_path(label);
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::InvalidLabel(_)));
    }
}

#[test]
fn test_special_characters_in_valid_labels() {
    // Test that valid special characters are allowed
    let valid_labels = [
        "key_with_underscores",
        "key-with-dashes",
        "key123with456numbers",
        "key.with.dots",
        "key_with_mixed-characters_123",
    ];

    for label in &valid_labels {
        let result = get_key_file_path(label);
        assert!(result.is_ok(), "Label '{}' should be valid", label);
    }
}
