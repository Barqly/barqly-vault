//! Unit tests for key management functions using the new test framework
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
use barqly_vault_lib::crypto::{
    decrypt_private_key, encrypt_private_key, generate_keypair, CryptoError,
};
use rstest::*;
use secrecy::SecretString;

// ============================================================================
// KEY GENERATION TESTS
// ============================================================================

#[test]
fn should_generate_valid_key_pair_with_correct_format() {
    // Given: No prerequisites needed

    // When: Generating a new key pair
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Key pair generation should succeed");

    // Then: The keys should have correct format
    assert!(
        keypair.public_key.as_str().starts_with("age1"),
        "Public key should start with 'age1' prefix"
    );
    assert!(
        keypair
            .private_key
            .expose_secret()
            .starts_with("AGE-SECRET-KEY-"),
        "Private key should start with 'AGE-SECRET-KEY-' prefix"
    );
}

#[test]
fn should_generate_unique_key_pairs_on_multiple_calls() {
    // Given: No prerequisites needed

    // When: Generating multiple key pairs
    let keypair1 = TestAssertions::assert_ok(
        generate_keypair(),
        "First key pair generation should succeed",
    );
    let keypair2 = TestAssertions::assert_ok(
        generate_keypair(),
        "Second key pair generation should succeed",
    );

    // Then: The key pairs should be unique
    assert_ne!(
        keypair1.public_key.as_str(),
        keypair2.public_key.as_str(),
        "Public keys should be unique"
    );
    assert_ne!(
        keypair1.private_key.expose_secret(),
        keypair2.private_key.expose_secret(),
        "Private keys should be unique"
    );
}

#[test]
fn should_generate_keys_within_performance_target() {
    // Given: No prerequisites needed

    // When: Generating a key pair with performance measurement
    let keypair = PerformanceHelper::assert_within_time_limit(
        || generate_keypair().unwrap(),
        std::time::Duration::from_secs(5), // 5 second target for key generation
        "Key pair generation should complete within time limit",
    );

    // Then: The generated key pair should be valid
    assert!(
        keypair.public_key.as_str().starts_with("age1"),
        "Generated public key should have correct format"
    );
    assert!(
        keypair
            .private_key
            .expose_secret()
            .starts_with("AGE-SECRET-KEY-"),
        "Generated private key should have correct format"
    );
}

#[test]
fn should_generate_keys_concurrently_without_conflicts() {
    use std::thread;

    // Given: No prerequisites needed

    // When: Generating keys concurrently in multiple threads
    let handles: Vec<_> = (0..10)
        .map(|_| {
            thread::spawn(|| {
                let keypair = TestAssertions::assert_ok(
                    generate_keypair(),
                    "Concurrent key generation should succeed",
                );
                (
                    keypair.public_key.to_string(),
                    keypair.private_key.expose_secret().to_string(),
                )
            })
        })
        .collect();

    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // Then: All generated keys should be unique
    let public_keys: Vec<_> = results.iter().map(|(pub_key, _)| pub_key).collect();
    let private_keys: Vec<_> = results.iter().map(|(_, priv_key)| priv_key).collect();

    for i in 0..public_keys.len() {
        for j in (i + 1)..public_keys.len() {
            assert_ne!(
                public_keys[i], public_keys[j],
                "Concurrently generated public keys should be unique"
            );
            assert_ne!(
                private_keys[i], private_keys[j],
                "Concurrently generated private keys should be unique"
            );
        }
    }
}

// ============================================================================
// PRIVATE KEY ENCRYPTION TESTS
// ============================================================================

#[rstest]
#[case("simple_passphrase", "test-passphrase-123")]
#[case("complex_passphrase", "MyS3cur3P@ssw0rd!")]
#[case("unicode_passphrase", "密码123!@#")]
fn should_encrypt_private_key_with_valid_passphrase(
    #[case] test_name: &str,
    #[case] passphrase: &str,
) {
    // Given: A valid key pair and passphrase
    let keypair = CryptoFixtures::create_test_key_pair("test_encryption");
    let passphrase = SecretString::from(passphrase.to_string());

    // When: Encrypting the private key with the passphrase
    let encrypted = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, passphrase),
        &format!("Private key encryption should succeed for {test_name}"),
    );

    // Then: The encrypted data should be different from original and not empty
    assert!(
        !encrypted.is_empty(),
        "Encrypted private key should not be empty for {test_name}"
    );
    assert_ne!(
        encrypted,
        keypair.private_key.expose_secret().as_bytes(),
        "Encrypted private key should differ from original for {test_name}"
    );
}

#[test]
fn should_encrypt_private_key_with_empty_passphrase() {
    // Given: A valid key pair and empty passphrase
    let keypair = CryptoFixtures::create_test_key_pair("test_empty_passphrase");
    let empty_passphrase = SecretString::from("".to_string());

    // When: Attempting to encrypt with empty passphrase
    let result = encrypt_private_key(&keypair.private_key, empty_passphrase);

    // Then: Encryption should succeed (age allows empty passphrases)
    let encrypted =
        TestAssertions::assert_ok(result, "Encryption with empty passphrase should succeed");

    // And: The encrypted data should be different from original and not empty
    assert!(
        !encrypted.is_empty(),
        "Encrypted private key should not be empty"
    );
    assert_ne!(
        encrypted,
        keypair.private_key.expose_secret().as_bytes(),
        "Encrypted private key should differ from original"
    );
}

