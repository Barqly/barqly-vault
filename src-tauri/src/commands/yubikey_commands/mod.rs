//! YubiKey command implementations for Tauri
//!
//! This module provides all YubiKey-related commands for the frontend interface.

// Temporarily re-enabled for compilation - will be fully migrated later
pub mod smart_decryption;
pub mod streamlined; // Primary YubiKey API

// NOTE: Commands are now consolidated in separate modules, but keeping these
// temporarily to avoid breaking existing internal usage
// NOT re-exporting to avoid conflicts with new consolidated commands:
// pub use smart_decryption::*;
// pub use streamlined::*;

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::key_management::yubikey::domain::errors::YubiKeyError;

/// Convert YubiKey errors to command errors with appropriate recovery guidance
impl From<YubiKeyError> for CommandError {
    fn from(err: YubiKeyError) -> Self {
        match err {
            YubiKeyError::DeviceNotFound { serial } => CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("YubiKey with serial {serial} not found"),
            )
            .with_recovery_guidance("Please insert the correct YubiKey device"),
            YubiKeyError::MultipleDevicesFound { serials } => CommandError::operation(
                ErrorCode::UnexpectedError,
                format!("Multiple YubiKey devices found: {serials:?}"),
            )
            .with_recovery_guidance("Disconnect extra YubiKey devices or specify serial number"),
            YubiKeyError::Device { message } => CommandError::operation(
                ErrorCode::YubiKeyCommunicationError,
                format!("YubiKey device error: {message}"),
            )
            .with_recovery_guidance("Check YubiKey connection and try again"),
            YubiKeyError::Identity { message } => CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("YubiKey identity error: {message}"),
            )
            .with_recovery_guidance("Try re-initializing the YubiKey or use a different device"),
            YubiKeyError::IdentityNotFound { serial } => CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("No identity found for YubiKey: {serial}"),
            )
            .with_recovery_guidance("Initialize the YubiKey first or check the serial number"),
            YubiKeyError::Registry { message } => CommandError::operation(
                ErrorCode::UnexpectedError,
                format!("YubiKey registry error: {message}"),
            )
            .with_recovery_guidance("Check application data integrity"),
            YubiKeyError::Pin { message } => CommandError::operation(
                ErrorCode::YubiKeyPinRequired,
                format!("YubiKey PIN error: {message}"),
            )
            .with_recovery_guidance("Enter your 6-8 digit YubiKey PIN"),
            YubiKeyError::AgePlugin { message } => CommandError::operation(
                ErrorCode::PluginExecutionFailed,
                format!("age-plugin-yubikey error: {message}"),
            )
            .with_recovery_guidance("Check that age-plugin-yubikey is properly installed"),
            _ => CommandError::operation(
                ErrorCode::UnexpectedError,
                format!("YubiKey operation failed: {err}"),
            )
            .with_recovery_guidance(
                "Try reconnecting your YubiKey and attempting the operation again",
            ),
        }
    }
}
