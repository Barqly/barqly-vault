use super::services::{DecryptionService, EncryptionService, ProgressService};
use crate::commands::crypto::{
    DecryptDataInput, DecryptionResult, EncryptDataInput, EncryptFilesMultiInput,
    EncryptFilesMultiResponse, EncryptionStatusResponse, GetEncryptionStatusInput,
    GetProgressInput, GetProgressResponse, VerifyManifestInput, VerifyManifestResponse,
};
use crate::services::crypto::domain::CryptoResult;

pub struct CryptoManager {
    encryption_service: EncryptionService,
    decryption_service: DecryptionService,
    progress_service: ProgressService,
}

impl CryptoManager {
    pub fn new() -> Self {
        Self {
            encryption_service: EncryptionService::new(),
            decryption_service: DecryptionService::new(),
            progress_service: ProgressService::new(),
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

    /// Decrypt data
    pub async fn decrypt_data(&self, input: DecryptDataInput) -> CryptoResult<DecryptionResult> {
        self.decryption_service.decrypt_data(input).await
    }

    // NOTE: generate_key_multi removed - use key_management commands instead
    // Key generation belongs in key_management domain, not crypto domain

    /// Verify manifest
    pub async fn verify_manifest(
        &self,
        input: VerifyManifestInput,
    ) -> CryptoResult<VerifyManifestResponse> {
        self.decryption_service.verify_manifest(input).await
    }

    /// Get encryption status
    pub async fn get_encryption_status(
        &self,
        input: GetEncryptionStatusInput,
    ) -> CryptoResult<EncryptionStatusResponse> {
        self.progress_service.get_encryption_status(input).await
    }

    /// Get operation progress
    pub async fn get_progress(&self, input: GetProgressInput) -> CryptoResult<GetProgressResponse> {
        self.progress_service.get_progress(input).await
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
        // Just verify creation works
    }
}
