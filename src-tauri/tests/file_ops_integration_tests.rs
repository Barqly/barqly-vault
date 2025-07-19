//! Integration tests for file operations module
//!
//! Tests complete workflows including:
//! - File selection and validation
//! - Archive creation and extraction
//! - Manifest generation and verification
//! - Error handling and edge cases

use barqly_vault_lib::file_ops::{
    create_archive, create_manifest_for_archive, create_staging_area, extract_archive,
    validate_selection, verify_manifest, FileOpsConfig, FileOpsError, FileSelection,
};
use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::{tempdir, NamedTempFile};

/// Test environment for file operations
struct FileOpsTestEnv {
    temp_dir: tempfile::TempDir,
    test_files: Vec<std::path::PathBuf>,
    test_folders: Vec<std::path::PathBuf>,
}

impl FileOpsTestEnv {
    fn new() -> Self {
        let temp_dir = tempdir().expect("Failed to create temp directory");
        Self {
            temp_dir,
            test_files: Vec::new(),
            test_folders: Vec::new(),
        }
    }

    fn create_test_file(&mut self, name: &str, content: &str) -> std::path::PathBuf {
        let file_path = self.temp_dir.path().join(name);
        let mut file = fs::File::create(&file_path).expect("Failed to create test file");
        file.write_all(content.as_bytes())
            .expect("Failed to write test content");
        self.test_files.push(file_path.clone());
        file_path
    }

    fn create_test_folder(&mut self, name: &str) -> std::path::PathBuf {
        let folder_path = self.temp_dir.path().join(name);
        fs::create_dir_all(&folder_path).expect("Failed to create test folder");
        self.test_folders.push(folder_path.clone());
        folder_path
    }

    fn create_test_folder_with_files(
        &mut self,
        folder_name: &str,
        files: &[(&str, &str)],
    ) -> std::path::PathBuf {
        let folder_path = self.create_test_folder(folder_name);

        for (file_name, content) in files {
            let file_path = folder_path.join(file_name);

            // Create parent directories if needed
            if let Some(parent) = file_path.parent() {
                fs::create_dir_all(parent).expect("Failed to create parent directory");
            }

            let mut file = fs::File::create(&file_path).expect("Failed to create test file");
            file.write_all(content.as_bytes())
                .expect("Failed to write test content");
        }

        folder_path
    }

    fn path(&self) -> &std::path::Path {
        self.temp_dir.path()
    }
}

