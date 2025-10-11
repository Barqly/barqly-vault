use crate::services::key_management::passphrase::infrastructure::StorageError;
use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::key_management::shared::domain::models::{KeyReference, KeyType};
use crate::services::vault;
use crate::services::vault::infrastructure::persistence::metadata::{RecipientInfo, RecipientType};
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
        let metadata = vault::get_vault(vault_id)
            .await
            .map_err(|e| VaultIntegrationError::VaultNotFound(e.to_string()))?;

        // Check if any recipient is a passphrase type
        let has_passphrase = metadata
            .recipients()
            .iter()
            .any(|recipient| matches!(recipient.recipient_type, RecipientType::Passphrase { .. }));

        Ok(has_passphrase)
    }

    pub async fn add_key_to_vault(
        &self,
        vault_id: &str,
        key_id: String,
        label: String,
        public_key: String,
    ) -> Result<KeyReference> {
        let mut metadata = vault::get_vault(vault_id)
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
            label: label.clone(),
            lifecycle_status: KeyLifecycleStatus::Active,
            created_at: Utc::now(),
            last_used: None,
        };

        // Add as recipient to the metadata
        let recipient = RecipientInfo::new_passphrase(
            key_id.clone(),
            public_key,
            label,
            format!("{}.agekey.enc", key_id), // key filename
        );

        metadata.add_recipient(recipient);

        vault::save_vault(&metadata)
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
