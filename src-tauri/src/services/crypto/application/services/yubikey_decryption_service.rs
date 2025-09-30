//! YubiKey-based Decryption Service
//!
//! Handles decryption using YubiKey hardware tokens via age CLI plugin.

use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::crypto::infrastructure as crypto;
use crate::services::key_management::shared::KeyEntry;

/// Service for YubiKey-based decryption operations
#[derive(Debug)]
pub struct YubiKeyDecryptionService;

impl YubiKeyDecryptionService {
    pub fn new() -> Self {
        Self
    }

    /// Decrypt data using YubiKey via age CLI plugin
    #[instrument(skip(self, encrypted_data, key_entry, passphrase))]
    pub fn decrypt_with_yubikey(
        &self,
        encrypted_data: &[u8],
        key_entry: &KeyEntry,
        passphrase: &str,
    ) -> CryptoResult<Vec<u8>> {
        debug!(
            encrypted_data_size = encrypted_data.len(),
            "Starting YubiKey-based decryption via age CLI"
        );

        // Use age CLI with YubiKey plugin for decryption
        let decrypted_data =
            crypto::decrypt_data_yubikey_cli(encrypted_data, key_entry, passphrase).map_err(
                |e| {
                    error!(
                        error = %e,
                        "Failed to decrypt data with YubiKey"
                    );
                    CryptoError::DecryptionFailed(format!("YubiKey decryption failed: {}", e))
                },
            )?;

        info!(
            decrypted_data_size = decrypted_data.len(),
            "Successfully decrypted vault data with YubiKey"
        );

        Ok(decrypted_data)
    }
}

impl Default for YubiKeyDecryptionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_yubikey_decryption_service_creation() {
        let _service = YubiKeyDecryptionService::new();
        // Just verify creation works
    }
}
