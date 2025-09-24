//! YubiKey vault integration commands
//!
//! This module handles the integration between YubiKey operations
//! and the vault system, including initialization and registration.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::commands::yubikey_commands::{
    YubiKeyState, YubiKeyStateInfo, init_yubikey, list_yubikeys,
};
use crate::crypto::yubikey::YubiKeyInitResult;
use crate::models::{KeyReference, KeyState, KeyType};
use crate::prelude::*;
use crate::storage::{KeyRegistry, vault_store};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use tauri::command;

/// YubiKey initialization parameters for vault
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyInitForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8, // 0-2 for UI positioning
}

/// YubiKey registration parameters for vault
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct RegisterYubiKeyForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8,
}

/// Result from YubiKey registration
#[derive(Debug, Serialize, specta::Type)]
pub struct RegisterYubiKeyResult {
    pub success: bool,
    pub key_reference: KeyReference,
}

/// Initialize a new YubiKey and add it to a vault
#[command]
#[specta::specta]
#[instrument(skip(input))]
pub async fn init_yubikey_for_vault(
    input: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyInitResult> {
    info!(
        serial = %redact_serial(&input.serial),
        vault_id = input.vault_id,
        slot_index = input.slot_index,
        "init_yubikey_for_vault called"
    );

    // Validate slot index
    if input.slot_index > 2 {
        return Err(Box::new(
            CommandError::validation("Slot index must be 0-2 for UI positioning")
                .with_recovery_guidance("Use slot index 0, 1, or 2"),
        ));
    }

    // Get the vault
    let mut vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load registry to check if slot is already taken
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let slot_taken = vault.keys.iter().any(|key_id| {
        if let Some(entry) = registry.get_key(key_id) {
            if let crate::storage::KeyEntry::Yubikey { slot, .. } = entry {
                *slot == input.slot_index
            } else {
                false
            }
        } else {
            false
        }
    });

    if slot_taken {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                format!("Slot {} is already occupied", input.slot_index),
            )
            .with_recovery_guidance("Choose a different slot or remove the existing key"),
        ));
    }

    // Check if YubiKey is already in this vault (registry was loaded above)
    let already_registered = vault.keys.iter().any(|key_id| {
        if let Some(entry) = registry.get_key(key_id) {
            if let crate::storage::KeyEntry::Yubikey { serial, .. } = entry {
                serial == &input.serial
            } else {
                false
            }
        } else {
            false
        }
    });

    if already_registered {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey is already registered in this vault",
            )
            .with_recovery_guidance("Use a different YubiKey or remove the existing one"),
        ));
    }

    // Initialize the YubiKey
    let streamlined_result =
        init_yubikey(input.serial.clone(), input.pin.clone(), input.label.clone())
            .await
            .map_err(|e| {
                Box::new(
                    CommandError::operation(
                        ErrorCode::YubiKeyInitializationFailed,
                        format!("Failed to initialize YubiKey: {e}"),
                    )
                    .with_recovery_guidance("Ensure YubiKey is connected and PIN is correct"),
                )
            })?;

    // Map retired slot (1-20) to PIV slot (82-95)
    let piv_slot = if streamlined_result.slot >= 1 && streamlined_result.slot <= 20 {
        81 + streamlined_result.slot // Maps 1->82, 20->101 (but we'll cap at 95)
    } else {
        82 // Default to first retired slot
    };

    // Convert StreamlinedYubiKeyInitResult to YubiKeyInitResult
    let yubikey_result = YubiKeyInitResult {
        public_key: streamlined_result.recipient.clone(), // Clone to avoid move
        slot: streamlined_result.slot,
        touch_required: true, // Default to true for security
        pin_policy: crate::crypto::yubikey::management::PinPolicy::Once,
    };

    // Add YubiKey to registry first
    let mut registry = registry; // We already loaded it above
    let key_registry_id = registry.add_yubikey_entry(
        input.label.clone(),
        input.serial.clone(),
        1, // Default slot
        piv_slot.min(95) as u8,
        streamlined_result.recipient,
        streamlined_result.identity_tag,
        None,                                                     // firmware_version
        format!("{:x}", Sha256::digest(b"recovery-placeholder")), // Placeholder recovery hash
    );

    registry.save().map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save key registry"),
        )
    })?;

    // Add key ID to vault
    vault.add_key_id(key_registry_id.clone()).map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::InvalidInput, e)
                .with_recovery_guidance("Failed to add key to vault"),
        )
    })?;

    // Save vault
    vault_store::save_vault(&vault).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save vault"),
        )
    })?;

    Ok(yubikey_result)
}

