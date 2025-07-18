//! Crypto Module Integration Tests
//!
//! Comprehensive test suite for the crypto module including:
//! - Key generation and validation
//! - Encryption/decryption operations
//! - Passphrase protection
//! - Security edge cases
//! - Performance with large data

use barqly_vault_lib::crypto::{
    decrypt_data, decrypt_private_key, encrypt_data, encrypt_private_key, generate_keypair,
};
use secrecy::SecretString;

#[test]
fn test_keypair_generation() {
    let keypair = generate_keypair().unwrap();

    // Verify public key format (age1...)
    assert!(keypair.public_key.as_str().starts_with("age1"));

    // Verify private key is properly wrapped
    let private_key_str = keypair.private_key.expose_secret();
    assert!(private_key_str.starts_with("AGE-SECRET-KEY-"));
}

#[test]
fn test_key_encryption_decryption() {
    // Generate keypair
    let keypair = generate_keypair().unwrap();

    // Encrypt private key with passphrase
    let passphrase = SecretString::from("test-passphrase-123".to_string());
    let encrypted_key = encrypt_private_key(&keypair.private_key, passphrase.clone()).unwrap();

    // Decrypt with same passphrase - should succeed
    let decrypted_key = decrypt_private_key(&encrypted_key, passphrase).unwrap();
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted_key.expose_secret()
    );
}

#[test]
fn test_wrong_passphrase_decryption() {
    // Generate keypair
    let keypair = generate_keypair().unwrap();

    // Encrypt private key with passphrase
    let passphrase = SecretString::from("test-passphrase-123".to_string());
    let encrypted_key = encrypt_private_key(&keypair.private_key, passphrase).unwrap();

    // Decrypt with wrong passphrase - should fail
    let wrong_passphrase = SecretString::from("wrong-passphrase".to_string());
    let result = decrypt_private_key(&encrypted_key, wrong_passphrase);
    assert!(result.is_err());
}

#[test]
fn test_data_encryption_decryption() {
    // Test with small data (< 1KB)
    let test_data = b"Hello, this is a test message for encryption!";

    let keypair = generate_keypair().unwrap();

    // Encrypt data
    let encrypted = encrypt_data(test_data, &keypair.public_key).unwrap();

    // Decrypt data
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Verify round-trip encryption/decryption
    assert_eq!(test_data, decrypted.as_slice());
}

#[test]
fn test_large_data_encryption_decryption() {
    // Test with medium data (1MB)
    let test_data: Vec<u8> = (0..1024 * 1024).map(|i| (i % 256) as u8).collect();

    let keypair = generate_keypair().unwrap();

    // Encrypt data
    let encrypted = encrypt_data(&test_data, &keypair.public_key).unwrap();

    // Decrypt data
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();

    // Verify round-trip encryption/decryption
    assert_eq!(test_data, decrypted);
}

#[test]
fn test_wrong_key_decryption() {
    // Generate two keypairs
    let keypair_a = generate_keypair().unwrap();
    let keypair_b = generate_keypair().unwrap();

    // Encrypt with key A
    let test_data = b"Secret message";
    let encrypted = encrypt_data(test_data, &keypair_a.public_key).unwrap();

    // Try to decrypt with key B
    let result = decrypt_data(&encrypted, &keypair_b.private_key);

    // Should fail with specific error
    assert!(result.is_err());
}

#[test]
fn test_memory_zeroization() {
    // Create private key in scope
    let keypair = generate_keypair().unwrap();
    let _private_key_str = keypair.private_key.expose_secret().to_string();

    // Let it drop
    drop(keypair);

    // Note: We can't easily verify memory zeroization in tests
    // but SecretString should handle this automatically
    // This test ensures the drop implementation doesn't panic
}

// Additional integration tests that benefit from being separate

#[test]
fn test_multiple_keypairs() {
    // Test that multiple keypairs are unique
    let keypair1 = generate_keypair().unwrap();
    let keypair2 = generate_keypair().unwrap();

    assert_ne!(keypair1.public_key.as_str(), keypair2.public_key.as_str());
    assert_ne!(
        keypair1.private_key.expose_secret(),
        keypair2.private_key.expose_secret()
    );
}

#[test]
fn test_public_key_display() {
    let keypair = generate_keypair().unwrap();
    let public_key_str = keypair.public_key.to_string();

    // Test Display trait implementation
    assert!(public_key_str.starts_with("age1"));
    assert_eq!(public_key_str, keypair.public_key.as_str());
}

#[test]
fn test_error_handling_integration() {
    // Test various error conditions in an integrated way

    // Test invalid public key
    let invalid_key = barqly_vault_lib::crypto::PublicKey::from("invalid-key".to_string());
    let test_data = b"test";
    let result = encrypt_data(test_data, &invalid_key);
    assert!(result.is_err());

    // Test empty data encryption
    let keypair = generate_keypair().unwrap();
    let empty_data: &[u8] = &[];
    let encrypted = encrypt_data(empty_data, &keypair.public_key).unwrap();
    let decrypted = decrypt_data(&encrypted, &keypair.private_key).unwrap();
    assert_eq!(empty_data, decrypted.as_slice());
}

#[test]
fn test_concurrent_key_generation() {
    // Test that key generation works correctly in concurrent scenarios
    use std::thread;

    let handles: Vec<_> = (0..10)
        .map(|_| {
            thread::spawn(|| {
                let keypair = generate_keypair().unwrap();
                (
                    keypair.public_key.to_string(),
                    keypair.private_key.expose_secret().to_string(),
                )
            })
        })
        .collect();

    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // All keys should be unique
    let public_keys: Vec<_> = results.iter().map(|(pub_key, _)| pub_key).collect();
    let private_keys: Vec<_> = results.iter().map(|(_, priv_key)| priv_key).collect();

    // Check uniqueness
    for i in 0..public_keys.len() {
        for j in (i + 1)..public_keys.len() {
            assert_ne!(public_keys[i], public_keys[j]);
            assert_ne!(private_keys[i], private_keys[j]);
        }
    }
}
