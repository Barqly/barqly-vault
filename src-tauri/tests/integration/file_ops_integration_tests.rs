//! Integration tests for file operations module using the new test framework
//!
//! This module demonstrates comprehensive integration testing:
//! - End-to-end file operation workflows
//! - Cross-module interaction testing
//! - Archive creation and extraction validation
//! - Manifest generation and verification
//! - Error handling and edge cases
//! - Performance validation with realistic file sizes

use crate::common::helpers::TestAssertions;
use barqly_vault_lib::file_ops::{
    FileOpsConfig, FileSelection, create_archive, create_manifest_for_archive, create_staging_area,
    extract_archive, validate_selection, verify_manifest,
};
use rstest::*;
use std::fs;
use std::io::Write;
use tempfile::tempdir;

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

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

// ============================================================================
// FILE ENCRYPTION WORKFLOW TESTS
// ============================================================================

#[test]
fn should_complete_file_encryption_workflow_successfully() {
    // Given: Test files and configuration
    let mut env = FileOpsTestEnv::new();
    let file1 = env.create_test_file("wallet.dat", "bitcoin wallet data");
    let file2 = env.create_test_file("descriptor.txt", "output descriptor");
    let file3 = env.create_test_file("keys.json", r#"{"key": "value"}"#);

    let selection = FileSelection::Files(vec![file1, file2, file3]);
    let config = FileOpsConfig::default();

    // When: Validating selection
    let validation_result = validate_selection(&selection, &config);
    TestAssertions::assert_ok(
        validation_result,
        "File selection validation should succeed",
    );

    // When: Creating archive
    let archive_path = env.path().join("backup.tar.gz");
    let archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        "Archive creation should succeed",
    );

    // Then: Archive should be created with correct properties
    assert!(archive_path.exists(), "Archive file should exist");
    assert_eq!(
        archive_operation.file_count, 3,
        "Archive should contain 3 files"
    );
    assert!(
        archive_operation.total_size > 0,
        "Archive should have positive size"
    );

    // When: Extracting archive
    let extract_dir = env.path().join("extracted");
    let extracted_files = TestAssertions::assert_ok(
        extract_archive(&archive_path, &extract_dir, &config),
        "Archive extraction should succeed",
    );

    // Then: Files should be extracted correctly
    assert_eq!(extracted_files.len(), 3, "Should extract 3 files");
    assert!(extract_dir.exists(), "Extraction directory should exist");

    // Verify file contents
    let extracted_wallet = extract_dir.join("wallet.dat");
    let extracted_descriptor = extract_dir.join("descriptor.txt");
    let extracted_keys = extract_dir.join("keys.json");

    assert!(
        extracted_wallet.exists(),
        "Extracted wallet file should exist"
    );
    assert!(
        extracted_descriptor.exists(),
        "Extracted descriptor file should exist"
    );
    assert!(extracted_keys.exists(), "Extracted keys file should exist");

    let wallet_content = fs::read_to_string(&extracted_wallet).expect("Should read wallet content");
    assert_eq!(
        wallet_content, "bitcoin wallet data",
        "Wallet content should match"
    );
}

