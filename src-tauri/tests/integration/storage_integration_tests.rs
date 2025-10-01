//! Integration tests for the storage module using the new test framework
//!
//! This module demonstrates comprehensive integration testing:
//! - Complete storage workflow validation
//! - Key lifecycle management (save, load, list, delete)
//! - Cross-module interaction testing
//! - Error handling and recovery scenarios
//! - Performance validation with realistic data sizes
//! - Concurrent access testing

use crate::common::helpers::TestAssertions;
// Storage tests now use proper domain modules
use barqly_vault_lib::services::key_management::shared::KeyInfo, barqly_vault_lib::error::StorageError;
use rstest::*;
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

// ============================================================================
// TEST ENVIRONMENT SETUP
// ============================================================================

/// Test environment for storage integration tests
struct StorageTestEnv {
    temp_dir: TempDir,
    app_dir: PathBuf,
    keys_dir: PathBuf,
}

impl StorageTestEnv {
    fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let temp_dir = TempDir::new()?;
        let app_dir = temp_dir.path().join("barqly-vault");
        let keys_dir = app_dir.join("keys");

        fs::create_dir_all(&keys_dir)?;

        Ok(Self {
            temp_dir,
            app_dir,
            keys_dir,
        })
    }

    fn create_test_key_data(&self, size: usize) -> Vec<u8> {
        (0..size).map(|i| (i % 256) as u8).collect()
    }
}

/// Mock the directories crate for testing
fn mock_directories_for_test(app_dir: &Path) {
    // This would normally be done with a proper mocking framework
    // For now, we'll use environment variables to control the directories crate
    std::env::set_var("XDG_CONFIG_HOME", app_dir.to_string_lossy().to_string());
}

// ============================================================================
// STORAGE MODULE INITIALIZATION TESTS
// ============================================================================

#[test]
fn should_initialize_storage_module_successfully() {
    // Given: A request to initialize the storage module
    
    // When: Getting the application directory
    let result = crate::services::key_management::shared::get_application_directory();

    // Then: Storage module should initialize successfully
    TestAssertions::assert_ok(
        result,
        "Storage module initialization should succeed"
    );
}

// ============================================================================
// KEY STORAGE LIFECYCLE TESTS
// ============================================================================

#[test]
fn should_complete_key_storage_lifecycle_successfully() {
    // Given: Test environment and key data
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("test-key-{}", timestamp);
    let encrypted_data = env.create_test_key_data(1024);
    let public_key = "age1testpublickey123456789";

    // When: Checking if key exists initially
    let exists_initially = TestAssertions::assert_ok(
        crate::services::key_management::shared::key_exists(&label),
        "Key existence check should succeed"
    );

    // Then: Key should not exist initially
    assert!(!exists_initially, "Key should not exist initially");

    // When: Saving the key
    let saved_path = TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(&label, &encrypted_data, Some(public_key)),
        "Key saving should succeed"
    );

    // Then: Key file should exist
    assert!(saved_path.exists(), "Saved key file should exist");

    // When: Verifying key exists
    let exists_after_save = TestAssertions::assert_ok(
        crate::services::key_management::shared::key_exists(&label),
        "Key existence check after save should succeed"
    );

    // Then: Key should exist after saving
    assert!(exists_after_save, "Key should exist after saving");

    // When: Loading the key
    let loaded_data = TestAssertions::assert_ok(
        crate::services::key_management::shared::load_encrypted_key(&label),
        "Key loading should succeed"
    );

    // Then: Loaded data should match original
    assert_eq!(loaded_data, encrypted_data, "Loaded data should match original");

    // When: Getting key info
    let key_info = TestAssertions::assert_ok(
        crate::services::key_management::shared::get_key_info(&label),
        "Key info retrieval should succeed"
    );

    // Then: Key info should be correct
    assert_eq!(key_info.label, label, "Key label should match");
    assert!(key_info.public_key.is_some(), "Public key should be present");
    assert_eq!(key_info.public_key.unwrap(), public_key, "Public key should match");

    // When: Listing keys
    let keys = TestAssertions::assert_ok(
        crate::services::key_management::shared::list_keys(),
        "Key listing should succeed"
    );

    // Then: Our key should be in the list
    let our_key = keys.iter().find(|k| k.label == label);
    assert!(our_key.is_some(), "Our key should be in the list");
    assert_eq!(our_key.unwrap().label, label, "Listed key label should match");

    // When: Deleting the key
    TestAssertions::assert_ok(
        crate::services::key_management::shared::delete_key(&label),
        "Key deletion should succeed"
    );

    // Then: Key should not exist after deletion
    let exists_after_delete = TestAssertions::assert_ok(
        crate::services::key_management::shared::key_exists(&label),
        "Key existence check after delete should succeed"
    );
    assert!(!exists_after_delete, "Key should not exist after deletion");

    // When: Listing keys after deletion
    let keys_after_delete = TestAssertions::assert_ok(
        crate::services::key_management::shared::list_keys(),
        "Key listing after delete should succeed"
    );

    // Then: Our key should be gone from the list
    let our_key_after_delete = keys_after_delete.iter().find(|k| k.label == label);
    assert!(our_key_after_delete.is_none(), "Our key should be gone from list");
}

