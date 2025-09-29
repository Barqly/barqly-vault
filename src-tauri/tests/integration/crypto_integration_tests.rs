//! Crypto Module Integration Tests using the new test framework
//!
//! This module demonstrates comprehensive integration testing:
//! - End-to-end crypto workflows
//! - Cross-module interaction testing
//! - Performance validation with realistic data sizes
//! - Security edge case validation
//! - Concurrent operation testing
//! - Memory safety verification

use crate::common::cleanup::TestCleanup;
use crate::common::helpers::TestAssertions;
use barqly_vault_lib::crypto::{decrypt_data, encrypt_data};
use barqly_vault_lib::services::passphrase::{
    decrypt_private_key, encrypt_private_key, generate_keypair,
};
use rstest::*;
use secrecy::SecretString;
use std::thread;

// ============================================================================
// KEY GENERATION INTEGRATION TESTS
// ============================================================================

#[test]
fn should_generate_valid_keypair_with_correct_format() {
    // Given: A request to generate a new keypair and cleanup manager
    let _cleanup = TestCleanup::new();

    // When: Generating the keypair
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");

    // Then: The keypair should have correct format
    assert!(
        keypair.public_key.as_str().starts_with("age1"),
        "Public key should start with 'age1'"
    );

    let private_key_str = keypair.private_key.expose_secret();
    assert!(
        private_key_str.starts_with("AGE-SECRET-KEY-"),
        "Private key should start with 'AGE-SECRET-KEY-'"
    );
}

#[test]
fn should_generate_unique_keypairs() {
    // Given: Multiple keypair generation requests and cleanup manager
    let _cleanup = TestCleanup::new();

    // When: Generating multiple keypairs
    let keypair1 = TestAssertions::assert_ok(
        generate_keypair(),
        "First keypair generation should succeed",
    );
    let keypair2 = TestAssertions::assert_ok(
        generate_keypair(),
        "Second keypair generation should succeed",
    );

    // Then: The keypairs should be unique
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
fn should_display_public_key_correctly() {
    // Given: A generated keypair and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");

    // When: Converting public key to string
    let public_key_str = keypair.public_key.to_string();

    // Then: The string should have correct format
    assert!(
        public_key_str.starts_with("age1"),
        "Public key string should start with 'age1'"
    );
    assert_eq!(
        public_key_str,
        keypair.public_key.as_str(),
        "Display and as_str should return same value"
    );
}

// ============================================================================
// PRIVATE KEY ENCRYPTION/DECRYPTION TESTS
// ============================================================================

#[test]
fn should_encrypt_and_decrypt_private_key_with_passphrase() {
    // Given: A keypair and passphrase and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");
    let passphrase = SecretString::from("test-passphrase-123".to_string());

    // When: Encrypting and decrypting the private key
    let encrypted_key = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, passphrase.clone()),
        "Private key encryption should succeed",
    );
    let decrypted_key = TestAssertions::assert_ok(
        decrypt_private_key(&encrypted_key, passphrase),
        "Private key decryption should succeed",
    );

    // Then: The decrypted key should match the original
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted_key.expose_secret(),
        "Decrypted private key should match original"
    );
}

#[test]
fn should_reject_wrong_passphrase_for_private_key() {
    // Given: An encrypted private key and wrong passphrase and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");
    let correct_passphrase = SecretString::from("test-passphrase-123".to_string());
    let encrypted_key = TestAssertions::assert_ok(
        encrypt_private_key(&keypair.private_key, correct_passphrase),
        "Private key encryption should succeed",
    );
    let wrong_passphrase = SecretString::from("wrong-passphrase".to_string());

    // When: Attempting to decrypt with wrong passphrase
    let result = decrypt_private_key(&encrypted_key, wrong_passphrase);

    // Then: The operation should fail
    assert!(
        result.is_err(),
        "Private key decryption should fail with wrong passphrase"
    );
}

// ============================================================================
// DATA ENCRYPTION/DECRYPTION TESTS
// ============================================================================

