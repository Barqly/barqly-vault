use crate::services::shared::infrastructure::DeviceInfo;
use crate::services::vault::application::services::VaultMetadataService;
use crate::services::vault::domain::models::VaultSummary;
use crate::services::vault::domain::{VaultError, VaultResult, VaultRules};
use crate::services::vault::infrastructure::VaultRepository;
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;

#[derive(Debug)]
pub struct VaultService {
    repository: VaultRepository,
    metadata_service: VaultMetadataService,
}

impl VaultService {
    pub fn new() -> Self {
        Self {
            repository: VaultRepository::new(),
            metadata_service: VaultMetadataService::new(),
        }
    }

    /// Create a new vault with business rule validation
    pub async fn create_vault(
        &self,
        name: String,
        description: Option<String>,
    ) -> VaultResult<VaultSummary> {
        // Apply domain rules
        VaultRules::validate_vault_name(&name)?;

        // Check if vault already exists
        if self.repository.vault_exists(&name).await? {
            return Err(VaultError::AlreadyExists(name));
        }

        // Load or create device info
        let device_info = DeviceInfo::load_or_create("2.0.0")
            .map_err(|e| VaultError::StorageError(format!("Failed to load device info: {}", e)))?;

        // Generate vault ID
        let vault_id = Self::generate_vault_id();

        // Use VaultMetadataService to create manifest with defaults
        let metadata = self
            .metadata_service
            .load_or_create(&vault_id, &name, description, &device_info)
            .map_err(|e| {
                VaultError::StorageError(format!("Failed to create vault metadata: {}", e))
            })?;

        // Save via repository
        self.repository.save_vault(&metadata).await?;

        Ok(metadata.to_summary())
    }

    /// List all vaults
    pub async fn list_vaults(&self) -> VaultResult<Vec<VaultSummary>> {
        let metadatas = self.repository.list_vaults().await?;
        Ok(metadatas.into_iter().map(|m| m.to_summary()).collect())
    }

    /// Get vault metadata by ID
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<VaultMetadata> {
        self.repository.get_vault(vault_id).await
    }

    /// Get vault metadata by sanitized name
    ///
    /// Searches all vaults to find one matching the sanitized name.
    /// Used for encrypted vault file analysis where only the filename is available.
    ///
    /// # Arguments
    /// * `sanitized_name` - Sanitized vault name (e.g., "Sam-Family-Vault")
    ///
    /// # Returns
    /// * `Ok(Some(VaultMetadata))` - Vault found
    /// * `Ok(None)` - No vault with matching sanitized name
    /// * `Err(VaultError)` - Repository access error
    pub async fn get_vault_by_sanitized_name(
        &self,
        sanitized_name: &str,
    ) -> VaultResult<Option<VaultMetadata>> {
        // List all vaults and find matching sanitized name
        let all_vaults = self.repository.list_vaults().await?;

        for vault in all_vaults {
            if vault.vault.sanitized_name == sanitized_name {
                return Ok(Some(vault));
            }
        }

        Ok(None)
    }

    /// Delete vault with optional force
    pub async fn delete_vault(&self, vault_id: &str, force: bool) -> VaultResult<()> {
        let metadata = self.repository.get_vault(vault_id).await?;

        // Business rule: Don't delete vaults with recipients unless forced
        if !force && !metadata.recipients().is_empty() {
            return Err(VaultError::InvalidOperation(
                "Cannot delete vault with keys. Use force=true to override".to_string(),
            ));
        }

        self.repository.delete_vault(vault_id).await
    }

    /// Generate a unique vault ID
    fn generate_vault_id() -> String {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let bytes: [u8; 16] = rng.r#gen();
        bs58::encode(bytes).into_string()
    }
}

impl Default for VaultService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_service_creation() {
        let _service = VaultService::new();
        // Just verify creation works
    }
}
