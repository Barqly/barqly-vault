//! YubiKey vault integration commands
//!
//! This module handles the integration between YubiKey operations
//! and the vault system, including initialization and registration.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::commands::yubikey_commands::{
    init_yubikey, list_yubikeys, YubiKeyInitResult, YubiKeyState, YubiKeyStateInfo,
};
use crate::models::vault::{KeyReference, KeyState, KeyType};
use crate::storage::vault_store;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tauri::command;

/// YubiKey initialization parameters for vault
#[derive(Debug, Deserialize)]
pub struct YubiKeyInitForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8, // 0-2 for UI positioning
}

/// YubiKey registration parameters for vault
#[derive(Debug, Deserialize)]
pub struct RegisterYubiKeyForVaultParams {
    pub serial: String,
    pub pin: String,
    pub label: String,
    pub vault_id: String,
    pub slot_index: u8,
}

/// Result from YubiKey registration
#[derive(Debug, Serialize)]
pub struct RegisterYubiKeyResult {
    pub success: bool,
    pub key_reference: KeyReference,
}

/// Initialize a new YubiKey and add it to a vault
#[command]
pub async fn init_yubikey_for_vault(
    params: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyInitResult> {
    // Validate slot index
    if params.slot_index > 2 {
        return Err(Box::new(
            CommandError::validation("Slot index must be 0-2 for UI positioning")
                .with_recovery_guidance("Use slot index 0, 1, or 2"),
        ));
    }

    // Get the vault
    let mut vault = vault_store::get_vault(&params.vault_id)
        .await
        .map_err(|e| {
            Box::new(
                CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                    .with_recovery_guidance("Ensure the vault exists"),
            )
        })?;

    // Check if slot is already taken
    let slot_taken = vault.keys.iter().any(|k| match &k.key_type {
        KeyType::Yubikey {
            slot_index: idx, ..
        } => *idx == params.slot_index,
        _ => false,
    });

    if slot_taken {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                format!("Slot {} is already occupied", params.slot_index),
            )
            .with_recovery_guidance("Choose a different slot or remove the existing key"),
        ));
    }

    // Check if YubiKey is already in this vault
    let already_registered = vault.keys.iter().any(|k| match &k.key_type {
        KeyType::Yubikey { serial, .. } => serial == &params.serial,
        _ => false,
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
    let yubikey_result = init_yubikey(params.serial.clone(), params.pin, params.label.clone())
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
    let piv_slot = if yubikey_result.slot >= 1 && yubikey_result.slot <= 20 {
        81 + yubikey_result.slot // Maps 1->82, 20->101 (but we'll cap at 95)
    } else {
        82 // Default to first retired slot
    };

    // Create key reference
    let key_ref = KeyReference {
        id: generate_key_reference_id(),
        key_type: KeyType::Yubikey {
            serial: params.serial.clone(),
            slot_index: params.slot_index,
            piv_slot: piv_slot.min(95), // Cap at slot 95
        },
        label: params.label,
        state: KeyState::Active,
        created_at: Utc::now(),
        last_used: None,
    };

    // Add to vault
    vault.keys.push(key_ref);

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
pub async fn register_yubikey_for_vault(
    params: RegisterYubiKeyForVaultParams,
) -> CommandResponse<RegisterYubiKeyResult> {
    crate::logging::log_debug(&format!(
        "register_yubikey_for_vault called with serial: {}, vault_id: {}, slot_index: {}",
        params.serial, params.vault_id, params.slot_index
    ));

    // Validate slot index
    if params.slot_index > 2 {
        crate::logging::log_error(&format!(
            "Invalid slot index: {}",
            params.slot_index
        ));
        return Err(Box::new(
            CommandError::validation("Slot index must be 0-2 for UI positioning")
                .with_recovery_guidance("Use slot index 0, 1, or 2"),
        ));
    }

    // Get the vault
    crate::logging::log_debug(&format!("Fetching vault: {}", params.vault_id));
    let mut vault = vault_store::get_vault(&params.vault_id)
        .await
        .map_err(|e| {
            crate::logging::log_error(&format!("Failed to fetch vault: {}", e));
            Box::new(
                CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                    .with_recovery_guidance("Ensure the vault exists"),
            )
        })?;
    crate::logging::log_debug(&format!("Vault loaded successfully"));

    // Check if slot is already taken
    let slot_taken = vault.keys.iter().any(|k| match &k.key_type {
        KeyType::Yubikey {
            slot_index: idx, ..
        } => *idx == params.slot_index,
        _ => false,
    });

    if slot_taken {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                format!("Slot {} is already occupied", params.slot_index),
            )
            .with_recovery_guidance("Choose a different slot or remove the existing key"),
        ));
    }

    // Verify YubiKey exists and has an identity
    crate::logging::log_debug(&format!("Listing YubiKeys to find serial: {}", params.serial));
    let yubikeys = list_yubikeys().await?;
    crate::logging::log_debug(&format!("Found {} YubiKeys", yubikeys.len()));

    let yubikey = yubikeys
        .iter()
        .find(|yk| yk.serial == params.serial)
        .ok_or_else(|| {
            crate::logging::log_error(&format!("YubiKey with serial {} not found", params.serial));
            Box::new(
                CommandError::operation(
                    ErrorCode::YubiKeyNotFound,
                    "YubiKey not found or not connected",
                )
                .with_recovery_guidance("Ensure YubiKey is connected"),
            )
        })?;

    crate::logging::log_debug(&format!(
        "Found YubiKey - State: {:?}, Slot: {:?}, Has recipient: {}",
        yubikey.state,
        yubikey.slot,
        yubikey.recipient.is_some()
    ));

    // For ORPHANED YubiKeys (already have age key), we don't need PIN verification
    // PIN will be requested during actual encryption/decryption operations
    // For NEW YubiKeys, they need to be initialized first

    if yubikey.state == YubiKeyState::New {
        crate::logging::log_error(&format!("YubiKey is in NEW state, needs initialization"));
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey needs to be initialized first",
            )
            .with_recovery_guidance("Use init_yubikey_for_vault for new YubiKeys"),
        ));
    }

    crate::logging::log_info(&format!(
        "Registering {} YubiKey {} to vault (no PIN verification for existing keys)",
        yubikey.state,
        params.serial
    ));

    // For ORPHANED or REUSED keys, skip PIN verification
    // The PIN will be validated during actual use (encryption/decryption)

    // Get the PIV slot from existing YubiKey info or use default
    let piv_slot = yubikey.slot.unwrap_or(1) + 81; // Convert retired slot to PIV
    crate::logging::log_debug(&format!("Using PIV slot: {}", piv_slot));

    // Create key reference
    let key_ref = KeyReference {
        id: generate_key_reference_id(),
        key_type: KeyType::Yubikey {
            serial: params.serial.clone(),
            slot_index: params.slot_index,
            piv_slot: piv_slot.min(95),
        },
        label: params.label.clone(),
        state: KeyState::Registered,
        created_at: Utc::now(),
        last_used: None,
    };

    crate::logging::log_debug(&format!(
        "Created key reference: id={}, label={}, slot_index={}",
        key_ref.id, key_ref.label, params.slot_index
    ));

    // Add to vault
    vault.keys.push(key_ref.clone());
    crate::logging::log_debug(&format!("Added key to vault, total keys: {}", vault.keys.len()));

    // Save vault
    crate::logging::log_debug(&format!("Saving vault with new key"));
    vault_store::save_vault(&vault).await.map_err(|e| {
        crate::logging::log_error(&format!("Failed to save vault: {}", e));
        Box::new(
            CommandError::operation(ErrorCode::StorageFailed, e.to_string())
                .with_recovery_guidance("Failed to save vault"),
        )
    })?;

    crate::logging::log_info(&format!(
        "Successfully registered YubiKey {} to vault {}",
        params.serial, params.vault_id
    ));

    Ok(RegisterYubiKeyResult {
        success: true,
        key_reference: key_ref,
    })
}