// ============================================================================
// MULTIPLE KEYS MANAGEMENT TESTS
// ============================================================================

#[test]
fn should_manage_multiple_keys_successfully() {
    // Given: Test environment and multiple key labels
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let labels = [
        format!("key1-{}", timestamp),
        format!("key2-{}", timestamp),
        format!("key3-{}", timestamp),
    ];
    let mut saved_paths = Vec::new();

    // When: Saving multiple keys
    for (i, label) in labels.iter().enumerate() {
        let data = env.create_test_key_data(512 + i * 100);
        let public_key = format!("age1testpublickey{}", i);

        let path = TestAssertions::assert_ok(
            crate::services::key_management::shared::save_encrypted_key(label, &data, Some(&public_key)),
            &format!("Saving key {} should succeed", label)
        );
        saved_paths.push(path);
    }

    // When: Listing all keys
    let keys = TestAssertions::assert_ok(
        crate::services::key_management::shared::list_keys(),
        "Key listing should succeed"
    );

    // Then: All our keys should be in the list
    for label in labels.iter() {
        let found_key = keys.iter().find(|k| k.label == *label);
        assert!(found_key.is_some(), "Key {} should be in the list", label);
    }

    // Then: Keys should be sorted by creation time (newest first)
    let our_keys: Vec<_> = keys.iter().filter(|k| labels.contains(&k.label)).collect();
    assert_eq!(our_keys.len(), 3, "Should have 3 keys in list");

    for i in 0..our_keys.len() - 1 {
        assert!(
            our_keys[i].created_at >= our_keys[i + 1].created_at,
            "Keys should be sorted by creation time (newest first)"
        );
    }

    // When: Loading each key
    for (i, label) in labels.iter().enumerate() {
        let expected_data = env.create_test_key_data(512 + i * 100);
        let loaded_data = TestAssertions::assert_ok(
            crate::services::key_management::shared::load_encrypted_key(label),
            &format!("Loading key {} should succeed", label)
        );
        assert_eq!(loaded_data, expected_data, "Loaded data should match for key {}", label);
    }

    // When: Deleting keys one by one
    for label in labels.iter() {
        TestAssertions::assert_ok(
            crate::services::key_management::shared::delete_key(label),
            &format!("Deleting key {} should succeed", label)
        );
    }

    // Then: All our keys should be gone
    let keys_after_delete = TestAssertions::assert_ok(
        crate::services::key_management::shared::list_keys(),
        "Key listing after delete should succeed"
    );
    for label in labels.iter() {
        let found_key = keys_after_delete.iter().find(|k| k.label == *label);
        assert!(found_key.is_none(), "Key {} should be deleted", label);
    }
}

// ============================================================================
// KEY LABEL VALIDATION TESTS
// ============================================================================

