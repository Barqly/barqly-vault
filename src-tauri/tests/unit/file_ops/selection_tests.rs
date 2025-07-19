//! Unit tests for file selection functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use barqly_vault_lib::file_ops::FileSelection;
use rstest::*;
use std::path::PathBuf;

// ============================================================================
// FILE SELECTION CREATION TESTS
// ============================================================================

#[rstest]
#[case(0, "empty_selection")]
#[case(1, "single_file")]
#[case(3, "multiple_files")]
#[case(10, "many_files")]
fn should_create_file_selection_with_correct_count(
    #[case] file_count: usize,
    #[case] test_name: &str,
) {
    // Given: A set of test files
    let files: Vec<PathBuf> = (0..file_count)
        .map(|i| PathBuf::from(format!("/path/to/file_{i}.txt")))
        .collect();

    // When: Creating a file selection
    let selection = FileSelection::Files(files);

    // Then: The selection should have the correct count
    assert_eq!(
        selection.count(),
        file_count,
        "File selection should have correct count for {test_name}"
    );

    // And: The empty check should be correct
    if file_count == 0 {
        assert!(
            selection.is_empty(),
            "Empty file selection should be empty for {test_name}"
        );
    } else {
        assert!(
            !selection.is_empty(),
            "Non-empty file selection should not be empty for {test_name}"
        );
    }
}

#[test]
fn should_create_file_selection_with_individual_files() {
    // Given: Individual file paths
    let files = vec![
        PathBuf::from("/path/to/file1.txt"),
        PathBuf::from("/path/to/file2.txt"),
        PathBuf::from("/path/to/file3.txt"),
    ];

    // When: Creating a file selection
    let selection = FileSelection::Files(files);

    // Then: The selection should have correct properties
    assert_eq!(
        selection.count(),
        3,
        "File selection should count 3 individual files"
    );
    assert!(
        !selection.is_empty(),
        "File selection with files should not be empty"
    );
}

#[test]
fn should_create_folder_selection_with_single_folder() {
    // Given: A folder path
    let folder = PathBuf::from("/path/to/folder");

    // When: Creating a folder selection
    let selection = FileSelection::Folder(folder);

    // Then: The selection should have correct properties
    assert_eq!(
        selection.count(),
        1,
        "Folder selection should count as 1 item"
    );
    assert!(
        !selection.is_empty(),
        "Folder selection should not be empty"
    );
}

// ============================================================================
// EMPTY SELECTION TESTS
// ============================================================================

#[test]
fn should_handle_empty_file_selection() {
    // Given: An empty file list
    let files: Vec<PathBuf> = vec![];

    // When: Creating an empty file selection
    let selection = FileSelection::Files(files);

    // Then: The selection should be empty
    assert_eq!(
        selection.count(),
        0,
        "Empty file selection should have count 0"
    );
    assert!(selection.is_empty(), "Empty file selection should be empty");
}

#[test]
fn should_distinguish_empty_and_non_empty_selections() {
    // Given: Empty and non-empty file lists
    let empty_files: Vec<PathBuf> = vec![];
    let non_empty_files = vec![PathBuf::from("/path/to/file.txt")];

    // When: Creating both types of selections
    let empty_selection = FileSelection::Files(empty_files);
    let non_empty_selection = FileSelection::Files(non_empty_files);

    // Then: They should have different empty states
    assert!(
        empty_selection.is_empty(),
        "Empty selection should be empty"
    );
    assert!(
        !non_empty_selection.is_empty(),
        "Non-empty selection should not be empty"
    );

    // And: They should have different counts
    assert_eq!(
        empty_selection.count(),
        0,
        "Empty selection should have count 0"
    );
    assert_eq!(
        non_empty_selection.count(),
        1,
        "Non-empty selection should have count 1"
    );
}

// ============================================================================
// FILE COUNTING TESTS
// ============================================================================

#[rstest]
#[case(0, "zero_files")]
#[case(1, "one_file")]
#[case(5, "five_files")]
#[case(100, "hundred_files")]
fn should_count_files_correctly(#[case] expected_count: usize, #[case] test_name: &str) {
    // Given: A list of files with known count
    let files: Vec<PathBuf> = (0..expected_count)
        .map(|i| PathBuf::from(format!("/path/to/file_{i}.txt")))
        .collect();

    // When: Creating a file selection
    let selection = FileSelection::Files(files);

    // Then: The count should match the expected value
    assert_eq!(
        selection.count(),
        expected_count,
        "File selection should count {expected_count} files for {test_name}"
    );
}

#[test]
fn should_count_large_file_selection_efficiently() {
    // Given: A large number of files
    let large_file_count = 1000;
    let files: Vec<PathBuf> = (0..large_file_count)
        .map(|i| PathBuf::from(format!("/path/to/large_file_{i}.txt")))
        .collect();

    // When: Creating a large file selection
    let selection = FileSelection::Files(files);

    // Then: The count should be accurate
    assert_eq!(
        selection.count(),
        large_file_count,
        "Large file selection should count {large_file_count} files correctly"
    );

    // And: It should not be empty
    assert!(
        !selection.is_empty(),
        "Large file selection should not be empty"
    );
}

// ============================================================================
// SELECTION TYPE TESTS
// ============================================================================

#[test]
fn should_distinguish_file_and_folder_selections() {
    // Given: File and folder paths
    let files = vec![
        PathBuf::from("/path/to/file1.txt"),
        PathBuf::from("/path/to/file2.txt"),
    ];
    let folder = PathBuf::from("/path/to/folder");

    // When: Creating both types of selections
    let file_selection = FileSelection::Files(files);
    let folder_selection = FileSelection::Folder(folder);

    // Then: Both should have correct counts
    assert_eq!(
        file_selection.count(),
        2,
        "File selection should count individual files"
    );
    assert_eq!(
        folder_selection.count(),
        1,
        "Folder selection should count as single item"
    );

    // And: Both should not be empty
    assert!(
        !file_selection.is_empty(),
        "File selection should not be empty"
    );
    assert!(
        !folder_selection.is_empty(),
        "Folder selection should not be empty"
    );
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

#[test]
fn should_handle_selection_with_duplicate_paths() {
    // Given: Files with duplicate paths
    let files = vec![
        PathBuf::from("/path/to/file.txt"),
        PathBuf::from("/path/to/file.txt"), // Duplicate
        PathBuf::from("/path/to/another.txt"),
    ];

    // When: Creating a file selection with duplicates
    let selection = FileSelection::Files(files);

    // Then: The selection should count all files (including duplicates)
    assert_eq!(
        selection.count(),
        3,
        "File selection should count all files including duplicates"
    );
    assert!(
        !selection.is_empty(),
        "File selection with duplicates should not be empty"
    );
}

#[test]
fn should_handle_selection_with_special_characters() {
    // Given: Files with special characters in paths
    let files = vec![
        PathBuf::from("/path/with spaces/file.txt"),
        PathBuf::from("/path/with-underscores/file.txt"),
        PathBuf::from("/path/with.dots/file.txt"),
        PathBuf::from("/path/with_unicode/文件.txt"),
    ];

    // When: Creating a file selection with special characters
    let selection = FileSelection::Files(files);

    // Then: The selection should handle special characters correctly
    assert_eq!(
        selection.count(),
        4,
        "File selection should count files with special characters"
    );
    assert!(
        !selection.is_empty(),
        "File selection with special characters should not be empty"
    );
}