// ============================================================================
// PRIVATE KEY DECRYPTION TESTS
// ============================================================================

#[rstest]
#[case("simple_passphrase", "test-passphrase-123")]
#[case("complex_passphrase", "MyS3cur3P@ssw0rd!")]
#[case("unicode_passphrase", "密码123!@#")]
fn should_decrypt_private_key_with_correct_passphrase(
    #[case] test_name: &str,
    #[case] passphrase: &str,
) {
    // Given: A valid key pair, passphrase, and encrypted private key
    let keypair = CryptoFixtures::create_test_key_pair("test_decryption");
    let passphrase = SecretString::from(passphrase.to_string());
    let encrypted = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, passphrase.clone()),
        &format!("Private key encryption should succeed for {test_name}"),
    );

    // When: Decrypting the private key with the correct passphrase
    let decrypted = TestAssertions::assert_ok(
        decrypt_private_key(&encrypted, passphrase),
        &format!("Private key decryption should succeed for {test_name}"),
    );

    // Then: The decrypted private key should match the original
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted.expose_secret(),
        "Decrypted private key should match original for {test_name}"
    );
}

#[test]
fn should_fail_decryption_with_wrong_passphrase() {
    // Given: A valid key pair, correct passphrase, wrong passphrase, and encrypted private key
    let keypair = CryptoFixtures::create_test_key_pair("test_wrong_passphrase");
    let correct_passphrase = SecretString::from("test-passphrase-123".to_string());
    let wrong_passphrase = SecretString::from("wrong-passphrase".to_string());
    let encrypted = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, correct_passphrase),
        "Private key encryption should succeed",
    );

    // When: Attempting to decrypt with wrong passphrase
    let result = decrypt_private_key(&encrypted, wrong_passphrase);

    // Then: Decryption should fail with appropriate error
    assert!(
        result.is_err(),
        "Decryption with wrong passphrase should fail"
    );
    if let Err(error) = result {
        assert!(
            matches!(error, CryptoError::WrongPassphrase),
            "Should get WrongPassphrase error for wrong passphrase"
        );
    }
}

#[test]
fn should_fail_decryption_with_corrupted_data() {
    // Given: Corrupted encrypted data and valid passphrase
    let corrupted_data = b"this is not valid encrypted data";
    let passphrase = SecretString::from("test-passphrase-123".to_string());

    // When: Attempting to decrypt corrupted data
    let result = decrypt_private_key(corrupted_data, passphrase);

    // Then: Decryption should fail with appropriate error
    assert!(result.is_err(), "Decryption of corrupted data should fail");
    if let Err(error) = result {
        assert!(
            matches!(error, CryptoError::DecryptionFailed(_)),
            "Should get DecryptionFailed error for corrupted data"
        );
    }
}

// ============================================================================
// ROUNDTRIP TESTS
// ============================================================================

#[rstest]
#[case("simple_passphrase", "test-passphrase-123")]
#[case("complex_passphrase", "MyS3cur3P@ssw0rd!")]
#[case("unicode_passphrase", "密码123!@#")]
fn should_complete_encrypt_decrypt_roundtrip_successfully(
    #[case] test_name: &str,
    #[case] passphrase: &str,
) {
    // Given: A valid key pair and passphrase
    let keypair = CryptoFixtures::create_test_key_pair("test_roundtrip");
    let passphrase = SecretString::from(passphrase.to_string());

    // When: Performing complete encrypt-decrypt roundtrip
    let encrypted = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, passphrase.clone()),
        &format!("Encryption should succeed in roundtrip for {test_name}"),
    );

    let decrypted = TestAssertions::assert_ok(
        decrypt_private_key(&encrypted, passphrase),
        &format!("Decryption should succeed in roundtrip for {test_name}"),
    );

    // Then: The final result should match the original private key
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted.expose_secret(),
        "Roundtrip should preserve original private key for {test_name}"
    );
}

// ============================================================================
// KEY FORMAT VALIDATION TESTS
// ============================================================================

#[test]
fn should_display_public_key_in_correct_format() {
    // Given: A valid key pair
    let keypair = CryptoFixtures::create_test_key_pair("test_display_format");

    // When: Converting public key to string
    let public_key_str = keypair.public_key.to_string();

    // Then: The public key should have correct format
    assert!(
        public_key_str.starts_with("age1"),
        "Public key string should start with 'age1' prefix"
    );
    assert_eq!(
        public_key_str,
        keypair.public_key.as_str(),
        "Public key string should match as_str() output"
    );
}

#[test]
fn should_wrap_private_key_in_secret_type() {
    // Given: A valid key pair
    let keypair = CryptoFixtures::create_test_key_pair("test_secret_wrapping");

    // When: Accessing the private key secret
    let private_key_str = keypair.private_key.expose_secret();

    // Then: The private key should have correct format and length
    assert!(
        private_key_str.starts_with("AGE-SECRET-KEY-"),
        "Private key should start with 'AGE-SECRET-KEY-' prefix"
    );
    assert!(
        private_key_str.len() > 50,
        "Private key should have reasonable length (got {} chars)",
        private_key_str.len()
    );
}
