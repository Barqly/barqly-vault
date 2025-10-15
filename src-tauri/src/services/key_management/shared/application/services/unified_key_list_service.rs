//! Unified Key List Service
//!
//! Aggregates keys from multiple subsystems (passphrase, YubiKey) into a unified view.
//! Provides filtering and coordination logic for cross-subsystem key operations.

use crate::prelude::*;
use crate::services::key_management::passphrase::domain::models::passphrase_key_info::PassphraseKeyInfo;
use crate::services::key_management::shared::KeyEntry;
use crate::services::key_management::shared::application::services::KeyRegistryService;
use crate::services::key_management::shared::domain::models::KeyType;
use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::key_management::shared::domain::models::key_reference::{
    GlobalKey, KeyListFilter, YubiKeyInfo,
};
use crate::services::key_management::yubikey::YubiKeyManager;
use crate::services::key_management::yubikey::domain::models::{
    available_yubikey::AvailableYubiKey,
    state::{PinStatus, YubiKeyState},
    yubikey_state_info::YubiKeyStateInfo,
};
use crate::services::vault::VaultManager;
use std::collections::HashSet;

// Conversion functions to transform Layer 2 types to unified types

/// Convert PassphraseKeyInfo to unified GlobalKey
fn convert_passphrase_to_unified(
    passphrase_key: PassphraseKeyInfo,
    vault_associations: Vec<String>,
) -> GlobalKey {
    let key_id = passphrase_key.id.clone();
    GlobalKey {
        id: passphrase_key.id,
        label: passphrase_key.label,
        key_type: KeyType::Passphrase { key_id },
        recipient: passphrase_key.public_key, // Real public key from registry!
        is_available: passphrase_key.is_available,
        vault_associations,
        lifecycle_status: KeyLifecycleStatus::Active, // Passphrase keys are always active when in registry
        created_at: passphrase_key.created_at,
        last_used: passphrase_key.last_used,
        yubikey_info: None,
    }
}

/// Convert YubiKeyStateInfo to unified GlobalKey
fn convert_yubikey_to_unified(
    yubikey_key: YubiKeyStateInfo,
    vault_associations: Vec<String>,
) -> GlobalKey {
    let is_available = match yubikey_key.state {
        YubiKeyState::Registered => true,
        YubiKeyState::Orphaned => true,
        YubiKeyState::Reused => true,
        YubiKeyState::New => false,
    };

    GlobalKey {
        id: format!("yubikey_{}", yubikey_key.serial), // Generate consistent ID
        label: yubikey_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", yubikey_key.serial)),
        key_type: KeyType::YubiKey {
            serial: yubikey_key.serial.clone(),
            firmware_version: yubikey_key.firmware_version.clone(), // Real firmware version from registry/device
        },
        recipient: yubikey_key
            .recipient
            .unwrap_or_else(|| "unknown".to_string()), // Real recipient from registry!
        is_available,
        vault_associations,
        lifecycle_status: match yubikey_key.state {
            YubiKeyState::Registered => KeyLifecycleStatus::Active,
            YubiKeyState::Orphaned => KeyLifecycleStatus::Suspended, // Was used before
            YubiKeyState::Reused => KeyLifecycleStatus::PreActivation,
            YubiKeyState::New => KeyLifecycleStatus::PreActivation,
        },
        created_at: yubikey_key.created_at,
        last_used: yubikey_key.last_used,
        yubikey_info: Some(YubiKeyInfo {
            slot: yubikey_key.slot,
            identity_tag: yubikey_key.identity_tag,
            pin_status: yubikey_key.pin_status,
            yubikey_state: yubikey_key.state,
        }),
    }
}

