use super::super::errors::{StorageError, StorageResult};

/// Business rules for storage operations
pub struct StorageRules;

impl StorageRules {
    /// Maximum number of recent files to track
    pub const MAX_RECENT_FILES: usize = 100;

    /// Validate configuration parameters
    pub fn validate_config_update(
        default_key_label: Option<&str>,
        max_recent_files: Option<usize>,
    ) -> StorageResult<()> {
        // Validate default key label if provided
        if let Some(label) = default_key_label {
            if label.trim().is_empty() {
                return Err(StorageError::ConfigurationInvalid(
                    "Default key label cannot be empty".to_string(),
                ));
            }
            if label.len() > 100 {
                return Err(StorageError::ConfigurationInvalid(
                    "Default key label must be less than 100 characters".to_string(),
                ));
            }
        }

        // Validate max recent files if provided
        if let Some(max_files) = max_recent_files {
            if max_files == 0 {
                return Err(StorageError::ConfigurationInvalid(
                    "Max recent files must be greater than 0".to_string(),
                ));
            }
            if max_files > Self::MAX_RECENT_FILES {
                return Err(StorageError::ConfigurationInvalid(format!(
                    "Max recent files cannot exceed {}",
                    Self::MAX_RECENT_FILES
                )));
            }
        }

        Ok(())
    }

    /// Validate key deletion parameters
    pub fn validate_key_deletion(key_id: &str) -> StorageResult<()> {
        if key_id.trim().is_empty() {
            return Err(StorageError::ConfigurationInvalid(
                "Key ID cannot be empty".to_string(),
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_config_empty_label() {
        assert!(StorageRules::validate_config_update(Some(""), None).is_err());
        assert!(StorageRules::validate_config_update(Some("   "), None).is_err());
    }

    #[test]
    fn test_validate_config_valid() {
        assert!(StorageRules::validate_config_update(Some("my-key"), Some(50)).is_ok());
        assert!(StorageRules::validate_config_update(None, None).is_ok());
    }

    #[test]
    fn test_validate_config_max_files_limits() {
        assert!(StorageRules::validate_config_update(None, Some(0)).is_err());
        assert!(
            StorageRules::validate_config_update(None, Some(StorageRules::MAX_RECENT_FILES + 1))
                .is_err()
        );
        assert!(StorageRules::validate_config_update(None, Some(50)).is_ok());
    }

    #[test]
    fn test_validate_key_deletion() {
        assert!(StorageRules::validate_key_deletion("").is_err());
        assert!(StorageRules::validate_key_deletion("valid-key").is_ok());
    }
}
