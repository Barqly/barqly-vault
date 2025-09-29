use crate::crypto;
use crate::services::crypto::domain::{CryptoError, CryptoResult};

pub struct AgeRepository;

impl AgeRepository {
    pub fn new() -> Self {
        Self
    }

    /// Encrypt data using age - delegates to crypto module
    pub async fn encrypt_data(&self, data: &[u8], public_key: &str) -> CryptoResult<Vec<u8>> {
        crypto::encrypt_data(data, &crypto::PublicKey::from(public_key.to_string()))
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))
    }

    /// Decrypt data using age - delegates to crypto module
    pub async fn decrypt_data(
        &self,
        encrypted_data: &[u8],
        private_key: &str,
    ) -> CryptoResult<Vec<u8>> {
        use age::secrecy::SecretString;
        let secret = SecretString::new(private_key.to_string().into());
        let private_key = crypto::PrivateKey::from(secret);

        crypto::decrypt_data(encrypted_data, &private_key)
            .map_err(|e| CryptoError::DecryptionFailed(e.to_string()))
    }

    /// Multi-recipient encryption - delegates to crypto module
    pub async fn encrypt_data_multi_recipient(
        &self,
        data: &[u8],
        public_keys: &[String],
    ) -> CryptoResult<Vec<u8>> {
        let pub_keys: Vec<crypto::PublicKey> = public_keys
            .iter()
            .map(|k| crypto::PublicKey::from(k.clone()))
            .collect();
        crypto::encrypt_data_multi_recipient(data, &pub_keys)
            .map_err(|e| CryptoError::EncryptionFailed(e.to_string()))
    }
}

impl Default for AgeRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_age_repository_creation() {
        let _repo = AgeRepository::new();
        // Just verify creation works
    }
}
