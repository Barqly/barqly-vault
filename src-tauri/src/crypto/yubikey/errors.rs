//! YubiKey-specific error types and handling

use serde::{Deserialize, Serialize};
use thiserror::Error;

pub type YubiKeyResult<T> = Result<T, YubiKeyError>;

/// YubiKey operation errors
#[derive(Debug, Error, Clone, Serialize, Deserialize)]
pub enum YubiKeyError {
    #[error("No YubiKey devices found")]
    NoDevicesFound,

    #[error("YubiKey device not found: {0}")]
    DeviceNotFound(String),

    #[error("YubiKey PIN required ({0} attempts remaining)")]
    PinRequired(u8),

    #[error("YubiKey PIN blocked - PUK required")]
    PinBlocked,

    #[error("YubiKey touch confirmation required")]
    TouchRequired,

    #[error("YubiKey touch confirmation timed out")]
    TouchTimeout,

    #[error("Wrong YubiKey - expected serial {expected}, found {found}")]
    WrongDevice { expected: String, found: String },

    #[error("PIV slot {0} is already in use")]
    SlotInUse(u8),

    #[error("PIV slot {0} is not available")]
    SlotNotAvailable(u8),

    #[error("YubiKey initialization failed: {0}")]
    InitializationFailed(String),

    #[error("YubiKey communication error: {0}")]
    CommunicationError(String),

    #[error("Invalid PIN format")]
    InvalidPin,

    #[error("PIV operation failed: {0}")]
    PivOperationFailed(String),

    #[error("Plugin error: {0}")]
    PluginError(String),

    #[error("Unsupported YubiKey model: {0}")]
    UnsupportedModel(String),

    #[error("YubiKey hardware error: {0}")]
    HardwareError(String),

    #[error("Smart card service unavailable")]
    SmartCardServiceUnavailable,
}

// Legacy hardware integration error conversions (deprecated)
// These implementations are removed since we've moved to age-plugin-yubikey binary integration
// Direct hardware integration using yubikey and pcsc crates is no longer supported
