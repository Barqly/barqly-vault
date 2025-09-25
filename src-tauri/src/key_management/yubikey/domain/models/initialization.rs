//! YubiKey initialization domain objects
//!
//! Contains domain models for YubiKey initialization results and related types.
//! This replaces the legacy YubiKeyInitResult from crypto/yubikey.

use serde::{Deserialize, Serialize};
use std::fmt;

/// PIN policy for YubiKey operations (from crypto/yubikey management)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
pub enum PinPolicy {
    Never,
    Once,
    Always,
}

/// Touch policy for YubiKey operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, specta::Type)]
pub enum TouchPolicy {
    Never,
    Always,
    Cached,
}

/// Default policy configurations for YubiKey operations
pub mod policy_config {
    use super::*;

    /// PIN policy for all YubiKey operations
    /// - Once: PIN required once per session (recommended for usability)
    /// - Always: PIN required for every operation (maximum security)
    /// - Never: No PIN required (not recommended)
    pub const DEFAULT_PIN_POLICY: PinPolicy = PinPolicy::Once;

    /// Touch policy for all YubiKey operations
    /// - Cached: Touch required once, then 15s window (recommended for usability)
    /// - Always: Touch required for every operation (maximum security)
    /// - Never: No touch required (for testing/debugging)
    pub const DEFAULT_TOUCH_POLICY: TouchPolicy = TouchPolicy::Never;
}

/// Result from YubiKey initialization containing all necessary information
/// for registration and subsequent operations
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct InitializationResult {
    /// Public key (age recipient string)
    pub public_key: String,
    /// Slot number used for the key
    pub slot: u8,
    /// Whether touch is required for operations
    pub touch_required: bool,
    /// PIN policy for the key
    pub pin_policy: PinPolicy,
}

impl fmt::Display for PinPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PinPolicy::Never => write!(f, "Never"),
            PinPolicy::Once => write!(f, "Once"),
            PinPolicy::Always => write!(f, "Always"),
        }
    }
}

impl fmt::Display for TouchPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TouchPolicy::Never => write!(f, "Never"),
            TouchPolicy::Always => write!(f, "Always"),
            TouchPolicy::Cached => write!(f, "Cached"),
        }
    }
}

impl InitializationResult {
    /// Create new initialization result
    pub fn new(public_key: String, slot: u8, touch_required: bool, pin_policy: PinPolicy) -> Self {
        Self {
            public_key,
            slot,
            touch_required,
            pin_policy,
        }
    }

    /// Create with default security settings (touch required, PIN once)
    pub fn with_defaults(public_key: String, slot: u8) -> Self {
        Self::new(public_key, slot, true, PinPolicy::Once)
    }

    /// Get the age recipient string
    pub fn age_recipient(&self) -> &str {
        &self.public_key
    }

    /// Check if this key requires touch for operations
    pub fn requires_touch(&self) -> bool {
        self.touch_required
    }

    /// Check if this key requires PIN for operations
    pub fn requires_pin(&self) -> bool {
        !matches!(self.pin_policy, PinPolicy::Never)
    }

    /// Get security summary for display
    pub fn security_summary(&self) -> String {
        let touch = if self.touch_required {
            "Touch Required"
        } else {
            "No Touch"
        };
        let pin = match self.pin_policy {
            PinPolicy::Never => "No PIN",
            PinPolicy::Once => "PIN Once",
            PinPolicy::Always => "PIN Always",
        };
        format!("{}, {}", touch, pin)
    }
}

/// Unlock methods available for decryption
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, specta::Type)]
pub enum UnlockMethod {
    Passphrase,
    YubiKey,
}

/// Credentials for unlocking vaults
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum UnlockCredentials {
    Passphrase {
        key_label: String,
        passphrase: String,
    },
    YubiKey {
        serial: String,
        pin: Option<String>,
    },
}

impl UnlockCredentials {
    /// Get the unlock method for these credentials
    pub fn method(&self) -> UnlockMethod {
        match self {
            UnlockCredentials::Passphrase { .. } => UnlockMethod::Passphrase,
            UnlockCredentials::YubiKey { .. } => UnlockMethod::YubiKey,
        }
    }