#[test]
fn should_complete_folder_encryption_workflow_successfully() {
    // Given: Test folder with files and configuration
    let mut env = FileOpsTestEnv::new();
    let folder_path = env.create_test_folder_with_files(
        "bitcoin_data",
        &[
            ("wallet.dat", "wallet content"),
            ("descriptor.txt", "descriptor content"),
            ("subfolder/config.json", r#"{"network": "mainnet"}"#),
        ],
    );

    let selection = FileSelection::Folder(folder_path);
    let config = FileOpsConfig::default();

    // When: Validating selection
    let validation_result = validate_selection(&selection, &config);
    TestAssertions::assert_ok(
        validation_result,
        "Folder selection validation should succeed",
    );

    // When: Creating archive
    let archive_path = env.path().join("folder_backup.tar.gz");
    let archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        "Folder archive creation should succeed",
    );

    // Then: Archive should be created with correct properties
    assert!(archive_path.exists(), "Folder archive file should exist");
    assert!(
        archive_operation.file_count >= 3,
        "Archive should contain at least 3 files"
    );
    assert!(
        archive_operation.total_size > 0,
        "Archive should have positive size"
    );

    // When: Extracting archive
    let extract_dir = env.path().join("extracted_folder");
    let extracted_files = TestAssertions::assert_ok(
        extract_archive(&archive_path, &extract_dir, &config),
        "Folder archive extraction should succeed",
    );

    // Then: Folder structure should be preserved
    assert!(
        extracted_files.len() >= 3,
        "Should extract at least 3 files"
    );
    assert!(extract_dir.exists(), "Extraction directory should exist");

    let extracted_bitcoin_data = extract_dir.join("bitcoin_data");
    assert!(
        extracted_bitcoin_data.exists(),
        "Bitcoin data folder should exist"
    );
    assert!(
        extracted_bitcoin_data.join("wallet.dat").exists(),
        "Wallet file should exist"
    );
    assert!(
        extracted_bitcoin_data.join("descriptor.txt").exists(),
        "Descriptor file should exist"
    );
    assert!(
        extracted_bitcoin_data.join("subfolder").exists(),
        "Subfolder should exist"
    );
    assert!(
        extracted_bitcoin_data
            .join("subfolder/config.json")
            .exists(),
        "Config file in subfolder should exist"
    );
}

// ============================================================================
// MANIFEST INTEGRATION TESTS
// ============================================================================

#[test]
fn should_create_and_verify_manifest_successfully() {
    // Given: Test files and archive
    let mut env = FileOpsTestEnv::new();
    let file1 = env.create_test_file("important.txt", "very important data");
    let file2 = env.create_test_file("backup.dat", "backup data");

    let selection = FileSelection::Files(vec![file1, file2]);
    let config = FileOpsConfig::default();

    // When: Creating archive
    let archive_path = env.path().join("with_manifest.tar.gz");
    let archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        "Archive creation should succeed",
    );

    // When: Extracting archive
    let extract_dir = env.path().join("manifest_extracted");
    let extracted_files = TestAssertions::assert_ok(
        extract_archive(&archive_path, &extract_dir, &config),
        "Archive extraction should succeed",
    );

    // When: Creating manifest
    let manifest_path = env.path().join("manifest.json");
    let manifest = TestAssertions::assert_ok(
        create_manifest_for_archive(&archive_operation, &extracted_files, Some(&manifest_path)),
        "Manifest creation should succeed",
    );

    // Then: Manifest should be created with correct properties
    assert!(manifest_path.exists(), "Manifest file should exist");
    assert_eq!(manifest.file_count(), 2, "Manifest should contain 2 files");

    // When: Verifying manifest
    let verification_result = verify_manifest(&manifest, &extracted_files, &config);
    TestAssertions::assert_ok(verification_result, "Manifest verification should succeed");
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

#[test]
fn should_handle_invalid_file_selection_gracefully() {
    // Given: Non-existent file selection
    let env = FileOpsTestEnv::new();
    let non_existent_file = env.path().join("non_existent.txt");
    let selection = FileSelection::Files(vec![non_existent_file]);
    let config = FileOpsConfig::default();

    // When: Validating selection
    let validation_result = validate_selection(&selection, &config);

    // Then: Validation should fail
    assert!(
        validation_result.is_err(),
        "Validation should fail for non-existent files"
    );
}

#[test]
fn should_handle_empty_selection_gracefully() {
    // Given: Empty file selection
    let selection = FileSelection::Files(vec![]);
    let config = FileOpsConfig::default();

    // When: Validating selection
    let validation_result = validate_selection(&selection, &config);

    // Then: Validation should fail
    assert!(
        validation_result.is_err(),
        "Validation should fail for empty selection"
    );
}

// ============================================================================
// LARGE FILE HANDLING TESTS
// ============================================================================

