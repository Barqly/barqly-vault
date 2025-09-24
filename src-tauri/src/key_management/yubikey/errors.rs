//! Centralized YubiKey error types
//!
//! Provides unified error handling for all YubiKey operations, replacing
//! the scattered error handling patterns found throughout the codebase.

use crate::key_management::yubikey::models::{Serial, IdentityValidationError, PinValidationError, SerialValidationError, StateTransitionError};
use std::fmt;

/// Main result type for all YubiKey operations
pub type YubiKeyResult<T> = Result<T, YubiKeyError>;

/// Centralized YubiKey error types
#[derive(Debug, thiserror::Error)]
pub enum YubiKeyError {
    /// Device-related errors
    #[error("Device error: {message}")]
    Device { message: String },

    /// Device not found
    #[error("YubiKey device not found: {serial}")]
    DeviceNotFound { serial: String },

    /// Multiple devices when one expected
    #[error("Multiple YubiKey devices found, specify serial: {serials:?}")]
    MultipleDevicesFound { serials: Vec<String> },

    /// Identity-related errors (this fixes the identity tag bug)
    #[error("Identity error: {message}")]
    Identity { message: String },

    /// Identity not found for device
    #[error("No identity found for YubiKey: {serial}")]
    IdentityNotFound { serial: String },

    /// Identity validation failed
    #[error("Identity validation failed: {source}")]
    IdentityValidation {
        #[from]
        source: IdentityValidationError,
    },

    /// Registry-related errors
    #[error("Registry error: {message}")]
    Registry { message: String },

    /// Registry entry not found
    #[error("Registry entry not found for YubiKey: {serial}")]
    RegistryEntryNotFound { serial: String },

    /// Registry entry already exists
    #[error("Registry entry already exists for YubiKey: {serial}")]
    RegistryEntryExists { serial: String },

    /// File operation errors
    #[error("File operation error: {message}")]
    File { message: String },

    /// Encryption/decryption errors
    #[error("Encryption error: {message}")]
    Encryption { message: String },

    /// Decryption errors
    #[error("Decryption error: {message}")]
    Decryption { message: String },

    /// PIN-related errors
    #[error("PIN error: {message}")]
    Pin { message: String },

    /// PIN validation errors
    #[error("PIN validation failed: {source}")]
    PinValidation {
        #[from]
        source: PinValidationError,
    },

    /// PIN blocked (too many attempts)
    #[error("PIN is blocked for YubiKey: {serial}")]
    PinBlocked { serial: String },

    /// Serial number errors
    #[error("Serial validation failed: {source}")]
    SerialValidation {
        #[from]
        source: SerialValidationError,
    },

    /// State management errors
    #[error("State error: {message}")]
    State { message: String },

    /// Invalid state transition
    #[error("State transition error: {source}")]
    StateTransition {
        #[from]
        source: StateTransitionError,
    },

    /// Operation not allowed in current state
    #[error("Operation '{operation}' not allowed in state '{current_state}' for YubiKey: {serial}")]
    OperationNotAllowed {
        operation: String,
        current_state: String,
        serial: String,
    },

    /// Slot-related errors (fixes the slot occupation bug)
    #[error("Slot error: {message}")]
    Slot { message: String },

    /// Slot not available on device
    #[error("Slot {slot} not available on YubiKey {serial}")]
    SlotNotAvailable { slot: String, serial: String },

    /// Slot already occupied on device
    #[error("Slot {slot} already occupied on YubiKey {serial}")]
    SlotOccupied { slot: String, serial: String },

    /// age-plugin-yubikey errors
    #[error("age-plugin-yubikey error: {message}")]
    AgePlugin { message: String },

    /// age-plugin-yubikey not found
    #[error("age-plugin-yubikey not found at path: {path}")]
    AgePluginNotFound { path: String },

    /// age-plugin-yubikey command failed
    #[error("age-plugin-yubikey command failed: {command}, exit_code: {exit_code}, stderr: {stderr}")]
    AgePluginCommandFailed {
        command: String,
        exit_code: i32,
        stderr: String,
    },

    /// Configuration errors
    #[error("Configuration error: {message}")]
    Configuration { message: String },

    /// Timeout errors
    #[error("Operation timed out after {timeout_secs} seconds: {operation}")]
    Timeout {
        operation: String,
        timeout_secs: u64,
    },

    /// Validation errors
    #[error("Validation error: {message}")]
    Validation { message: String },

    /// Operation requires serial parameter (enforces architectural requirement)
    #[error("Operation requires serial parameter: {operation}")]
    SerialRequired { operation: String },

