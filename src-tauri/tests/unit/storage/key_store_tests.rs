//! Unit tests for key store functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::services::key_management::shared::KeyInfo;
use chrono::{Datelike, Timelike};
use rstest::*;
use std::path::PathBuf;

// ============================================================================
// KEY INFO CREATION TESTS
// ============================================================================

#[test]
fn should_create_key_info_with_all_fields() {
    // Given: Key info parameters
    let label = "test-label";
    let file_path = PathBuf::from("/test/path");
    let public_key = "age1test";

    // When: Creating a key info with all fields
    let key_info = KeyInfo::new(
        label.to_string(),
        file_path.clone(),
        Some(public_key.to_string()),
    );

    // Then: All fields should be set correctly
    assert_eq!(
        key_info.label, label,
        "Key info label should match the provided value"
    );
    assert_eq!(
        key_info.file_path, file_path,
        "Key info file path should match the provided value"
    );
    assert!(
        key_info.public_key.is_some(),
        "Key info should have a public key"
    );
    assert_eq!(
        key_info.public_key.unwrap(),
        public_key,
        "Key info public key should match the provided value"
    );
    assert!(
        key_info.last_accessed.is_none(),
        "New key info should not have last accessed timestamp"
    );
}

#[test]
fn should_create_key_info_without_public_key() {
    // Given: Key info parameters without public key
    let label = "test-label";
    let file_path = PathBuf::from("/test/path");

    // When: Creating a key info without public key
    let key_info = KeyInfo::new(label.to_string(), file_path.clone(), None);

    // Then: Fields should be set correctly
    assert_eq!(
        key_info.label, label,
        "Key info label should match the provided value"
    );
    assert_eq!(
        key_info.file_path, file_path,
        "Key info file path should match the provided value"
    );
    assert!(
        key_info.public_key.is_none(),
        "Key info should not have a public key"
    );
    assert!(
        key_info.last_accessed.is_none(),
        "New key info should not have last accessed timestamp"
    );
}

#[rstest]
#[case("simple-label", "/simple/path", "age1simple")]
#[case("label-with-dashes", "/path/with/dashes", "age1withdashes")]
#[case(
    "label_with_underscores",
    "/path/with/underscores",
    "age1withunderscores"
)]
#[case("label123", "/path/123", "age1withnumbers")]
fn should_create_key_info_with_different_formats(
    #[case] label: &str,
    #[case] file_path_str: &str,
    #[case] public_key: &str,
) {
    // Given: Key info parameters with different formats
    let file_path = PathBuf::from(file_path_str);

    // When: Creating a key info
    let key_info = KeyInfo::new(
        label.to_string(),
        file_path.clone(),
        Some(public_key.to_string()),
    );

    // Then: All fields should be set correctly
    assert_eq!(
        key_info.label, label,
        "Key info label should match the provided value"
    );
    assert_eq!(
        key_info.file_path, file_path,
        "Key info file path should match the provided value"
    );
    assert_eq!(
        key_info.public_key.unwrap(),
        public_key,
        "Key info public key should match the provided value"
    );
}

// ============================================================================
// ACCESS TRACKING TESTS
// ============================================================================

#[test]
fn should_track_initial_access() {
    // Given: A key info without access tracking
    let mut key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // Verify initial state
    assert!(
        key_info.last_accessed.is_none(),
        "Key info should not have last accessed timestamp initially"
    );

    // When: Marking the key as accessed
    key_info.mark_accessed();

    // Then: Access should be tracked
    assert!(
        key_info.last_accessed.is_some(),
        "Key info should have last accessed timestamp after marking access"
    );
    assert!(
        key_info.last_accessed.unwrap() >= key_info.created_at,
        "Last accessed timestamp should be after or equal to creation timestamp"
    );
}

#[test]
fn should_track_multiple_accesses_with_increasing_timestamps() {
    // Given: A key info
    let mut key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // When: Marking accessed multiple times
    key_info.mark_accessed();
    let first_access = key_info.last_accessed.unwrap();

    // Wait a bit to ensure time difference
    std::thread::sleep(std::time::Duration::from_millis(10));

    key_info.mark_accessed();
    let second_access = key_info.last_accessed.unwrap();

    // Then: Access timestamps should be increasing
    assert!(
        second_access > first_access,
        "Second access timestamp should be after first access timestamp"
    );
}

#[test]
fn should_handle_rapid_access_tracking() {
    // Given: A key info
    let mut key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // When: Marking accessed rapidly
    key_info.mark_accessed();
    let first_access = key_info.last_accessed.unwrap();

    key_info.mark_accessed();
    let second_access = key_info.last_accessed.unwrap();

    // Then: Access should be tracked even for rapid calls
    assert!(
        second_access >= first_access,
        "Second access timestamp should be at least equal to first access timestamp"
    );
}

// ============================================================================
// SERIALIZATION TESTS
// ============================================================================

#[test]
fn should_serialize_and_deserialize_key_info_correctly() {
    // Given: A key info with all fields
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // When: Serializing and deserializing
    let serialized = TestAssertions::assert_ok(
        serde_json::to_string(&key_info),
        "Key info serialization should succeed",
    );
    let deserialized: KeyInfo = TestAssertions::assert_ok(
        serde_json::from_str(&serialized),
        "Key info deserialization should succeed",
    );

    // Then: All fields should be preserved
    assert_eq!(
        key_info.label, deserialized.label,
        "Label should be preserved through serialization"
    );
    assert_eq!(
        key_info.file_path, deserialized.file_path,
        "File path should be preserved through serialization"
    );
    assert_eq!(
        key_info.public_key, deserialized.public_key,
        "Public key should be preserved through serialization"
    );
    assert_eq!(
        key_info.created_at, deserialized.created_at,
        "Created timestamp should be preserved through serialization"
    );
    assert_eq!(
        key_info.last_accessed, deserialized.last_accessed,
        "Last accessed timestamp should be preserved through serialization"
    );
}

