use super::services::{KeyManagementError, KeyRegistryService, UnifiedKeyListService};
use crate::services::key_management::shared::KeyEntry;
use crate::services::key_management::shared::domain::models::key_reference::{
    KeyInfo, KeyListFilter,
};

pub type Result<T> = std::result::Result<T, KeyManagementError>;

/// Manager for shared key operations across all key types
///
/// Provides a facade for unified key listing and registry operations.
/// Coordinates KeyRegistryService and UnifiedKeyListService.
///
/// NOTE: UnifiedKeyListService currently has circular dependency (calls commands)
/// This is documented tech debt to be fixed in future refactoring.
pub struct KeyManager {
    registry_service: KeyRegistryService,
    unified_list_service: UnifiedKeyListService,
}

impl KeyManager {
    pub fn new() -> Self {
        Self {
            registry_service: KeyRegistryService::new(),
            unified_list_service: UnifiedKeyListService::new(),
        }
    }

    /// List keys with flexible filtering options
    pub async fn list_keys(
        &self,
        filter: KeyListFilter,
    ) -> std::result::Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        self.unified_list_service.list_keys(filter).await
    }

    /// Get a specific key from the registry
    pub fn get_key(&self, key_id: &str) -> Result<KeyEntry> {
        self.registry_service.get_key(key_id)
    }

    /// Update a key in the registry
    pub fn update_key(&self, key_id: &str, updated_entry: KeyEntry) -> Result<()> {
        self.registry_service.update_key(key_id, updated_entry)
    }

    /// Detach a key from a vault
    pub async fn detach_key_from_vault(&self, key_id: &str, vault_id: &str) -> Result<()> {
        self.registry_service
            .detach_key_from_vault(key_id, vault_id)
            .await
    }

    /// Get all passphrase keys for a specific vault
    pub async fn get_vault_passphrase_keys(
        &self,
        vault_id: &str,
    ) -> std::result::Result<
        Vec<crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo>,
        Box<dyn std::error::Error>,
    >{
        use crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo;
        use crate::services::vault::VaultManager;
        use crate::services::vault::infrastructure::persistence::metadata::RecipientType;

        let vault_manager = VaultManager::new();
        let metadata = vault_manager.get_vault(vault_id).await?;
        let registry = self.registry_service.load_registry()?;

        let mut passphrase_keys = Vec::new();

        // Get passphrase recipients from metadata
        for recipient in &metadata.recipients {
            if let RecipientType::Passphrase { key_filename } = &recipient.recipient_type {
                // Try to find key in registry by filename pattern (remove .agekey.enc)
                let key_id = key_filename.trim_end_matches(".agekey.enc");

                if let Some(crate::services::key_management::shared::KeyEntry::Passphrase {
                    label,
                    created_at,
                    last_used,
                    public_key,
                    ..
                }) = registry.get_key(key_id)
                {
                    passphrase_keys.push(PassphraseKeyInfo {
                        id: key_id.to_string(),
                        label: label.clone(),
                        public_key: public_key.clone(),
                        created_at: *created_at,
                        last_used: *last_used,
                        is_available: true,
                    });
                }
            }
        }

        Ok(passphrase_keys)
    }

    /// Get all passphrase keys available to add to a vault (not already in vault)
    pub async fn get_available_passphrase_keys(
        &self,
        vault_id: &str,
    ) -> std::result::Result<
        Vec<crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo>,
        Box<dyn std::error::Error>,
    >{
        use crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo;
        use crate::services::vault::VaultManager;

        let vault_manager = VaultManager::new();
        let metadata = vault_manager.get_vault(vault_id).await?;
        let registry = self.registry_service.load_registry()?;

        // Get labels of all recipients already in vault
        let vault_key_labels: std::collections::HashSet<String> = metadata
            .recipients
            .iter()
            .map(|r| r.label.clone())
            .collect();

        let mut available_keys = Vec::new();

        for (key_id, entry) in registry.keys.iter() {
            if let crate::services::key_management::shared::KeyEntry::Passphrase {
                label,
                created_at,
                last_used,
                public_key,
                ..
            } = entry
                && !vault_key_labels.contains(label)
            {
                available_keys.push(PassphraseKeyInfo {
                    id: key_id.clone(),
                    label: label.clone(),
                    public_key: public_key.clone(),
                    created_at: *created_at,
                    last_used: *last_used,
                    is_available: true,
                });
            }
        }

        Ok(available_keys)
    }

    /// Load the key registry (for commands that need registry access)
    pub fn load_registry(
        &self,
    ) -> Result<crate::services::key_management::shared::infrastructure::KeyRegistry> {
        self.registry_service.load_registry()
    }
}

impl Default for KeyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_manager_creation() {
        let _manager = KeyManager::new();
        // Just verify creation works
    }
}