    /// External dependency errors
    #[error("External error: {source}")]
    External {
        #[from]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// I/O errors
    #[error("I/O error: {source}")]
    Io {
        #[from]
        source: std::io::Error,
    },

    /// Serialization errors
    #[error("Serialization error: {source}")]
    Serialization {
        #[from]
        source: serde_json::Error,
    },
}

impl YubiKeyError {
    /// Create a device error
    pub fn device(message: impl Into<String>) -> Self {
        Self::Device {
            message: message.into(),
        }
    }

    /// Create a device not found error
    pub fn device_not_found(serial: &Serial) -> Self {
        Self::DeviceNotFound {
            serial: serial.redacted(),
        }
    }

    /// Create a multiple devices found error
    pub fn multiple_devices_found(serials: &[Serial]) -> Self {
        Self::MultipleDevicesFound {
            serials: serials.iter().map(|s| s.redacted()).collect(),
        }
    }

    /// Create an identity error
    pub fn identity(message: impl Into<String>) -> Self {
        Self::Identity {
            message: message.into(),
        }
    }

    /// Create an identity not found error
    pub fn identity_not_found(serial: &Serial) -> Self {
        Self::IdentityNotFound {
            serial: serial.redacted(),
        }
    }

    /// Create a registry error
    pub fn registry(message: impl Into<String>) -> Self {
        Self::Registry {
            message: message.into(),
        }
    }

    /// Create a registry entry not found error
    pub fn registry_entry_not_found(serial: &Serial) -> Self {
        Self::RegistryEntryNotFound {
            serial: serial.redacted(),
        }
    }

    /// Create a registry entry exists error
    pub fn registry_entry_exists(serial: &Serial) -> Self {
        Self::RegistryEntryExists {
            serial: serial.redacted(),
        }
    }

    /// Create a file error
    pub fn file(message: impl Into<String>) -> Self {
        Self::File {
            message: message.into(),
        }
    }

    /// Create an encryption error
    pub fn encryption(message: impl Into<String>) -> Self {
        Self::Encryption {
            message: message.into(),
        }
    }

    /// Create a decryption error
    pub fn decryption(message: impl Into<String>) -> Self {
        Self::Decryption {
            message: message.into(),
        }
    }

    /// Create a PIN error
    pub fn pin(message: impl Into<String>) -> Self {
        Self::Pin {
            message: message.into(),
        }
    }

    /// Create a PIN blocked error
    pub fn pin_blocked(serial: &Serial) -> Self {
        Self::PinBlocked {
            serial: serial.redacted(),
        }
    }

    /// Create a state error
    pub fn state(message: impl Into<String>) -> Self {
        Self::State {
            message: message.into(),
        }
    }

    /// Create an operation not allowed error
    pub fn operation_not_allowed(operation: &str, current_state: &str, serial: &Serial) -> Self {
        Self::OperationNotAllowed {
            operation: operation.to_string(),
            current_state: current_state.to_string(),
            serial: serial.redacted(),
        }
    }

    /// Create a slot error
    pub fn slot(message: impl Into<String>) -> Self {
        Self::Slot {
            message: message.into(),
        }
    }

    /// Create a slot not available error (device-specific)
    pub fn slot_not_available(slot: &str, serial: &Serial) -> Self {
        Self::SlotNotAvailable {
            slot: slot.to_string(),
            serial: serial.redacted(),
        }
    }

    /// Create a slot occupied error (device-specific - fixes the bug)
    pub fn slot_occupied(slot: &str, serial: &Serial) -> Self {
        Self::SlotOccupied {
            slot: slot.to_string(),
            serial: serial.redacted(),
        }
    }

    /// Create an age-plugin error
    pub fn age_plugin(message: impl Into<String>) -> Self {
        Self::AgePlugin {
            message: message.into(),
        }
    }

    /// Create an age-plugin not found error
    pub fn age_plugin_not_found(path: &str) -> Self {
        Self::AgePluginNotFound {
            path: path.to_string(),
        }
    }

    /// Create an age-plugin command failed error
    pub fn age_plugin_command_failed(command: &str, exit_code: i32, stderr: &str) -> Self {
        Self::AgePluginCommandFailed {
            command: command.to_string(),
            exit_code,
            stderr: stderr.to_string(),
        }
    }

    /// Create a configuration error
    pub fn configuration(message: impl Into<String>) -> Self {
        Self::Configuration {
            message: message.into(),
        }
    }

    /// Create a timeout error
    pub fn timeout(operation: &str, timeout_secs: u64) -> Self {
        Self::Timeout {
            operation: operation.to_string(),
            timeout_secs,
        }
    }

