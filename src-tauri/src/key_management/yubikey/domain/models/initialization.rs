//! YubiKey initialization domain objects
//!
//! Contains domain models for YubiKey initialization results and related types.
//! This replaces the legacy YubiKeyInitResult from crypto/yubikey.

use crate::key_management::yubikey::domain::models::serial::Serial;
use serde::{Deserialize, Serialize};

/// PIN policy for YubiKey operations (from crypto/yubikey management)
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum PinPolicy {
    Never,
    Once,
    Always,
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

impl InitializationResult {
    /// Create new initialization result
    pub fn new(
        public_key: String,
        slot: u8,
        touch_required: bool,
        pin_policy: PinPolicy,
    ) -> Self {
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
        let touch = if self.touch_required { "Touch Required" } else { "No Touch" };
        let pin = match self.pin_policy {
            PinPolicy::Never => "No PIN",
            PinPolicy::Once => "PIN Once",
            PinPolicy::Always => "PIN Always",
        };
        format!("{}, {}", touch, pin)
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
        assert_eq!(result.age_recipient(), "age1yubikey1qxf8r7wdfvr3a3k2tqqqqqqqqqqqqqqqqqqqqqqqqqqqqq");
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