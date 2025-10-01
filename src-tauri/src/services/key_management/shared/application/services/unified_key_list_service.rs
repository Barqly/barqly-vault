//! Unified Key List Service
//!
//! Aggregates keys from multiple subsystems (passphrase, YubiKey) into a unified view.
//! Provides filtering and coordination logic for cross-subsystem key operations.

use crate::commands::key_management::unified_keys::{
    KeyInfo, KeyListFilter, convert_passphrase_to_unified, convert_yubikey_to_unified,
};
use crate::commands::passphrase::PassphraseKeyInfo;
use crate::prelude::*;
use crate::services::key_management::shared::KeyEntry;
use crate::services::key_management::shared::application::services::KeyRegistryService;
use crate::services::key_management::yubikey::YubiKeyManager;
use crate::services::vault::VaultManager;
use std::collections::HashSet;

/// Service for unified key listing across all key types
#[derive(Debug)]
pub struct UnifiedKeyListService {
    registry_service: KeyRegistryService,
}

impl UnifiedKeyListService {
    pub fn new() -> Self {
        Self {
            registry_service: KeyRegistryService::new(),
        }
    }

    /// List keys with flexible filtering options
    #[instrument(skip(self))]
    pub async fn list_keys(
        &self,
        filter: KeyListFilter,
    ) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        info!("Listing unified keys with filter: {:?}", filter);

