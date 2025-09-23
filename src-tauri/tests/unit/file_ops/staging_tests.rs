//! Unit tests for file operations staging functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::file_ops::{FileSelection, StagingArea, create_staging_area};
use rstest::*;
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::tempdir;

/// Helper function to create test files for staging tests
fn create_test_file(dir: &Path, name: &str, content: &str) -> std::path::PathBuf {
    let file_path = dir.join(name);
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    file_path
}

// ============================================================================
// STAGING AREA CREATION TESTS
// ============================================================================

#[test]
fn should_create_staging_area_with_valid_properties() {
    // Given: No prerequisites needed

    // When: Creating a new staging area
    let staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // Then: The staging area should have correct properties
    assert!(staging.path().exists(), "Staging area path should exist");
    assert!(
        staging.path().is_dir(),
        "Staging area path should be a directory"
    );
    assert_eq!(
        staging.file_count(),
        0,
        "New staging area should have zero files"
    );
    assert_eq!(
        staging.total_size(),
        0,
        "New staging area should have zero total size"
    );
}

#[test]
fn should_create_staging_area_with_unique_paths() {
    // Given: No prerequisites needed

    // When: Creating multiple staging areas
    let staging1 = TestAssertions::assert_ok(
        StagingArea::new(),
        "First staging area creation should succeed",
    );
    let staging2 = TestAssertions::assert_ok(
        StagingArea::new(),
        "Second staging area creation should succeed",
    );

    // Then: The staging areas should have different paths
    assert_ne!(
        staging1.path(),
        staging2.path(),
        "Staging areas should have unique paths"
    );

    // And: Both should exist and be directories
    assert!(
        staging1.path().exists() && staging1.path().is_dir(),
        "First staging area should exist and be a directory"
    );
    assert!(
        staging2.path().exists() && staging2.path().is_dir(),
        "Second staging area should exist and be a directory"
    );
}

// ============================================================================
// FILE STAGING TESTS
// ============================================================================

#[rstest]
#[case(1, "single_file")]
#[case(2, "two_files")]
#[case(5, "multiple_files")]
fn should_stage_individual_files_correctly(#[case] file_count: usize, #[case] test_name: &str) {
    // Given: A temporary directory with test files
    let temp_dir = tempdir().unwrap();
    let files: Vec<std::path::PathBuf> = (0..file_count)
        .map(|i| {
            create_test_file(
                temp_dir.path(),
                &format!("test{i}.txt"),
                &format!("content{i}"),
            )
        })
        .collect();

    let selection = FileSelection::Files(files);
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Staging the files
    let result = staging.stage_files(&selection);

    // Then: Staging should succeed
    TestAssertions::assert_ok(
        result,
        &format!("File staging should succeed for {test_name}"),
    );

    // And: The staging area should have correct file count
    assert_eq!(
        staging.file_count(),
        file_count,
        "Staging area should have correct file count for {test_name}"
    );

    // And: The total size should be greater than zero
    assert!(
        staging.total_size() > 0,
        "Staging area should have non-zero total size for {test_name}"
    );
}

#[test]
fn should_stage_folder_with_all_contents() {
    // Given: A temporary directory with subdirectory and files
    let temp_dir = tempdir().unwrap();
    let sub_dir = temp_dir.path().join("subdir");
    fs::create_dir(&sub_dir).unwrap();

    create_test_file(&sub_dir, "test1.txt", "content1");
    create_test_file(&sub_dir, "test2.txt", "content2");

    let selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Staging the folder
    let result = staging.stage_files(&selection);

    // Then: Staging should succeed
    TestAssertions::assert_ok(result, "Folder staging should succeed");

    // And: The staging area should contain all files
    assert_eq!(
        staging.file_count(),
        2,
        "Staging area should contain all files from folder"
    );
}

#[test]
fn should_stage_folder_with_nested_structure() {
    // Given: A temporary directory with nested subdirectories and files
    let temp_dir = tempdir().unwrap();
    let sub_dir1 = temp_dir.path().join("subdir1");
    let sub_dir2 = sub_dir1.join("subdir2");
    fs::create_dir_all(&sub_dir2).unwrap();

    create_test_file(&sub_dir1, "file1.txt", "content1");
    create_test_file(&sub_dir2, "file2.txt", "content2");

    let selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Staging the folder with nested structure
    let result = staging.stage_files(&selection);

    // Then: Staging should succeed
    TestAssertions::assert_ok(result, "Nested folder staging should succeed");

    // And: The staging area should contain all files from nested structure
    assert_eq!(
        staging.file_count(),
        2,
        "Staging area should contain all files from nested folder structure"
    );
}

