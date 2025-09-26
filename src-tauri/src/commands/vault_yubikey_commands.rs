//! Vault YubiKey Integration Commands
//!
//! This module provides THIN WRAPPER commands for YubiKey-vault integration.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles vault-specific concerns like registry updates.
//!
//! Commands included:
//! - init_yubikey_for_vault: Initialize YubiKey and add to vault
//! - register_yubikey_for_vault: Register existing YubiKey to vault
//! - list_available_yubikeys_for_vault: List YubiKeys available for vault
//! - check_keymenubar_positions_available: Check vault display positions

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
// YubiKeyManager will be used in next iteration
use crate::prelude::*;
use crate::storage::{KeyRegistry, vault_store};
// serde re-exports handled by existing implementation imports
// use tauri::command; // Using #[tauri::command] instead

// Re-export types from existing implementation to avoid duplication
pub use crate::commands::vault_commands::yubikey_integration::{
    AvailableYubiKey, RegisterYubiKeyForVaultParams, YubiKeyInitForVaultParams, YubiKeyVaultResult,
};

/// Initialize a new YubiKey and add it to a vault
/// Delegates YubiKey operations to YubiKeyManager, handles vault integration
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey_for_vault(
    input: YubiKeyInitForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    info!(
        "Initializing YubiKey for vault: {} -> {}",
        &input.serial[..8.min(input.serial.len())],
        input.vault_id
    );

    // Validate vault exists
    let vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Check for existing YubiKey in vault
    let registry = KeyRegistry::load().unwrap_or_else(|_| KeyRegistry::new());
    if vault.keys.iter().any(|key_id| {
        matches!(
            registry.get_key(key_id),
            Some(crate::storage::KeyEntry::Yubikey { serial, .. }) if *serial == input.serial
        )
    }) {
        return Err(Box::new(
            CommandError::operation(
                ErrorCode::InvalidInput,
                "This YubiKey is already registered in this vault",
            )
            .with_recovery_guidance("Use a different YubiKey or remove the existing one"),
        ));
    }

    // Temporary: Use existing implementation from yubikey_integration.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::vault_commands::yubikey_integration;
    yubikey_integration::init_yubikey_for_vault_old(input).await
}

/// Register an existing YubiKey with a vault
/// Delegates YubiKey operations to YubiKeyManager, handles vault integration
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey_for_vault(
    input: RegisterYubiKeyForVaultParams,
) -> CommandResponse<YubiKeyVaultResult> {
    info!(
        "Registering YubiKey for vault: {} -> {}",
        &input.serial[..8.min(input.serial.len())],
        input.vault_id
    );

    // Validate vault exists
    let _vault = vault_store::get_vault(&input.vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Temporary: Use existing implementation from yubikey_integration.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::vault_commands::yubikey_integration;
    yubikey_integration::register_yubikey_for_vault_old(input).await
}

/// List available YubiKeys for vault registration
/// Delegates to YubiKeyManager and filters for vault compatibility
#[tauri::command]
#[specta::specta]
pub async fn list_available_yubikeys_for_vault(
    vault_id: String,
) -> CommandResponse<Vec<AvailableYubiKey>> {
    info!("Listing available YubiKeys for vault: {}", vault_id);

    // Validate vault exists
    let _vault = vault_store::get_vault(&vault_id).await.map_err(|e| {
        Box::new(
            CommandError::operation(ErrorCode::VaultNotFound, e.to_string())
                .with_recovery_guidance("Ensure the vault exists"),
        )
    })?;

    // Temporary: Use existing implementation from yubikey_integration.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::vault_commands::yubikey_integration;
    yubikey_integration::list_available_yubikeys_for_vault_old(vault_id).await
}

/// Check which KeyMenuBar display positions are available in a vault
/// This is a legacy display helper - frontend should handle positioning
#[tauri::command]
#[specta::specta]
pub async fn check_keymenubar_positions_available(vault_id: String) -> CommandResponse<Vec<bool>> {
    info!("Checking KeyMenuBar positions for vault: {}", vault_id);

    // Temporary: Use existing implementation from yubikey_integration.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::vault_commands::yubikey_integration;
    yubikey_integration::check_keymenubar_positions_available_old(vault_id).await
}
