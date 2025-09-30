//! Passphrase-based Decryption Service
//!
//! Handles decryption using passphrase-protected private keys.

use crate::crypto;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::key_management::passphrase;
use crate::storage;
use age::secrecy::SecretString;

/// Service for passphrase-based decryption operations
#[derive(Debug)]
pub struct PassphraseDecryptionService;

impl PassphraseDecryptionService {
    pub fn new() -> Self {
        Self
    }

    /// Decrypt data using passphrase-protected key
    #[instrument(skip(self, encrypted_data, passphrase))]
    pub fn decrypt_with_passphrase(
        &self,
        encrypted_data: &[u8],
        key_filename: &str,
        passphrase: SecretString,
    ) -> CryptoResult<Vec<u8>> {
        debug!(
            key_filename = %key_filename,
            encrypted_data_size = encrypted_data.len(),
            "Starting passphrase-based decryption"
        );

        // Load the encrypted private key
        let encrypted_key = storage::load_encrypted_key(key_filename).map_err(|e| {
            error!(
                key_filename = %key_filename,
                error = %e,
                "Failed to load encrypted private key"
            );
            CryptoError::ConfigurationError(format!("Failed to load encrypted key: {}", e))
        })?;

        debug!(
            key_filename = %key_filename,
            encrypted_key_size = encrypted_key.len(),
            "Successfully loaded encrypted private key"
        );

        // Decrypt the private key with passphrase
        let private_key =
            passphrase::decrypt_private_key(&encrypted_key, passphrase).map_err(|e| {
                error!(
                    key_filename = %key_filename,
                    error = %e,
                    "Failed to decrypt private key with passphrase"
                );
                CryptoError::DecryptionFailed(format!("Failed to decrypt private key: {}", e))
            })?;

        debug!(
            key_filename = %key_filename,
            "Successfully decrypted private key"
        );

        // Decrypt the vault data using the private key
        let decrypted_data = crypto::decrypt_data(encrypted_data, &private_key).map_err(|e| {
            error!(
                error = %e,
                "Failed to decrypt vault data"
            );
            CryptoError::DecryptionFailed(format!("Failed to decrypt data: {}", e))
        })?;

        info!(
            decrypted_data_size = decrypted_data.len(),
            "Successfully decrypted vault data with passphrase"
        );

        Ok(decrypted_data)
    }
}

impl Default for PassphraseDecryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_passphrase_decryption_service_creation() {
        let _service = PassphraseDecryptionService::new();
        // Just verify creation works
    }
}