    /// Get a display name for these credentials (without exposing sensitive data)
    pub fn display_name(&self) -> String {
        match self {
            UnlockCredentials::Passphrase { key_label, .. } => {
                format!("Passphrase ({})", key_label)
            }
            UnlockCredentials::YubiKey { serial, .. } => {
                format!("YubiKey ({})", &serial[..4.min(serial.len())]) // Only show first 4 chars
            }
        }
    }

    /// Check if these credentials are for a YubiKey
    pub fn is_yubikey(&self) -> bool {
        matches!(self, UnlockCredentials::YubiKey { .. })
    }

    /// Check if these credentials are for a passphrase
    pub fn is_passphrase(&self) -> bool {
        matches!(self, UnlockCredentials::Passphrase { .. })
    }
}

/// Protection modes for vault security
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum ProtectionMode {
    PassphraseOnly,
    YubiKeyOnly { serial: String },
    Hybrid { yubikey_serial: String },
}

impl ProtectionMode {
    /// Check if this protection mode requires a YubiKey
    pub fn requires_yubikey(&self) -> bool {
        matches!(self, ProtectionMode::YubiKeyOnly { .. } | ProtectionMode::Hybrid { .. })
    }

    /// Check if this protection mode requires a passphrase
    pub fn requires_passphrase(&self) -> bool {
        matches!(self, ProtectionMode::PassphraseOnly | ProtectionMode::Hybrid { .. })
    }

    /// Get the YubiKey serial if applicable
    pub fn yubikey_serial(&self) -> Option<&str> {
        match self {
            ProtectionMode::YubiKeyOnly { serial } => Some(serial),
            ProtectionMode::Hybrid { yubikey_serial } => Some(yubikey_serial),
            ProtectionMode::PassphraseOnly => None,
        }
    }

    /// Get a display name for this protection mode
    pub fn display_name(&self) -> String {
        match self {
            ProtectionMode::PassphraseOnly => "Passphrase Only".to_string(),
            ProtectionMode::YubiKeyOnly { serial } => format!("YubiKey Only ({})", serial),
            ProtectionMode::Hybrid { yubikey_serial } => {
                format!("Hybrid (YubiKey + Passphrase, {})", yubikey_serial)
            }
        }
    }

    /// Get compatible unlock methods for this protection mode
    pub fn compatible_methods(&self) -> Vec<UnlockMethod> {
        match self {
            ProtectionMode::PassphraseOnly => vec![UnlockMethod::Passphrase],
            ProtectionMode::YubiKeyOnly { .. } => vec![UnlockMethod::YubiKey],
            ProtectionMode::Hybrid { .. } => vec![UnlockMethod::Passphrase, UnlockMethod::YubiKey],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initialization_result_creation() {
        let result = InitializationResult::new(
            "age1yubikey1qxf8r7wdfvr3a3k2tqqqqqqqqqqqqqqqqqqqqqqqqqqqqq".to_string(),
            1,
            true,
            PinPolicy::Once,
        );

        assert_eq!(result.slot, 1);
        assert!(result.requires_touch());
        assert!(result.requires_pin());
        assert_eq!(
            result.age_recipient(),
            "age1yubikey1qxf8r7wdfvr3a3k2tqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"
        );
    }

    #[test]
    fn test_with_defaults() {
        let result = InitializationResult::with_defaults(
            "age1yubikey1qxf8r7wdfvr3a3k2tqqqqqqqqqqqqqqqqqqqqqqqqqqqqq".to_string(),
            1,
        );

        assert!(result.touch_required);
        assert!(matches!(result.pin_policy, PinPolicy::Once));
    }

    #[test]
    fn test_security_summary() {
        let result = InitializationResult::new(
            "age1yubikey1qxf8r7wdfvr3a3k2tqqqqqqqqqqqqqqqqqqqqqqqqqqqqq".to_string(),
            1,
            true,
            PinPolicy::Always,
        );

        let summary = result.security_summary();
        assert!(summary.contains("Touch Required"));
        assert!(summary.contains("PIN Always"));
    }

    #[test]
    fn test_pin_requirements() {
        let never_pin = InitializationResult::new("test".to_string(), 1, false, PinPolicy::Never);
        let once_pin = InitializationResult::new("test".to_string(), 1, false, PinPolicy::Once);
        let always_pin = InitializationResult::new("test".to_string(), 1, false, PinPolicy::Always);

        assert!(!never_pin.requires_pin());
        assert!(once_pin.requires_pin());
        assert!(always_pin.requires_pin());
    }
}