#[rstest]
#[case("normal-key", true, "normal_key")]
#[case("my_key_123", true, "underscore_with_numbers")]
#[case("key-with-dashes", true, "dashes")]
#[case("key/with/slash", false, "forward_slashes")]
#[case("key\\with\\backslash", false, "backslashes")]
#[case("key..with..dots", false, "double_dots")]
#[case("", false, "empty_string")]
#[case("   ", false, "spaces_only")]
#[case("key*with*stars", false, "asterisks")]
#[case("key?with?question", false, "question_marks")]
#[case("key\"with\"quotes", false, "quotes")]
fn should_validate_key_labels_correctly(
    #[case] label: &str,
    #[case] should_succeed: bool,
    #[case] test_name: &str,
) {
    // Given: Test environment and key data
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);
    let data = env.create_test_key_data(100);

    // When: Attempting to save key with the label
    let result = crate::services::key_management::shared::save_encrypted_key(label, &data, None);

    // Then: Result should match expectation
    if should_succeed {
        TestAssertions::assert_ok(
            result,
            &format!("Label '{}' should be valid for {test_name}", label)
        );
        // Clean up
        let _ = crate::services::key_management::shared::delete_key(label);
    } else {
        assert!(
            result.is_err(),
            "Label '{}' should be invalid for {test_name}",
            label
        );
        if let Err(StorageError::InvalidLabel(_)) = result {
            // Expected error
        } else {
            panic!("Expected InvalidLabel error for label '{}' ({test_name})", label);
        }
    }
}

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

#[test]
fn should_handle_key_already_exists_error() {
    // Given: Test environment and existing key
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = "duplicate-key";
    let data1 = env.create_test_key_data(100);
    let data2 = env.create_test_key_data(200);

    // When: Saving a key
    TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(label, &data1, None),
        "First key save should succeed"
    );

    // When: Attempting to save another key with same label
    let result = crate::services::key_management::shared::save_encrypted_key(label, &data2, None);

    // Then: Should get key already exists error
    assert!(
        result.is_err(),
        "Saving duplicate key should fail"
    );
    if let Err(StorageError::KeyAlreadyExists(_)) = result {
        // Expected error
    } else {
        panic!("Expected KeyAlreadyExists error for duplicate key");
    }

    // Clean up
    let _ = crate::services::key_management::shared::delete_key(label);
}

#[test]
fn should_handle_key_not_found_error() {
    // Given: Test environment and non-existent key
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = "non-existent-key";

    // When: Attempting to load non-existent key
    let result = crate::services::key_management::shared::load_encrypted_key(label);

    // Then: Should get key not found error
    assert!(
        result.is_err(),
        "Loading non-existent key should fail"
    );
    if let Err(StorageError::KeyNotFound(_)) = result {
        // Expected error
    } else {
        panic!("Expected KeyNotFound error for non-existent key");
    }
}

// ============================================================================
// KEY METADATA TESTS
// ============================================================================

#[test]
fn should_persist_key_metadata_correctly() {
    // Given: Test environment and key with metadata
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = "metadata-test-key";
    let data = env.create_test_key_data(256);
    let public_key = "age1testpublickeymetadata";

    // When: Saving key with metadata
    TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(label, &data, Some(public_key)),
        "Saving key with metadata should succeed"
    );

    // When: Getting key info
    let key_info = TestAssertions::assert_ok(
        crate::services::key_management::shared::get_key_info(label),
        "Getting key info should succeed"
    );

    // Then: Metadata should be persisted correctly
    assert_eq!(key_info.label, label, "Key label should match");
    assert!(key_info.public_key.is_some(), "Public key should be present");
    assert_eq!(key_info.public_key.unwrap(), public_key, "Public key should match");
    assert!(key_info.created_at > 0, "Creation timestamp should be positive");
    assert!(key_info.last_accessed > 0, "Last accessed timestamp should be positive");

    // Clean up
    let _ = crate::services::key_management::shared::delete_key(label);
}

// ============================================================================
// LARGE KEY STORAGE TESTS
// ============================================================================