        match filter {
            KeyListFilter::All => self.list_all_keys().await,
            KeyListFilter::ForVault(vault_id) => self.list_vault_keys(vault_id).await,
            KeyListFilter::AvailableForVault(vault_id) => {
                self.list_available_for_vault(vault_id).await
            }
            KeyListFilter::ConnectedOnly => self.list_connected_keys().await,
        }
    }

    /// List all registered keys across all vaults
    async fn list_all_keys(&self) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        let mut all_keys = Vec::new();

        // Get all YubiKeys using YubiKeyManager
        match YubiKeyManager::new().await {
            Ok(yubikey_manager) => match yubikey_manager.list_yubikeys_with_state().await {
                Ok(yubikey_list) => {
                    for yubikey in yubikey_list {
                        all_keys.push(convert_yubikey_to_unified(yubikey, None));
                    }
                }
                Err(e) => {
                    warn!("Failed to list YubiKey devices: {:?}", e);
                }
            },
            Err(e) => {
                warn!("Failed to initialize YubiKeyManager: {:?}", e);
                // Continue with other key types even if YubiKeys fail
            }
        }

        // Get all passphrase keys from registry using KeyRegistryService
        match self.registry_service.load_registry() {
            Ok(registry) => {
                for (key_id, entry) in registry.keys {
                    if let KeyEntry::Passphrase {
                        label,
                        created_at,
                        last_used,
                        public_key,
                        ..
                    } = entry
                    {
                        let passphrase_info = PassphraseKeyInfo {
                            id: key_id,
                            label,
                            public_key,
                            created_at,
                            last_used,
                            is_available: true,
                        };
                        all_keys.push(convert_passphrase_to_unified(passphrase_info, None));
                    }
                }
            }
            Err(e) => {
                warn!("Failed to load key registry: {:?}", e);
            }
        }

        Ok(all_keys)
    }

    /// List keys for a specific vault
    async fn list_vault_keys(
        &self,
        vault_id: String,
    ) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        let mut unified_keys = Vec::new();

        // Get vault first - needed for both passphrase and YubiKey filtering
        let vault = match VaultManager::new().get_vault(&vault_id).await {
            Ok(v) => v,
            Err(e) => {
                warn!(vault_id = %vault_id, error = ?e, "Failed to load vault");
                return Ok(unified_keys);
            }
        };

        // Get passphrase keys for vault
        match self.registry_service.load_registry() {
            Ok(registry) => {
                for key_id in &vault.keys {
                    if let Some(KeyEntry::Passphrase {
                        label,
                        created_at,
                        last_used,
                        public_key,
                        ..
                    }) = registry.get_key(key_id)
                    {
                        let passphrase_info = PassphraseKeyInfo {
                            id: key_id.clone(),
                            label: label.clone(),
                            public_key: public_key.clone(),
                            created_at: *created_at,
                            last_used: *last_used,
                            is_available: true,
                        };
                        unified_keys.push(convert_passphrase_to_unified(
                            passphrase_info,
                            Some(vault_id.clone()),
                        ));
                    }
                }
            }
            Err(e) => {
                warn!(vault_id = %vault_id, error = ?e, "Failed to load registry");
            }
        }

        // Get YubiKeys for vault - filter connected YubiKeys that are in this vault
        // Filter YubiKeys that are in this vault
        match YubiKeyManager::new().await {
            Ok(yubikey_manager) => {
                match yubikey_manager.list_yubikeys_with_state().await {
                    Ok(all_yubikeys) => {
                        // Get vault yubikey serials from registry
                        if let Ok(registry) = self.registry_service.load_registry() {
                            let vault_yubikey_serials: HashSet<String> = vault
                                .keys
                                .iter()
                                .filter_map(|key_id| {
                                    if let Some(KeyEntry::Yubikey { serial, .. }) =
                                        registry.get_key(key_id)
                                    {
                                        Some(serial.clone())
                                    } else {
                                        None
                                    }
                                })
                                .collect();

                            // Filter YubiKeys that are in this vault
                            for yubikey in all_yubikeys {
                                if vault_yubikey_serials.contains(&yubikey.serial) {
                                    unified_keys.push(convert_yubikey_to_unified(
                                        yubikey,
                                        Some(vault_id.clone()),
                                    ));
                                }
                            }
                        }
                    }
                    Err(e) => {
                        warn!(vault_id = %vault_id, error = ?e, "Failed to list YubiKeys");
                    }
                }
            }
            Err(e) => {
                warn!(vault_id = %vault_id, error = ?e, "Failed to initialize YubiKeyManager");
            }
        }

        Ok(unified_keys)
    }

    /// List keys available to add to a vault (not already in vault)
    async fn list_available_for_vault(
        &self,
        vault_id: String,
    ) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        let mut available_keys = Vec::new();

        // Get vault and registry to determine which keys are already in vault
        match VaultManager::new().get_vault(&vault_id).await {
            Ok(vault) => {
                let vault_key_ids: HashSet<String> = vault.keys.iter().cloned().collect();

                // Get available passphrase keys (not in vault)
                match self.registry_service.load_registry() {
                    Ok(registry) => {
                        for (key_id, entry) in registry.keys.iter() {
                            if let KeyEntry::Passphrase {
                                label,
                                created_at,
                                last_used,
                                public_key,
                                ..
                            } = entry
                                && !vault_key_ids.contains(key_id)
                            {
                                let passphrase_info = PassphraseKeyInfo {
                                    id: key_id.clone(),
                                    label: label.clone(),
                                    public_key: public_key.clone(),
                                    created_at: *created_at,
                                    last_used: *last_used,
                                    is_available: true,
                                };
                                available_keys
                                    .push(convert_passphrase_to_unified(passphrase_info, None));
                            }
                        }
                    }
                    Err(e) => {
                        warn!(vault_id = %vault_id, error = ?e, "Failed to load registry");
                    }
                }

                // Get available YubiKeys (not in vault) - would need YubiKey availability logic
                // For now, skip as this requires more complex YubiKey state management
                // TODO: Implement YubiKey available-for-vault logic without calling commands
            }
            Err(e) => {
                warn!(vault_id = %vault_id, error = ?e, "Failed to load vault");
            }
        }

        Ok(available_keys)
    }

    /// List only currently connected/available keys (for decryption UI)
    async fn list_connected_keys(&self) -> Result<Vec<KeyInfo>, Box<dyn std::error::Error>> {
        let mut connected_keys = Vec::new();

        // All passphrase keys are always "connected" (available on disk)
        match self.registry_service.load_registry() {
            Ok(registry) => {
                for (key_id, entry) in registry.keys {
                    if let KeyEntry::Passphrase {
                        label,
                        created_at,
                        last_used,
                        public_key,
                        ..
                    } = entry
                    {
                        let passphrase_info = PassphraseKeyInfo {
                            id: key_id,
                            label,
                            public_key,
                            created_at,
                            last_used,
                            is_available: true,
                        };
                        connected_keys.push(convert_passphrase_to_unified(passphrase_info, None));
                    }
                }
            }
            Err(e) => {
                warn!("Failed to load key registry: {:?}", e);
            }
        }

        // Only include YubiKeys that are physically connected
        match YubiKeyManager::new().await {
            Ok(yubikey_manager) => {
                match yubikey_manager.list_yubikeys_with_state().await {
                    Ok(yubikey_list) => {
                        for yubikey in yubikey_list {
                            // Only include if yubikey is in a "connected" state
                            if matches!(
                                yubikey.state,
                                crate::commands::yubikey::device_commands::YubiKeyState::Registered
                                    | crate::commands::yubikey::device_commands::YubiKeyState::Orphaned
                                    | crate::commands::yubikey::device_commands::YubiKeyState::Reused
                            ) {
                                connected_keys.push(convert_yubikey_to_unified(yubikey, None));
                            }
                        }
                    }
                    Err(e) => {
                        warn!("Failed to list YubiKey devices: {:?}", e);
                    }
                }
            }
            Err(e) => {
                warn!("Failed to initialize YubiKeyManager: {:?}", e);
            }
        }

        Ok(connected_keys)
    }
}

impl Default for UnifiedKeyListService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unified_key_list_service_creation() {
        let _service = UnifiedKeyListService::new();
        // Just verify creation works
    }
}
