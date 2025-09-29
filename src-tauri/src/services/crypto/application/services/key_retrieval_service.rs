//! Key retrieval service for crypto operations
//!
//! Handles retrieving and validating encryption keys for crypto operations.
//! Extracted from commands/crypto/encryption.rs for proper domain separation.

use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::storage;

#[derive(Debug)]
pub struct KeyRetrievalService;

impl KeyRetrievalService {
    pub fn new() -> Self {
        Self
    }

    /// Retrieve and validate encryption key for operations
    pub async fn get_encryption_key(&self, key_id: &str) -> CryptoResult<String> {
        // Get available keys from storage
        let keys = storage::list_keys()
            .map_err(|e| CryptoError::EncryptionFailed(format!("Failed to list keys: {}", e)))?;

        // Find the requested key
        let key_info = keys.iter().find(|k| k.label == key_id).ok_or_else(|| {
            debug!(
                key_id = %key_id,
                available_keys = ?keys.iter().map(|k| &k.label).collect::<Vec<_>>(),
                "Encryption key not found in available keys"
            );
            CryptoError::InvalidKey(format!("Key '{}' not found", key_id))
        })?;

        // Validate key has public key component
        let public_key_str = key_info.public_key.as_ref().ok_or_else(|| {
            error!(
                key_id = %key_id,
                "Public key not available for encryption key"
            );
            CryptoError::ConfigurationError(format!(
                "Public key not available for key '{}'",
                key_id
            ))
        })?;

        debug!(
            key_id = %key_id,
            has_public_key = true,
            "Successfully found and validated encryption key"
        );

        Ok(public_key_str.clone())
    }
}

impl Default for KeyRetrievalService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_retrieval_service_creation() {
        let _service = KeyRetrievalService::new();
        // Just verify creation works
    }
}