#[test]
fn test_complete_file_encryption_workflow() {
    let mut env = FileOpsTestEnv::new();

    // Create test files
    let file1 = env.create_test_file("wallet.dat", "bitcoin wallet data");
    let file2 = env.create_test_file("descriptor.txt", "output descriptor");
    let file3 = env.create_test_file("keys.json", r#"{"key": "value"}"#);

    // Create file selection
    let selection = FileSelection::Files(vec![file1, file2, file3]);
    let config = FileOpsConfig::default();

    // Validate selection
    assert!(validate_selection(&selection, &config).is_ok());

    // Create archive
    let archive_path = env.path().join("backup.tar.gz");
    let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

    // Verify archive was created
    assert!(archive_path.exists());
    assert_eq!(archive_operation.file_count, 3);
    assert!(archive_operation.total_size > 0);

    // Extract and verify
    let extract_dir = env.path().join("extracted");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    assert_eq!(extracted_files.len(), 3);
    assert!(extract_dir.exists());

    // Verify file contents
    let extracted_wallet = extract_dir.join("wallet.dat");
    let extracted_descriptor = extract_dir.join("descriptor.txt");
    let extracted_keys = extract_dir.join("keys.json");

    assert!(extracted_wallet.exists());
    assert!(extracted_descriptor.exists());
    assert!(extracted_keys.exists());

    let wallet_content = fs::read_to_string(&extracted_wallet).unwrap();
    assert_eq!(wallet_content, "bitcoin wallet data");
}

#[test]
fn test_complete_folder_encryption_workflow() {
    let mut env = FileOpsTestEnv::new();

    // Create test folder with files
    let folder_path = env.create_test_folder_with_files(
        "bitcoin_data",
        &[
            ("wallet.dat", "wallet content"),
            ("descriptor.txt", "descriptor content"),
            ("subfolder/config.json", r#"{"network": "mainnet"}"#),
        ],
    );

    // Create folder selection
    let selection = FileSelection::Folder(folder_path);
    let config = FileOpsConfig::default();

    // Validate selection
    assert!(validate_selection(&selection, &config).is_ok());

    // Create archive
    let archive_path = env.path().join("folder_backup.tar.gz");
    let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

    // Verify archive was created
    assert!(archive_path.exists());
    assert!(archive_operation.file_count >= 3); // At least 3 files
    assert!(archive_operation.total_size > 0);

    // Extract and verify
    let extract_dir = env.path().join("extracted_folder");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    assert!(extracted_files.len() >= 3);
    assert!(extract_dir.exists());

    // Verify folder structure was preserved
    let extracted_bitcoin_data = extract_dir.join("bitcoin_data");
    assert!(extracted_bitcoin_data.exists());
    assert!(extracted_bitcoin_data.join("wallet.dat").exists());
    assert!(extracted_bitcoin_data.join("descriptor.txt").exists());
    assert!(extracted_bitcoin_data.join("subfolder").exists());
    assert!(extracted_bitcoin_data
        .join("subfolder/config.json")
        .exists());
}

#[test]
fn test_manifest_integration_workflow() {
    let mut env = FileOpsTestEnv::new();

    // Create test files
    let file1 = env.create_test_file("important.txt", "very important data");
    let file2 = env.create_test_file("backup.dat", "backup data");

    // Create file selection
    let selection = FileSelection::Files(vec![file1, file2]);
    let config = FileOpsConfig::default();

    // Create archive
    let archive_path = env.path().join("with_manifest.tar.gz");
    let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

    // Extract archive first
    let extract_dir = env.path().join("manifest_extracted");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    // Create manifest with extracted file info
    let manifest_path = env.path().join("manifest.json");
    let manifest =
        create_manifest_for_archive(&archive_operation, &extracted_files, Some(&manifest_path))
            .unwrap();

    // Verify manifest was created
    assert!(manifest_path.exists());
    assert_eq!(manifest.file_count(), 2);
    assert_eq!(manifest.total_size(), 30); // "very important data" (17) + "backup data" (13)

    // Verify manifest integrity
    assert!(manifest.verify_integrity().is_ok());

    // Verify manifest against extracted files
    assert!(verify_manifest(&manifest, &extracted_files, &config).is_ok());
}

#[test]
fn test_error_handling_integration() {
    let mut env = FileOpsTestEnv::new();
    let config = FileOpsConfig::default();

    // Test empty selection
    let empty_selection = FileSelection::Files(vec![]);
    let result = validate_selection(&empty_selection, &config);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::InvalidSelection { .. }
    ));

    // Test non-existent file
    let non_existent_file = env.path().join("nonexistent.txt");
    let bad_selection = FileSelection::Files(vec![non_existent_file]);
    let result = validate_selection(&bad_selection, &config);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::PathValidationFailed { .. }
    ));

    // Test non-existent folder
    let non_existent_folder = env.path().join("nonexistent_folder");
    let bad_folder_selection = FileSelection::Folder(non_existent_folder);
    let result = validate_selection(&bad_folder_selection, &config);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::PathValidationFailed { .. }
    ));
}

#[test]
fn test_large_file_handling() {
    let mut env = FileOpsTestEnv::new();

    // Create a large file (but within limits)
    let large_content = vec![b'a'; 50 * 1024 * 1024]; // 50MB
    let large_file =
        env.create_test_file("large.dat", std::str::from_utf8(&large_content).unwrap());

    let selection = FileSelection::Files(vec![large_file]);
    let config = FileOpsConfig::default();

    // Should work with default config (100MB limit)
    assert!(validate_selection(&selection, &config).is_ok());

    // Test with smaller limit
    let mut small_config = config;
    small_config.max_file_size = 10 * 1024 * 1024; // 10MB

    let result = validate_selection(&selection, &small_config);
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::FileTooLarge { .. }
    ));
}

#[test]
fn test_staging_area_integration() {
    let mut env = FileOpsTestEnv::new();

    // Create test files
    let file1 = env.create_test_file("test1.txt", "content1");
    let file2 = env.create_test_file("test2.txt", "content2");

    let selection = FileSelection::Files(vec![file1, file2]);

    // Test staging area creation
    let staging = create_staging_area(&selection).unwrap();

    assert_eq!(staging.file_count(), 2);
    assert!(staging.total_size() > 0);

    // Verify files were staged
    let staged_files = staging.staged_files();
    assert_eq!(staged_files.len(), 2);

    // Check that staged files exist
    for file_info in staged_files {
        assert!(file_info.path.exists());
    }
}

