//! Unified Key List Service
//!
//! Aggregates keys from multiple subsystems (passphrase, YubiKey) into a unified view.
//! Provides filtering and coordination logic for cross-subsystem key operations.

use crate::commands::key_management::unified_keys::{
    KeyInfo, KeyListFilter, convert_available_yubikey_to_unified, convert_passphrase_to_unified,
    convert_yubikey_to_unified,
};
use crate::commands::passphrase::{
    PassphraseKeyInfo, list_available_passphrase_keys_for_vault, list_passphrase_keys_for_vault,
};
use crate::commands::yubikey::device_commands::list_yubikeys;
use crate::commands::yubikey::vault_commands::list_available_yubikeys_for_vault;
use crate::prelude::*;
use crate::services::key_management::shared::KeyEntry;
use crate::services::key_management::shared::application::services::KeyRegistryService;
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

        // Get all YubiKeys using proper Layer 2 delegation
        match list_yubikeys().await {
            Ok(yubikey_list) => {
                for yubikey in yubikey_list {
                    all_keys.push(convert_yubikey_to_unified(yubikey, None));
                }
            }
            Err(e) => {
                warn!("Failed to get all YubiKeys: {:?}", e);
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

        // Get passphrase keys for vault using Layer 2 command
        match list_passphrase_keys_for_vault(vault_id.clone()).await {
            Ok(passphrase_response) => {
                for key in passphrase_response.keys {
                    unified_keys.push(convert_passphrase_to_unified(key, Some(vault_id.clone())));
                }
            }
            Err(e) => {
                warn!(
                    vault_id = %vault_id,
                    error = ?e,
                    "Failed to get passphrase keys for vault"
                );
            }
        }

        // Get YubiKeys for vault by filtering all YubiKeys
        let vault = crate::storage::vault_store::load_vault(&vault_id)
            .await
            .map_err(|e| format!("Failed to load vault: {}", e))?;

        let registry = self
            .registry_service
            .load_registry()
            .map_err(|e| format!("Failed to load registry: {}", e))?;

        let vault_yubikey_serials: HashSet<String> = vault
            .keys
            .iter()
            .filter_map(|key_id| {
                if let Some(KeyEntry::Yubikey { serial, .. }) = registry.get_key(key_id) {
                    Some(serial.clone())
                } else {
                    None
                }
            })
            .collect();

        // Get all YubiKeys and filter for ones in this vault
        match list_yubikeys().await {
            Ok(all_yubikeys) => {
                for yubikey in all_yubikeys {
                    if vault_yubikey_serials.contains(&yubikey.serial) {
                        unified_keys
                            .push(convert_yubikey_to_unified(yubikey, Some(vault_id.clone())));
                    }
                }
            }
            Err(e) => {
                warn!(
                    vault_id = %vault_id,
                    error = ?e,
                    "Failed to get YubiKeys for vault filtering"
                );
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

        // Get available passphrase keys using Layer 2 command
        match list_available_passphrase_keys_for_vault(vault_id.clone()).await {
            Ok(passphrase_response) => {
                for key in passphrase_response.keys {
                    available_keys.push(convert_passphrase_to_unified(key, None));
                }
            }
            Err(e) => {
                warn!(
                    vault_id = %vault_id,
                    error = ?e,
                    "Failed to get available passphrase keys"
                );
            }
        }

        // Get available YubiKeys using Layer 2 command
        match list_available_yubikeys_for_vault(vault_id.clone()).await {
            Ok(available_yubikeys) => {
                for yubikey in available_yubikeys {
                    available_keys.push(convert_available_yubikey_to_unified(yubikey, None));
                }
            }
            Err(e) => {
                warn!(
                    vault_id = %vault_id,
                    error = ?e,
                    "Failed to get available YubiKeys"
                );
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
        match list_yubikeys().await {
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
                warn!("Failed to get connected YubiKeys: {:?}", e);
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
