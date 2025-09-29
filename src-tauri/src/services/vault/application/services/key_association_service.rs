use crate::models::{KeyReference, KeyState, KeyType};
use crate::services::vault::domain::{VaultError, VaultResult, VaultRules};
use crate::services::vault::infrastructure::VaultRepository;
use crate::storage::KeyRegistry;
use chrono::Utc;

pub struct KeyAssociationService {
    repository: VaultRepository,
}

impl KeyAssociationService {
    pub fn new() -> Self {
        Self {
            repository: VaultRepository::new(),
        }
    }

    /// Get all keys for a vault
    pub async fn get_vault_keys(&self, vault_id: &str) -> VaultResult<Vec<KeyReference>> {
        let vault = self.repository.get_vault(vault_id).await?;
        let registry = KeyRegistry::load().map_err(|e| VaultError::StorageError(e.to_string()))?;

        let mut key_references = Vec::new();

        for key_id in &vault.keys {
            if let Some(entry) = registry.get_key(key_id) {
                let key_ref = match entry {
                    crate::storage::KeyEntry::Passphrase {
                        label,
                        created_at,
                        last_used,
                        ..
                    } => {
                        KeyReference {
                            id: key_id.clone(),
                            key_type: KeyType::Passphrase {
                                key_id: key_id.clone(),
                            },
                            label: label.clone(),
                            state: KeyState::Active, // Passphrase keys are always active
                            created_at: *created_at,
                            last_used: *last_used,
                        }
                    }
                    crate::storage::KeyEntry::Yubikey {
                        label,
                        serial,
                        created_at,
                        last_used,
                        firmware_version,
                        ..
                    } => {
                        KeyReference {
                            id: key_id.clone(),
                            key_type: KeyType::Yubikey {
                                serial: serial.clone(),
                                firmware_version: firmware_version.clone(),
                            },
                            label: label.clone(),
                            state: KeyState::Registered, // TODO: Check if YubiKey is actually connected
                            created_at: *created_at,
                            last_used: *last_used,
                        }
                    }
                };
                key_references.push(key_ref);
            }
        }

        Ok(key_references)
    }

    /// Add key to vault with business rule validation
    pub async fn add_key_to_vault(
        &self,
        vault_id: &str,
        key_id: String,
        key_type: String,
        label: String,
    ) -> VaultResult<KeyReference> {
        let mut vault = self.repository.get_vault(vault_id).await?;

        // Apply business rules
        VaultRules::can_add_key(vault.keys.len(), &key_type)?;

        // Check if key already in vault
        if vault.keys.contains(&key_id) {
            return Err(VaultError::InvalidOperation(
                "Key is already associated with this vault".to_string(),
            ));
        }

        // Add key to vault
        vault
            .add_key_id(key_id.clone())
            .map_err(VaultError::InvalidOperation)?;

        // Save updated vault
        self.repository.save_vault(&vault).await?;

        // Create key reference for response
        let key_type_enum = match key_type.as_str() {
            "passphrase" => KeyType::Passphrase {
                key_id: key_id.clone(),
            },
            "yubikey" => KeyType::Yubikey {
                serial: key_id.clone(),
                firmware_version: None,
            }, // TODO: Get real serial
            _ => {
                return Err(VaultError::InvalidOperation(format!(
                    "Unknown key type: {}",
                    key_type
                )));
            }
        };

        Ok(KeyReference {
            id: key_id,
            key_type: key_type_enum,
            label,
            state: KeyState::Active,
            created_at: Utc::now(),
            last_used: None,
        })
    }

    /// Remove key from vault with business rule validation
    pub async fn remove_key_from_vault(&self, vault_id: &str, key_id: &str) -> VaultResult<()> {
        let mut vault = self.repository.get_vault(vault_id).await?;

        // Apply business rules
        VaultRules::can_remove_key(vault.keys.len())?;

        // Check if key exists in vault
        if !vault.keys.contains(&key_id.to_string()) {
            return Err(VaultError::KeyNotFound(key_id.to_string()));
        }

        // Remove key from vault
        vault
            .remove_key(key_id)
            .map_err(VaultError::InvalidOperation)?;

        // Save updated vault
        self.repository.save_vault(&vault).await?;

        Ok(())
    }

    /// Update key label
    pub async fn update_key_label(
        &self,
        _vault_id: &str,
        _key_id: &str,
        _new_label: String,
    ) -> VaultResult<()> {
        // TODO: Implement key label update logic
        // This would need to update the key registry, not just the vault
        Err(VaultError::InvalidOperation(
            "Key label update not implemented yet".to_string(),
        ))
    }
}

impl Default for KeyAssociationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_key_association_service_creation() {
        let _service = KeyAssociationService::new();
        // Just verify creation works
    }
}
