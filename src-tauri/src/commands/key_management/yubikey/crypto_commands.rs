//! YubiKey Crypto Commands - Encryption/Decryption Operations
//!
//! This module provides THIN WRAPPER commands for YubiKey crypto operations.
//! ALL YubiKey business logic is delegated to the DDD YubiKeyManager.
//! This layer ONLY handles parameter validation and response formatting.
//!
//! Commands included:
//! - yubikey_decrypt_file: Smart decryption with method selection

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::services::yubikey::domain::models::UnlockMethod;
use serde::Deserialize;
use tauri;

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
pub use crate::services::yubikey::domain::models::UnlockCredentials;

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
