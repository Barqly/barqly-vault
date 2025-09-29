use crate::commands::storage::{AppConfig, AppConfigUpdate};
use crate::services::storage::domain::{StorageResult, StorageRules};

pub struct ConfigService;

impl ConfigService {
    pub fn new() -> Self {
        Self
    }

    /// Get application configuration with exact logic from commands/storage/mod.rs
    pub async fn get_config(&self) -> StorageResult<AppConfig> {
        // TODO: Implement configuration loading from file
        // For now, return default configuration (same as current command)
        let config = AppConfig {
            version: env!("CARGO_PKG_VERSION").to_string(),
            default_key_label: None,
            remember_last_folder: true,
            max_recent_files: 10,
        };

        Ok(config)
    }

    /// Update application configuration with exact logic from commands/storage/mod.rs
    pub async fn update_config(&self, config: AppConfigUpdate) -> StorageResult<()> {
        // Apply domain rules
        StorageRules::validate_config_update(
            config.default_key_label.as_deref(),
            config.max_recent_files,
        )?;

        // TODO: Implement configuration validation and persistence
        // For now, just log the update (same as current command)
        log::info!(
            "Configuration update completed successfully: default_key_label={:?}, remember_last_folder={:?}, max_recent_files={:?}",
            config.default_key_label,
            config.remember_last_folder,
            config.max_recent_files
        );

        Ok(())
    }
}

impl Default for ConfigService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_service_creation() {
        let _service = ConfigService::new();
        // Just verify creation works
    }
}
