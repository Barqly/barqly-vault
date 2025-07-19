//! Unit tests for file selection functions
//!
//! Tests individual file selection functions in isolation:
//! - File selection creation
//! - File counting
//! - File validation

use barqly_vault_lib::file_ops::FileSelection;
use std::path::PathBuf;

#[test]
fn test_file_selection_creation() {
    // Test creating file selection with individual files
    let files = vec![
        PathBuf::from("/path/to/file1.txt"),
        PathBuf::from("/path/to/file2.txt"),
    ];
    let selection = FileSelection::Files(files.clone());

    assert_eq!(selection.count(), 2);
    assert!(!selection.is_empty());
}

#[test]
fn test_folder_selection_creation() {
    // Test creating file selection with folder
    let folder = PathBuf::from("/path/to/folder");
    let selection = FileSelection::Folder(folder);

    assert_eq!(selection.count(), 1); // Folder selection counts as 1 item
    assert!(!selection.is_empty()); // Folder selection is not empty
}

#[test]
fn test_empty_file_selection() {
    // Test empty file selection
    let files = vec![];
    let selection = FileSelection::Files(files);

    assert_eq!(selection.count(), 0);
    assert!(selection.is_empty());
}

#[test]
fn test_file_selection_count() {
    // Test file counting
    let files = vec![
        PathBuf::from("/path/to/file1.txt"),
        PathBuf::from("/path/to/file2.txt"),
        PathBuf::from("/path/to/file3.txt"),
    ];
    let selection = FileSelection::Files(files);

    assert_eq!(selection.count(), 3);
}

#[test]
fn test_file_selection_is_empty() {
    // Test empty check
    let empty_files = vec![];
    let empty_selection = FileSelection::Files(empty_files);
    assert!(empty_selection.is_empty());

    let non_empty_files = vec![PathBuf::from("/path/to/file.txt")];
    let non_empty_selection = FileSelection::Files(non_empty_files);
    assert!(!non_empty_selection.is_empty());
}
