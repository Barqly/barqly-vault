//! Integration Tests for Decrypt Directory Creation
//!
//! This module tests the directory creation functionality for the decrypt_data command,
//! ensuring feature parity with the encrypt_files command.

use barqly_vault_lib::{commands::crypto::DecryptDataInput, commands::types::ValidateInput};
use std::{fs, path::Path};
use tempfile::TempDir;

// ============================================================================
// VALIDATION TESTS - Directory existence should not be required
// ============================================================================

#[test]
fn should_validate_decrypt_input_with_non_existent_directory() {
    // Given: A DecryptDataInput with non-existent output directory
    let temp_dir = TempDir::new().unwrap();
    let encrypted_file = temp_dir.path().join("test.age");
    fs::write(&encrypted_file, b"encrypted data").unwrap();

    let non_existent_dir = temp_dir.path().join("non_existent").join("nested");
    assert!(!non_existent_dir.exists(), "Directory should not exist");

    let input = DecryptDataInput {
        encrypted_file: encrypted_file.to_string_lossy().to_string(),
        key_id: "test_key".to_string(),
        passphrase: "TestPass123!@#".to_string(),
        output_dir: non_existent_dir.to_string_lossy().to_string(),
    };

    // When: Validating the input
    let result = input.validate();

    // Then: Validation should succeed (directory existence not required)
    assert!(
        result.is_ok(),
        "Validation should succeed with non-existent output directory"
    );
}

#[test]
fn should_validate_decrypt_input_with_existing_directory() {
    // Given: A DecryptDataInput with existing output directory
    let temp_dir = TempDir::new().unwrap();
    let encrypted_file = temp_dir.path().join("test.age");
    fs::write(&encrypted_file, b"encrypted data").unwrap();

    let existing_dir = temp_dir.path().join("existing");
    fs::create_dir_all(&existing_dir).unwrap();
    assert!(existing_dir.exists(), "Directory should exist");

    let input = DecryptDataInput {
        encrypted_file: encrypted_file.to_string_lossy().to_string(),
        key_id: "test_key".to_string(),
        passphrase: "TestPass123!@#".to_string(),
        output_dir: existing_dir.to_string_lossy().to_string(),
    };

    // When: Validating the input
    let result = input.validate();

    // Then: Validation should succeed
    assert!(
        result.is_ok(),
        "Validation should succeed with existing output directory"
    );
}

#[test]
fn should_fail_validation_when_encrypted_file_missing() {
    // Given: A DecryptDataInput with non-existent encrypted file
    let temp_dir = TempDir::new().unwrap();
    let non_existent_file = temp_dir.path().join("missing.age");

    let input = DecryptDataInput {
        encrypted_file: non_existent_file.to_string_lossy().to_string(),
        key_id: "test_key".to_string(),
        passphrase: "TestPass123!@#".to_string(),
        output_dir: temp_dir.path().to_string_lossy().to_string(),
    };

    // When: Validating the input
    let result = input.validate();

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "Validation should fail when encrypted file doesn't exist"
    );
}

#[test]
fn should_fail_validation_when_encrypted_file_is_directory() {
    // Given: A DecryptDataInput where encrypted file path is actually a directory
    let temp_dir = TempDir::new().unwrap();
    let dir_path = temp_dir.path().join("not_a_file");
    fs::create_dir_all(&dir_path).unwrap();

    let input = DecryptDataInput {
        encrypted_file: dir_path.to_string_lossy().to_string(),
        key_id: "test_key".to_string(),
        passphrase: "TestPass123!@#".to_string(),
        output_dir: temp_dir.path().to_string_lossy().to_string(),
    };

    // When: Validating the input
    let result = input.validate();

    // Then: Validation should fail
    assert!(
        result.is_err(),
        "Validation should fail when encrypted file is a directory"
    );
}

// ============================================================================
// DIRECTORY CREATION HELPER FUNCTION TESTS
// ============================================================================

/// Test the validate_output_directory function behavior
#[test]
fn test_validate_output_directory_creates_non_existent() {
    use std::io;

    // Helper function from crypto_commands.rs (we'll test its behavior)
    fn validate_output_directory(path: &Path) -> Result<(), io::Error> {
        // If directory doesn't exist, try to create it
        if !path.exists() {
            // Attempt to create the directory (including parent directories)
            std::fs::create_dir_all(path).map_err(|e| {
                io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    format!(
                        "Failed to create output directory '{}': {}",
                        path.display(),
                        e
                    ),
                )
            })?;
        }

        // Check if it's actually a directory
        if !path.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "Output path exists but is not a directory: {}",
                    path.display()
                ),
            ));
        }

        // Check write permissions by attempting to create a temporary test file
        let test_file = path.join(format!(".barqly_write_test_{}", std::process::id()));
        match std::fs::write(&test_file, b"test") {
            Ok(_) => {
                // Clean up test file
                let _ = std::fs::remove_file(test_file);
                Ok(())
            }
            Err(e) => Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("Cannot write to output directory: {e}"),
            )),
        }
    }

    // Given: A non-existent directory path
    let temp_dir = TempDir::new().unwrap();
    let new_dir = temp_dir.path().join("new_directory");
    assert!(!new_dir.exists());

    // When: Calling validate_output_directory
    let result = validate_output_directory(&new_dir);

    // Then: Directory should be created
    assert!(result.is_ok(), "Should create directory successfully");
    assert!(new_dir.exists(), "Directory should exist after validation");
    assert!(new_dir.is_dir(), "Should be a directory");
}