#[rstest]
#[case(b"Hello, this is a test message for encryption!", "small_text")]
#[case(b"", "empty_data")]
#[case(b"Special chars: !@#$%^&*()_+-=[]{}|;':\",./<>?", "special_characters")]
fn should_encrypt_and_decrypt_small_data_correctly(
    #[case] test_data: &[u8],
    #[case] test_name: &str,
) {
    // Given: Test data and a keypair and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair = TestAssertions::assert_ok(
        generate_keypair(),
        &format!("Keypair generation should succeed for {test_name}"),
    );

    // When: Encrypting and decrypting the data
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(test_data, &keypair.public_key),
        &format!("Data encryption should succeed for {test_name}"),
    );
    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        &format!("Data decryption should succeed for {test_name}"),
    );

    // Then: The decrypted data should match the original
    assert_eq!(
        test_data,
        decrypted.as_slice(),
        "Decrypted data should match original for {test_name}"
    );
}

#[rstest]
#[case(1024, "1kb_data")]
#[case(1024 * 1024, "1mb_data")]
#[case(10 * 1024 * 1024, "10mb_data")]
fn should_encrypt_and_decrypt_large_data_correctly(
    #[case] size_bytes: usize,
    #[case] test_name: &str,
) {
    // Given: Large test data and a keypair and cleanup manager
    let _cleanup = TestCleanup::new();
    let test_data: Vec<u8> = (0..size_bytes).map(|i| (i % 256) as u8).collect();
    let keypair = TestAssertions::assert_ok(
        generate_keypair(),
        &format!("Keypair generation should succeed for {test_name}"),
    );

    // When: Encrypting and decrypting the data
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(&test_data, &keypair.public_key),
        &format!("Large data encryption should succeed for {test_name}"),
    );
    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        &format!("Large data decryption should succeed for {test_name}"),
    );

    // Then: The decrypted data should match the original
    assert_eq!(
        test_data, decrypted,
        "Decrypted large data should match original for {test_name}"
    );
}

#[test]
fn should_reject_decryption_with_wrong_key() {
    // Given: Data encrypted with one key and a different keypair and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair_a = TestAssertions::assert_ok(
        generate_keypair(),
        "First keypair generation should succeed",
    );
    let keypair_b = TestAssertions::assert_ok(
        generate_keypair(),
        "Second keypair generation should succeed",
    );
    let test_data = b"Secret message";
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(test_data, &keypair_a.public_key),
        "Data encryption should succeed",
    );

    // When: Attempting to decrypt with wrong key
    let result = decrypt_data(&encrypted, &keypair_b.private_key);

    // Then: The operation should fail
    assert!(
        result.is_err(),
        "Data decryption should fail with wrong key"
    );
}

// ============================================================================
// ERROR HANDLING INTEGRATION TESTS
// ============================================================================

#[test]
fn should_handle_invalid_public_key_gracefully() {
    // Given: An invalid public key
    let invalid_key = barqly_vault_lib::crypto::PublicKey::from("invalid-key".to_string());
    let test_data = b"test";

    // When: Attempting to encrypt with invalid key
    let result = encrypt_data(test_data, &invalid_key);

    // Then: The operation should fail gracefully
    assert!(
        result.is_err(),
        "Encryption should fail with invalid public key"
    );
}

#[test]
fn should_handle_empty_data_correctly() {
    // Given: Empty data and a valid keypair and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");
    let empty_data: &[u8] = &[];

    // When: Encrypting and decrypting empty data
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(empty_data, &keypair.public_key),
        "Empty data encryption should succeed",
    );
    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        "Empty data decryption should succeed",
    );

    // Then: The decrypted data should be empty
    assert_eq!(
        empty_data,
        decrypted.as_slice(),
        "Decrypted empty data should remain empty"
    );
}

// ============================================================================
// CONCURRENT OPERATION TESTS
// ============================================================================

