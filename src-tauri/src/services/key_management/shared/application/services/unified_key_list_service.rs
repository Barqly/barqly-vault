//! Unified Key List Service
//!
//! Aggregates keys from multiple subsystems (passphrase, YubiKey) into a unified view.
//! Provides filtering and coordination logic for cross-subsystem key operations.

use crate::commands::key_management::unified_keys::{
    convert_available_yubikey_to_unified, convert_passphrase_to_unified, convert_yubikey_to_unified,
    KeyInfo, KeyListFilter,
};
use crate::commands::passphrase::{
    list_available_passphrase_keys_for_vault, list_passphrase_keys_for_vault, PassphraseKeyInfo,
};
use crate::commands::yubikey::device_commands::{list_yubikeys, YubiKeyStateInfo};
use crate::commands::yubikey::vault_commands::{list_available_yubikeys_for_vault, AvailableYubiKey};
use crate::prelude::*;
use crate::services::key_management::shared::application::services::KeyRegistryService;
use crate::storage::KeyEntry;

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
        let key_infos = self
            .registry_service
            .list_keys()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        for key_info in key_infos {
            // list_keys returns storage::KeyInfo, need to get full entry to check type
            let entry = self.registry_service.get_key(&key_info.id).ok();

            if let Some(KeyEntry::Passphrase {
                label,
                created_at,
                last_used,
                public_key,
                ..
            }) = entry
            {
                let passphrase_info = PassphraseKeyInfo {
                    id: key_info.id.clone(),
                    label,
                    public_key,
                    created_at,
                    last_used,
                    is_available: true,
                };
                all_keys.push(
                    convert_passphrase_to_unified(
                        passphrase_info,
                        None,
                    ),
                );
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

        // Get passphrase keys for vault
        match list_passphrase_keys_for_vault(vault_id.clone()).await {
            Ok(passphrase_keys) => {
                for key in passphrase_keys {
                    unified_keys.push(
                        convert_passphrase_to_unified(
                            key,
                            Some(vault_id.clone()),
                        ),
                    );
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

        // Get YubiKeys for vault (using existing command delegation)
        match list_yubikeys().await {
            Ok(yubikey_list) => {
                // Filter YubiKeys that belong to this vault
                let vault = crate::storage::vault_store::load_vault(&vault_id).await.ok();
                if let Some(vault) = vault {
                    for yubikey in yubikey_list {
                        // Check if this YubiKey's serial is in vault's keys
                        let yubikey_id = format!("yubikey_{}", yubikey.serial);
                        if vault.keys.contains(&yubikey_id) {
                            unified_keys.push(
                                convert_yubikey_to_unified(
                                    yubikey,
                                    Some(vault_id.clone()),
                                ),
                            );
                        }
                    }
                }
            }
            Err(e) => {
                warn!(
                    vault_id = %vault_id,
                    error = ?e,
                    "Failed to get YubiKeys for vault"
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

        // Get available passphrase keys
        match list_available_passphrase_keys_for_vault(vault_id.clone()).await {
            Ok(passphrase_keys) => {
                for key in passphrase_keys {
                    available_keys.push(
                        convert_passphrase_to_unified(
                            key, None,
                        ),
                    );
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

        // Get available YubiKeys
        match list_available_yubikeys_for_vault(vault_id.clone()).await {
            Ok(available_yubikeys) => {
                for yubikey in available_yubikeys {
                    available_keys.push(
                        convert_available_yubikey_to_unified(
                            yubikey, None,
                        ),
                    );
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
        let key_infos = self
            .registry_service
            .list_keys()
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;

        for key_info in key_infos {
            let entry = self.registry_service.get_key(&key_info.id).ok();

            if let Some(KeyEntry::Passphrase {
                label,
                created_at,
                last_used,
                public_key,
                ..
            }) = entry
            {
                let passphrase_info = PassphraseKeyInfo {
                    id: key_info.id.clone(),
                    label,
                    public_key,
                    created_at,
                    last_used,
                    is_available: true,
                };
                connected_keys.push(
                    convert_passphrase_to_unified(
                        passphrase_info,
                        None,
                    ),
                );
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
                        connected_keys.push(
                            convert_yubikey_to_unified(
                                yubikey, None,
                            ),
                        );
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
