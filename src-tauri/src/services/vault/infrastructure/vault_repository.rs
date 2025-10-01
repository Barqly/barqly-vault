use crate::services::vault;
use crate::services::vault::domain::models::Vault;
use crate::services::vault::domain::{VaultError, VaultResult};

#[derive(Debug)]
pub struct VaultRepository;

impl VaultRepository {
    pub fn new() -> Self {
        Self
    }

    /// Save vault to storage
    pub async fn save_vault(&self, vault: &Vault) -> VaultResult<()> {
        vault::save_vault(vault)
            .await
            .map_err(|e| VaultError::StorageError(e.to_string()))
    }

    /// Load vault from storage
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<Vault> {
        vault::get_vault(vault_id)
            .await
            .map_err(|e| VaultError::NotFound(e.to_string()))
    }

    /// Load vault by name
    pub async fn load_vault(&self, vault_id: &str) -> VaultResult<Vault> {
        vault::load_vault(vault_id)
            .await
            .map_err(|e| VaultError::NotFound(e.to_string()))
    }

    /// List all vaults
    pub async fn list_vaults(&self) -> VaultResult<Vec<Vault>> {
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
