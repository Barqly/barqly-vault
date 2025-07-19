//! Unit tests for key management functions
//!
//! Tests individual key management operations in isolation:
//! - Key pair generation
//! - Private key encryption/decryption
//! - Passphrase validation
//! - Error conditions

use barqly_vault_lib::crypto::{
    decrypt_private_key, encrypt_private_key, generate_keypair, CryptoError,
};
use secrecy::SecretString;

#[test]
fn test_generate_keypair_creates_valid_keys() {
    // Arrange & Act
    let keypair = generate_keypair().unwrap();

    // Assert
    assert!(keypair.public_key.as_str().starts_with("age1"));
    assert!(keypair
        .private_key
        .expose_secret()
        .starts_with("AGE-SECRET-KEY-"));
}

#[test]
fn test_generate_keypair_creates_unique_keys() {
    // Arrange & Act
    let keypair1 = generate_keypair().unwrap();
    let keypair2 = generate_keypair().unwrap();

    // Assert
    assert_ne!(keypair1.public_key.as_str(), keypair2.public_key.as_str());
    assert_ne!(
        keypair1.private_key.expose_secret(),
        keypair2.private_key.expose_secret()
    );
}

#[test]
fn test_encrypt_private_key_with_valid_passphrase() {
    // Arrange
    let keypair = generate_keypair().unwrap();
    let passphrase = SecretString::from("test-passphrase-123".to_string());

    // Act
    let encrypted = encrypt_private_key(&keypair.private_key, passphrase).unwrap();

    // Assert
    assert!(!encrypted.is_empty());
    assert_ne!(encrypted, keypair.private_key.expose_secret().as_bytes());
}

#[test]
fn test_decrypt_private_key_with_correct_passphrase() {
    // Arrange
    let keypair = generate_keypair().unwrap();
    let passphrase = SecretString::from("test-passphrase-123".to_string());
    let encrypted = encrypt_private_key(&keypair.private_key, passphrase.clone()).unwrap();

    // Act
    let decrypted = decrypt_private_key(&encrypted, passphrase).unwrap();

    // Assert
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted.expose_secret()
    );
}

#[test]
fn test_decrypt_private_key_with_wrong_passphrase() {
    // Arrange
    let keypair = generate_keypair().unwrap();
    let correct_passphrase = SecretString::from("test-passphrase-123".to_string());
    let wrong_passphrase = SecretString::from("wrong-passphrase".to_string());
    let encrypted = encrypt_private_key(&keypair.private_key, correct_passphrase).unwrap();

    // Act
    let result = decrypt_private_key(&encrypted, wrong_passphrase);

    // Assert
    assert!(result.is_err());
    assert!(result.is_err());
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    // Arrange
    let keypair = generate_keypair().unwrap();
    let passphrase = SecretString::from("test-passphrase-123".to_string());

    // Act
    let encrypted = encrypt_private_key(&keypair.private_key, passphrase.clone()).unwrap();
    let decrypted = decrypt_private_key(&encrypted, passphrase).unwrap();

    // Assert
    assert_eq!(
        keypair.private_key.expose_secret(),
        decrypted.expose_secret()
    );
}

#[test]
fn test_public_key_display_format() {
    // Arrange & Act
    let keypair = generate_keypair().unwrap();
    let public_key_str = keypair.public_key.to_string();

    // Assert
    assert!(public_key_str.starts_with("age1"));
    assert_eq!(public_key_str, keypair.public_key.as_str());
}

#[test]
fn test_private_key_secret_wrapping() {
    // Arrange & Act
    let keypair = generate_keypair().unwrap();
    let private_key_str = keypair.private_key.expose_secret();

    // Assert
    assert!(private_key_str.starts_with("AGE-SECRET-KEY-"));
    assert!(private_key_str.len() > 50); // Should be a reasonable length
}

#[test]
fn test_concurrent_key_generation() {
    use std::thread;

    // Arrange
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

    // Act
    let results: Vec<_> = handles.into_iter().map(|h| h.join().unwrap()).collect();

    // Assert - All keys should be unique
    let public_keys: Vec<_> = results.iter().map(|(pub_key, _)| pub_key).collect();
    let private_keys: Vec<_> = results.iter().map(|(_, priv_key)| priv_key).collect();

    for i in 0..public_keys.len() {
        for j in (i + 1)..public_keys.len() {
            assert_ne!(public_keys[i], public_keys[j]);
            assert_ne!(private_keys[i], private_keys[j]);
        }
    }
}
