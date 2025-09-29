//! Unit tests for age operations functions
//!
//! Tests individual age encryption/decryption operations in isolation:
//! - Data encryption with public keys
//! - Data decryption with private keys
//! - Error handling for invalid keys/data
//! - Performance with different data sizes

use crate::common::cleanup::TestCleanup;
use barqly_vault_lib::crypto::{decrypt_data, encrypt_data, CryptoError};
use barqly_vault_lib::services::passphrase::generate_keypair;

#[test]
fn test_encrypt_data_with_valid_public_key() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"Hello, this is a test message for encryption!";

    // Act
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();

    // Assert
    assert!(!encrypted.is_empty());
    assert_ne!(encrypted, test_data);
}

#[test]
fn test_decrypt_data_with_correct_private_key() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"Hello, this is a test message for encryption!";
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();

    // Act
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(test_data, decrypted.as_slice());
}

#[test]
fn test_decrypt_data_with_wrong_private_key() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair_a = generate_keypair().unwrap();
    let keypair_b = generate_keypair().unwrap();
    let test_data = b"Secret message";
    let encrypted = encrypt_data(test_data, &keypair_a.public_key).unwrap();

    // Act
    let result = decrypt_data(&encrypted, &keypair_b.private_key);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        CryptoError::DecryptionFailed(_)
    ));
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"Hello, this is a test message for encryption!";

    // Act
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(test_data, decrypted.as_slice());
}

#[test]
fn test_encrypt_empty_data() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let empty_data: &[u8] = &[];

    // Act
    let encrypted = encrypt_data(empty_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(empty_data, decrypted.as_slice());
}

#[test]
fn test_encrypt_large_data() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let large_data: Vec<u8> = (0..1024 * 1024).map(|i| (i % 256) as u8).collect(); // 1MB

    // Act
    let encrypted = encrypt_data(&large_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(large_data, decrypted);
}

#[test]
fn test_encrypt_with_invalid_public_key() {
    // Arrange
    let invalid_key = barqly_vault_lib::crypto::PublicKey::from("invalid-key".to_string());
    let test_data = b"test";

    // Act
    let result = encrypt_data(test_data, &invalid_key);

    // Assert
    assert!(result.is_err());
    assert!(matches!(result.unwrap_err(), CryptoError::InvalidRecipient));
}

#[test]
fn test_decrypt_with_invalid_private_key() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"test";
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();
    let invalid_private_key = barqly_vault_lib::crypto::PrivateKey::from(
        secrecy::SecretString::from("AGE-SECRET-KEY-INVALID".to_string()),
    );

    // Act
    let result = decrypt_data(&encrypted, &invalid_private_key);

    // Assert
    assert!(result.is_err());
    assert!(matches!(
        result.unwrap_err(),
        CryptoError::InvalidKeyFormat(_)
    ));
}

#[test]
fn test_encrypt_decrypt_binary_data() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let binary_data: Vec<u8> = (0..1000).map(|i| (i % 256) as u8).collect();

    // Act
    let encrypted = encrypt_data(&binary_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(binary_data, decrypted);
}

#[test]
fn test_encrypt_decrypt_unicode_data() {
    // Arrange
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let unicode_data = "Hello, 世界! 🌍".as_bytes();

    // Act
    let encrypted = encrypt_data(unicode_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Assert
    assert_eq!(unicode_data, decrypted.as_slice());
}

#[test]
fn test_encryption_operations_are_deterministic() {
    // Test that encryption operations produce consistent results
    let _cleanup = TestCleanup::new();
    let keypair = generate_keypair().unwrap();
    let test_data = b"deterministic test data";

    let encrypted1 = encrypt_data(test_data, &keypair.public_key).unwrap();
    let encrypted2 = encrypt_data(test_data, &keypair.public_key).unwrap();

    // Note: Age encryption is not deterministic, so encrypted data will be different
    // but both should decrypt to the same original data
    let decrypted1 = decrypt_data(&encrypted1, &keypair.private_key).unwrap();
    let decrypted2 = decrypt_data(&encrypted2, &keypair.private_key).unwrap();

    assert_eq!(test_data, decrypted1.as_slice());
    assert_eq!(test_data, decrypted2.as_slice());
}
