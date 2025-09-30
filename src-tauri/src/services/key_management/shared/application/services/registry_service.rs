//! Key Registry Service
//!
//! Application service layer for key registry operations. Provides business logic
//! for key lifecycle management (creation, retrieval, attachment, detachment, deletion).
//!
//! This service wraps the infrastructure layer KeyRegistry and adds:
//! - Vault integration (key-vault relationships)
//! - Lifecycle management (detach, delete with safety checks)
//! - Business rule enforcement
//! - Comprehensive error handling and logging

use crate::prelude::*;
use crate::services::key_management::shared::infrastructure::{
    KeyEntry, KeyInfo, KeyRegistry, list_keys as list_key_files,
};
use crate::services::vault;
use crate::storage; // For path_management (shared infrastructure)

/// Error types for key registry operations
#[derive(Debug, thiserror::Error)]
pub enum KeyManagementError {
    #[error("Key not found: {0}")]
    KeyNotFound(String),

    #[error("Key '{0}' is still attached to {1} vault(s): {2:?}")]
    KeyInUse(String, usize, Vec<String>),

    #[error("Registry load failed: {0}")]
    RegistryLoadFailed(String),

    #[error("Registry save failed: {0}")]
    RegistrySaveFailed(String),

    #[error("Vault not found: {0}")]
    VaultNotFound(String),

    #[error("Key already exists: {0}")]
    KeyAlreadyExists(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),

    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

pub type Result<T> = std::result::Result<T, KeyManagementError>;

/// Key Registry Service - application layer for key management
#[derive(Debug)]
pub struct KeyRegistryService;

impl KeyRegistryService {
    pub fn new() -> Self {
        Self
    }

    /// Load the key registry from disk
    #[instrument]
    pub fn load_registry(&self) -> Result<KeyRegistry> {
        debug!("Loading key registry from disk");

        KeyRegistry::load().map_err(|e| {
            error!(error = %e, "Failed to load key registry");
            KeyManagementError::RegistryLoadFailed(e.to_string())
        })
    }

    /// Get a specific key entry by ID
    #[instrument(skip(self))]
    pub fn get_key(&self, key_id: &str) -> Result<KeyEntry> {
        debug!(key_id = %key_id, "Getting key from registry");

        let registry = self.load_registry()?;

        registry.get_key(key_id).cloned().ok_or_else(|| {
            warn!(key_id = %key_id, "Key not found in registry");
            KeyManagementError::KeyNotFound(key_id.to_string())
        })
    }

    /// List all available keys
    #[instrument(skip(self))]
    pub fn list_keys(&self) -> Result<Vec<KeyInfo>> {
        debug!("Listing all keys");

        list_key_files().map_err(|e| {
            error!(error = %e, "Failed to list keys");
            KeyManagementError::StorageError(e.to_string())
        })
    }

    /// Register a new key in the registry
    #[instrument(skip(self, entry))]
    pub fn register_key(&self, key_id: String, entry: KeyEntry) -> Result<()> {
        info!(key_id = %key_id, "Registering new key");

        let mut registry = self.load_registry()?;

        registry.register_key(key_id.clone(), entry).map_err(|e| {
            error!(key_id = %key_id, error = %e, "Failed to register key");
            KeyManagementError::KeyAlreadyExists(key_id.clone())
        })?;

        registry.save().map_err(|e| {
            error!(error = %e, "Failed to save registry after key registration");
            KeyManagementError::RegistrySaveFailed(e.to_string())
        })?;

        info!(key_id = %key_id, "Key registered successfully");
        Ok(())
    }

    /// Update an existing key entry
    #[instrument(skip(self, entry))]
    pub fn update_key(&self, key_id: &str, entry: KeyEntry) -> Result<()> {
        info!(key_id = %key_id, "Updating key");

        let mut registry = self.load_registry()?;

        registry.update_key(key_id, entry).map_err(|e| {
            error!(key_id = %key_id, error = %e, "Failed to update key");
            KeyManagementError::KeyNotFound(key_id.to_string())
        })?;

        registry.save().map_err(|e| {
            error!(error = %e, "Failed to save registry after key update");
            KeyManagementError::RegistrySaveFailed(e.to_string())
        })?;

        info!(key_id = %key_id, "Key updated successfully");
        Ok(())
    }

    /// Remove a key from the registry
    #[instrument(skip(self))]
    pub fn remove_key(&self, key_id: &str) -> Result<KeyEntry> {
        info!(key_id = %key_id, "Removing key from registry");

        let mut registry = self.load_registry()?;

        let removed_entry = registry.remove_key(key_id).map_err(|e| {
            error!(key_id = %key_id, error = %e, "Failed to remove key");
            KeyManagementError::KeyNotFound(key_id.to_string())
        })?;

        registry.save().map_err(|e| {
            error!(error = %e, "Failed to save registry after key removal");
            KeyManagementError::RegistrySaveFailed(e.to_string())
        })?;

        info!(key_id = %key_id, "Key removed successfully");
        Ok(removed_entry)
    }

    /// Check if a key exists in the registry
    #[instrument(skip(self))]
    pub fn contains_key(&self, key_id: &str) -> Result<bool> {
        debug!(key_id = %key_id, "Checking if key exists");

        let registry = self.load_registry()?;
        Ok(registry.contains_key(key_id))
    }

    /// Mark a key as used (updates last_used timestamp)
    #[instrument(skip(self))]
    pub fn mark_key_used(&self, key_id: &str) -> Result<()> {
        debug!(key_id = %key_id, "Marking key as used");

        let mut registry = self.load_registry()?;

        registry
            .mark_key_used(key_id)
            .map_err(KeyManagementError::KeyNotFound)?;

        registry
            .save()
            .map_err(|e| KeyManagementError::RegistrySaveFailed(e.to_string()))?;

        Ok(())
    }