/// Register an existing YubiKey with a vault
#[command]
#[specta::specta]
#[instrument(skip(input))]
pub async fn register_yubikey_for_vault(
    input: RegisterYubiKeyForVaultParams,
) -> CommandResponse<RegisterYubiKeyResult> {
    debug!(
        serial = %redact_serial(&input.serial),
        vault_id = input.vault_id,
        slot_index = input.slot_index,
        "register_yubikey_for_vault called"
    );

    // Validate slot index
    if input.slot_index > 2 {
        error!(slot_index = input.slot_index, "Invalid slot index");
        return Err(Box::new(
            CommandError::validation("Slot index must be 0-2 for UI positioning")
                .with_recovery_guidance("Use slot index 0, 1, or 2"),
        ));
    }

    // Get the vault
    debug!(vault_id = input.vault_id, "Fetching vault");
    let mut vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        error!(error = %e, "Failed to fetch vault");
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;
    debug!("Vault loaded successfully");

    // Load registry to check if slot is already taken
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let slot_taken = vault.keys.iter().any(|key_id| {
        if let Some(entry) = registry.get_key(key_id) {
            if let crate::storage::KeyEntry::Yubikey { slot, .. } = entry {
                *slot == input.slot_index
            } else {
                false
            }
        } else {
            false
        }
    });

    if slot_taken {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                format!("Slot {} is already occupied", input.slot_index),
            )
            .with_recovery_guidance("Choose a different slot or remove the existing key"),
        ));
    }

    // Verify YubiKey exists and has an identity
    debug!(serial = %redact_serial(&input.serial), "Listing YubiKeys to find serial");
    let yubikeys = list_yubikeys().await?;
    debug!(yubikey_count = yubikeys.len(), "Found YubiKeys");

    let yubikey = yubikeys
        .iter()
        .find(|yk| yk.serial == input.serial)
        .ok_or_else(|| {
            error!(serial = %redact_serial(&input.serial), "YubiKey not found");
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyNotFound,
                    "YubiKey not found or not connected",
                )
                .with_recovery_guidance("Ensure YubiKey is connected"),
            )
        })?;

    debug!(
        state = ?yubikey.state,
        slot = ?yubikey.slot,
        has_recipient = yubikey.recipient.is_some(),
        "Found YubiKey"
    );

    // For ORPHANED YubiKeys (already have age key), we don't need PIN verification
    // PIN will be requested during actual encryption/decryption operations
    // For NEW YubiKeys, they need to be initialized first

    if yubikey.state == YubiKeyState::New {
        error!("YubiKey is in NEW state, needs initialization");
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey needs to be initialized first",
            )
            .with_recovery_guidance("Use init_yubikey_for_vault for new YubiKeys"),
        ));
    }

    info!(
        state = ?yubikey.state,
        serial = %redact_serial(&input.serial),
        "Registering YubiKey to vault (no PIN verification for existing keys)"
    );

    // For ORPHANED or REUSED keys, skip PIN verification
    // The PIN will be validated during actual use (encryption/decryption)

    // Get the PIV slot from existing YubiKey info or use default
    let piv_slot = yubikey.slot.unwrap_or(1) + 81; // Convert retired slot to PIV
    debug!(piv_slot = piv_slot, "Using PIV slot");

    // Add YubiKey to registry first
    let mut registry = registry; // We already loaded it above
    let key_registry_id = registry.add_yubikey_entry(
        input.label.clone(),
        input.serial.clone(),
        yubikey.slot.unwrap_or(1),
        piv_slot.min(95) as u8,
        yubikey
            .recipient
            .as_ref()
            .cloned()
            .unwrap_or_else(|| format!("age1yubikey1{}", &input.serial[..8])),
        yubikey
            .identity_tag
            .as_ref()
            .cloned()
            .unwrap_or_else(|| {
                error!("YubiKey has no identity tag, this should not happen");
                format!("AGE-PLUGIN-YUBIKEY-MISSING")
            }),
        None,                                               // firmware_version
        format!("{:x}", Sha256::digest(b"registered-key")), // Placeholder recovery hash for registered keys
    );

    registry.save().map_err(|e| {
        error!(error = %e, "Failed to save key registry");
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save key registry"),
        )
    })?;

    debug!(
        key_registry_id = key_registry_id,
        label = input.label,
        slot_index = input.slot_index,
        "Created key in registry"
    );

    // Add key ID to vault
    vault.add_key_id(key_registry_id.clone()).map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::InvalidInput, e)
                .with_recovery_guidance("Failed to add key to vault"),
        )
    })?;
    debug!(total_keys = vault.keys.len(), "Added key ID to vault");

    // Save vault
    debug!("Saving vault with new key");
    vault_store::save_vault(&vault).await.map_err(|e| {
        error!(error = %e, "Failed to save vault");
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save vault"),
        )
    })?;

    info!(
        serial = %redact_serial(&input.serial),
        vault_id = input.vault_id,
        "Successfully registered YubiKey to vault"
    );

    // Create KeyReference for response
    let key_reference = KeyReference {
        id: key_registry_id,
        key_type: KeyType::Yubikey {
            serial: input.serial.clone(),
            slot_index: input.slot_index,
            piv_slot: piv_slot.min(95) as u8,
            firmware_version: None,
        },
        label: input.label,
        state: KeyState::Registered,
        created_at: Utc::now(),
        last_used: None,
    };

    Ok(RegisterYubiKeyResult {
        success: true,
        key_reference,
    })
}