#[test]
fn test_validate_output_directory_handles_nested_paths() {
    use std::io;

    // Helper function from crypto_commands.rs (we'll test its behavior)
    fn validate_output_directory(path: &Path) -> Result<(), io::Error> {
        // If directory doesn't exist, try to create it
        if !path.exists() {
            // Attempt to create the directory (including parent directories)
            std::fs::create_dir_all(path).map_err(|e| {
                io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    format!(
                        "Failed to create output directory '{}': {}",
                        path.display(),
                        e
                    ),
                )
            })?;
        }

        // Check if it's actually a directory
        if !path.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "Output path exists but is not a directory: {}",
                    path.display()
                ),
            ));
        }

        // Check write permissions by attempting to create a temporary test file
        let test_file = path.join(format!(".barqly_write_test_{}", std::process::id()));
        match std::fs::write(&test_file, b"test") {
            Ok(_) => {
                // Clean up test file
                let _ = std::fs::remove_file(test_file);
                Ok(())
            }
            Err(e) => Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("Cannot write to output directory: {e}"),
            )),
        }
    }

    // Given: A deeply nested non-existent directory path
    let temp_dir = TempDir::new().unwrap();
    let nested_dir = temp_dir.path().join("level1").join("level2").join("level3");
    assert!(!nested_dir.exists());

    // When: Calling validate_output_directory
    let result = validate_output_directory(&nested_dir);

    // Then: All directories should be created
    assert!(
        result.is_ok(),
        "Should create nested directories successfully"
    );
    assert!(nested_dir.exists(), "Nested directory should exist");
    assert!(
        nested_dir.parent().unwrap().exists(),
        "Parent directories should exist"
    );
}

#[test]
fn test_validate_output_directory_rejects_file_as_directory() {
    use std::io;

    // Helper function from crypto_commands.rs (we'll test its behavior)
    fn validate_output_directory(path: &Path) -> Result<(), io::Error> {
        // If directory doesn't exist, try to create it
        if !path.exists() {
            // Attempt to create the directory (including parent directories)
            std::fs::create_dir_all(path).map_err(|e| {
                io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    format!(
                        "Failed to create output directory '{}': {}",
                        path.display(),
                        e
                    ),
                )
            })?;
        }

        // Check if it's actually a directory
        if !path.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "Output path exists but is not a directory: {}",
                    path.display()
                ),
            ));
        }

        // Check write permissions by attempting to create a temporary test file
        let test_file = path.join(format!(".barqly_write_test_{}", std::process::id()));
        match std::fs::write(&test_file, b"test") {
            Ok(_) => {
                // Clean up test file
                let _ = std::fs::remove_file(test_file);
                Ok(())
            }
            Err(e) => Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("Cannot write to output directory: {e}"),
            )),
        }
    }

    // Given: A file path (not a directory)
    let temp_dir = TempDir::new().unwrap();
    let file_path = temp_dir.path().join("file.txt");
    fs::write(&file_path, b"content").unwrap();

    // When: Calling validate_output_directory with a file path
    let result = validate_output_directory(&file_path);

    // Then: Should fail with appropriate error
    assert!(result.is_err(), "Should fail when path is a file");
    let error = result.unwrap_err();
    assert!(error.to_string().contains("not a directory"));
}

// ============================================================================
// FEATURE PARITY TESTS
// ============================================================================

#[test]
fn test_decrypt_matches_encrypt_validation_behavior() {
    // This test ensures that DecryptDataInput validation behaves consistently
    // with EncryptDataInput when it comes to output directories

    let temp_dir = TempDir::new().unwrap();
    let encrypted_file = temp_dir.path().join("test.age");
    fs::write(&encrypted_file, b"encrypted").unwrap();

    // Test 1: Non-existent directory should pass validation
    let non_existent = temp_dir.path().join("not_yet_created");
    let decrypt_input = DecryptDataInput {
        encrypted_file: encrypted_file.to_string_lossy().to_string(),
        key_id: "key".to_string(),
        passphrase: "pass".to_string(),
        output_dir: non_existent.to_string_lossy().to_string(),
    };

    assert!(
        decrypt_input.validate().is_ok(),
        "Decrypt should allow non-existent output directory (like encrypt does)"
    );

    // Test 2: Existing directory should pass validation
    let existing = temp_dir.path().join("existing");
    fs::create_dir_all(&existing).unwrap();
    let decrypt_input2 = DecryptDataInput {
        encrypted_file: encrypted_file.to_string_lossy().to_string(),
        key_id: "key".to_string(),
        passphrase: "pass".to_string(),
        output_dir: existing.to_string_lossy().to_string(),
    };

    assert!(
        decrypt_input2.validate().is_ok(),
        "Decrypt should allow existing output directory"
    );
}

#[test]
fn test_timestamp_based_directory_pattern() {
    // Test the common frontend pattern: Barqly-Recovery/YYYY-MM-DD_HHMMSS
    let temp_dir = TempDir::new().unwrap();
    let encrypted_file = temp_dir.path().join("test.age");
    fs::write(&encrypted_file, b"encrypted").unwrap();

    let timestamp = chrono::Utc::now().format("%Y-%m-%d_%H%M%S");
    let recovery_dir = temp_dir
        .path()
        .join("Barqly-Recovery")
        .join(timestamp.to_string());

    let input = DecryptDataInput {
        encrypted_file: encrypted_file.to_string_lossy().to_string(),
        key_id: "key".to_string(),
        passphrase: "pass".to_string(),
        output_dir: recovery_dir.to_string_lossy().to_string(),
    };

    // Should validate successfully even though directory doesn't exist
    assert!(
        input.validate().is_ok(),
        "Should validate timestamp-based recovery directory pattern"
    );
}
