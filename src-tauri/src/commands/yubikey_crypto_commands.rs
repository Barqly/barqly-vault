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

// Define types that were previously imported from deleted modules
#[derive(Debug, Deserialize, serde::Serialize, specta::Type)]
pub struct AvailableMethod {
    pub method_type: UnlockMethod,
    pub display_name: String,
    pub description: String,
    pub requires_hardware: bool,
    pub estimated_time: String,
    pub confidence_level: ConfidenceLevel,
}

#[derive(Debug, Deserialize, serde::Serialize, specta::Type)]
pub enum ConfidenceLevel {
    High,
    Medium,
    Low,
}

#[derive(Debug, serde::Serialize, specta::Type)]
pub struct VaultDecryptionResult {
    pub method_used: UnlockMethod,
    pub recipient_used: String,
    pub files_extracted: Vec<String>,
    pub output_path: String,
    pub decryption_time: String,
}

// Re-export YubiKeyCredentials - will be harmonized with UnlockCredentials later
#[derive(Debug, Deserialize, specta::Type)]
pub struct YubiKeyCredentials {
    pub serial: String,
    pub pin: String,
}

// Re-export type from domain to avoid duplication
pub use crate::key_management::yubikey::domain::models::UnlockCredentials;

/// Decrypt file using YubiKey with smart method selection
/// Currently uses existing implementation - will be migrated to YubiKeyManager in next iteration
#[tauri::command]
#[specta::specta]
pub async fn yubikey_decrypt_file(
    _encrypted_file: String,
    _unlock_method: Option<UnlockMethod>,
    _credentials: UnlockCredentials,
    _output_path: String,
) -> Result<VaultDecryptionResult, CommandError> {
    // TODO: Implement proper YubiKey decryption logic
    // For now, return error indicating function needs implementation
    Err(CommandError::operation(
        ErrorCode::YubiKeyInitializationFailed,
        "YubiKey decryption functionality needs to be implemented with YubiKeyManager",
    ))
}

/// Get available unlock methods for an encrypted file
/// Delegates to YubiKeyManager to analyze file and available hardware
// TODO: REMOVE - Unused by frontend, disabled for testing
// #[tauri::command]
// #[specta::specta]
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
// TODO: REMOVE - Unused by frontend, disabled for testing
// #[tauri::command]
// #[specta::specta]
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