/// Convert AvailableYubiKey to unified GlobalKey
fn convert_available_yubikey_to_unified(available_key: AvailableYubiKey) -> GlobalKey {
    use chrono::Utc;

    GlobalKey {
        id: format!("available_yubikey_{}", available_key.serial),
        label: available_key
            .label
            .unwrap_or_else(|| format!("YubiKey-{}", available_key.serial)),
        key_type: KeyType::YubiKey {
            serial: available_key.serial.clone(),
            firmware_version: None,
        },
        recipient: available_key
            .recipient
            .unwrap_or_else(|| "pending".to_string()),
        is_available: true,
        vault_associations: vec![], // Available keys not yet attached to any vault
        created_at: Utc::now(),     // Not yet registered, use current time
        lifecycle_status: available_key.lifecycle_status,
        last_used: None,
        yubikey_info: Some(YubiKeyInfo {
            slot: available_key.slot,
            identity_tag: available_key.identity_tag,
            pin_status: PinStatus::Custom, // Simplified for available keys
            yubikey_state: match available_key.state.as_str() {
                "new" => YubiKeyState::New,
                "orphaned" => YubiKeyState::Orphaned,
                _ => YubiKeyState::Orphaned,
            },
        }),
    }
}

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
    ) -> Result<Vec<GlobalKey>, Box<dyn std::error::Error>> {
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
    ///
    /// **Design:** Registry is the single source of truth. Returns ALL keys in registry
    /// regardless of hardware connection status. For YubiKeys, checks if device is
    /// currently connected and sets is_available accordingly.
    async fn list_all_keys(&self) -> Result<Vec<GlobalKey>, Box<dyn std::error::Error>> {
        let mut all_keys = Vec::new();

        // Initialize YubiKey manager for connection status checks (optional - don't fail if unavailable)
        let yubikey_manager = YubiKeyManager::new().await.ok();

        // Load registry - this is the source of truth for ALL keys
        let registry = match self.registry_service.load_registry() {
            Ok(r) => r,
            Err(e) => {
                warn!("Failed to load key registry: {:?}", e);
                return Ok(all_keys);
            }
        };

        // Iterate through ALL registry entries (passphrase + yubikey)
        for (key_id, entry) in registry.keys {
            match entry {
                KeyEntry::Passphrase {
                    label,
                    created_at,
                    last_used,
                    public_key,
                    vault_associations,
                    ..
                } => {
                    let passphrase_info = PassphraseKeyInfo {
                        id: key_id,
                        label,
                        public_key,
                        created_at,
                        last_used,
                        is_available: true, // Passphrase keys are always available (file-based)
                    };

                    all_keys.push(convert_passphrase_to_unified(
                        passphrase_info,
                        vault_associations,
                    ));
                }
                KeyEntry::Yubikey {
                    label,
                    created_at,
                    last_used,
                    serial,
                    slot,
                    recipient,
                    identity_tag,
                    firmware_version,
                    lifecycle_status,
                    vault_associations,
                    ..
                } => {
                    // Check if YubiKey is currently connected (physical availability)
                    let is_available = if let Some(ref manager) = yubikey_manager {
                        use crate::services::key_management::yubikey::domain::models::Serial;
                        if let Ok(serial_obj) = Serial::new(serial.clone()) {
                            manager
                                .is_device_connected(&serial_obj)
                                .await
                                .unwrap_or(false)
                        } else {
                            false
                        }
                    } else {
                        false // YubiKeyManager unavailable, assume not connected
                    };

                    // Determine YubiKey state based on connection and registry
                    let yubikey_state = if is_available {
                        YubiKeyState::Registered // Connected and in registry
                    } else {
                        YubiKeyState::Orphaned // In registry but not connected
                    };

                    // Build GlobalKey directly from registry (NO ID transformation!)
                    let key_info = GlobalKey {
                        id: key_id, // ← Use actual registry key_id! (e.g., "YubiKey-35230900")
                        label,
                        key_type: KeyType::YubiKey {
                            serial: serial.clone(),
                            firmware_version,
                        },
                        recipient,
                        is_available,
                        vault_associations,
                        lifecycle_status,
                        created_at,
                        last_used,
                        yubikey_info: Some(YubiKeyInfo {
                            slot: Some(slot),
                            identity_tag: Some(identity_tag),
                            pin_status: if is_available {
                                crate::services::key_management::yubikey::domain::models::PinStatus::Custom
                            } else {
                                crate::services::key_management::yubikey::domain::models::PinStatus::Unknown
                            },
                            yubikey_state,
                        }),
                    };

                    all_keys.push(key_info);
                }
            }
        }

        info!(
            total_keys = all_keys.len(),
            "Listed all registered keys from registry"
        );

        Ok(all_keys)
    }

    /// List keys for a specific vault
    async fn list_vault_keys(
        &self,
        vault_id: String,
    ) -> Result<Vec<GlobalKey>, Box<dyn std::error::Error>> {
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
                for key_id in &vault.get_key_ids() {
                    if let Some(KeyEntry::Passphrase {
                        label,
                        created_at,
                        last_used,
                        public_key,
                        vault_associations,
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
                            vault_associations.clone(),
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
                        // Get vault yubikey data from registry
                        if let Ok(registry) = self.registry_service.load_registry() {
                            let vault_key_ids = vault.get_key_ids();

                            // Filter YubiKeys that are in this vault
                            for yubikey in all_yubikeys {
                                // Check if this YubiKey is in the vault
                                if let Some((_key_id, vault_associations)) =
                                    vault_key_ids.iter().find_map(|kid| {
                                        if let Some(KeyEntry::Yubikey {
                                            serial,
                                            vault_associations,
                                            ..
                                        }) = registry.get_key(kid)
                                        {
                                            if serial == &yubikey.serial {
                                                Some((kid.clone(), vault_associations.clone()))
                                            } else {
                                                None
                                            }
                                        } else {
                                            None
                                        }
                                    })
                                {
                                    unified_keys.push(convert_yubikey_to_unified(
                                        yubikey,
                                        vault_associations,
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
    ) -> Result<Vec<GlobalKey>, Box<dyn std::error::Error>> {
        let mut available_keys = Vec::new();

        // Get vault and registry to determine which keys are already in vault
        match VaultManager::new().get_vault(&vault_id).await {
            Ok(vault) => {
                let vault_key_ids: HashSet<String> = vault.get_key_ids().into_iter().collect();

                // Get available passphrase keys (not in vault)
                match self.registry_service.load_registry() {
                    Ok(registry) => {
                        for (key_id, entry) in registry.keys.iter() {
                            if let KeyEntry::Passphrase {
                                label,
                                created_at,
                                last_used,
                                public_key,
                                vault_associations,
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
                                available_keys.push(convert_passphrase_to_unified(
                                    passphrase_info,
                                    vault_associations.clone(),
                                ));
                            }
                        }
                    }
                    Err(e) => {
                        warn!(vault_id = %vault_id, error = ?e, "Failed to load registry");
                    }
                }

                // Get available YubiKeys (not in vault)
                // Collect YubiKey serials already in this vault
                let vault_yubikey_serials: HashSet<String> = vault
                    .get_key_ids()
                    .iter()
                    .filter_map(|key_id| {
                        if let Ok(registry) = self.registry_service.load_registry() {
                            if let Some(KeyEntry::Yubikey { serial, .. }) = registry.get_key(key_id)
                            {
                                Some(serial.clone())
                            } else {
                                None
                            }
                        } else {
                            None
                        }
                    })
                    .collect();

                // List connected YubiKey devices and filter for available ones
                match YubiKeyManager::new().await {
                    Ok(yubikey_manager) => {
                        match yubikey_manager.list_connected_devices().await {
                            Ok(devices) => {
                                for device in devices {
                                    let serial_str = device.serial().value().to_string();

                                    // Skip if already in vault
                                    if vault_yubikey_serials.contains(&serial_str) {
                                        continue;
                                    }

                                    // Check if device has identity
                                    let has_identity = yubikey_manager
                                        .has_identity(device.serial())
                                        .await
                                        .unwrap_or(false);

                                    // Build AvailableYubiKey with proper state mapping
                                    let state_str = if has_identity {
                                        "orphaned".to_string()
                                    } else {
                                        "new".to_string()
                                    };

                                    // Map device state to NIST lifecycle status
                                    let lifecycle_status = if has_identity {
                                        KeyLifecycleStatus::Suspended // Orphaned → Suspended (NIST)
                                    } else {
                                        KeyLifecycleStatus::PreActivation // New → PreActivation (NIST)
                                    };

                                    let available_yubikey = AvailableYubiKey {
                                        serial: serial_str,
                                        state: state_str,
                                        lifecycle_status,
                                        slot: None,
                                        recipient: None,
                                        identity_tag: None,
                                        label: None,
                                        pin_status: "unknown".to_string(),
                                    };

                                    // Convert to unified format and add
                                    available_keys.push(convert_available_yubikey_to_unified(
                                        available_yubikey,
                                    ));
                                }
                            }
                            Err(e) => {
                                warn!(vault_id = %vault_id, error = ?e, "Failed to list YubiKey devices");
                            }
                        }
                    }
                    Err(e) => {
                        warn!(vault_id = %vault_id, error = ?e, "Failed to initialize YubiKeyManager");
                    }
                }
            }
            Err(e) => {
                warn!(vault_id = %vault_id, error = ?e, "Failed to load vault");
            }
        }

        Ok(available_keys)
    }

    /// List only currently connected/available keys (for decryption UI)
    async fn list_connected_keys(&self) -> Result<Vec<GlobalKey>, Box<dyn std::error::Error>> {
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
                        vault_associations,
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
                        connected_keys.push(convert_passphrase_to_unified(
                            passphrase_info,
                            vault_associations,
                        ));
                    }
                }
            }
            Err(e) => {
                warn!("Failed to load key registry: {:?}", e);
            }
        }

        // Only include YubiKeys that are physically connected
        // Load registry to get vault_associations for each YubiKey
        match self.registry_service.load_registry() {
            Ok(registry) => {
                match YubiKeyManager::new().await {
                    Ok(yubikey_manager) => {
                        match yubikey_manager.list_yubikeys_with_state().await {
                            Ok(yubikey_list) => {
                                for yubikey in yubikey_list {
                                    // Only include if yubikey is in a "connected" state
                                    if matches!(
                                        yubikey.state,
                                        YubiKeyState::Registered
                                            | YubiKeyState::Orphaned
                                            | YubiKeyState::Reused
                                    ) {
                                        // Find vault_associations from registry
                                        let vault_associations = registry
                                            .keys
                                            .iter()
                                            .find_map(|(_, entry)| {
                                                if let KeyEntry::Yubikey {
                                                    serial,
                                                    vault_associations,
                                                    ..
                                                } = entry
                                                {
                                                    if serial == &yubikey.serial {
                                                        Some(vault_associations.clone())
                                                    } else {
                                                        None
                                                    }
                                                } else {
                                                    None
                                                }
                                            })
                                            .unwrap_or_default();

                                        connected_keys.push(convert_yubikey_to_unified(
                                            yubikey,
                                            vault_associations,
                                        ));
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
            }
            Err(e) => {
                warn!("Failed to load registry: {:?}", e);
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