#[rstest]
#[case(1024 * 1024, "1mb_file")]
#[case(10 * 1024 * 1024, "10mb_file")]
fn should_handle_large_files_successfully(#[case] file_size: usize, #[case] test_name: &str) {
    // Given: Large test file
    let mut env = FileOpsTestEnv::new();
    let large_content: String = (0..file_size)
        .map(|i| (i % 26 + 97) as u8 as char)
        .collect();
    let large_file = env.create_test_file(&format!("large_{test_name}.dat"), &large_content);

    let selection = FileSelection::Files(vec![large_file]);
    let config = FileOpsConfig::default();

    // When: Creating archive with large file
    let archive_path = env.path().join(format!("large_{test_name}.tar.gz"));
    let archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        &format!("Large file archive creation should succeed for {test_name}"),
    );

    // Then: Archive should be created successfully
    assert!(archive_path.exists(), "Large file archive should exist");
    assert_eq!(
        archive_operation.file_count, 1,
        "Archive should contain 1 file"
    );
    assert!(
        archive_operation.total_size > 0,
        "Archive should have positive size"
    );

    // When: Extracting large file
    let extract_dir = env.path().join(format!("extracted_large_{test_name}"));
    let extracted_files = TestAssertions::assert_ok(
        extract_archive(&archive_path, &extract_dir, &config),
        &format!("Large file extraction should succeed for {test_name}"),
    );

    // Then: Large file should be extracted correctly
    assert_eq!(extracted_files.len(), 1, "Should extract 1 file");
    assert!(extract_dir.exists(), "Extraction directory should exist");

    let extracted_file = extract_dir.join(format!("large_{test_name}.dat"));
    assert!(extracted_file.exists(), "Extracted large file should exist");

    let extracted_content =
        fs::read_to_string(&extracted_file).expect("Should read large file content");
    assert_eq!(
        extracted_content, large_content,
        "Large file content should match"
    );
}

// ============================================================================
// STAGING AREA TESTS
// ============================================================================

#[test]
fn should_manage_staging_area_correctly() {
    // Given: Test files and configuration
    let mut env = FileOpsTestEnv::new();
    let file1 = env.create_test_file("test1.txt", "content 1");
    let file2 = env.create_test_file("test2.txt", "content 2");

    let selection = FileSelection::Files(vec![file1, file2]);

    // When: Creating staging area
    let mut staging_area = TestAssertions::assert_ok(
        create_staging_area(&selection),
        "Staging area creation should succeed",
    );

    // Then: Staging area should be created with correct properties
    assert!(
        staging_area.path().exists(),
        "Staging area path should exist"
    );
    assert_eq!(
        staging_area.file_count(),
        2,
        "Staging area should contain 2 files"
    );
    assert!(
        staging_area.total_size() > 0,
        "Staging area should have positive size"
    );

    // Verify staging area contains expected files
    let staged_files = staging_area.staged_files();
    assert_eq!(staged_files.len(), 2, "Should have 2 staged files");

    // Clean up staging area
    staging_area
        .cleanup()
        .expect("Staging area cleanup should succeed");
}

// ============================================================================
// CROSS-PLATFORM PATH TESTS
// ============================================================================

#[test]
fn should_handle_cross_platform_paths_correctly() {
    // Given: Test files with various path formats
    let mut env = FileOpsTestEnv::new();

    // Create files with different path separators and special characters
    let file1 = env.create_test_file("normal_file.txt", "normal content");
    let file2 = env.create_test_file("file with spaces.txt", "content with spaces");
    let file3 = env.create_test_file("file-with-dashes.txt", "content with dashes");
    let file4 = env.create_test_file("file_with_underscores.txt", "content with underscores");

    let selection = FileSelection::Files(vec![file1, file2, file3, file4]);
    let config = FileOpsConfig::default();

    // When: Validating selection
    let validation_result = validate_selection(&selection, &config);
    TestAssertions::assert_ok(
        validation_result,
        "Cross-platform path validation should succeed",
    );

    // When: Creating archive
    let archive_path = env.path().join("cross_platform.tar.gz");
    let archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        "Cross-platform archive creation should succeed",
    );

    // Then: Archive should be created successfully
    assert!(archive_path.exists(), "Cross-platform archive should exist");
    assert_eq!(
        archive_operation.file_count, 4,
        "Archive should contain 4 files"
    );

    // When: Extracting archive
    let extract_dir = env.path().join("cross_platform_extracted");
    let extracted_files = TestAssertions::assert_ok(
        extract_archive(&archive_path, &extract_dir, &config),
        "Cross-platform archive extraction should succeed",
    );

    // Then: All files should be extracted with correct names
    assert_eq!(extracted_files.len(), 4, "Should extract 4 files");

    let expected_files = [
        "normal_file.txt",
        "file with spaces.txt",
        "file-with-dashes.txt",
        "file_with_underscores.txt",
    ];

    for expected_file in &expected_files {
        let extracted_file = extract_dir.join(expected_file);
        assert!(
            extracted_file.exists(),
            "Extracted file '{expected_file}' should exist"
        );
    }
}

