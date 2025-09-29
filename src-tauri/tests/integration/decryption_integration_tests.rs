//! Task 3.4 Integration Tests - Decryption Commands
//!
//! This module provides comprehensive integration testing for:
//! - End-to-end decryption workflows using underlying functions
//! - Cross-module interaction testing (crypto + file_ops)
//! - Error handling and edge cases
//! - Performance validation with realistic data sizes
//! - Security validation for decryption operations

use crate::common::cleanup::TestCleanup;
use crate::common::helpers::TestAssertions;
use barqly_vault_lib::{
    crypto::{decrypt_data, encrypt_data},
    file_ops::{FileOpsConfig, FileSelection},
    services::passphrase::generate_keypair,
};
use std::{fs, path::PathBuf, thread, time::Duration};
use tempfile::TempDir;

// ============================================================================
// TEST SETUP AND HELPERS
// ============================================================================

struct TestEnvironment {
    #[allow(dead_code)] // Keep temp_dir to prevent cleanup of test files
    temp_dir: TempDir,
    test_files: Vec<PathBuf>,
    encrypted_data: Vec<u8>,
    keypair: barqly_vault_lib::crypto::KeyPair,
    _cleanup: TestCleanup,
}

impl TestEnvironment {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let temp_dir = tempfile::tempdir()?;

        // Generate test keypair
        let keypair = generate_keypair()?;

        // Create test files
        let test_files = Self::create_test_files(&temp_dir)?;

        // Create test data to encrypt
        let test_data = b"This is test data for encryption and decryption testing";
        let encrypted_data = encrypt_data(test_data, &keypair.public_key)?;

        Ok(Self {
            temp_dir,
            test_files,
            encrypted_data,
            keypair,
            _cleanup: TestCleanup::new(),
        })
    }

    fn create_test_files(temp_dir: &TempDir) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
        let mut test_files = Vec::new();

        // Create various test files
        let medium_content = "This is a medium test file with more content".repeat(10);
        let large_content = "This is a large test file with much more content".repeat(100);
        let file_contents = vec![
            ("small.txt", "This is a small test file"),
            ("medium.txt", &medium_content),
            ("large.txt", &large_content),
        ];

        for (filename, content) in file_contents {
            let file_path = temp_dir.path().join(filename);
            fs::write(&file_path, content)?;
            test_files.push(file_path);
        }

        Ok(test_files)
    }

    fn cleanup(&self) {
        // Cleanup is handled by TempDir drop
    }
}

// ============================================================================
// DECRYPT DATA FUNCTION INTEGRATION TESTS
// ============================================================================

#[test]
fn should_decrypt_data_successfully_end_to_end() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment with encrypted data
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Decrypting the data using the underlying function
    let decrypted_data = TestAssertions::assert_ok(
        decrypt_data(&env.encrypted_data, &env.keypair.private_key),
        "Decryption should succeed",
    );

    // Then: The decrypted data should match the original
    let expected_data = b"This is test data for encryption and decryption testing";
    assert_eq!(
        decrypted_data, expected_data,
        "Decrypted data should match original"
    );

    Ok(())
}

#[test]
fn should_handle_decryption_with_wrong_key() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment with encrypted data and cleanup manager
    let _cleanup = TestCleanup::new();
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // Generate a different keypair
    let wrong_keypair = generate_keypair()?;

    // When: Attempting to decrypt with wrong key
    let result = decrypt_data(&env.encrypted_data, &wrong_keypair.private_key);

    // Then: The decryption should fail
    assert!(result.is_err(), "Decryption with wrong key should fail");

    Ok(())
}

#[test]
fn should_handle_decryption_with_corrupted_data() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // Create corrupted data
    let corrupted_data = b"this is not valid encrypted data";

    // When: Attempting to decrypt corrupted data
    let result = decrypt_data(corrupted_data, &env.keypair.private_key);

    // Then: The decryption should fail
    assert!(result.is_err(), "Decryption of corrupted data should fail");

    Ok(())
}

// ============================================================================
// FILE OPERATIONS INTEGRATION TESTS
// ============================================================================

#[test]
fn should_handle_file_selection_creation() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment with files
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Creating file selection
    let file_selection = FileSelection::Files(env.test_files.clone());

    // Then: The file selection should be valid
    match file_selection {
        FileSelection::Files(files) => {
            assert_eq!(files.len(), 3, "Should have 3 test files");
            assert!(files.iter().all(|p| p.exists()), "All files should exist");
        }
        _ => panic!("Expected Files selection"),
    }

    Ok(())
}

#[test]
fn should_handle_file_ops_config_creation() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let _env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Creating file ops config
    let config = FileOpsConfig::default();

    // Then: The config should be valid
    assert!(config.max_file_size > 0, "Max file size should be positive");
    assert!(
        config.max_archive_size > 0,
        "Max archive size should be positive"
    );

    Ok(())
}

// ============================================================================
// CROSS-MODULE INTEGRATION TESTS
// ============================================================================

