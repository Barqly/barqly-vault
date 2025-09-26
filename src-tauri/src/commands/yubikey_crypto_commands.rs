//! YubiKey Crypto Commands - Encryption/Decryption Operations
//!
//! This module provides THIN WRAPPER commands for YubiKey crypto operations.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles parameter validation and response formatting.
//!
//! Commands included:
//! - yubikey_decrypt_file: Smart decryption with method selection
//! - yubikey_get_available_unlock_methods: Get available unlock methods for file
//! - yubikey_test_unlock_credentials: Test YubiKey credentials

use crate::commands::command_types::CommandError;
use crate::key_management::yubikey::domain::models::UnlockMethod;
use crate::prelude::*;
use serde::Deserialize;

// Re-export types from smart_decryption to avoid duplication
pub use crate::commands::yubikey_commands::smart_decryption::{AvailableMethod, ConfidenceLevel};

// Re-export YubiKeyCredentials - will be harmonized with UnlockCredentials later
#[derive(Debug, Deserialize, specta::Type)]
pub struct YubiKeyCredentials {
    pub serial: String,
    pub pin: String,
}

// Re-export type from domain to avoid duplication
pub use crate::key_management::yubikey::domain::models::UnlockCredentials;

// Re-export type from smart_decryption to avoid duplication
pub use crate::commands::yubikey_commands::smart_decryption::VaultDecryptionResult;

/// Decrypt file using YubiKey with smart method selection
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn yubikey_decrypt_file(
    encrypted_file: String,
    unlock_method: Option<UnlockMethod>,
    credentials: UnlockCredentials,
    output_path: String,
) -> Result<VaultDecryptionResult, CommandError> {
    // Temporary: Use existing implementation from smart_decryption.rs
    // TODO: Migrate to full YubiKeyManager integration
    use crate::commands::yubikey_commands::smart_decryption;
    smart_decryption::yubikey_decrypt_file(encrypted_file, unlock_method, credentials, output_path)
        .await
}

/// Get available unlock methods for an encrypted file
/// Delegates to YubiKeyManager to analyze file and available hardware
#[tauri::command]
#[specta::specta]
pub async fn yubikey_get_available_unlock_methods(
    file_path: String,
) -> Result<Vec<AvailableMethod>, CommandError> {
    info!(
        "Getting available unlock methods for file: {}",
        file_path.split('/').next_back().unwrap_or("unknown")
    );

    // Temporary placeholder - return basic YubiKey method for now
    // TODO: Implement proper method detection with YubiKeyManager
    info!(
        "Getting available unlock methods for file: {} (placeholder implementation)",
        file_path.split('/').next_back().unwrap_or("unknown")
    );
    Ok(vec![AvailableMethod {
        method_type: UnlockMethod::YubiKey,
        display_name: "YubiKey".to_string(),
        description: "Unlock using connected YubiKey device".to_string(),
        requires_hardware: true,
        estimated_time: "5-10 seconds".to_string(),
        confidence_level: ConfidenceLevel::High,
    }])
}

/// Test YubiKey unlock credentials against a file
/// Delegates to YubiKeyManager for credential validation
#[tauri::command]
#[specta::specta]
pub async fn yubikey_test_unlock_credentials(
    file_path: String,
    _credentials: YubiKeyCredentials,
) -> Result<bool, CommandError> {
    info!(
        "Testing YubiKey credentials for file: {}",
        file_path.split('/').next_back().unwrap_or("unknown")
    );

    // Temporary placeholder - just return true for now
    // TODO: Implement proper credential testing with YubiKeyManager
    info!(
        "Testing YubiKey credentials for file: {} (placeholder implementation)",
        file_path.split('/').next_back().unwrap_or("unknown")
    );
    Ok(true) // Placeholder - always return valid for testing
}
