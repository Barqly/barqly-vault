//! Smoke tests for post-deployment validation
//!
//! These tests verify critical functionality after deployment:
//! - Core encryption/decryption works
//! - File operations are functional
//! - Storage operations work
//! - Logging is operational
//!
//! These are minimal, fast tests that validate the critical path
//! without running full test suites.

use crate::common::cleanup::TestCleanup;
use barqly_vault_lib::{
    crypto::{decrypt_data, encrypt_data, generate_keypair},
    file_ops::{FileSelection, FileOpsConfig},
    storage,
};

#[test]
fn test_critical_encryption_path() {
    // Test that core encryption functionality works after deployment
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"critical encryption test";
    
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();
    
    assert_eq!(test_data, decrypted.as_slice());
}

#[test]
fn test_critical_file_operations() {
    // Test that basic file operations work
    let config = FileOpsConfig::default();
    
    // Test that we can create a file selection
    let test_files = vec![std::path::PathBuf::from("/tmp/test.txt")];
    let selection = FileSelection::Files(test_files);
    
    assert_eq!(selection.count(), 1);
    assert!(!selection.is_empty());
}

#[test]
fn test_critical_storage_operations() {
    // Test that storage module can be initialized
    let result = storage::get_application_directory();
    assert!(result.is_ok());
}

#[test]
fn test_critical_logging_initialization() {
    // Test that logging can be initialized
    let result = barqly_vault_lib::logging::init_logging(barqly_vault_lib::logging::LogLevel::Info);
    assert!(result.is_ok());
}

#[test]
fn test_critical_crypto_key_generation() {
    // Test that key generation works
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    
    assert!(keypair.public_key.as_str().starts_with("age1"));
    assert!(keypair.private_key.expose_secret().starts_with("AGE-SECRET-KEY-"));
}

#[test]
fn test_critical_error_handling() {
    // Test that error handling works correctly
    let invalid_key = barqly_vault_lib::crypto::PublicKey::from("invalid-key".to_string());
    let test_data = b"test";
    
    let result = encrypt_data(test_data, &invalid_key);
    assert!(result.is_err());
} 