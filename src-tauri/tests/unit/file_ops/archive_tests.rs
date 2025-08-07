//! Unit tests for archive operations

use barqly_vault_lib::file_ops::archive_operations::{
    create_archive, create_archive_with_progress, extract_archive,
};
use barqly_vault_lib::file_ops::{FileOpsConfig, FileSelection};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tempfile::tempdir;

fn create_test_file(dir: &Path, name: &str, content: &str) -> PathBuf {
    let file_path = dir.join(name);
    let mut file = fs::File::create(&file_path).unwrap();
    file.write_all(content.as_bytes()).unwrap();
    file_path
}

#[test]
fn test_create_archive() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let output_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    let result = create_archive(&selection, &output_path, &config);
    assert!(result.is_ok());

    let operation = result.unwrap();
    assert_eq!(operation.file_count, 2);
    assert!(operation.total_size > 0);
    assert!(output_path.exists());
}

#[test]
fn test_extract_archive() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let archive_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    // Create archive
    create_archive(&selection, &archive_path, &config).unwrap();

    // Extract archive
    let extract_dir = temp_dir.path().join("extracted");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    assert_eq!(extracted_files.len(), 2);
    assert!(extract_dir.exists());
}

#[test]
fn test_archive_with_progress() {
    let temp_dir = tempdir().unwrap();
    let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
    let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);
    let output_path = temp_dir.path().join("test.tar.gz");
    let config = FileOpsConfig::default();

    let progress_calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let progress_calls_clone = progress_calls.clone();
    let progress_callback = Box::new(move |processed: u64, total: u64| {
        progress_calls_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        assert!(processed <= total);
    });

    let result =
        create_archive_with_progress(&selection, &output_path, &config, Some(progress_callback));

    assert!(result.is_ok());
    assert!(progress_calls.load(std::sync::atomic::Ordering::Relaxed) > 0);
}