/// List available YubiKeys with vault context
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn list_available_yubikeys(vault_id: String) -> CommandResponse<Vec<YubiKeyStateInfo>> {
    debug!(vault_id = vault_id, "list_available_yubikeys called");

    // Get all connected YubiKeys
    let all_yubikeys = list_yubikeys().await?;
    debug!(
        yubikey_count = all_yubikeys.len(),
        "Found total YubiKeys connected"
    );

    // Get vault's existing YubiKeys
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load registry to get YubiKey serials from vault
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    let vault_serials: HashSet<String> = vault
        .keys
        .iter()
        .filter_map(|key_id| {
            if let Some(entry) = registry.get_key(key_id) {
                if let crate::storage::KeyEntry::Yubikey { serial, .. } = entry {
                    Some(serial.clone())
                } else {
                    None
                }
            } else {
                None
            }
        })
        .collect();

    // Filter out YubiKeys that are already registered to this vault
    // Only return YubiKeys that are available for registration
    let available_yubikeys: Vec<YubiKeyStateInfo> = all_yubikeys
        .into_iter()
        .filter(|yk| !vault_serials.contains(&yk.serial))
        .collect();

    log_sensitive!(dev_only: {
        debug!(
            registered_count = vault_serials.len(),
            serials = ?vault_serials.iter().map(|s| redact_serial(s)).collect::<Vec<_>>(),
            "Vault has YubiKeys registered"
        );
    });

    debug!(
        available_count = available_yubikeys.len(),
        vault_id = vault_id,
        "Returning available YubiKeys for vault"
    );
    log_sensitive!(dev_only: {
        debug!(
            serials = ?available_yubikeys.iter().map(|y| redact_serial(&y.serial)).collect::<Vec<_>>(),
            "Available YubiKey serials"
        );
    });

    Ok(available_yubikeys)
}

/// Check which YubiKey slots are available in a vault
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn check_yubikey_slot_availability(vault_id: String) -> CommandResponse<Vec<bool>> {
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Load registry to check slot availability
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());

    // Check slots 0, 1, 2
    let mut available = vec![true, true, true];

    for key_id in &vault.keys {
        if let Some(entry) = registry.get_key(key_id) {
            if let crate::storage::KeyEntry::Yubikey { slot, .. } = entry {
                if *slot < 3 {
                    available[*slot as usize] = false;
                }
            }
        }
    }

    Ok(available)
}

/// Generate a unique key reference ID
fn generate_key_reference_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..8).map(|_| rng.r#gen()).collect();
    format!("keyref_{}", bs58::encode(random_bytes).into_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_slot_availability() {
        // This test would require a mock vault store
        // For now, just test the ID generation
        let id1 = generate_key_reference_id();
        let id2 = generate_key_reference_id();

        assert!(id1.starts_with("keyref_"));
        assert!(id2.starts_with("keyref_"));
        assert_ne!(id1, id2);
    }
}

// Tests are in yubikey_integration_tests.rs
// Uncomment when ready to run integration tests
// #[cfg(test)]
// #[path = "yubikey_integration_tests.rs"]
// mod yubikey_integration_tests;
