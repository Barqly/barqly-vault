//! Unit tests for file selection functionality

use barqly_vault_lib::file_ops::{
    FileSelection, FileOpsConfig, validate_selection
};
use tempfile::{tempdir, NamedTempFile};
use std::fs;
use std::io::Write;
use std::path::Path;

fn create_test_file(dir: &Path, name: &str, content: &str) -> std::path::PathBuf {
    let file_path = dir.join(name);
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    file_path
}

#[test]
fn test_file_selection_validation() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let config = FileOpsConfig::default();

    assert!(validate_selection(&selection, &config).is_ok());
}

#[test]
fn test_folder_selection_validation() {
    let temp_dir = tempdir().unwrap();
    create_test_file(temp_dir.path(), "test1.txt", "content1");
    create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    let config = FileOpsConfig::default();

    assert!(validate_selection(&selection, &config).is_ok());
}

#[test]
fn test_empty_selection() {
    let selection = FileSelection::Files(vec![]);
    let config = FileOpsConfig::default();

    let result = validate_selection(&selection, &config);
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), barqly_vault_lib::file_ops::FileOpsError::InvalidSelection { .. }));
}

#[test]
fn test_file_hash_calculation() {
    let temp_file = NamedTempFile::new().unwrap();
    let content = "test content";
    temp_file.as_file().write_all(content.as_bytes()).unwrap();

    // Test that we can get file info which includes hash calculation
    let selection = FileSelection::Files(vec![temp_file.path().to_path_buf()]);
    let file_infos = selection.get_file_info().unwrap();
    
    assert_eq!(file_infos.len(), 1);
    assert_eq!(file_infos[0].hash.len(), 64); // SHA-256 hex string length
}

#[test]
fn test_selection_count() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let file_selection = FileSelection::Files(vec![file1, file2]);
    assert_eq!(file_selection.count(), 2);
    assert!(!file_selection.is_empty());

    let folder_selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    assert_eq!(folder_selection.count(), 1);
    assert!(!folder_selection.is_empty());
}

#[test]
fn test_selection_type() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    
    let file_selection = FileSelection::Files(vec![file1]);
    assert!(matches!(file_selection.selection_type(), barqly_vault_lib::file_ops::SelectionType::Files));

    let folder_selection = FileSelection::Folder(temp_dir.path().to_path_buf());
    assert!(matches!(folder_selection.selection_type(), barqly_vault_lib::file_ops::SelectionType::Folder));
}

#[test]
fn test_total_size_calculation() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1"); // 8 bytes
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2"); // 8 bytes

    let selection = FileSelection::Files(vec![file1, file2]);
    let total_size = selection.total_size().unwrap();
    
    assert_eq!(total_size, 16); // 8 + 8 bytes
}

#[test]
fn test_get_all_files() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1.clone(), file2.clone()]);
    let all_files = selection.get_all_files().unwrap();
    
    assert_eq!(all_files.len(), 2);
    assert!(all_files.contains(&file1));
    assert!(all_files.contains(&file2));
} 