#[test]
fn test_cross_platform_path_handling() {
    let mut env = FileOpsTestEnv::new();

    // Test with various path formats
    let files = vec![
        env.create_test_file("simple.txt", "simple"),
        env.create_test_file("with spaces.txt", "with spaces"),
        env.create_test_file("with-dashes.txt", "with dashes"),
        env.create_test_file("with_underscores.txt", "with underscores"),
    ];

    let selection = FileSelection::Files(files);
    let config = FileOpsConfig::default();

    // Should handle all path formats
    assert!(validate_selection(&selection, &config).is_ok());

    // Create archive with mixed path formats
    let archive_path = env.path().join("mixed_paths.tar.gz");
    let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

    assert!(archive_path.exists());
    assert_eq!(archive_operation.file_count, 4);

    // Extract and verify
    let extract_dir = env.path().join("mixed_extracted");
    let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

    assert_eq!(extracted_files.len(), 4);

    // Verify all files were extracted correctly
    let expected_files = [
        "simple.txt",
        "with spaces.txt",
        "with-dashes.txt",
        "with_underscores.txt",
    ];

    for expected_file in &expected_files {
        assert!(extract_dir.join(expected_file).exists());
    }
}

#[test]
fn test_progress_callback_integration() {
    let mut env = FileOpsTestEnv::new();

    // Create multiple test files
    let files: Vec<_> = (0..5)
        .map(|i| env.create_test_file(&format!("file{}.txt", i), &format!("content{}", i)))
        .collect();

    let selection = FileSelection::Files(files);
    let config = FileOpsConfig::default();

    // Test progress callback
    let progress_calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let progress_calls_clone = progress_calls.clone();

    let progress_callback = Box::new(move |processed: u64, total: u64| {
        progress_calls_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        assert!(processed <= total);
        assert!(total > 0);
    });

    let archive_path = env.path().join("progress_test.tar.gz");
    let result = barqly_vault_lib::file_ops::create_archive_with_progress(
        &selection,
        &archive_path,
        &config,
        Some(progress_callback),
    );

    assert!(result.is_ok());
    assert!(progress_calls.load(std::sync::atomic::Ordering::Relaxed) > 0);
}

#[test]
fn test_archive_corruption_detection() {
    let mut env = FileOpsTestEnv::new();

    // Create a valid archive
    let file = env.create_test_file("test.txt", "test content");
    let selection = FileSelection::Files(vec![file]);
    let config = FileOpsConfig::default();

    let archive_path = env.path().join("valid.tar.gz");
    let archive_operation = create_archive(&selection, &archive_path, &config).unwrap();

    // Get file info for manifest
    let file_infos = selection.get_file_info().unwrap();
    let manifest = create_manifest_for_archive(&archive_operation, &file_infos, None).unwrap();

    // Corrupt the archive by truncating it
    let mut archive_file = fs::OpenOptions::new()
        .write(true)
        .open(&archive_path)
        .unwrap();

    archive_file.set_len(100).unwrap(); // Truncate to 100 bytes

    // Try to extract corrupted archive
    let extract_dir = env.path().join("corrupted_extract");
    let result = extract_archive(&archive_path, &extract_dir, &config);

    // Should fail due to corruption
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        FileOpsError::ArchiveExtractionFailed { .. }
    ));
}

#[test]
fn test_concurrent_archive_operations() {
    use std::sync::Arc;
    use std::thread;

    let mut env = FileOpsTestEnv::new();
    let config = FileOpsConfig::default();

    // Create multiple test files
    let files: Vec<_> = (0..10)
        .map(|i| env.create_test_file(&format!("concurrent{}.txt", i), &format!("content{}", i)))
        .collect();

    let selection = FileSelection::Files(files);
    let selection_arc = Arc::new(selection);
    let config_arc = Arc::new(config);

    // Run multiple archive operations concurrently
    let handles: Vec<_> = (0..3)
        .map(|i| {
            let selection_clone = Arc::clone(&selection_arc);
            let config_clone = Arc::clone(&config_arc);
            let env_path = env.path().to_path_buf();

            thread::spawn(move || {
                let archive_path = env_path.join(format!("concurrent_{}.tar.gz", i));
                create_archive(&selection_clone, &archive_path, &config_clone)
            })
        })
        .collect();

    // Wait for all operations to complete
    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // All operations should succeed
    for result in results {
        assert!(result.is_ok());
    }
}