#[test]
fn should_generate_unique_keys_in_concurrent_scenarios() {
    // Given: Multiple concurrent key generation requests and cleanup manager
    let _cleanup = TestCleanup::new();
    let num_threads = 10;

    // When: Generating keys concurrently
    let handles: Vec<_> = (0..num_threads)
        .map(|_| {
            thread::spawn(|| {
                let keypair = TestAssertions::assert_ok(
                    generate_keypair(),
                    "Concurrent keypair generation should succeed",
                );
                (
                    keypair.public_key.to_string(),
                    keypair.private_key.expose_secret().to_string(),
                )
            })
        })
        .collect();

    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // Then: All keys should be unique
    let public_keys: Vec<_> = results.iter().map(|(pub_key, _)| pub_key).collect();
    let private_keys: Vec<_> = results.iter().map(|(_, priv_key)| priv_key).collect();

    // Check uniqueness
    for i in 0..public_keys.len() {
        for j in (i + 1)..public_keys.len() {
            assert_ne!(
                public_keys[i], public_keys[j],
                "Concurrent public keys should be unique"
            );
            assert_ne!(
                private_keys[i], private_keys[j],
                "Concurrent private keys should be unique"
            );
        }
    }
}

#[test]
fn should_handle_concurrent_encryption_decryption() {
    // Given: Multiple keypairs and test data sets and cleanup manager
    let _cleanup = TestCleanup::new();
    let test_data_sets: Vec<Vec<u8>> = (0..5)
        .map(|i| format!("Test message {i}").into_bytes())
        .collect();

    // When: Encrypting and decrypting concurrently with separate keypairs
    let handles: Vec<_> = test_data_sets
        .into_iter()
        .map(|data| {
            thread::spawn(move || {
                let keypair = TestAssertions::assert_ok(
                    generate_keypair(),
                    "Keypair generation should succeed",
                );
                let encrypted = TestAssertions::assert_ok(
                    encrypt_data(&data, &keypair.public_key),
                    "Concurrent encryption should succeed",
                );
                let decrypted = TestAssertions::assert_ok(
                    decrypt_data(&encrypted, &keypair.private_key),
                    "Concurrent decryption should succeed",
                );
                (data, decrypted)
            })
        })
        .collect();

    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // Then: All operations should succeed and data should match
    for (original, decrypted) in results {
        assert_eq!(
            original, decrypted,
            "Concurrent encryption/decryption should preserve data"
        );
    }
}

// ============================================================================
// MEMORY SAFETY TESTS
// ============================================================================

#[test]
fn should_handle_private_key_drop_safely() {
    // Given: A keypair with private key in scope and cleanup manager
    let _cleanup = TestCleanup::new();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");
    let _private_key_str = keypair.private_key.expose_secret().to_string();

    // When: Dropping the keypair
    drop(keypair);

    // Then: The drop should complete without panicking
    // Note: We can't easily verify memory zeroization in tests
    // but SecretString should handle this automatically
    // Private key drop should complete safely
}

// ============================================================================
// PERFORMANCE VALIDATION TESTS
// ============================================================================

#[test]
fn should_encrypt_data_within_reasonable_time() {
    // Given: A 1MB test data set and cleanup manager
    let _cleanup = TestCleanup::new();
    let test_data: Vec<u8> = (0..1024 * 1024).map(|i| (i % 256) as u8).collect();
    let keypair =
        TestAssertions::assert_ok(generate_keypair(), "Keypair generation should succeed");

    // When: Measuring encryption time
    let start = std::time::Instant::now();
    let encrypted = TestAssertions::assert_ok(
        encrypt_data(&test_data, &keypair.public_key),
        "1MB data encryption should succeed",
    );
    let encryption_time = start.elapsed();

    // Then: Encryption should complete within reasonable time (< 5 seconds)
    assert!(
        encryption_time.as_secs() < 5,
        "1MB encryption should complete within 5 seconds, took: {encryption_time:?}"
    );

    // Verify decryption also works
    let decrypted = TestAssertions::assert_ok(
        decrypt_data(&encrypted, &keypair.private_key),
        "1MB data decryption should succeed",
    );
    assert_eq!(
        test_data, decrypted,
        "Decrypted 1MB data should match original"
    );
}
