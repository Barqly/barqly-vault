//! Integration tests for the storage module.
//!
//! These tests verify the complete storage workflow including key saving,
//! loading, listing, and deletion with proper error handling.

use barqly_vault_lib::storage;
use barqly_vault_lib::storage::{KeyInfo, StorageError};
use std::fs;
use std::path::{Path, PathBuf};
use tempfile::TempDir;

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

#[test]
fn test_storage_module_initialization() {
    // Test that the storage module can be imported and used
    let result = storage::get_application_directory();
    assert!(result.is_ok());
}

#[test]
fn test_key_storage_lifecycle() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("test-key-{}", timestamp);
    let encrypted_data = env.create_test_key_data(1024);
    let public_key = "age1testpublickey123456789";

    // Test key doesn't exist initially
    assert!(!storage::key_exists(&label).unwrap());

    // Save the key
    let saved_path =
        storage::save_encrypted_key(&label, &encrypted_data, Some(public_key)).unwrap();
    assert!(saved_path.exists());

    // Verify key exists
    assert!(storage::key_exists(&label).unwrap());

    // Load the key
    let loaded_data = storage::load_encrypted_key(&label).unwrap();
    assert_eq!(loaded_data, encrypted_data);

    // Get key info
    let key_info = storage::get_key_info(&label).unwrap();
    assert_eq!(key_info.label, label);
    assert!(key_info.public_key.is_some());
    assert_eq!(key_info.public_key.unwrap(), public_key);

    // List keys - check that our key is in the list
    let keys = storage::list_keys().unwrap();
    let our_key = keys.iter().find(|k| k.label == label);
    assert!(our_key.is_some());
    assert_eq!(our_key.unwrap().label, label);

    // Delete the key
    storage::delete_key(&label).unwrap();
    assert!(!storage::key_exists(&label).unwrap());

    // Verify key is gone from list
    let keys_after_delete = storage::list_keys().unwrap();
    let our_key_after_delete = keys_after_delete.iter().find(|k| k.label == label);
    assert!(our_key_after_delete.is_none());
}

#[test]
fn test_multiple_keys_management() {
    let env = StorageTestEnv::new().unwrap();
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

    // Save multiple keys
    for (i, label) in labels.iter().enumerate() {
        let data = env.create_test_key_data(512 + i * 100);
        let public_key = format!("age1testpublickey{}", i);

        let path = storage::save_encrypted_key(label, &data, Some(&public_key)).unwrap();
        saved_paths.push(path);
    }

    // List all keys - check that our keys are in the list
    let keys = storage::list_keys().unwrap();
    for label in labels.iter() {
        let found_key = keys.iter().find(|k| k.label == *label);
        assert!(found_key.is_some(), "Key {} should be in the list", label);
    }

    // Verify keys are sorted by creation time (newest first)
    // Find our keys in the sorted list
    let our_keys: Vec<_> = keys.iter().filter(|k| labels.contains(&k.label)).collect();
    assert_eq!(our_keys.len(), 3);

    // Check that our keys are sorted by creation time (newest first)
    for i in 0..our_keys.len() - 1 {
        assert!(our_keys[i].created_at >= our_keys[i + 1].created_at);
    }

    // Load each key
    for (i, label) in labels.iter().enumerate() {
        let data = env.create_test_key_data(512 + i * 100);
        let loaded_data = storage::load_encrypted_key(label).unwrap();
        assert_eq!(loaded_data, data);
    }

    // Delete keys one by one
    for label in labels.iter() {
        storage::delete_key(label).unwrap();
    }

    // Verify all our keys are gone
    let keys_after_delete = storage::list_keys().unwrap();
    for label in labels.iter() {
        let found_key = keys_after_delete.iter().find(|k| k.label == *label);
        assert!(found_key.is_none(), "Key {} should be deleted", label);
    }
}

#[test]
fn test_key_label_validation() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let test_cases = [
        ("normal-key", true),
        ("my_key_123", true),
        ("key-with-dashes", true),
        ("key/with/slash", false),
        ("key\\with\\backslash", false),
        ("key..with..dots", false),
        ("", false),
        ("   ", false),
        ("key*with*stars", false),
        ("key?with?question", false),
        ("key\"with\"quotes", false),
    ];

    for (label, should_succeed) in test_cases {
        let data = env.create_test_key_data(100);
        let result = storage::save_encrypted_key(label, &data, None);

        if should_succeed {
            assert!(result.is_ok(), "Label '{}' should be valid", label);
            // Clean up
            let _ = storage::delete_key(label);
        } else {
            assert!(result.is_err(), "Label '{}' should be invalid", label);
            if let Err(StorageError::InvalidLabel(_)) = result {
                // Expected error
            } else {
                panic!("Expected InvalidLabel error for label '{}'", label);
            }
        }
    }
}

#[test]
fn test_key_already_exists_error() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("duplicate-key-{}", timestamp);
    let data1 = env.create_test_key_data(100);
    let data2 = env.create_test_key_data(200);

    // Save first key
    storage::save_encrypted_key(&label, &data1, None).unwrap();

    // Try to save second key with same label
    let result = storage::save_encrypted_key(&label, &data2, None);
    assert!(result.is_err());

    if let Err(StorageError::KeyAlreadyExists(_)) = result {
        // Expected error
    } else {
        panic!("Expected KeyAlreadyExists error");
    }

    // Clean up
    storage::delete_key(&label).unwrap();
}

