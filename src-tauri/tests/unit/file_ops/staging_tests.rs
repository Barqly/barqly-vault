//! Unit tests for file operations staging functions
//!
//! Tests individual staging functions in isolation:
//! - Staging area creation and management
//! - File staging operations
//! - Temporary file creation
//! - Cleanup operations

use barqly_vault_lib::file_ops::{create_staging_area, FileSelection, StagingArea};
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::{tempdir, NamedTempFile};

fn create_test_file(dir: &Path, name: &str, content: &str) -> std::path::PathBuf {
    let file_path = dir.join(name);
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    file_path
}

#[test]
fn test_create_staging_area() {
    // Arrange & Act
    let staging = StagingArea::new().unwrap();

    // Assert
    assert!(staging.path().exists());
    assert!(staging.path().is_dir());
    assert_eq!(staging.file_count(), 0);
    assert_eq!(staging.total_size(), 0);
}

#[test]
fn test_stage_individual_files() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let mut staging = StagingArea::new().unwrap();

    // Act
    let result = staging.stage_files(&selection);

    // Assert
    assert!(result.is_ok());
    assert_eq!(staging.file_count(), 2);
    assert!(staging.total_size() > 0);
}

#[test]
fn test_stage_folder() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let sub_dir = temp_dir.path().join("subdir");
    fs::create_dir(&sub_dir).unwrap();

    create_test_file(&sub_dir, "test1.txt", "content1");
    create_test_file(&sub_dir, "test2.txt", "content2");

    let selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    let mut staging = StagingArea::new().unwrap();

    // Act
    let result = staging.stage_files(&selection);

    // Assert
    assert!(result.is_ok());
    assert_eq!(staging.file_count(), 2);
}

#[test]
fn test_create_temp_file() {
    // Arrange
    let staging = StagingArea::new().unwrap();

    // Act
    let temp_file = staging.create_temp_file("test", ".tmp").unwrap();

    // Assert
    assert!(temp_file.path().exists());
}

#[test]
fn test_staging_area_cleanup() {
    // Arrange
    let mut staging = StagingArea::new().unwrap();
    let staging_path = staging.path().to_path_buf();

    // Assert initial state
    assert!(staging_path.exists());

    // Act
    let result = staging.cleanup();

    // Assert
    assert!(result.is_ok());
}

#[test]
fn test_staging_area_double_cleanup() {
    // Arrange
    let mut staging = StagingArea::new().unwrap();

    // Act - Clean up twice
    let result1 = staging.cleanup();
    let result2 = staging.cleanup();

    // Assert - Both should succeed
    assert!(result1.is_ok());
    assert!(result2.is_ok());
}

#[test]
fn test_staged_files_access() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let mut staging = StagingArea::new().unwrap();
    staging.stage_files(&selection).unwrap();

    // Act
    let staged_files = staging.staged_files();

    // Assert
    assert_eq!(staged_files.len(), 2);
    assert!(staged_files.iter().all(|f| f.path.exists()));
}

#[test]
fn test_staging_area_path_access() {
    // Arrange
    let staging = StagingArea::new().unwrap();

    // Act
    let path = staging.path();

    // Assert
    assert!(path.exists());
    assert!(path.is_dir());
    assert!(path.is_absolute());
}

#[test]
fn test_create_staging_area_function() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let selection = FileSelection::Files(vec![file1]);

    // Act
    let staging = create_staging_area(&selection).unwrap();

    // Assert
    assert_eq!(staging.file_count(), 1);
    assert!(staging.total_size() > 0);
}

#[test]
fn test_staging_area_with_empty_selection() {
    // Arrange
    let selection = FileSelection::Files(vec![]);
    let mut staging = StagingArea::new().unwrap();

    // Act
    let result = staging.stage_files(&selection);

    // Assert
    assert!(result.is_ok()); // Empty selection should be handled gracefully
    assert_eq!(staging.file_count(), 0);
    assert_eq!(staging.total_size(), 0);
}

#[test]
fn test_staging_area_file_info() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let file_path = create_test_file(temp_dir.path(), "test.txt", "test content");
    let selection = FileSelection::Files(vec![file_path]);
    let mut staging = StagingArea::new().unwrap();

    // Act
    staging.stage_files(&selection).unwrap();
    let staged_files = staging.staged_files();

    // Assert
    assert_eq!(staged_files.len(), 1);
    let file_info = &staged_files[0];
    assert_eq!(file_info.size, 12); // "test content" is 12 bytes
    assert!(!file_info.hash.is_empty());
}

#[test]
fn test_staging_area_with_nested_folders() {
    // Arrange
    let temp_dir = tempdir().unwrap();
    let sub_dir1 = temp_dir.path().join("subdir1");
    let sub_dir2 = sub_dir1.join("subdir2");
    fs::create_dir_all(&sub_dir2).unwrap();

    create_test_file(&sub_dir1, "file1.txt", "content1");
    create_test_file(&sub_dir2, "file2.txt", "content2");

    let selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    let mut staging = StagingArea::new().unwrap();

    // Act
    let result = staging.stage_files(&selection);

    // Assert
    assert!(result.is_ok());
    assert_eq!(staging.file_count(), 2);
}
