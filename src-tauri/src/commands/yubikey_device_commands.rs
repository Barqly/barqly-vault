//! YubiKey Device Commands - Core Hardware Operations
//!
//! This module provides THIN WRAPPER commands for core YubiKey device operations.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles parameter validation and response formatting.
//!
//! Commands included:
//! - list_yubikeys: List all YubiKeys with state detection
//! - init_yubikey: Initialize new YubiKey device
//! - register_yubikey: Register existing YubiKey device
//! - get_identities: Get YubiKey identity information

use crate::commands::command_types::CommandError;
use crate::commands::yubikey_commands::streamlined::StreamlinedYubiKeyInitResult;
// YubiKeyManager will be used in next iteration
// prelude re-exported through existing implementation imports
use tauri;

// Error handling implementation is already available in yubikey_commands/mod.rs
// No need to duplicate it here

// Re-export types from streamlined module to avoid duplication
pub use crate::commands::yubikey_commands::streamlined::{
    PinStatus, YubiKeyState, YubiKeyStateInfo,
};

// YubiKeyInitResult removed - using StreamlinedYubiKeyInitResult from existing implementation

/// List all YubiKeys with state detection
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn list_yubikeys() -> Result<Vec<YubiKeyStateInfo>, CommandError> {
    // Temporary: Use existing implementation from streamlined.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::yubikey_commands::streamlined;
    streamlined::list_yubikeys().await
}

/// Initialize a new YubiKey device
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn init_yubikey(
    serial: String,
    new_pin: String,
    label: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    // Temporary: Use existing implementation from streamlined.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::yubikey_commands::streamlined;
    streamlined::init_yubikey(serial, new_pin, label).await
}

/// Register an existing YubiKey device (orphaned state)
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn register_yubikey(
    serial: String,
    label: String,
    pin: String,
) -> Result<StreamlinedYubiKeyInitResult, CommandError> {
    // Temporary: Use existing implementation from streamlined.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::yubikey_commands::streamlined;
    streamlined::register_yubikey(serial, label, pin).await
}

/// Get YubiKey identity information
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn get_identities(serial: String) -> Result<Vec<String>, CommandError> {
    // Temporary: Use existing implementation from streamlined.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::yubikey_commands::streamlined;
    streamlined::get_identities(serial).await
}
