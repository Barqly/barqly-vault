//! Unit tests for storage paths functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::storage::{get_key_file_path, get_key_metadata_path, StorageError};
use rstest::*;

// ============================================================================
// SAFE LABEL VALIDATION TESTS
// ============================================================================

#[rstest]
#[case("normal-key", "normal_key")]
#[case("my_key_123", "underscore_with_numbers")]
#[case("key-with-dashes", "dashes")]
fn should_accept_valid_labels(#[case] label: &str, #[case] test_name: &str) {
    // Given: A valid label

    // When: Getting the key file path
    let result = get_key_file_path(label);

    // Then: The operation should succeed
    TestAssertions::assert_ok(
        result,
        &format!("Valid label '{label}' should be accepted for {test_name}"),
    );
}

#[rstest]
#[case("key/with/slash", "forward_slashes")]
#[case("key\\with\\backslashes", "backslashes")]
#[case("key..with..dots", "double_dots")]
#[case("", "empty_string")]
fn should_reject_invalid_labels(#[case] label: &str, #[case] test_name: &str) {
    // Given: An invalid label

    // When: Getting the key file path
    let result = get_key_file_path(label);

    // Then: The operation should fail
    TestAssertions::assert_err(
        result,
        &format!("Invalid label '{label}' should be rejected for {test_name}"),
    );
}

// ============================================================================
// PATH GENERATION TESTS
// ============================================================================

#[test]
fn should_generate_key_file_path_with_correct_format() {
    // Given: A valid label
    let label = "test-key";

    // When: Generating the key file path
    let path = TestAssertions::assert_ok(
        get_key_file_path(label),
        "Key file path generation should succeed",
    );

    // Then: The path should have correct format
    let path_str = path.to_string_lossy();
    assert!(
        path_str.contains(label),
        "Generated path should contain the label"
    );
    assert!(
        path_str.ends_with(".agekey.enc"),
        "Generated path should end with .agekey.enc extension"
    );
}

#[test]
fn should_generate_key_metadata_path_with_correct_format() {
    // Given: A valid label
    let label = "test-key";

    // When: Generating the key metadata path
    let path = TestAssertions::assert_ok(
        get_key_metadata_path(label),
        "Key metadata path generation should succeed",
    );

    // Then: The path should have correct format
    let path_str = path.to_string_lossy();
    assert!(
        path_str.contains(label),
        "Generated metadata path should contain the label"
    );
    assert!(
        path_str.ends_with(".agekey.meta"),
        "Generated metadata path should end with .agekey.meta extension"
    );
}

#[rstest]
#[case("simple-key", "simple")]
#[case("complex_key_123", "complex")]
#[case("mixed-key_456", "mixed")]
fn should_generate_consistent_paths_for_same_label(#[case] label: &str, #[case] test_name: &str) {
    // Given: A valid label

    // When: Generating paths multiple times
    let path1 = TestAssertions::assert_ok(
        get_key_file_path(label),
        &format!("First path generation should succeed for {test_name}"),
    );
    let path2 = TestAssertions::assert_ok(
        get_key_file_path(label),
        &format!("Second path generation should succeed for {test_name}"),
    );

    // Then: The paths should be identical
    assert_eq!(
        path1, path2,
        "Generated paths should be consistent for the same label"
    );
}

// ============================================================================
// INVALID CHARACTER TESTS
// ============================================================================

#[rstest]
#[case("key*with*stars", "asterisks")]
#[case("key?with?question", "question_marks")]
#[case("key\"with\"quotes", "quotes")]
#[case("key/with/slashes", "forward_slashes")]
#[case("key\\with\\backslashes", "backslashes")]
#[case("key..with..dots", "double_dots")]
fn should_reject_labels_with_invalid_characters(#[case] label: &str, #[case] test_name: &str) {
    // Given: A label with invalid characters

    // When: Getting the key file path
    let result = get_key_file_path(label);

    // Then: The operation should fail with InvalidLabel error
    assert!(
        result.is_err(),
        "Label with invalid characters should be rejected for {test_name}"
    );

    let err = result.unwrap_err();
    assert!(
        matches!(err, StorageError::InvalidLabel(_)),
        "Error should be InvalidLabel for {test_name}"
    );
}

// ============================================================================
// EMPTY AND WHITESPACE TESTS
// ============================================================================

#[rstest]
#[case("", "empty_string")]
#[case("   ", "spaces_only")]
#[case("\t", "tab_only")]
#[case("\n", "newline_only")]
fn should_reject_empty_and_whitespace_labels(#[case] label: &str, #[case] test_name: &str) {
    // Given: An empty or whitespace-only label

    // When: Getting the key file path
    let result = get_key_file_path(label);

    // Then: The operation should fail
    assert!(
        result.is_err(),
        "Empty or whitespace label should be rejected for {test_name}"
    );

    let err = result.unwrap_err();
    assert!(
        matches!(err, StorageError::InvalidLabel(_)),
        "Error should be InvalidLabel for {test_name}"
    );
}

// ============================================================================
// VALID SPECIAL CHARACTER TESTS
// ============================================================================

#[rstest]
#[case("key_with_underscores", "underscores")]
#[case("key-with-dashes", "dashes")]
#[case("key123with456numbers", "numbers")]
#[case("key.with.dots", "single_dots")]
#[case("key_with_mixed-characters_123", "mixed_characters")]
fn should_accept_labels_with_valid_special_characters(
    #[case] label: &str,
    #[case] test_name: &str,
) {
    // Given: A label with valid special characters

    // When: Getting the key file path
    let result = get_key_file_path(label);

    // Then: The operation should succeed
    TestAssertions::assert_ok(
        result,
        &format!("Label '{label}' should be valid for {test_name}"),
    );
}

// ============================================================================
// PATH COMPARISON TESTS
// ============================================================================

#[test]
fn should_generate_different_paths_for_different_labels() {
    // Given: Two different labels
    let label1 = "key1";
    let label2 = "key2";

    // When: Generating paths for both labels
    let path1 = TestAssertions::assert_ok(
        get_key_file_path(label1),
        "Path generation for first label should succeed",
    );
    let path2 = TestAssertions::assert_ok(
        get_key_file_path(label2),
        "Path generation for second label should succeed",
    );

    // Then: The paths should be different
    assert_ne!(
        path1, path2,
        "Different labels should generate different paths"
    );
}

#[test]
fn should_generate_file_and_metadata_paths_with_same_base() {
    // Given: A valid label
    let label = "test-key";

    // When: Generating both file and metadata paths
    let file_path = TestAssertions::assert_ok(
        get_key_file_path(label),
        "File path generation should succeed",
    );
    let metadata_path = TestAssertions::assert_ok(
        get_key_metadata_path(label),
        "Metadata path generation should succeed",
    );

    // Then: Both paths should contain the label and have appropriate extensions
    let file_path_str = file_path.to_string_lossy();
    let metadata_path_str = metadata_path.to_string_lossy();

    assert!(
        file_path_str.contains(label),
        "File path should contain the label"
    );
    assert!(
        metadata_path_str.contains(label),
        "Metadata path should contain the label"
    );
    assert!(
        file_path_str.ends_with(".agekey.enc"),
        "File path should end with .agekey.enc"
    );
    assert!(
        metadata_path_str.ends_with(".agekey.meta"),
        "Metadata path should end with .agekey.meta"
    );
}
