//! Crypto Domain Manager
//!
//! Facade for crypto operations following Command → Manager → Service pattern.
//! Coordinates encryption, decryption, and progress tracking services.

use super::services::{DecryptionOrchestrationService, EncryptionService};
use crate::services::crypto::application::dtos::{
    EncryptDataInput, EncryptFilesMultiInput, EncryptFilesMultiResponse,
};
use crate::services::crypto::domain::CryptoResult;
use crate::services::shared::infrastructure::progress::ProgressManager;
use crate::services::vault::application::services::{
    VaultBundleEncryptionInput, VaultBundleEncryptionService,
};
use crate::services::vault::infrastructure::persistence::metadata::SelectionType;
use std::path::Path;

pub struct CryptoManager {
    encryption_service: EncryptionService,
    decryption_orchestration: DecryptionOrchestrationService,
    vault_bundle_encryption: VaultBundleEncryptionService,
}

impl CryptoManager {
    pub fn new() -> Self {
        Self {
            encryption_service: EncryptionService::new(),
            decryption_orchestration: DecryptionOrchestrationService::new(),
            vault_bundle_encryption: VaultBundleEncryptionService::new(),
        }
    }

    /// Encrypt files with single key
    pub async fn encrypt_files(&self, input: EncryptDataInput) -> CryptoResult<String> {
        self.encryption_service.encrypt_files(input).await
    }

    /// Encrypt files with multiple keys (vault) - uses VaultBundleEncryptionService
    pub async fn encrypt_files_multi(
        &self,
        input: EncryptFilesMultiInput,
    ) -> CryptoResult<EncryptFilesMultiResponse> {
        use crate::services::crypto::domain::CryptoError;
        use crate::services::vault;

        // Load vault to get name
        let vault = vault::load_vault(&input.vault_id)
            .await
            .map_err(|e| CryptoError::InvalidInput(format!("Vault not found: {}", e)))?;

        // Convert to VaultBundleEncryptionInput
        // TODO: Detect selection_type and base_path from input
        let vault_input = VaultBundleEncryptionInput {
            vault_id: input.vault_id.clone(),
            vault_name: vault.name.clone(),
            file_paths: input.in_file_paths.clone(),
            selection_type: SelectionType::Files,
            base_path: None,
        };

        // Use VaultBundleEncryptionService
        let result = self
            .vault_bundle_encryption
            .orchestrate_vault_encryption(vault_input)
            .await
            .map_err(|e| {
                CryptoError::EncryptionFailed(format!("Vault encryption failed: {}", e))
            })?;

        // Convert back to expected response
        Ok(EncryptFilesMultiResponse {
            encrypted_file_path: result.encrypted_file_path,
            manifest_file_path: result.manifest_path,
            file_exists_warning: false, // TODO: Check if file exists
            keys_used: result.keys_used,
        })
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