#[test]
fn should_handle_complete_encrypt_decrypt_workflow() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Performing complete workflow (encrypt -> decrypt)
    let test_data = b"Complete workflow test data";
    let encrypted_data = TestAssertions::assert_ok(
        encrypt_data(test_data, &env.keypair.public_key),
        "Encryption should succeed",
    );

    let decrypted_data = TestAssertions::assert_ok(
        decrypt_data(&encrypted_data, &env.keypair.private_key),
        "Decryption should succeed",
    );

    // Then: Both operations should succeed and be consistent
    assert_eq!(
        decrypted_data, test_data,
        "Decrypted data should match original"
    );

    Ok(())
}

// ============================================================================
// PERFORMANCE AND CONCURRENCY TESTS
// ============================================================================

#[test]
fn should_handle_concurrent_decryption_operations() -> Result<(), Box<dyn std::error::Error>> {
    // Given: Multiple test environments
    let envs: Vec<TestEnvironment> = (0..3)
        .map(|_| {
            TestAssertions::assert_ok(
                TestEnvironment::new(),
                "Test environment setup should succeed",
            )
        })
        .collect();

    // When: Running concurrent decryption operations
    let handles: Vec<_> = envs
        .into_iter()
        .map(|env| {
            thread::spawn(move || decrypt_data(&env.encrypted_data, &env.keypair.private_key))
        })
        .collect();

    // Then: All operations should succeed
    for handle in handles {
        let result = TestAssertions::assert_ok(handle.join(), "Thread join should succeed");
        TestAssertions::assert_ok(result, "Concurrent decryption should succeed");
    }

    Ok(())
}

#[test]
fn should_complete_decryption_within_reasonable_time() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment with larger data
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // Create larger test data
    let large_data = b"Large test data".repeat(1000);
    assert!(large_data.len() > 10000, "Data should be larger than 10KB");

    // When: Encrypting and decrypting data
    let start_time = std::time::Instant::now();

    let encrypted_data = TestAssertions::assert_ok(
        encrypt_data(&large_data, &env.keypair.public_key),
        "Encryption should succeed",
    );

    let result = decrypt_data(&encrypted_data, &env.keypair.private_key);
    let decrypted_data = TestAssertions::assert_ok(result, "Decryption should succeed");

    let duration = start_time.elapsed();

    // Then: Operation should complete within reasonable time
    assert!(
        duration < Duration::from_secs(30),
        "Decryption should complete within 30 seconds"
    );
    assert_eq!(
        decrypted_data, large_data,
        "Decrypted data should match original"
    );

    Ok(())
}

// ============================================================================
// SECURITY AND EDGE CASE TESTS
// ============================================================================

#[test]
fn should_handle_empty_data_encryption_decryption() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Encrypting and decrypting empty data
    let empty_data = b"";
    let encrypted_data = TestAssertions::assert_ok(
        encrypt_data(empty_data, &env.keypair.public_key),
        "Encryption of empty data should succeed",
    );

    let decrypted_data = TestAssertions::assert_ok(
        decrypt_data(&encrypted_data, &env.keypair.private_key),
        "Decryption of empty data should succeed",
    );

    // Then: The operations should succeed and preserve empty data
    assert_eq!(decrypted_data, empty_data, "Empty data should be preserved");

    Ok(())
}

#[test]
fn should_handle_very_large_data_encryption_decryption() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // Create very large test data (100KB)
    let large_data = b"Large test data".repeat(6553); // ~100KB
    assert!(large_data.len() > 50000, "Data should be larger than 50KB");

    // When: Encrypting and decrypting large data
    let encrypted_data = TestAssertions::assert_ok(
        encrypt_data(&large_data, &env.keypair.public_key),
        "Encryption of large data should succeed",
    );

    let decrypted_data = TestAssertions::assert_ok(
        decrypt_data(&encrypted_data, &env.keypair.private_key),
        "Decryption of large data should succeed",
    );

    // Then: The operations should succeed and preserve data integrity
    assert_eq!(decrypted_data, large_data, "Large data should be preserved");
    assert!(
        encrypted_data.len() > large_data.len(),
        "Encrypted data should be larger than original"
    );

    Ok(())
}

// ============================================================================
// ERROR HANDLING AND RECOVERY TESTS
// ============================================================================

#[test]
fn should_handle_invalid_key_operations() -> Result<(), Box<dyn std::error::Error>> {
    // Given: A test environment
    let env = TestAssertions::assert_ok(
        TestEnvironment::new(),
        "Test environment setup should succeed",
    );

    // When: Attempting to decrypt with corrupted data
    let corrupted_data = b"this is definitely not valid encrypted data";

    let result = decrypt_data(corrupted_data, &env.keypair.private_key);

    // Then: The decryption should fail
    assert!(
        result.is_err(),
        "Decryption with corrupted data should fail"
    );

    Ok(())
}

// ============================================================================
// TEST CLEANUP
// ============================================================================

impl Drop for TestEnvironment {
    fn drop(&mut self) {
        self.cleanup();
    }
}
