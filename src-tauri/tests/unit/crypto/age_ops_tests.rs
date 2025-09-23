//! Unit tests for age operations functions using the new test framework
//!
//! This module demonstrates the new test framework features:
//! - Test-cases-as-documentation with descriptive names
//! - Parallel-safe test execution
//! - Enhanced assertions with better error messages
//! - Test data factories for consistent test data
//! - Performance measurement and validation
//! - Proper integration with hierarchical test structure

use crate::common::fixtures::CryptoFixtures;
use crate::common::helpers::{PerformanceHelper, TestAssertions};
use barqly_vault_lib::crypto::{CryptoError, decrypt_data, encrypt_data};
use rstest::*;

// ============================================================================
// ENCRYPTION TESTS
// ============================================================================

#[rstest]
#[case("valid_public_key", "Hello, this is a test message for encryption!")]
#[case("empty_data", "")]
#[case("unicode_data", "Hello, 世界! 🌍")]
fn should_encrypt_data_with_valid_public_key(#[case] test_name: &str, #[case] test_data: &str) {
    // Given: A valid key pair and test data
    let keypair = CryptoFixtures::create_test_key_pair("test_encryption");
    let data_bytes = test_data.as_bytes();

    // When: Encrypting the data with the public key
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(data_bytes, &keypair.public_key),
        &format!("Encryption should succeed for {test_name}"),
    );

    // Then: The encrypted data should be different from original and not empty
    assert!(
        !encrypted.is_empty(),
        "Encrypted data should not be empty for {test_name}"
    );
    assert_ne!(
        encrypted, data_bytes,
        "Encrypted data should differ from original for {test_name}"
    );
}

#[rstest]
#[case(1024, "1KB")]
#[case(1024 * 1024, "1MB")]
#[case(10 * 1024 * 1024, "10MB")]
fn should_encrypt_large_data_within_performance_target(
    #[case] size_bytes: usize,
    #[case] size_label: &str,
) {
    // Given: A valid key pair and large test data
    let keypair = CryptoFixtures::create_test_key_pair("test_large_encryption");
    let large_data: Vec<u8> = (0..size_bytes).map(|i| (i % 256) as u8).collect();

    // When: Encrypting large data with performance measurement
    let encrypted = PerformanceHelper::assert_within_time_limit(
        || encrypt_data(&large_data, &keypair.public_key).unwrap(),
        std::time::Duration::from_secs(30), // 30 second target for large files
        &format!("Large data encryption should complete within time limit for {size_label}"),
    );

    // Then: The encrypted data should be valid
    assert!(
        !encrypted.is_empty(),
        "Encrypted large data should not be empty for {size_label}"
    );
}

#[test]
fn should_fail_encryption_with_invalid_public_key() {
    // Given: An invalid public key and test data
    let invalid_key = barqly_vault_lib::crypto::PublicKey::from("invalid-key".to_string());
    let test_data = b"test data";

    // When: Attempting to encrypt with invalid key
    let result = encrypt_data(test_data, &invalid_key);

    // Then: Encryption should fail with appropriate error
    let error = TestAssertions::assert_err(result, "Encryption with invalid key should fail");
    assert!(
        matches!(error, CryptoError::InvalidRecipient),
        "Should get InvalidRecipient error for invalid public key"
    );
}

// ============================================================================
// DECRYPTION TESTS
// ============================================================================

#[rstest]
#[case("simple_text", "Hello, this is a test message for encryption!")]
#[case("empty_data", "")]
#[case("binary_data", &format!("Binary data: {}", String::from_utf8_lossy(&(0..1000).map(|i| (i % 256) as u8).collect::<Vec<u8>>())))]
fn should_decrypt_data_with_correct_private_key(#[case] test_name: &str, #[case] test_data: &str) {
    // Given: A valid key pair and encrypted data
    let keypair = CryptoFixtures::create_test_key_pair("test_decryption");
    let data_bytes = test_data.as_bytes();
    let encrypted = encrypt_data(data_bytes, &keypair.public_key).unwrap();

    // When: Decrypting the data with the correct private key
    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        &format!("Decryption should succeed for {test_name}"),
    );

    // Then: The decrypted data should match the original
    assert_eq!(
        data_bytes,
        decrypted.as_slice(),
        "Decrypted data should match original for {test_name}"
    );
}