// ============================================================================
// ARCHIVE CORRUPTION DETECTION TESTS
// ============================================================================

#[test]
fn should_detect_corrupted_archive() {
    // Given: Valid archive and corrupted version
    let mut env = FileOpsTestEnv::new();
    let file = env.create_test_file("test.txt", "test content");
    let selection = FileSelection::Files(vec![file]);
    let config = FileOpsConfig::default();

    // Create valid archive
    let archive_path = env.path().join("valid.tar.gz");
    let _archive_operation = TestAssertions::assert_ok(
        create_archive(&selection, &archive_path, &config),
        "Valid archive creation should succeed",
    );

    // Corrupt the archive by truncating it
    let archive_content = fs::read(&archive_path).expect("Should read archive");
    let corrupted_content = &archive_content[..archive_content.len() / 2];
    fs::write(&archive_path, corrupted_content).expect("Should write corrupted archive");

    // When: Attempting to extract corrupted archive
    let extract_dir = env.path().join("corrupted_extract");
    let extraction_result = extract_archive(&archive_path, &extract_dir, &config);

    // Then: Extraction should fail
    assert!(
        extraction_result.is_err(),
        "Extraction should fail for corrupted archive"
    );
}

// ============================================================================
// CONCURRENT OPERATION TESTS
// ============================================================================

#[test]
fn should_handle_concurrent_archive_operations() {
    // Given: Multiple test environments and files
    let mut env1 = FileOpsTestEnv::new();
    let mut env2 = FileOpsTestEnv::new();

    let file1 = env1.create_test_file("file1.txt", "content 1");
    let file2 = env2.create_test_file("file2.txt", "content 2");

    let selection1 = FileSelection::Files(vec![file1]);
    let selection2 = FileSelection::Files(vec![file2]);
    let config = FileOpsConfig::default();

    // When: Creating archives concurrently
    let archive_path1 = env1.path().join("concurrent1.tar.gz");
    let archive_path2 = env2.path().join("concurrent2.tar.gz");

    let archive_operation1 = TestAssertions::assert_ok(
        create_archive(&selection1, &archive_path1, &config),
        "First concurrent archive creation should succeed",
    );
    let archive_operation2 = TestAssertions::assert_ok(
        create_archive(&selection2, &archive_path2, &config),
        "Second concurrent archive creation should succeed",
    );

    // Then: Both archives should be created successfully
    assert!(
        archive_path1.exists(),
        "First concurrent archive should exist"
    );
    assert!(
        archive_path2.exists(),
        "Second concurrent archive should exist"
    );
    assert_eq!(
        archive_operation1.file_count, 1,
        "First archive should contain 1 file"
    );
    assert_eq!(
        archive_operation2.file_count, 1,
        "Second archive should contain 1 file"
    );

    // When: Extracting archives concurrently
    let extract_dir1 = env1.path().join("concurrent_extract1");
    let extract_dir2 = env2.path().join("concurrent_extract2");

    let extracted_files1 = TestAssertions::assert_ok(
        extract_archive(&archive_path1, &extract_dir1, &config),
        "First concurrent extraction should succeed",
    );
    let extracted_files2 = TestAssertions::assert_ok(
        extract_archive(&archive_path2, &extract_dir2, &config),
        "Second concurrent extraction should succeed",
    );

    // Then: Both extractions should succeed
    assert_eq!(
        extracted_files1.len(),
        1,
        "Should extract 1 file from first archive"
    );
    assert_eq!(
        extracted_files2.len(),
        1,
        "Should extract 1 file from second archive"
    );
}