    /// Create a validation error
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
        }
    }

    /// Create a serial required error (enforces architectural requirement)
    pub fn serial_required(operation: &str) -> Self {
        Self::SerialRequired {
            operation: operation.to_string(),
        }
    }

    /// Check if error is recoverable
    pub fn is_recoverable(&self) -> bool {
        match self {
            // Recoverable errors
            Self::Pin { .. } => true,
            Self::PinValidation { .. } => true,
            Self::Timeout { .. } => true,
            Self::File { .. } => true,

            // Non-recoverable errors
            Self::DeviceNotFound { .. } => false,
            Self::PinBlocked { .. } => false,
            Self::SerialValidation { .. } => false,
            Self::AgePluginNotFound { .. } => false,

            // Context-dependent
            _ => false,
        }
    }

    /// Get error category for metrics/logging
    pub fn category(&self) -> ErrorCategory {
        match self {
            Self::Device { .. } | Self::DeviceNotFound { .. } | Self::MultipleDevicesFound { .. } => {
                ErrorCategory::Device
            }
            Self::Identity { .. } | Self::IdentityNotFound { .. } | Self::IdentityValidation { .. } => {
                ErrorCategory::Identity
            }
            Self::Registry { .. } | Self::RegistryEntryNotFound { .. } | Self::RegistryEntryExists { .. } => {
                ErrorCategory::Registry
            }
            Self::File { .. } | Self::Encryption { .. } | Self::Decryption { .. } => {
                ErrorCategory::File
            }
            Self::Pin { .. } | Self::PinValidation { .. } | Self::PinBlocked { .. } => {
                ErrorCategory::Pin
            }
            Self::State { .. } | Self::StateTransition { .. } | Self::OperationNotAllowed { .. } => {
                ErrorCategory::State
            }
            Self::Slot { .. } | Self::SlotNotAvailable { .. } | Self::SlotOccupied { .. } => {
                ErrorCategory::Slot
            }
            Self::AgePlugin { .. } | Self::AgePluginNotFound { .. } | Self::AgePluginCommandFailed { .. } => {
                ErrorCategory::AgePlugin
            }
            Self::SerialValidation { .. } | Self::SerialRequired { .. } => {
                ErrorCategory::Serial
            }
            _ => ErrorCategory::Other,
        }
    }
}

/// Error categories for metrics and logging
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ErrorCategory {
    Device,
    Identity,
    Registry,
    File,
    Pin,
    State,
    Slot,
    AgePlugin,
    Serial,
    Other,
}

impl fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ErrorCategory::Device => write!(f, "device"),
            ErrorCategory::Identity => write!(f, "identity"),
            ErrorCategory::Registry => write!(f, "registry"),
            ErrorCategory::File => write!(f, "file"),
            ErrorCategory::Pin => write!(f, "pin"),
            ErrorCategory::State => write!(f, "state"),
            ErrorCategory::Slot => write!(f, "slot"),
            ErrorCategory::AgePlugin => write!(f, "age_plugin"),
            ErrorCategory::Serial => write!(f, "serial"),
            ErrorCategory::Other => write!(f, "other"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::key_management::yubikey::models::Serial;

    #[test]
    fn test_error_creation() {
        let serial = Serial::new("12345678".to_string()).unwrap();

        let device_error = YubiKeyError::device_not_found(&serial);
        assert!(matches!(device_error, YubiKeyError::DeviceNotFound { .. }));

        let slot_error = YubiKeyError::slot_occupied("1", &serial);
        assert!(matches!(slot_error, YubiKeyError::SlotOccupied { .. }));

        let serial_required = YubiKeyError::serial_required("encrypt");
        assert!(matches!(serial_required, YubiKeyError::SerialRequired { .. }));
    }

    #[test]
    fn test_error_categories() {
        let serial = Serial::new("12345678".to_string()).unwrap();

        assert_eq!(
            YubiKeyError::device_not_found(&serial).category(),
            ErrorCategory::Device
        );

        assert_eq!(
            YubiKeyError::slot_occupied("1", &serial).category(),
            ErrorCategory::Slot
        );

        assert_eq!(
            YubiKeyError::serial_required("encrypt").category(),
            ErrorCategory::Serial
        );
    }

    #[test]
    fn test_error_recoverability() {
        let pin_error = YubiKeyError::pin("Invalid PIN");
        assert!(pin_error.is_recoverable());

        let device_not_found = YubiKeyError::device("Device disconnected");
        assert!(!device_not_found.is_recoverable());
    }

    #[test]
    fn test_serial_redaction_in_errors() {
        let serial = Serial::new("12345678".to_string()).unwrap();
        let error = YubiKeyError::device_not_found(&serial);

        let error_message = format!("{}", error);
        assert!(!error_message.contains("12345678"));
        assert!(error_message.contains("***"));
    }
}