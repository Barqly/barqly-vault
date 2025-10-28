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
use crate::services::key_management::shared::domain::models::key_lifecycle::{
    KeyLifecycleStatus, StatusHistoryEntry,
};
use crate::services::key_management::shared::infrastructure::{
    KeyEntry, KeyInfo, KeyRegistry, list_keys as list_key_files,
};
use crate::services::shared;
use crate::services::vault;
use crate::services::vault::infrastructure::persistence::metadata::{
    RecipientInfo, RecipientType, VaultMetadata,
};

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

/// Merge strategy for handling duplicate public keys
#[derive(Debug, Clone, Copy)]
pub enum MergeStrategy {
    /// Skip if key_id exists (bootstrap: additive only)
    Additive,
    /// Replace if same public_key with different key_id (recovery: authoritative)
    ReplaceIfDuplicate,
}

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

    /// Detach a key from a vault (removes recipient from metadata, keeps key in registry)
    #[instrument(skip(self))]
    pub async fn detach_key_from_vault(&self, key_id: &str, vault_id: &str) -> Result<()> {
        info!(key_id = %key_id, vault_id = %vault_id, "Detaching key from vault");

        // Verify key exists
        let key_entry = self.get_key(key_id)?;

        // Load vault metadata
        let mut metadata = vault::load_vault(vault_id).await.map_err(|e| {
            error!(vault_id = %vault_id, error = %e, "Failed to load vault");
            KeyManagementError::VaultNotFound(vault_id.to_string())
        })?;

        // Get the label from the key entry
        let key_label = match &key_entry {
            crate::services::key_management::shared::KeyEntry::Passphrase { label, .. } => {
                label.clone()
            }
            crate::services::key_management::shared::KeyEntry::Yubikey { label, .. } => {
                label.clone()
            }
        };

        // Remove recipient by label (idempotent)
        if metadata.remove_recipient(&key_label).is_some() {
            debug!(key_id = %key_id, vault_id = %vault_id, "Recipient removed from vault metadata");
        } else {
            info!(
                key_id = %key_id,
                vault_id = %vault_id,
                "Key already not attached to vault (idempotent - no-op)"
            );
            return Ok(()); // Already not attached - success (no-op)
        }

        // Save updated vault metadata
        vault::save_vault(&metadata).await.map_err(|e| {
            error!(vault_id = %vault_id, error = %e, "Failed to save vault after detaching key");
            KeyManagementError::StorageError(e.to_string())
        })?;

        // CRITICAL: Update global key registry (mirror of attach logic)
        // This was missing and caused registry-manifest desynchronization

        // Step 1: Load global registry
        let mut registry = self.load_registry()?;

        // Step 2: Get mutable key entry and perform updates
        {
            let key_entry = registry.get_key_mut(key_id).ok_or_else(|| {
                error!(key_id = %key_id, "Key not found in registry during detach sync");
                KeyManagementError::KeyNotFound(key_id.to_string())
            })?;

            // Step 3: Remove vault from associations
            key_entry.remove_vault_association(vault_id);

            let remaining_vaults = key_entry.vault_associations().len();

            debug!(
                key_id = %key_id,
                vault_id = %vault_id,
                remaining_vaults = remaining_vaults,
                "Removed vault from key's vault_associations"
            );

            // Step 4: Update lifecycle status based on remaining vault associations
            if key_entry.vault_associations().is_empty() {
                // No more vaults → Transition to Suspended
                key_entry
                    .set_lifecycle_status(
                        crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus::Suspended,
                        format!("Detached from last vault '{}'", vault_id),
                        "system".to_string(),
                    )
                    .map_err(|e| {
                        error!(key_id = %key_id, error = %e, "Failed to set lifecycle status to Suspended");
                        KeyManagementError::InvalidOperation(e)
                    })?;

                info!(
                    key_id = %key_id,
                    vault_id = %vault_id,
                    remaining_vaults = remaining_vaults,
                    "Key transitioned to Suspended (no more vault associations)"
                );
            } else {
                // Still attached to other vaults → Stay Active, but log the detachment
                debug!(
                    key_id = %key_id,
                    vault_id = %vault_id,
                    remaining_vaults = remaining_vaults,
                    "Key still Active (attached to other vaults)"
                );
            }
        } // key_entry mutable borrow ends here

        // Step 5: Save updated registry (borrow ended, safe to save)
        registry.save().map_err(|e| {
            error!(error = %e, "Failed to save registry after key detachment");
            KeyManagementError::RegistrySaveFailed(e.to_string())
        })?;

        info!(
            key_id = %key_id,
            vault_id = %vault_id,
            "Key detached successfully and registry synchronized"
        );

        Ok(())
    }

    /// Check which vaults are using this key
    #[instrument(skip(self))]
    pub async fn is_key_used_by_vaults(&self, key_id: &str) -> Result<Vec<String>> {
        debug!(key_id = %key_id, "Checking vault usage for key");

        // Get key entry to find label
        let key_entry = self.get_key(key_id)?;
        let key_label = match &key_entry {
            crate::services::key_management::shared::KeyEntry::Passphrase { label, .. } => {
                label.clone()
            }
            crate::services::key_management::shared::KeyEntry::Yubikey { label, .. } => {
                label.clone()
            }
        };

        // List all vaults
        let vaults = vault::list_vaults().await.map_err(|e| {
            error!(error = %e, "Failed to list vaults");
            KeyManagementError::StorageError(e.to_string())
        })?;

        // Check each vault for this key (by label in recipients)
        let mut using_vaults = Vec::new();
        for metadata in vaults {
            if metadata.recipients().iter().any(|r| r.label == key_label) {
                using_vaults.push(metadata.vault_id().to_string());
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

            let key_path = shared::get_key_file_path(key_filename)
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

    //
    // SHARED UTILITIES FOR REGISTRY-MANIFEST SYNCHRONIZATION
    //

    /// Convert vault RecipientInfo to KeyEntry for registry
    /// Shared utility used by both bootstrap and recovery flows
    pub fn recipient_to_key_entry(recipient: &RecipientInfo) -> KeyEntry {
        match &recipient.recipient_type {
            RecipientType::Passphrase { key_filename } => KeyEntry::Passphrase {
                label: recipient.label.clone(),
                created_at: recipient.created_at,
                last_used: None,
                public_key: recipient.public_key.clone(),
                key_filename: key_filename.clone(),
                lifecycle_status: KeyLifecycleStatus::Active, // From manifest means it's active
                status_history: vec![StatusHistoryEntry::new(
                    KeyLifecycleStatus::Active,
                    "Imported from vault manifest",
                    "system",
                )],
                vault_associations: vec![], // Will be populated by higher level
                deactivated_at: None,
                previous_lifecycle_status: None,
            },
            RecipientType::YubiKey {
                serial,
                slot,
                piv_slot,
                identity_tag,
                model,
                firmware_version,
            } => KeyEntry::Yubikey {
                label: recipient.label.clone(),
                created_at: recipient.created_at,
                last_used: None,
                serial: serial.clone(),
                slot: *slot,
                piv_slot: *piv_slot,
                recipient: recipient.public_key.clone(),
                identity_tag: identity_tag.clone(),
                model: model.clone(),
                firmware_version: firmware_version.clone(),
                recovery_code_hash: String::new(), // Not available from manifest
                lifecycle_status: KeyLifecycleStatus::Active, // From manifest means it's active
                status_history: vec![StatusHistoryEntry::new(
                    KeyLifecycleStatus::Active,
                    "Imported from vault manifest",
                    "system",
                )],
                vault_associations: vec![], // Will be populated by higher level
                deactivated_at: None,
                previous_lifecycle_status: None,
            },
        }
    }

    /// Find key by public key (returns key_id if exists)
    #[instrument(skip(self))]
    pub fn find_by_public_key(&self, public_key: &str) -> Result<Option<String>> {
        let registry = self.load_registry()?;

        for (key_id, entry) in registry.keys.iter() {
            match entry {
                KeyEntry::Passphrase { public_key: pk, .. } if pk == public_key => {
                    return Ok(Some(key_id.clone()));
                }
                KeyEntry::Yubikey { recipient, .. } if recipient == public_key => {
                    return Ok(Some(key_id.clone()));
                }
                _ => continue,
            }
        }

        Ok(None)
    }

    /// Generate key_id from recipient (matches BootstrapService logic)
    fn generate_key_id_from_recipient(recipient: &RecipientInfo) -> String {
        // Use the key_id field directly from RecipientInfo
        recipient.key_id.clone()
    }

    /// Merge keys from vault manifest into registry
    #[instrument(skip(self, manifest))]
    pub fn merge_keys_from_manifest(
        &self,
        manifest: &VaultMetadata,
        vault_id: &str,
        strategy: MergeStrategy,
    ) -> Result<usize> {
        let mut registry = self.load_registry()?;
        let mut keys_added = 0;

        for recipient in manifest.recipients() {
            let key_id = Self::generate_key_id_from_recipient(recipient);

            // Handle duplicates based on strategy
            match strategy {
                MergeStrategy::Additive => {
                    // Bootstrap: Skip if key_id exists
                    if registry.keys.contains_key(&key_id) {
                        debug!(
                            key_id = %key_id,
                            "Key already in registry (additive strategy), skipping"
                        );
                        continue;
                    }
                }
                MergeStrategy::ReplaceIfDuplicate => {
                    // Recovery: Deactivate orphaned recovery key if same public_key exists
                    if let Some(existing_id) = self.find_by_public_key(&recipient.public_key)? {

                        // Get existing entry to check vault associations
                        if let Some(existing_entry) = registry.keys.get_mut(&existing_id) {

                            // Only deactivate if NOT attached to any vault (orphaned recovery key)
                            if existing_entry.vault_associations().is_empty() {

                                // Deactivate orphaned recovery key (safe - no file deletion)
                                existing_entry.set_lifecycle_status(
                                    KeyLifecycleStatus::Deactivated,
                                    "Replaced by authoritative version from vault manifest during recovery".to_string(),
                                    "system".to_string(),
                                ).map_err(|e| {
                                    warn!("Failed to deactivate recovery key: {}", e);
                                    KeyManagementError::InvalidOperation(format!("Failed to deactivate key: {}", e))
                                })?;

                                info!(
                                    existing_key = %existing_id,
                                    bundle_key = %key_id,
                                    "Deactivated orphaned recovery key (bundle version is authoritative)"
                                );
                            } else {
                                // Key is attached to other vaults - keep it active
                                debug!(
                                    existing_key = %existing_id,
                                    vault_count = existing_entry.vault_associations().len(),
                                    "Key with matching public key attached to other vaults, keeping both entries"
                                );
                            }
                        }
                    }
                    // Continue to add bundle version as new entry (creates duplicate temporarily)
                }
            }

            // Create key entry
            let mut key_entry = Self::recipient_to_key_entry(recipient);

            // Add vault association
            key_entry.add_vault_association(vault_id.to_string());

            // Insert into registry
            registry.keys.insert(key_id.clone(), key_entry);
            keys_added += 1;

            info!(
                key_id = %key_id,
                label = %recipient.label,
                vault = %manifest.label(),
                strategy = ?strategy,
                "Added key from manifest to registry"
            );
        }

        // Save registry
        registry.save().map_err(|e| {
            error!(error = %e, "Failed to save registry after merging keys");
            KeyManagementError::RegistrySaveFailed(e.to_string())
        })?;

        info!(
            keys_added = keys_added,
            vault = %manifest.label(),
            strategy = ?strategy,
            "Registry merge completed"
        );

        Ok(keys_added)
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
