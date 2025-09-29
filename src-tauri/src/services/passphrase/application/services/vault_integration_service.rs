use crate::models::{KeyReference, KeyState, KeyType};
use crate::services::passphrase::infrastructure::StorageError;
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;

pub type Result<T> = std::result::Result<T, VaultIntegrationError>;

#[derive(Debug)]
pub enum VaultIntegrationError {
    Storage(StorageError),
    VaultNotFound(String),
    VaultOperationFailed(String),
    DuplicatePassphraseKey,
}

impl From<StorageError> for VaultIntegrationError {
    fn from(err: StorageError) -> Self {
        Self::Storage(err)
    }
}

impl std::fmt::Display for VaultIntegrationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Storage(err) => write!(f, "Storage error: {}", err),
            Self::VaultNotFound(id) => write!(f, "Vault '{}' not found", id),
            Self::VaultOperationFailed(msg) => write!(f, "Vault operation failed: {}", msg),
            Self::DuplicatePassphraseKey => {
                write!(f, "Vault already has a passphrase key")
            }
        }
    }
}

impl std::error::Error for VaultIntegrationError {}

pub struct VaultIntegrationService;

impl VaultIntegrationService {
    pub fn new() -> Self {
        Self
    }

    pub async fn validate_vault_has_passphrase_key(&self, vault_id: &str) -> Result<bool> {
        let vault = vault_store::get_vault(vault_id)
            .await
            .map_err(|e| VaultIntegrationError::VaultNotFound(e.to_string()))?;

        let registry =
            KeyRegistry::load().map_err(|e| StorageError::RegistryLoadFailed(e.to_string()))?;

        let has_passphrase = vault.keys.iter().any(|key_id| {
            if let Some(entry) = registry.get_key(key_id) {
                matches!(entry, crate::storage::KeyEntry::Passphrase { .. })
            } else {
                false
            }
        });

        Ok(has_passphrase)
    }

    pub async fn add_key_to_vault(
        &self,
        vault_id: &str,
        key_id: String,
        label: String,
        _public_key: String,
    ) -> Result<KeyReference> {
        let mut vault = vault_store::get_vault(vault_id)
            .await
            .map_err(|e| VaultIntegrationError::VaultNotFound(e.to_string()))?;

        if self.validate_vault_has_passphrase_key(vault_id).await? {
            return Err(VaultIntegrationError::DuplicatePassphraseKey);
        }

        let key_reference = KeyReference {
            id: key_id.clone(),
            key_type: KeyType::Passphrase {
                key_id: label.clone(),
            },
            label,
            state: KeyState::Active,
            created_at: Utc::now(),
            last_used: None,
        };

        vault
            .add_key_id(key_id)
            .map_err(VaultIntegrationError::VaultOperationFailed)?;

        vault_store::save_vault(&vault)
            .await
            .map_err(|e| VaultIntegrationError::VaultOperationFailed(e.to_string()))?;

        Ok(key_reference)
    }
}

impl Default for VaultIntegrationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_integration_service_creation() {
        let service = VaultIntegrationService::new();
        assert!(std::mem::size_of_val(&service) == 0);
    }
}
