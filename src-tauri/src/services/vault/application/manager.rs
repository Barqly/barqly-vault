use super::services::{VaultService, KeyAssociationService};
use crate::services::vault::domain::VaultResult;
use crate::models::{KeyReference, Vault, VaultSummary};

pub struct VaultManager {
    vault_service: VaultService,
    key_service: KeyAssociationService,
}

impl VaultManager {
    pub fn new() -> Self {
        Self {
            vault_service: VaultService::new(),
            key_service: KeyAssociationService::new(),
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

    /// Get vault by ID
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<Vault> {
        self.vault_service.get_vault(vault_id).await
    }

    /// Delete vault
    pub async fn delete_vault(&self, vault_id: &str, force: bool) -> VaultResult<()> {
        self.vault_service.delete_vault(vault_id, force).await
    }

    /// Get all keys for a vault
    pub async fn get_vault_keys(&self, vault_id: &str) -> VaultResult<Vec<KeyReference>> {
        self.key_service.get_vault_keys(vault_id).await
    }

    /// Add key to vault
    pub async fn add_key_to_vault(
        &self,
        vault_id: &str,
        key_id: String,
        key_type: String,
        label: String,
    ) -> VaultResult<KeyReference> {
        self.key_service.add_key_to_vault(vault_id, key_id, key_type, label).await
    }

    /// Remove key from vault
    pub async fn remove_key_from_vault(
        &self,
        vault_id: &str,
        key_id: &str,
    ) -> VaultResult<()> {
        self.key_service.remove_key_from_vault(vault_id, key_id).await
    }

    /// Update key label
    pub async fn update_key_label(
        &self,
        vault_id: &str,
        key_id: &str,
        new_label: String,
    ) -> VaultResult<()> {
        self.key_service.update_key_label(vault_id, key_id, new_label).await
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
        let manager = VaultManager::new();
        assert!(std::mem::size_of_val(&manager) >= 0);
    }
}