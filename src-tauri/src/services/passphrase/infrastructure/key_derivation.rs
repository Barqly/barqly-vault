use age::secrecy::{ExposeSecret, SecretString};
use age::x25519::Identity;
use std::io::Write;
use std::str::FromStr;

use crate::crypto::{CryptoError, KeyPair, PrivateKey, PublicKey, Result};
use crate::prelude::*;

pub fn generate_keypair() -> Result<KeyPair> {
    let identity = Identity::generate();

    let public_key = identity.to_public().to_string();

    let private_key_str = identity.to_string();
    let private_key = SecretString::from(private_key_str);

    Ok(KeyPair {
        public_key: PublicKey::from(public_key),
        private_key: PrivateKey::from(private_key),
    })
}

pub fn encrypt_private_key(private_key: &PrivateKey, passphrase: SecretString) -> Result<Vec<u8>> {
    let private_key_str = private_key.expose_secret();

    let mut encrypted = Vec::new();

    let encryptor = age::Encryptor::with_user_passphrase(passphrase.clone());

    let mut writer = encryptor
        .wrap_output(&mut encrypted)
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    writer
        .write_all(private_key_str.as_bytes())
        .map_err(CryptoError::IoError)?;

    writer
        .finish()
        .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))?;

    Ok(encrypted)
}

pub fn decrypt_private_key(encrypted_key: &[u8], passphrase: SecretString) -> Result<PrivateKey> {
    debug_assert!(!encrypted_key.is_empty(), "Encrypted key cannot be empty");
    debug_assert!(
        !passphrase.expose_secret().is_empty(),
        "Passphrase cannot be empty"
    );

    trace!(
        encrypted_key_size = encrypted_key.len(),
        "Starting private key decryption with provided passphrase"
    );

    let decryptor = age::Decryptor::new(encrypted_key).map_err(|e| {
        error!(
            error = %e,
            encrypted_key_size = encrypted_key.len(),
            "Failed to create age decryptor - invalid encrypted key format"
        );
        CryptoError::DecryptionFailed(e.to_string())
    })?;

    debug!("Successfully created age decryptor, attempting passphrase validation");

    let mut decrypted = Vec::new();

    let identity = age::scrypt::Identity::new(passphrase.clone());
    let mut reader = decryptor
        .decrypt(std::iter::once(&identity as &dyn age::Identity))
        .map_err(|e| {
            debug!("Passphrase validation failed during age decryption: {}", e);
            CryptoError::WrongPassphrase
        })?;

    debug!("Passphrase validation successful, reading decrypted private key data");

    std::io::copy(&mut reader, &mut decrypted).map_err(|e| {
        error!(
            error = %e,
            "IO error while reading decrypted private key data"
        );
        CryptoError::IoError(e)
    })?;

    debug!(
        decrypted_size = decrypted.len(),
        "Successfully read decrypted private key data"
    );

    let private_key_str = String::from_utf8(decrypted).map_err(|e| {
        error!(
            error = %e,
            "Decrypted private key data is not valid UTF-8"
        );
        CryptoError::InvalidKeyFormat(e.to_string())
    })?;

    if !private_key_str.starts_with("AGE-SECRET-KEY-") {
        error!(
            key_prefix = &private_key_str[..std::cmp::min(20, private_key_str.len())],
            "Decrypted data is not a valid age private key - invalid prefix"
        );
        return Err(CryptoError::InvalidKeyFormat(
            "Decrypted data is not a valid age private key".to_string(),
        ));
    }

    debug!("Private key has valid AGE-SECRET-KEY prefix, validating key structure");

    Identity::from_str(&private_key_str).map_err(|e| {
        error!(
            error = %e,
            "Decrypted private key failed age Identity validation"
        );
        CryptoError::InvalidKeyFormat(e.to_string())
    })?;

    debug!("Private key successfully validated and ready for use");

    Ok(PrivateKey::from(SecretString::from(private_key_str)))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_keypair() {
        let keypair = generate_keypair().unwrap();
        assert!(!keypair.public_key.as_str().is_empty());
        assert!(keypair.public_key.as_str().starts_with("age1"));
    }

    #[test]
    fn test_encrypt_and_decrypt_private_key() {
        let keypair = generate_keypair().unwrap();
        let passphrase = SecretString::from("TestPassphrase123!".to_string());

        let encrypted = encrypt_private_key(&keypair.private_key, passphrase.clone()).unwrap();
        assert!(!encrypted.is_empty());

        let decrypted = decrypt_private_key(&encrypted, passphrase).unwrap();
        assert_eq!(
            keypair.private_key.expose_secret(),
            decrypted.expose_secret()
        );
    }

    #[test]
    fn test_decrypt_with_wrong_passphrase() {
        let keypair = generate_keypair().unwrap();
        let correct_passphrase = SecretString::from("Correct123!".to_string());
        let wrong_passphrase = SecretString::from("Wrong123!".to_string());

        let encrypted =
            encrypt_private_key(&keypair.private_key, correct_passphrase.clone()).unwrap();

        let result = decrypt_private_key(&encrypted, wrong_passphrase);
        assert!(result.is_err());
        if let Err(e) = result {
            assert!(matches!(e, CryptoError::WrongPassphrase));
        }
    }
}