#[test]
fn should_fail_decryption_with_wrong_private_key() {
    // Given: Two different key pairs and encrypted data
    let keypair_a = CryptoFixtures::create_test_key_pair("keypair_a");
    let keypair_b = CryptoFixtures::create_test_key_pair("keypair_b");
    let test_data = b"Secret message";
    let encrypted = encrypt_data(test_data, &keypair_a.public_key).unwrap();

    // When: Attempting to decrypt with wrong private key
    let result = decrypt_data(&encrypted, &keypair_b.private_key);

    // Then: Decryption should fail with appropriate error
    let error = TestAssertions::assert_err(result, "Decryption with wrong key should fail");
    assert!(
        matches!(error, CryptoError::DecryptionFailed(_)),
        "Should get DecryptionFailed error for wrong private key"
    );
}

#[test]
fn should_fail_decryption_with_invalid_private_key() {
    // Given: A valid key pair, encrypted data, and invalid private key
    let keypair = CryptoFixtures::create_test_key_pair("test_invalid_decryption");
    let test_data = b"test data";
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();
    let invalid_private_key = barqly_vault_lib::crypto::PrivateKey::from(
        secrecy::SecretString::from("AGE-SECRET-KEY-INVALID".to_string()),
    );

    // When: Attempting to decrypt with invalid private key
    let result = decrypt_data(&encrypted, &invalid_private_key);

    // Then: Decryption should fail with appropriate error
    let error = TestAssertions::assert_err(result, "Decryption with invalid key should fail");
    assert!(
        matches!(error, CryptoError::InvalidKeyFormat(_)),
        "Should get InvalidKeyFormat error for invalid private key"
    );
}

// ============================================================================
// ROUNDTRIP TESTS
// ============================================================================

#[rstest]
#[case("simple_text", "Hello, this is a test message for encryption!")]
#[case("unicode_text", "Hello, 世界! 🌍")]
#[case("empty_data", "")]
#[case("large_binary", &format!("Large binary: {}", String::from_utf8_lossy(&(0..10000).map(|i| (i % 256) as u8).collect::<Vec<u8>>())))]
fn should_complete_encrypt_decrypt_roundtrip_successfully(
    #[case] test_name: &str,
    #[case] test_data: &str,
) {
    // Given: A valid key pair and test data
    let keypair = CryptoFixtures::create_test_key_pair("test_roundtrip");
    let data_bytes = test_data.as_bytes();

    // When: Performing complete encrypt-decrypt roundtrip
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(data_bytes, &keypair.public_key),
        &format!("Encryption should succeed in roundtrip for {test_name}"),
    );

    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        &format!("Decryption should succeed in roundtrip for {test_name}"),
    );

    // Then: The final result should match the original data
    assert_eq!(
        data_bytes,
        decrypted.as_slice(),
        "Roundtrip should preserve original data for {test_name}"
    );
}

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

#[test]
fn should_encrypt_data_within_performance_target() {
    // Given: A valid key pair and test data
    let keypair = CryptoFixtures::create_test_key_pair("test_performance");
    let test_data = b"Performance test data";

    // When: Measuring encryption performance
    let (encrypted, _duration) =
        PerformanceHelper::measure_time(|| encrypt_data(test_data, &keypair.public_key).unwrap());

    // Then: Encryption should complete within performance target
    PerformanceHelper::assert_within_time_limit(
        || encrypt_data(test_data, &keypair.public_key).unwrap(),
        std::time::Duration::from_millis(100), // 100ms target for small data
        "Encryption should complete within performance target",
    );

    // And: The result should be valid
    assert!(!encrypted.is_empty(), "Encrypted data should not be empty");
}

// ============================================================================
// DETERMINISTIC BEHAVIOR TESTS
// ============================================================================

#[test]
fn should_produce_consistent_encryption_results() {
    // Given: A valid key pair and test data
    let keypair = CryptoFixtures::create_test_key_pair("test_deterministic");
    let test_data = b"deterministic test data";

    // When: Encrypting the same data multiple times
    let encrypted1 = encrypt_data(test_data, &keypair.public_key).unwrap();
    let encrypted2 = encrypt_data(test_data, &keypair.public_key).unwrap();

    // Then: Both encrypted results should decrypt to the same original data
    // Note: Age encryption is not deterministic, so encrypted data will be different
    // but both should decrypt to the same original data
    let decrypted1 = decrypt_data(&encrypted1, &keypair.private_key).unwrap();
    let decrypted2 = decrypt_data(&encrypted2, &keypair.private_key).unwrap();

    assert_eq!(
        test_data,
        decrypted1.as_slice(),
        "First decryption should match original"
    );
    assert_eq!(
        test_data,
        decrypted2.as_slice(),
        "Second decryption should match original"
    );
    assert_eq!(
        decrypted1, decrypted2,
        "Both decryptions should produce identical results"
    );
}
