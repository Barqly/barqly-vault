use super::services::VaultService;
use crate::services::vault::domain::VaultResult;
use crate::services::vault::domain::models::VaultSummary;
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;

pub struct VaultManager {
    vault_service: VaultService,
}

impl VaultManager {
    pub fn new() -> Self {
        Self {
            vault_service: VaultService::new(),
        }
    }

    /// Create a new vault
    pub async fn create_vault(
        &self,
        name: String,
        description: Option<String>,
    ) -> VaultResult<VaultSummary> {
        self.vault_service.create_vault(name, description).await
    }

    /// List all vaults
    pub async fn list_vaults(&self) -> VaultResult<Vec<VaultSummary>> {
        self.vault_service.list_vaults().await
    }

    /// Get vault metadata by ID
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<VaultMetadata> {
        self.vault_service.get_vault(vault_id).await
    }

    /// Delete vault
    pub async fn delete_vault(&self, vault_id: &str, force: bool) -> VaultResult<()> {
        self.vault_service.delete_vault(vault_id, force).await
    }
}

impl Default for VaultManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_manager_creation() {
        let _manager = VaultManager::new();
        // Just verify manager creation works
    }
}