    /// Get all keys that match YubiKey serial
    #[instrument(skip(self))]
    pub fn find_yubikey_by_serial(&self, serial: &str) -> Result<Option<(String, KeyEntry)>> {
        debug!(serial = %serial, "Finding YubiKey by serial");

        let registry = self.load_registry()?;

        Ok(registry
            .find_yubikey_by_serial(serial)
            .map(|(id, entry)| (id.clone(), entry.clone())))
    }

    //
    // NEW LIFECYCLE OPERATIONS
    //

    /// Detach a key from a vault (removes from vault.keys array, keeps key in registry)
    #[instrument(skip(self))]
    pub async fn detach_key_from_vault(&self, key_id: &str, vault_id: &str) -> Result<()> {
        info!(key_id = %key_id, vault_id = %vault_id, "Detaching key from vault");

        // Verify key exists
        let _key_entry = self.get_key(key_id)?;

        // Load vault
        let mut vault = vault::load_vault(vault_id).await.map_err(|e| {
            error!(vault_id = %vault_id, error = %e, "Failed to load vault");
            KeyManagementError::VaultNotFound(vault_id.to_string())
        })?;

        // Remove key from vault's keys array
        if let Some(pos) = vault.keys.iter().position(|k| k == key_id) {
            vault.keys.remove(pos);
            debug!(key_id = %key_id, vault_id = %vault_id, "Key removed from vault keys array");
        } else {
            warn!(key_id = %key_id, vault_id = %vault_id, "Key not found in vault");
            return Err(KeyManagementError::InvalidOperation(format!(
                "Key '{}' is not attached to vault '{}'",
                key_id, vault_id
            )));
        }

        // Save updated vault
        vault::save_vault(&vault).await.map_err(|e| {
            error!(vault_id = %vault_id, error = %e, "Failed to save vault after detaching key");
            KeyManagementError::StorageError(e.to_string())
        })?;

        info!(key_id = %key_id, vault_id = %vault_id, "Key detached successfully");
        Ok(())
    }

    /// Check which vaults are using this key
    #[instrument(skip(self))]
    pub async fn is_key_used_by_vaults(&self, key_id: &str) -> Result<Vec<String>> {
        debug!(key_id = %key_id, "Checking vault usage for key");

        // List all vaults
        let vaults = vault::list_vaults().await.map_err(|e| {
            error!(error = %e, "Failed to list vaults");
            KeyManagementError::StorageError(e.to_string())
        })?;

        // Check each vault for this key
        let mut using_vaults = Vec::new();
        for vault in vaults {
            if vault.keys.contains(&key_id.to_string()) {
                using_vaults.push(vault.id.clone());
            }
        }

        debug!(key_id = %key_id, vault_count = using_vaults.len(), "Key usage check complete");
        Ok(using_vaults)
    }

    /// Delete a key permanently (checks vault usage, deletes encrypted key file for passphrase keys)
    #[instrument(skip(self))]
    pub async fn delete_key_permanently(&self, key_id: &str, confirmation: &str) -> Result<()> {
        info!(key_id = %key_id, "Attempting permanent key deletion");

        // Safety check: require confirmation
        if confirmation != "DELETE" {
            warn!(key_id = %key_id, "Key deletion aborted: incorrect confirmation");
            return Err(KeyManagementError::InvalidOperation(
                "Deletion confirmation required. Please provide 'DELETE' as confirmation."
                    .to_string(),
            ));
        }

        // Check if key is in use by any vaults
        let using_vaults = self.is_key_used_by_vaults(key_id).await?;
        if !using_vaults.is_empty() {
            error!(
                key_id = %key_id,
                vault_count = using_vaults.len(),
                vaults = ?using_vaults,
                "Cannot delete key: still in use by vaults"
            );
            return Err(KeyManagementError::KeyInUse(
                key_id.to_string(),
                using_vaults.len(),
                using_vaults,
            ));
        }

        // Get key entry to determine type
        let key_entry = self.get_key(key_id)?;

        // For passphrase keys, delete the encrypted private key file from disk
        if let KeyEntry::Passphrase { key_filename, .. } = &key_entry {
            debug!(key_id = %key_id, key_filename = %key_filename, "Deleting passphrase key file");

            let key_path = storage::get_key_file_path(key_filename)
                .map_err(|e| KeyManagementError::ConfigurationError(e.to_string()))?;

            if key_path.exists() {
                std::fs::remove_file(&key_path)
                    .map_err(|e| {
                        error!(key_id = %key_id, path = ?key_path, error = %e, "Failed to delete key file");
                        KeyManagementError::StorageError(format!("Failed to delete key file: {}", e))
                    })?;
                info!(key_id = %key_id, "Passphrase key file deleted");
            } else {
                warn!(key_id = %key_id, path = ?key_path, "Key file not found on disk");
            }
        } else {
            debug!(key_id = %key_id, "YubiKey detected - only removing from registry (key stays on hardware)");
        }

        // Remove from registry
        self.remove_key(key_id)?;

        info!(key_id = %key_id, "Key permanently deleted");
        Ok(())
    }
}

impl Default for KeyRegistryService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_service_creation() {
        let _service = KeyRegistryService::new();
        // Verify creation works
    }

    #[test]
    fn test_error_display() {
        let err = KeyManagementError::KeyNotFound("test-key".to_string());
        assert_eq!(err.to_string(), "Key not found: test-key");
    }

    #[test]
    fn test_key_in_use_error() {
        let err = KeyManagementError::KeyInUse(
            "key1".to_string(),
            2,
            vec!["vault1".to_string(), "vault2".to_string()],
        );
        assert!(err.to_string().contains("still attached to 2 vault(s)"));
    }
}