#[test]
fn should_serialize_key_info_without_public_key() {
    // Given: A key info without public key
    let key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // When: Serializing and deserializing
    let serialized = TestAssertions::assert_ok(
        serde_json::to_string(&key_info),
        "Key info serialization should succeed",
    );
    let deserialized: KeyInfo = TestAssertions::assert_ok(
        serde_json::from_str(&serialized),
        "Key info deserialization should succeed",
    );

    // Then: Fields should be preserved correctly
    assert_eq!(
        key_info.label, deserialized.label,
        "Label should be preserved through serialization"
    );
    assert_eq!(
        key_info.public_key, deserialized.public_key,
        "None public key should be preserved through serialization"
    );
}

// ============================================================================
// CLONING TESTS
// ============================================================================

#[test]
fn should_clone_key_info_with_all_fields() {
    // Given: A key info with all fields
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // When: Cloning the key info
    let cloned = key_info.clone();

    // Then: All fields should be identical
    assert_eq!(
        key_info.label, cloned.label,
        "Cloned label should match original"
    );
    assert_eq!(
        key_info.file_path, cloned.file_path,
        "Cloned file path should match original"
    );
    assert_eq!(
        key_info.public_key, cloned.public_key,
        "Cloned public key should match original"
    );
    assert_eq!(
        key_info.created_at, cloned.created_at,
        "Cloned created timestamp should match original"
    );
    assert_eq!(
        key_info.last_accessed, cloned.last_accessed,
        "Cloned last accessed timestamp should match original"
    );
}

// ============================================================================
// DEBUG FORMAT TESTS
// ============================================================================

#[test]
fn should_format_debug_output_with_all_fields() {
    // Given: A key info with all fields
    let key_info = KeyInfo::new(
        "test-label".to_string(),
        PathBuf::from("/test/path"),
        Some("age1test".to_string()),
    );

    // When: Formatting as debug string
    let debug_str = format!("{key_info:?}");

    // Then: Debug string should contain all relevant information
    assert!(
        debug_str.contains("test-label"),
        "Debug string should contain the label"
    );
    assert!(
        debug_str.contains("/test/path"),
        "Debug string should contain the file path"
    );
    assert!(
        debug_str.contains("age1test"),
        "Debug string should contain the public key"
    );
}

// ============================================================================
// EQUALITY TESTS
// ============================================================================

#[test]
fn should_compare_equal_key_infos_correctly() {
    // Given: Two identical key infos
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

    // When & Then: They should be equal in all fields
    assert_eq!(key_info1.label, key_info2.label, "Labels should be equal");
    assert_eq!(
        key_info1.file_path, key_info2.file_path,
        "File paths should be equal"
    );
    assert_eq!(
        key_info1.public_key, key_info2.public_key,
        "Public keys should be equal"
    );
}

#[test]
fn should_compare_different_key_infos_correctly() {
    // Given: Two different key infos
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

    // When & Then: They should be different
    assert_ne!(
        key_info1.label, key_info2.label,
        "Labels should be different"
    );
    assert_ne!(
        key_info1.file_path, key_info2.file_path,
        "File paths should be different"
    );
    assert_ne!(
        key_info1.public_key, key_info2.public_key,
        "Public keys should be different"
    );
}

// ============================================================================
// SPECIAL CHARACTERS TESTS
// ============================================================================

#[test]
fn should_handle_special_characters_in_all_fields() {
    // Given: Key info with special characters
    let key_info = KeyInfo::new(
        "test-label-with-dashes_123".to_string(),
        PathBuf::from("/test/path/with/subdirs"),
        Some("age1testwithspecialchars!@#".to_string()),
    );

    // When & Then: All fields should handle special characters correctly
    assert_eq!(
        key_info.label, "test-label-with-dashes_123",
        "Label should handle special characters"
    );
    assert_eq!(
        key_info.file_path,
        PathBuf::from("/test/path/with/subdirs"),
        "File path should handle special characters"
    );
    assert_eq!(
        key_info.public_key.unwrap(),
        "age1testwithspecialchars!@#",
        "Public key should handle special characters"
    );
}

// ============================================================================
// TIMESTAMP TESTS
// ============================================================================

#[test]
fn should_set_created_at_timestamp_correctly() {
    // Given: Timestamps before and after creation
    let before_creation = chrono::Utc::now();

    // When: Creating a key info
    let key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);
    let after_creation = chrono::Utc::now();

    // Then: Created timestamp should be within the expected range
    assert!(
        key_info.created_at >= before_creation,
        "Created timestamp should be after or equal to before creation time"
    );
    assert!(
        key_info.created_at <= after_creation,
        "Created timestamp should be before or equal to after creation time"
    );
}

#[test]
fn should_handle_timestamp_precision() {
    // Given: A key info
    let key_info = KeyInfo::new("test-label".to_string(), PathBuf::from("/test/path"), None);

    // When & Then: Timestamps should have appropriate precision
    assert!(
        key_info.created_at.timestamp_nanos_opt().unwrap() > 0,
        "Created timestamp should have positive nanoseconds"
    );

    // Test that we can access the timestamp components
    let _year = key_info.created_at.year();
    let _month = key_info.created_at.month();
    let _day = key_info.created_at.day();
    let _hour = key_info.created_at.hour();
    let _minute = key_info.created_at.minute();
    let _second = key_info.created_at.second();
}
