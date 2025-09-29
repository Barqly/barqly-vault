use crate::commands::types::ErrorCode;
use crate::error::ErrorHandler;
use crate::services::storage::domain::models::KeyMetadata;
use crate::services::storage::domain::{StorageError, StorageResult, StorageRules};
use crate::storage::{delete_key, list_keys};

pub struct KeyService;

impl KeyService {
    pub fn new() -> Self {
        Self
    }

    /// List all keys with exact logic from commands/storage/mod.rs
    pub async fn list_keys(&self) -> StorageResult<Vec<KeyMetadata>> {
        // Create error handler (same as current command)
        let error_handler = ErrorHandler::new();

        // Log operation start (same as current command)
        log::info!("Starting key listing operation");

        let keys = error_handler
            .handle_operation_error(list_keys(), "list_keys", ErrorCode::StorageFailed)
            .map_err(|e| StorageError::KeyListingFailed(format!("Failed to list keys: {}", e)))?;

        let metadata: Vec<KeyMetadata> = keys
            .into_iter()
            .map(|key| KeyMetadata {
                label: key.label,
                created_at: key.created_at.to_rfc3339(),
                public_key: key.public_key,
            })
            .collect();

        // Log operation completion (same as current command)
        log::info!(
            "Key listing operation completed successfully: key_count={}",
            metadata.len()
        );

        Ok(metadata)
    }

    /// Delete a key with exact logic from commands/storage/mod.rs
    pub async fn delete_key(&self, key_id: String) -> StorageResult<()> {
        // Apply domain rules
        StorageRules::validate_key_deletion(&key_id)?;

        // Create error handler (same as current command)
        let error_handler = ErrorHandler::new();

        // Log operation start (same as current command)
        log::info!("Starting key deletion operation: key_id={}", key_id);

        // Validate key exists (same logic as current command)
        let keys = error_handler
            .handle_operation_error(list_keys(), "list_keys", ErrorCode::StorageFailed)
            .map_err(|e| StorageError::KeyListingFailed(format!("Failed to list keys: {}", e)))?;

        if !keys.iter().any(|k| k.label == key_id) {
            return Err(StorageError::KeyDeletionFailed(format!(
                "No key found with label '{}'",
                key_id
            )));
        }

        // Delete the key (same logic as current command)
        error_handler
            .handle_operation_error(delete_key(&key_id), "delete_key", ErrorCode::StorageFailed)
            .map_err(|e| StorageError::KeyDeletionFailed(format!("Failed to delete key: {}", e)))?;

        // Log operation completion (same as current command)
        log::info!(
            "Key deletion operation completed successfully: key_id={}",
            key_id
        );

        Ok(())
    }
}

impl Default for KeyService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_service_creation() {
        let _service = KeyService::new();
        // Just verify creation works
    }
}
