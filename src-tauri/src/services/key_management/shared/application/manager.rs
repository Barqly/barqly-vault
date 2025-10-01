use super::services::{KeyManagementError, KeyRegistryService, UnifiedKeyListService};
use crate::commands::key_management::unified_keys::{KeyInfo, KeyListFilter};
use crate::services::key_management::shared::KeyEntry;

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
