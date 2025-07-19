//! Unit tests for key store functions
//!
//! Tests individual key store operations in isolation:
//! - Key info creation and manipulation
//! - Label validation
//! - Access tracking
//! - Error handling

use barqly_vault_lib::storage::{KeyInfo, StorageError};
use std::path::PathBuf;

#[test]
fn test_key_info_creation() {
    // Arrange & Act
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // Assert
    assert_eq!(key_info.label, "test-label");
    assert_eq!(key_info.file_path, PathBuf::from("/test/path"));
    assert!(key_info.public_key.is_some());
    assert_eq!(key_info.public_key.unwrap(), "age1test");
    assert!(key_info.last_accessed.is_none());
}

#[test]
fn test_key_info_creation_without_public_key() {
    // Arrange & Act
    let key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // Assert
    assert_eq!(key_info.label, "test-label");
    assert_eq!(key_info.file_path, PathBuf::from("/test/path"));
    assert!(key_info.public_key.is_none());
    assert!(key_info.last_accessed.is_none());
}

#[test]
fn test_key_info_access_tracking() {
    // Arrange
    let mut key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // Assert initial state
    assert!(key_info.last_accessed.is_none());

    // Act
    key_info.mark_accessed();

    // Assert
    assert!(key_info.last_accessed.is_some());
    assert!(key_info.last_accessed.unwrap() >= key_info.created_at);
}

#[test]
fn test_key_info_multiple_access_tracking() {
    // Arrange
    let mut key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // Act - Mark accessed multiple times
    key_info.mark_accessed();
    let first_access = key_info.last_accessed.unwrap();

    // Wait a bit to ensure time difference
    std::thread::sleep(std::time::Duration::from_millis(10));

    key_info.mark_accessed();
    let second_access = key_info.last_accessed.unwrap();

    // Assert
    assert!(second_access > first_access);
}

#[test]
fn test_key_info_serialization() {
    // Arrange
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // Act
    let serialized = serde_json::to_string(&key_info).unwrap();
    let deserialized: KeyInfo = serde_json::from_str(&serialized).unwrap();

    // Assert
    assert_eq!(key_info.label, deserialized.label);
    assert_eq!(key_info.file_path, deserialized.file_path);
    assert_eq!(key_info.public_key, deserialized.public_key);
    assert_eq!(key_info.created_at, deserialized.created_at);
    assert_eq!(key_info.last_accessed, deserialized.last_accessed);
}

#[test]
fn test_key_info_clone() {
    // Arrange
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // Act
    let cloned = key_info.clone();

    // Assert
    assert_eq!(key_info.label, cloned.label);
    assert_eq!(key_info.file_path, cloned.file_path);
    assert_eq!(key_info.public_key, cloned.public_key);
    assert_eq!(key_info.created_at, cloned.created_at);
    assert_eq!(key_info.last_accessed, cloned.last_accessed);
}

#[test]
fn test_key_info_debug_format() {
    // Arrange
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // Act
    let debug_str = format!("{:?}", key_info);

    // Assert
    assert!(debug_str.contains("test-label"));
    assert!(debug_str.contains("/test/path"));
    assert!(debug_str.contains("age1test"));
}

#[test]
fn test_key_info_equality() {
    // Arrange
    let key_info1 = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );
    let key_info2 = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // Act & Assert
    assert_eq!(key_info1.label, key_info2.label);
    assert_eq!(key_info1.file_path, key_info2.file_path);
    assert_eq!(key_info1.public_key, key_info2.public_key);
}

#[test]
fn test_key_info_inequality() {
    // Arrange
    let key_info1 = KeyInfo::new(
        "test-label1".to_string(),
        PathBuf::from("/test/path1"),
        Some("age1test1".to_string()),
    );
    let key_info2 = KeyInfo::new(
        "test-label2".to_string(),
        PathBuf::from("/test/path2"),
        Some("age1test2".to_string()),
    );

    // Act & Assert
    assert_ne!(key_info1.label, key_info2.label);
}

#[test]
fn test_key_info_with_special_characters() {
    // Arrange & Act
    let key_info = KeyInfo::new(
        "test-label-with-dashes_123".to_string(),
        PathBuf::from("/test/path/with/subdirs"),
        Some("age1testwithspecialchars!@#".to_string()),
    );

    // Assert
    assert_eq!(key_info.label, "test-label-with-dashes_123");
    assert_eq!(key_info.file_path, PathBuf::from("/test/path/with/subdirs"));
    assert_eq!(key_info.public_key.unwrap(), "age1testwithspecialchars!@#");
}

#[test]
fn test_key_info_created_at_timestamp() {
    // Arrange
    let before_creation = chrono::Utc::now();

    // Act
    let key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);
    let after_creation = chrono::Utc::now();

    // Assert
    assert!(key_info.created_at >= before_creation);
    assert!(key_info.created_at <= after_creation);
}
