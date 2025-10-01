use super::services::{
    GeneratedKey, GenerationError, GenerationService, ValidationError, ValidationService,
    VaultIntegrationError, VaultIntegrationService,
};
use crate::services::key_management::passphrase::domain::ValidationResult;
use crate::services::key_management::shared::domain::models::KeyReference;
use crate::services::vault::VaultMetadata;

pub struct PassphraseManager {
    generation_service: GenerationService,
    validation_service: ValidationService,
    vault_service: VaultIntegrationService,
}

impl PassphraseManager {
    pub fn new() -> Self {
        Self {
            generation_service: GenerationService::new(),
            validation_service: ValidationService::new(),
            vault_service: VaultIntegrationService::new(),
        }
    }

    pub fn validate_strength(&self, passphrase: &str) -> ValidationResult {
        self.validation_service.validate_strength(passphrase)
    }

    pub fn verify_key_passphrase(
        &self,
        key_id: &str,
        passphrase: &str,
    ) -> Result<bool, ValidationError> {
        self.validation_service
            .verify_key_passphrase(key_id, passphrase)
    }

    /// Check if a key with the given label already exists
    pub fn label_exists(&self, label: &str) -> Result<bool, GenerationError> {
        let existing_keys = crate::services::key_management::shared::list_keys()
            .map_err(|e| GenerationError::KeyGenerationFailed(e.to_string()))?;

        Ok(existing_keys.iter().any(|k| k.label == label))
    }

    pub fn generate_key(
        &self,
        label: &str,
        passphrase: &str,
    ) -> Result<GeneratedKey, GenerationError> {
        self.generation_service
            .generate_passphrase_key(label, passphrase)
    }

    pub fn generate_with_metadata(
        &self,
        label: &str,
        passphrase: &str,
        metadata: &VaultMetadata,
    ) -> Result<GeneratedKey, GenerationError> {
        self.generation_service
            .generate_with_metadata(label, passphrase, metadata)
    }

    pub async fn add_key_to_vault(
        &self,
        vault_id: &str,
        key_id: String,
        label: String,
        public_key: String,
    ) -> Result<KeyReference, VaultIntegrationError> {
        self.vault_service
            .add_key_to_vault(vault_id, key_id, label, public_key)
            .await
    }

    pub async fn validate_vault_has_passphrase_key(
        &self,
        vault_id: &str,
    ) -> Result<bool, VaultIntegrationError> {
        self.vault_service
            .validate_vault_has_passphrase_key(vault_id)
            .await
    }
}

impl Default for PassphraseManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manager_creation() {
        let manager = PassphraseManager::new();
        assert!(std::mem::size_of_val(&manager) == 0);
    }

    #[test]
    fn test_validate_strength_via_manager() {
        let manager = PassphraseManager::new();
        let result = manager.validate_strength("MySecure#Pass2024!");
        assert!(result.is_valid);
        assert!(result.score > 70);
    }
}