#[test]
fn test_key_not_found_error() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("non-existent-key-{}", timestamp);

    // Try to load non-existent key
    let result = storage::load_encrypted_key(&label);
    assert!(result.is_err());

    if let Err(StorageError::KeyNotFound(_)) = result {
        // Expected error
    } else {
        panic!("Expected KeyNotFound error");
    }

    // Try to delete non-existent key
    let result = storage::delete_key(&label);
    assert!(result.is_err());

    if let Err(StorageError::KeyNotFound(_)) = result {
        // Expected error
    } else {
        panic!("Expected KeyNotFound error");
    }
}

#[test]
fn test_key_metadata_persistence() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("metadata-test-key-{}", timestamp);
    let data = env.create_test_key_data(100);
    let public_key = "age1testpublickey";

    // Save key with metadata
    storage::save_encrypted_key(&label, &data, Some(public_key)).unwrap();

    // Get key info
    let key_info = storage::get_key_info(&label).unwrap();
    assert_eq!(key_info.label, label);
    assert_eq!(key_info.public_key.unwrap(), public_key);
    assert!(key_info.last_accessed.is_none());

    // Load key (should update last_accessed)
    storage::load_encrypted_key(&label).unwrap();

    // Get updated key info
    let updated_key_info = storage::get_key_info(&label).unwrap();
    assert!(updated_key_info.last_accessed.is_some());
    assert!(updated_key_info.last_accessed.unwrap() > key_info.created_at);

    // Clean up
    storage::delete_key(&label).unwrap();
}

#[test]
fn test_large_key_storage() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("large-key-{}", timestamp);
    let large_data = env.create_test_key_data(1024 * 1024); // 1MB

    // Save large key
    let start = std::time::Instant::now();
    storage::save_encrypted_key(&label, &large_data, None).unwrap();
    let save_time = start.elapsed();

    // Load large key
    let start = std::time::Instant::now();
    let loaded_data = storage::load_encrypted_key(&label).unwrap();
    let load_time = start.elapsed();

    // Verify data integrity
    assert_eq!(loaded_data, large_data);

    // Performance assertions (should be reasonable)
    assert!(
        save_time.as_millis() < 1000,
        "Save took too long: {:?}",
        save_time
    );
    assert!(
        load_time.as_millis() < 1000,
        "Load took too long: {:?}",
        load_time
    );

    // Clean up
    storage::delete_key(&label).unwrap();
}

#[test]
fn test_concurrent_key_access() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let label = format!("concurrent-key-{}", timestamp);
    let data = env.create_test_key_data(100);

    // Save key
    storage::save_encrypted_key(&label, &data, None).unwrap();

    // Simulate concurrent access (basic test)
    let mut handles = Vec::new();

    for _i in 0..5 {
        let label = label.clone();
        let handle = std::thread::spawn(move || storage::load_encrypted_key(&label).unwrap());
        handles.push(handle);
    }

    // Wait for all threads to complete
    for handle in handles {
        let loaded_data = handle.join().unwrap();
        assert_eq!(loaded_data, data);
    }

    // Clean up
    storage::delete_key(&label).unwrap();
}

#[test]
fn test_storage_error_recovery() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    // Test that recoverable errors are properly identified
    let io_error = StorageError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "test"));
    assert!(io_error.is_recoverable());

    // Test that security errors are properly identified
    let security_error = StorageError::PathTraversal;
    assert!(!security_error.is_recoverable());
    assert!(security_error.is_security_error());

    let invalid_label = StorageError::InvalidLabel("test".to_string());
    assert!(!invalid_label.is_recoverable());
    assert!(invalid_label.is_security_error());
}

#[test]
fn test_storage_directory_structure() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    // Verify directory structure is created correctly
    let app_dir = storage::get_application_directory().unwrap();
    let keys_dir = storage::get_keys_directory().unwrap();
    let logs_dir = storage::get_logs_directory().unwrap();

    assert!(app_dir.exists());
    assert!(app_dir.is_dir());
    assert!(keys_dir.exists());
    assert!(keys_dir.is_dir());
    assert!(logs_dir.exists());
    assert!(logs_dir.is_dir());

    // Verify keys_dir is a subdirectory of app_dir
    assert!(keys_dir.starts_with(&app_dir));
    assert!(logs_dir.starts_with(&app_dir));
}

#[test]
fn test_storage_permissions() {
    let env = StorageTestEnv::new().unwrap();
    mock_directories_for_test(&env.app_dir);

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let label = "permissions-test";
        let data = env.create_test_key_data(100);

        // Save key
        storage::save_encrypted_key(label, &data, None).unwrap();

        // Check key file permissions
        let key_path = storage::get_key_file_path(label).unwrap();
        let metadata = fs::metadata(&key_path).unwrap();
        let mode = metadata.permissions().mode();
        assert_eq!(mode & 0o777, 0o600, "Key file should have 600 permissions");

        // Check metadata file permissions
        let meta_path = storage::get_key_metadata_path(label).unwrap();
        let metadata = fs::metadata(&meta_path).unwrap();
        let mode = metadata.permissions().mode();
        assert_eq!(
            mode & 0o777,
            0o600,
            "Metadata file should have 600 permissions"
        );

        // Clean up
        storage::delete_key(label).unwrap();
    }
}
