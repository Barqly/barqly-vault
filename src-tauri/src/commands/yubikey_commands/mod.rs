//! YubiKey command implementations for Tauri
//!
//! This module provides all YubiKey-related commands for the frontend interface.

pub mod device_management;
pub mod initialization;
pub mod smart_decryption;

#[cfg(test)]
pub mod hardware_test;

pub use device_management::*;
pub use initialization::*;
pub use smart_decryption::*;

use crate::commands::command_types::{CommandError, ErrorCode};
use crate::crypto::yubikey::YubiKeyError;

/// Convert YubiKey errors to command errors with appropriate recovery guidance
impl From<YubiKeyError> for CommandError {
    fn from(err: YubiKeyError) -> Self {
        match err {
            YubiKeyError::NoDevicesFound => {
                CommandError::operation(ErrorCode::YubiKeyNotFound, "No YubiKey devices found")
                    .with_recovery_guidance("Please insert a YubiKey device and try again")
            }
            YubiKeyError::DeviceNotFound(serial) => CommandError::operation(
                ErrorCode::YubiKeyNotFound,
                format!("YubiKey with serial {serial} not found"),
            )
            .with_recovery_guidance("Please insert the correct YubiKey device"),
            YubiKeyError::PinRequired(attempts) => CommandError::operation(
                ErrorCode::YubiKeyPinRequired,
                format!("YubiKey PIN required ({attempts} attempts remaining)"),
            )
            .with_recovery_guidance("Enter your 6-8 digit YubiKey PIN"),
            YubiKeyError::PinBlocked => {
                CommandError::operation(ErrorCode::YubiKeyPinBlocked, "YubiKey PIN is blocked")
                    .with_recovery_guidance("Use your PUK (PIN Unblocking Key) to reset the PIN")
            }
            YubiKeyError::TouchRequired => {
                CommandError::operation(ErrorCode::YubiKeyTouchRequired, "YubiKey touch required")
                    .with_recovery_guidance("Touch the gold contact on your YubiKey when it blinks")
            }
            YubiKeyError::TouchTimeout => {
                CommandError::operation(ErrorCode::YubiKeyTouchTimeout, "YubiKey touch timed out")
                    .with_recovery_guidance("Touch the gold contact on your YubiKey when it blinks")
            }
            YubiKeyError::WrongDevice { expected, found } => CommandError::operation(
                ErrorCode::WrongYubiKey,
                format!("Wrong YubiKey connected. Expected {expected}, found {found}"),
            )
            .with_recovery_guidance("Connect the YubiKey that was used to create this vault"),
            YubiKeyError::SlotInUse(slot) => CommandError::operation(
                ErrorCode::YubiKeySlotInUse,
                format!("PIV slot {slot} is already in use"),
            )
            .with_recovery_guidance("Choose a different slot or use a different YubiKey"),
            YubiKeyError::InitializationFailed(msg) => CommandError::operation(
                ErrorCode::YubiKeyInitializationFailed,
                format!("YubiKey initialization failed: {msg}"),
            )
            .with_recovery_guidance(
                "Try resetting the YubiKey PIV applet or use a different device",
            ),
            YubiKeyError::CommunicationError(msg) => CommandError::operation(
                ErrorCode::YubiKeyCommunicationError,
                format!("YubiKey communication error: {msg}"),
            )
            .with_recovery_guidance("Check YubiKey connection and try again"),
            YubiKeyError::PluginError(msg) => CommandError::operation(
                ErrorCode::PluginExecutionFailed,
                format!("Plugin error: {msg}"),
            )
            .with_recovery_guidance("Check that age-plugin-yubikey is properly installed"),
            YubiKeyError::SmartCardServiceUnavailable => CommandError::operation(
                ErrorCode::YubiKeyCommunicationError,
                "Smart card service is not available",
            )
            .with_recovery_guidance(
                "Install PC/SC drivers and ensure the smart card service is running",
            ),
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
