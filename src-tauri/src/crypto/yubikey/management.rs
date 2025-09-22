//! YubiKey PIV management operations (DEPRECATED)
//!
//! This module contains legacy YubiKey management code using direct hardware integration.
//! It is deprecated in favor of the age-plugin-yubikey provider abstraction.

use super::errors::{YubiKeyError, YubiKeyResult};
use p256::{PublicKey, SecretKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use std::fmt;

/// Centralized YubiKey policy configuration
/// These constants ensure consistent policy application across all operations
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

/// PIN policy for PIV operations
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum PinPolicy {
    Never,
    Once,
    Always,
}

impl fmt::Display for PinPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PinPolicy::Never => write!(f, "never"),
            PinPolicy::Once => write!(f, "once"),
            PinPolicy::Always => write!(f, "always"),
        }
    }
}

/// Touch policy for PIV operations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
pub enum TouchPolicy {
    Never,
    Always,
    Cached,
}

impl fmt::Display for TouchPolicy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            TouchPolicy::Never => write!(f, "never"),
            TouchPolicy::Always => write!(f, "always"),
            TouchPolicy::Cached => write!(f, "cached"),
        }
    }
}

/// YubiKey information after initialization
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyInfo {
    pub serial: String,
    pub slot: u8,
    pub public_key: String,
    pub pin_policy: PinPolicy,
    pub touch_policy: TouchPolicy,
    pub label: String,
}

/// YubiKey PIV management operations
pub struct YubiKeyManager {
    #[allow(dead_code)]
    preferred_slots: Vec<u8>,
}

impl Default for YubiKeyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl YubiKeyManager {
    /// Create a new YubiKey manager with default slot preferences
    pub fn new() -> Self {
        Self {
            // Prefer retired key slots (0x82-0x95) for age encryption keys
            preferred_slots: vec![
                0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, // Retired slots 1-8
                0x8A, 0x8B, 0x8C, 0x8D, 0x8E, 0x8F, 0x90, 0x91, // Retired slots 9-16
                0x92, 0x93, 0x94, 0x95, // Retired slots 17-20
                0x9D, // Key management slot as fallback
            ],
        }
    }

    /// Initialize a YubiKey for age encryption (DEPRECATED)
    ///
    /// This method is deprecated. Use YubiIdentityProvider::register() instead.
    pub fn initialize_yubikey(
        &self,
        serial: &str,
        _pin: &str,
        _slot: Option<u8>,
        label: &str,
    ) -> YubiKeyResult<YubiKeyInfo> {
        // Return a stub implementation to maintain API compatibility
        // Real functionality has moved to the provider abstraction
        Err(YubiKeyError::InitializationFailed(
            format!("Direct YubiKey initialization is deprecated. Use YubiIdentityProvider::register() instead. Serial: {serial}, Label: {label}")
        ))
    }

    /// Connect to a YubiKey by serial number (DEPRECATED)
    #[allow(dead_code)]
    fn connect_to_yubikey(&self, serial: &str) -> YubiKeyResult<()> {
        // Stub implementation - direct hardware connection is deprecated
        Err(YubiKeyError::CommunicationError(format!(
            "Direct YubiKey connection is deprecated. Serial: {serial}"
        )))
    }

    /// Validate PIN format
    pub fn validate_pin(&self, pin: &str) -> YubiKeyResult<()> {
        if pin.len() < 6 || pin.len() > 8 {
            return Err(YubiKeyError::InvalidPin);
        }

        // Check if PIN contains only digits (YubiKey PIV PINs are numeric)
        if !pin.chars().all(|c| c.is_ascii_digit()) {
            return Err(YubiKeyError::InvalidPin);
        }

        Ok(())
    }

    /// Find an available slot from the preferred list
    #[allow(dead_code)]
    fn find_available_slot(&self, available_slots: &[u8]) -> YubiKeyResult<u8> {
        for &slot in &self.preferred_slots {
            if available_slots.contains(&slot) {
                return Ok(slot);
            }
        }

        // If no preferred slots are available, use the first available
        available_slots
            .first()
            .copied()
            .ok_or(YubiKeyError::InitializationFailed(
                "No available PIV slots".to_string(),
            ))
    }

    /// Authenticate with the YubiKey using PIN (DEPRECATED)
    #[allow(dead_code)]
    fn authenticate_pin(&self, _pin: &str) -> YubiKeyResult<()> {
        // Stub implementation - direct PIN authentication is deprecated
        Err(YubiKeyError::CommunicationError(
            "Direct PIN authentication is deprecated".to_string(),
        ))
    }

    /// Generate a P-256 key pair in the specified PIV slot (DEPRECATED)
    #[allow(dead_code)]
    fn generate_key_in_slot(&self, _slot: u8, _pin: &str) -> YubiKeyResult<PublicKey> {
        // Generate a mock key for backward compatibility
        // Real key generation has moved to the provider abstraction
        let secret_key = SecretKey::random(&mut OsRng);
        Ok(secret_key.public_key())
    }

    /// Extract P-256 public key from YubiKey response
    #[allow(dead_code)]
    fn extract_p256_public_key(&self, public_key: &PublicKey) -> YubiKeyResult<PublicKey> {
        // Return the provided public key
        Ok(*public_key)
    }

    /// Convert P-256 public key to age-compatible recipient format
    #[allow(dead_code)]
    fn public_key_to_age_format(&self, _public_key: &PublicKey, slot: u8) -> YubiKeyResult<String> {
        // Simplified age recipient format for compilation
        // In a real implementation, this would use the proper YubiKey plugin format
        let recipient = format!("age1yubikey1{slot:08x}mockkey");
        Ok(recipient)
    }

    /// Check if a YubiKey is ready for operations (DEPRECATED)
    pub fn check_yubikey_status(&self, serial: &str) -> YubiKeyResult<()> {
        // Stub implementation for backward compatibility
        Err(YubiKeyError::CommunicationError(format!(
            "Direct status check is deprecated. Serial: {serial}"
        )))
    }

    /// Test YubiKey connectivity and PIN without making changes (DEPRECATED)
    pub fn test_yubikey_connection(&self, serial: &str, pin: &str) -> YubiKeyResult<()> {
        // Stub implementation for backward compatibility
        self.validate_pin(pin)?; // Keep PIN validation as it's still useful
        Err(YubiKeyError::CommunicationError(format!(
            "Direct connection test is deprecated. Serial: {serial}"
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pin_validation() {
        let manager = YubiKeyManager::new();

        // Valid PINs
        assert!(manager.validate_pin("123456").is_ok());
        assert!(manager.validate_pin("12345678").is_ok());

        // Invalid PINs
        assert!(manager.validate_pin("12345").is_err()); // Too short
        assert!(manager.validate_pin("123456789").is_err()); // Too long
        assert!(manager.validate_pin("abcd56").is_err()); // Contains letters
        assert!(manager.validate_pin("123-56").is_err()); // Contains symbols
    }

    #[test]
    fn test_slot_selection() {
        let manager = YubiKeyManager::new();
        let available_slots = vec![0x82, 0x83, 0x9D];

        let selected_slot = manager.find_available_slot(&available_slots).unwrap();
        assert_eq!(selected_slot, 0x82); // Should pick the first preferred slot
    }

    #[test]
    fn test_slot_fallback() {
        let manager = YubiKeyManager::new();
        let available_slots = vec![0x9A]; // Only non-preferred slot available

        let selected_slot = manager.find_available_slot(&available_slots).unwrap();
        assert_eq!(selected_slot, 0x9A); // Should fall back to available slot
    }
}