#[rstest]
#[case(1024, "1kb_key")]
#[case(1024 * 1024, "1mb_key")]
#[case(10 * 1024 * 1024, "10mb_key")]
fn should_handle_large_key_storage_successfully(
    #[case] key_size: usize,
    #[case] test_name: &str,
) {
    // Given: Test environment and large key data
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = format!("large-key-{}", test_name);
    let data = env.create_test_key_data(key_size);

    // When: Saving large key
    let start = std::time::Instant::now();
    let saved_path = TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(&label, &data, None),
        &format!("Saving large key should succeed for {test_name}")
    );
    let save_time = start.elapsed();

    // Then: Key should be saved successfully
    assert!(saved_path.exists(), "Large key file should exist");
    assert!(
        save_time.as_secs() < 30,
        "Large key save should complete within 30 seconds, took: {:?}",
        save_time
    );

    // When: Loading large key
    let start = std::time::Instant::now();
    let loaded_data = TestAssertions::assert_ok(
        crate::services::key_management::shared::load_encrypted_key(&label),
        &format!("Loading large key should succeed for {test_name}")
    );
    let load_time = start.elapsed();

    // Then: Data should match and load within reasonable time
    assert_eq!(loaded_data, data, "Loaded large key data should match for {test_name}");
    assert!(
        load_time.as_secs() < 30,
        "Large key load should complete within 30 seconds, took: {:?}",
        load_time
    );

    // Clean up
    let _ = crate::services::key_management::shared::delete_key(&label);
}

// ============================================================================
// CONCURRENT ACCESS TESTS
// ============================================================================

#[test]
fn should_handle_concurrent_key_access() {
    // Given: Test environment and multiple concurrent operations
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let labels: Vec<_> = (0..5)
        .map(|i| format!("concurrent-key-{}-{}", i, timestamp))
        .collect();

    // When: Creating keys concurrently
    let handles: Vec<_> = labels
        .iter()
        .map(|label| {
            let label = label.clone();
            let data = env.create_test_key_data(512);
            std::thread::spawn(move || {
                crate::services::key_management::shared::save_encrypted_key(&label, &data, None)
            })
        })
        .collect();

    // Then: All concurrent saves should succeed
    for handle in handles {
        TestAssertions::assert_ok(
            handle.join().unwrap(),
            "Concurrent key save should succeed"
        );
    }

    // When: Loading keys concurrently
    let load_handles: Vec<_> = labels
        .iter()
        .map(|label| {
            let label = label.clone();
            std::thread::spawn(move || {
                crate::services::key_management::shared::load_encrypted_key(&label)
            })
        })
        .collect();

    // Then: All concurrent loads should succeed
    for handle in load_handles {
        TestAssertions::assert_ok(
            handle.join().unwrap(),
            "Concurrent key load should succeed"
        );
    }

    // Clean up
    for label in labels {
        let _ = crate::services::key_management::shared::delete_key(&label);
    }
}

// ============================================================================
// STORAGE RECOVERY TESTS
// ============================================================================

#[test]
fn should_recover_from_storage_errors() {
    // Given: Test environment
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = "recovery-test-key";
    let data = env.create_test_key_data(256);

    // When: Saving a key
    TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(label, &data, None),
        "Key save should succeed"
    );

    // When: Verifying key exists
    let exists = TestAssertions::assert_ok(
        crate::services::key_management::shared::key_exists(label),
        "Key existence check should succeed"
    );

    // Then: Key should exist
    assert!(exists, "Key should exist after saving");

    // When: Loading the key
    let loaded_data = TestAssertions::assert_ok(
        crate::services::key_management::shared::load_encrypted_key(label),
        "Key load should succeed"
    );

    // Then: Data should match
    assert_eq!(loaded_data, data, "Loaded data should match original");

    // Clean up
    let _ = crate::services::key_management::shared::delete_key(label);
}

// ============================================================================
// STORAGE DIRECTORY STRUCTURE TESTS
// ============================================================================

#[test]
fn should_create_proper_directory_structure() {
    // Given: Test environment
    let env = StorageTestEnv::new().expect("Should create test environment");
    mock_directories_for_test(&env.app_dir);

    let label = "structure-test-key";
    let data = env.create_test_key_data(128);

    // When: Saving a key
    let saved_path = TestAssertions::assert_ok(
        crate::services::key_management::shared::save_encrypted_key(label, &data, None),
        "Key save should succeed"
    );

    // Then: Directory structure should be correct
    assert!(env.app_dir.exists(), "Application directory should exist");
    assert!(env.keys_dir.exists(), "Keys directory should exist");
    assert!(saved_path.exists(), "Key file should exist");
    assert!(saved_path.starts_with(&env.keys_dir), "Key should be in keys directory");

    // Clean up
    let _ = crate::services::key_management::shared::delete_key(label);
}
