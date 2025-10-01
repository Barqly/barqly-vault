use crate::services::vault::domain::models::{Vault, VaultSummary};
use crate::services::vault::domain::{VaultError, VaultResult, VaultRules};
use crate::services::vault::infrastructure::VaultRepository;

#[derive(Debug)]
pub struct VaultService {
    repository: VaultRepository,
}

impl VaultService {
    pub fn new() -> Self {
        Self {
            repository: VaultRepository::new(),
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

        // Create vault
        let vault = Vault::new(name, description);
        self.repository.save_vault(&vault).await?;

        Ok(vault.to_summary())
    }

    /// List all vaults
    pub async fn list_vaults(&self) -> VaultResult<Vec<VaultSummary>> {
        let vaults = self.repository.list_vaults().await?;
        Ok(vaults.into_iter().map(|v| v.to_summary()).collect())
    }

    /// Get vault by ID
    pub async fn get_vault(&self, vault_id: &str) -> VaultResult<Vault> {
        self.repository.get_vault(vault_id).await
    }

    /// Delete vault with optional force
    pub async fn delete_vault(&self, vault_id: &str, force: bool) -> VaultResult<()> {
        let vault = self.repository.get_vault(vault_id).await?;

        // Business rule: Don't delete vaults with keys unless forced
        if !force && !vault.keys.is_empty() {
            return Err(VaultError::InvalidOperation(
                "Cannot delete vault with keys. Use force=true to override".to_string(),
            ));
        }

        self.repository.delete_vault(vault_id).await
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