/// List available YubiKeys with vault context
#[command]
pub async fn list_available_yubikeys(vault_id: String) -> CommandResponse<Vec<YubiKeyStateInfo>> {
    crate::logging::log_debug(&format!("list_available_yubikeys called for vault: {}", vault_id));

    // Get all connected YubiKeys
    let mut all_yubikeys = list_yubikeys().await?;
    crate::logging::log_debug(&format!("Found {} total YubiKeys connected", all_yubikeys.len()));

    // Get vault's existing YubiKeys
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    let vault_serials: HashSet<String> = vault
        .keys
        .iter()
        .filter_map(|k| match &k.key_type {
            KeyType::Yubikey { serial, .. } => Some(serial.clone()),
            _ => None,
        })
        .collect();

    // Mark which are already in use by this vault
    for yubikey in &mut all_yubikeys {
        if vault_serials.contains(&yubikey.serial) {
            yubikey.state = YubiKeyState::Registered;
        }
    }

    crate::logging::log_debug(&format!(
        "Returning {} YubiKeys for vault {}: {:?}",
        all_yubikeys.len(),
        vault_id,
        all_yubikeys.iter().map(|y| &y.serial).collect::<Vec<_>>()
    ));

    Ok(all_yubikeys)
}

/// Check which YubiKey slots are available in a vault
#[command]
pub async fn check_yubikey_slot_availability(vault_id: String) -> CommandResponse<Vec<bool>> {
    let vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Check slots 0, 1, 2
    let mut available = vec![true, true, true];

    for key in &vault.keys {
        if let KeyType::Yubikey {
            slot_index: idx, ..
        } = &key.key_type
        {
            if *idx < 3 {
                available[*idx as usize] = false;
            }
        }
    }

    Ok(available)
}

/// Generate a unique key reference ID
fn generate_key_reference_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let random_bytes: Vec<u8> = (0..8).map(|_| rng.gen()).collect();
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
