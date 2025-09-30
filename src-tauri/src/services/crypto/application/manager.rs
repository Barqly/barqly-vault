//! Crypto Domain Manager
//!
//! Facade for crypto operations following Command → Manager → Service pattern.
//! Coordinates encryption, decryption, and progress tracking services.

use super::services::{DecryptionOrchestrationService, EncryptionService};
use crate::commands::crypto::{
    EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse,
};
use crate::commands::types::ProgressManager;
use crate::services::crypto::domain::CryptoResult;
use std::path::Path;

pub struct CryptoManager {
    encryption_service: EncryptionService,
    decryption_orchestration: DecryptionOrchestrationService,
}

impl CryptoManager {
    pub fn new() -> Self {
        Self {
            encryption_service: EncryptionService::new(),
            decryption_orchestration: DecryptionOrchestrationService::new(),
        }
    }

    /// Encrypt files with single key
    pub async fn encrypt_files(&self, input: EncryptDataInput) -> CryptoResult<String> {
        self.encryption_service.encrypt_files(input).await
    }

    /// Encrypt files with multiple keys (vault)
    pub async fn encrypt_files_multi(
        &self,
        input: EncryptFilesMultiInput,
    ) -> CryptoResult<EncryptFilesMultiResponse> {
        self.encryption_service.encrypt_files_multi(input).await
    }

    /// Decrypt data using DecryptionOrchestrationService
    pub async fn decrypt_data(
        &self,
        encrypted_file: &str,
        key_id: &str,
        passphrase: age::secrecy::SecretString,
        output_dir: &Path,
        progress_manager: &mut ProgressManager,
    ) -> CryptoResult<super::services::DecryptionOutput> {
        let input = super::services::DecryptionInput {
            encrypted_file,
            key_id,
            passphrase,
            output_dir,
        };

        self.decryption_orchestration
            .decrypt(input, progress_manager)
            .await
    }
}

impl Default for CryptoManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crypto_manager_creation() {
        let _manager = CryptoManager::new();
        // Verify creation works
    }
}
