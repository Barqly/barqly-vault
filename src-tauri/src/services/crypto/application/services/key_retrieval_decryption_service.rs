//! Key Retrieval Service for Decryption
//!
//! Handles loading decryption keys from the key registry and determining
//! the appropriate decryption method based on key type.

use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::key_management::shared::{KeyEntry, KeyRegistryService};

/// Service for retrieving decryption key information
#[derive(Debug)]
pub struct KeyRetrievalDecryptionService {
    key_registry_service: KeyRegistryService,
}

impl KeyRetrievalDecryptionService {
    pub fn new() -> Self {
        Self {
            key_registry_service: KeyRegistryService::new(),
        }
    }

    /// Get decryption key entry from registry
    #[instrument(skip(self))]
    pub fn get_decryption_key_info(&self, key_id: &str) -> CryptoResult<KeyEntry> {
        debug!(key_id = %key_id, "Retrieving decryption key from registry");

        self.key_registry_service.get_key(key_id).map_err(|e| {
            error!(key_id = %key_id, error = %e, "Failed to retrieve key from registry");
            CryptoError::InvalidInput(format!("Key '{}' not found: {}", key_id, e))
        })
    }
}

impl Default for KeyRetrievalDecryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_retrieval_decryption_service_creation() {
        let _service = KeyRetrievalDecryptionService::new();
        // Just verify creation works
    }
}