#[test]
fn should_handle_empty_file_selection_gracefully() {
    // Given: An empty file selection
    let selection = FileSelection::Files(vec![]);
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Staging an empty selection
    let result = staging.stage_files(&selection);

    // Then: Staging should succeed gracefully
    TestAssertions::assert_ok(result, "Empty selection staging should succeed gracefully");

    // And: The staging area should remain empty
    assert_eq!(
        staging.file_count(),
        0,
        "Staging area should have zero files after empty selection"
    );
    assert_eq!(
        staging.total_size(),
        0,
        "Staging area should have zero total size after empty selection"
    );
}

// ============================================================================
// TEMPORARY FILE TESTS
// ============================================================================

#[test]
fn should_create_temp_file_in_staging_area() {
    // Given: A staging area
    let staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Creating a temporary file
    let temp_file = TestAssertions::assert_ok(
        staging.create_temp_file("test", ".tmp"),
        "Temp file creation should succeed",
    );

    // Then: The temporary file should exist
    assert!(temp_file.path().exists(), "Temporary file should exist");

    // And: The file should be in the staging area directory
    let staging_path = staging.path();
    let temp_file_path = temp_file.path();
    assert!(
        temp_file_path.starts_with(staging_path),
        "Temporary file should be created in staging area directory"
    );
}

// ============================================================================
// CLEANUP TESTS
// ============================================================================

#[test]
fn should_cleanup_staging_area_successfully() {
    // Given: A staging area
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");
    let staging_path = staging.path().to_path_buf();

    // Verify initial state
    assert!(
        staging_path.exists(),
        "Staging area should exist before cleanup"
    );

    // When: Cleaning up the staging area
    let result = staging.cleanup();

    // Then: Cleanup should succeed
    TestAssertions::assert_ok(result, "Staging area cleanup should succeed");
}

#[test]
fn should_handle_double_cleanup_gracefully() {
    // Given: A staging area
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Cleaning up twice
    let result1 = staging.cleanup();
    let result2 = staging.cleanup();

    // Then: Both cleanup operations should succeed
    TestAssertions::assert_ok(result1, "First cleanup should succeed");
    TestAssertions::assert_ok(result2, "Second cleanup should succeed");
}

// ============================================================================
// FILE ACCESS TESTS
// ============================================================================

#[test]
fn should_provide_access_to_staged_files() {
    // Given: A temporary directory with test files and a staging area
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    TestAssertions::assert_ok(
        staging.stage_files(&selection),
        "File staging should succeed",
    );

    // When: Accessing staged files
    let staged_files = staging.staged_files();

    // Then: All staged files should be accessible
    assert_eq!(
        staged_files.len(),
        2,
        "Should provide access to all staged files"
    );
    assert!(
        staged_files.iter().all(|f| f.path.exists()),
        "All staged files should exist"
    );
}

#[test]
fn should_provide_staging_area_path_access() {
    // Given: A staging area
    let staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Accessing the staging area path
    let path = staging.path();

    // Then: The path should have correct properties
    assert!(path.exists(), "Staging area path should exist");
    assert!(path.is_dir(), "Staging area path should be a directory");
    assert!(path.is_absolute(), "Staging area path should be absolute");
}

// ============================================================================
// FILE INFORMATION TESTS
// ============================================================================

#[test]
fn should_provide_correct_file_information() {
    // Given: A temporary file with known content and a staging area
    let temp_dir = tempdir().unwrap();
    let test_content = "test content";
    let file_path = create_test_file(temp_dir.path(), "test.txt", test_content);
    let selection = FileSelection::Files(vec![file_path]);
    let mut staging =
        TestAssertions::assert_ok(StagingArea::new(), "Staging area creation should succeed");

    // When: Staging the file and accessing file information
    TestAssertions::assert_ok(
        staging.stage_files(&selection),
        "File staging should succeed",
    );
    let staged_files = staging.staged_files();

    // Then: File information should be correct
    assert_eq!(staged_files.len(), 1, "Should have one staged file");

    let file_info = &staged_files[0];
    assert_eq!(
        file_info.size,
        test_content.len() as u64,
        "File size should match content length"
    );
    assert!(!file_info.hash.is_empty(), "File hash should not be empty");
}

// ============================================================================
// CONVENIENCE FUNCTION TESTS
// ============================================================================

#[test]
fn should_create_staging_area_from_selection() {
    // Given: A temporary directory with a test file
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let selection = FileSelection::Files(vec![file1]);

    // When: Creating a staging area from selection
    let staging = TestAssertions::assert_ok(
        create_staging_area(&selection),
        "Staging area creation from selection should succeed",
    );

    // Then: The staging area should contain the file
    assert_eq!(
        staging.file_count(),
        1,
        "Staging area should contain the file from selection"
    );
    assert!(
        staging.total_size() > 0,
        "Staging area should have non-zero total size"
    );
}
