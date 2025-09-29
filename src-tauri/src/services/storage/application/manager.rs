use super::services::{CacheService, ConfigService, KeyService};
use crate::commands::storage::{AppConfig, AppConfigUpdate, KeyMetadata};
use crate::services::storage::domain::StorageResult;
use crate::storage::CacheMetrics;

pub struct StorageManager {
    config_service: ConfigService,
    cache_service: CacheService,
    key_service: KeyService,
}

impl StorageManager {
    pub fn new() -> Self {
        Self {
            config_service: ConfigService::new(),
            cache_service: CacheService::new(),
            key_service: KeyService::new(),
        }
    }

    /// Get application configuration
    pub async fn get_config(&self) -> StorageResult<AppConfig> {
        self.config_service.get_config().await
    }

    /// Update application configuration
    pub async fn update_config(&self, config: AppConfigUpdate) -> StorageResult<()> {
        self.config_service.update_config(config).await
    }

    /// Get cache metrics
    pub async fn get_cache_metrics(&self) -> StorageResult<CacheMetrics> {
        self.cache_service.get_cache_metrics().await
    }

    /// List all keys
    pub async fn list_keys(&self) -> StorageResult<Vec<KeyMetadata>> {
        self.key_service.list_keys().await
    }

    /// Delete a key
    pub async fn delete_key(&self, key_id: String) -> StorageResult<()> {
        self.key_service.delete_key(key_id).await
    }
}

impl Default for StorageManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_manager_creation() {
        let _manager = StorageManager::new();
        // Just verify creation works
    }
}
