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
use std::path::PathBuf;

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
        // Detect if single folder or multiple files
        let source_root = Self::detect_source_root(&input.in_file_paths);

        // Check if output file would exist (before encryption)
        let vaults_dir =
            crate::services::shared::infrastructure::get_vaults_directory().map_err(|e| {
                CryptoError::InvalidInput(format!("Failed to get vaults directory: {}", e))
            })?;
        let sanitized = crate::services::shared::infrastructure::sanitize_vault_name(vault.label())
            .map_err(|e| CryptoError::InvalidInput(format!("Invalid vault name: {}", e)))?;
        let encrypted_path = vaults_dir.join(format!("{}.age", sanitized.sanitized));
        let file_exists_warning = encrypted_path.exists();

        let vault_input = VaultBundleEncryptionInput {
            vault_id: input.vault_id.clone(),
            vault_name: vault.label().to_string(),
            file_paths: input.in_file_paths.clone(),
            source_root,
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
            file_exists_warning,
            keys_used: result.keys_used,
        })
    }

    /// Detect selection type from file paths
    ///
    /// Returns: (SelectionType, base_path)
    /// Detect source_root from file paths
    /// Returns Some(folder_name) if single folder, None otherwise
    fn detect_source_root(file_paths: &[String]) -> Option<String> {
        if file_paths.len() == 1 {
            let path = std::path::Path::new(&file_paths[0]);
            if path.is_dir() {
                // Single folder selected - return folder name as source_root
                return path.file_name().map(|n| n.to_string_lossy().to_string());
            }
        }

        // Multiple files or single file - no source_root
        None
    }

    /// Decrypt data using DecryptionOrchestrationService
    pub async fn decrypt_data(
        &self,
        encrypted_file: &str,
        key_id: &str,
        passphrase: age::secrecy::SecretString,
        custom_output_dir: Option<PathBuf>, // Changed from &Path
        force_overwrite: bool,
        progress_manager: &mut ProgressManager,
    ) -> CryptoResult<super::services::DecryptionOutput> {
        let input = super::services::DecryptionInput {
            encrypted_file,
            key_id,
            passphrase,
            custom_output_dir, // Pass Option<PathBuf>
            force_overwrite,
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
