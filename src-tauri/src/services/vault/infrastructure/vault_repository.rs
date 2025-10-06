use crate::services::vault;
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;
use crate::services::vault::domain::{VaultError, VaultResult};

#[derive(Debug)]
pub struct VaultRepository;

impl VaultRepository {
    pub fn new() -> Self {
        Self
    }

    /// Save vault metadata to storage
    pub async fn save_vault(&self, metadata: &VaultMetadata) -> VaultResult<()> {
        vault::save_vault(metadata)
            .await
            .map_err(|e| VaultError::StorageError(e.to_string()))
    }

    /// Load vault metadata from storage
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<VaultMetadata> {
        vault::get_vault(vault_id)
            .await
            .map_err(|e| VaultError::NotFound(e.to_string()))
    }

    /// Load vault metadata by ID
    pub async fn load_vault(&self, vault_id: &str) -> VaultResult<VaultMetadata> {
        vault::load_vault(vault_id)
            .await
            .map_err(|e| VaultError::NotFound(e.to_string()))
    }

    /// List all vault metadata
    pub async fn list_vaults(&self) -> VaultResult<Vec<VaultMetadata>> {
        vault::list_vaults()
            .await
            .map_err(|e| VaultError::StorageError(e.to_string()))
    }

    /// Check if vault exists
    pub async fn vault_exists(&self, vault_name: &str) -> VaultResult<bool> {
        Ok(vault::vault_exists(vault_name).await)
    }

    /// Delete vault
    pub async fn delete_vault(&self, vault_id: &str) -> VaultResult<()> {
        vault::delete_vault(vault_id)
            .await
            .map_err(|e| VaultError::StorageError(e.to_string()))
    }
}

impl Default for VaultRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_repository_creation() {
        let repo = VaultRepository::new();
        assert!(std::mem::size_of_val(&repo) == 0);
    }
}
