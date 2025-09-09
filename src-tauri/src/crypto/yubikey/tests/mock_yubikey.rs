//! Mock YubiKey implementation for testing
//!
//! This module provides mock implementations of YubiKey operations
//! that can be used in CI/CD environments where physical hardware is not available.

use crate::crypto::yubikey::*;
use crate::crypto::yubikey::management::{PinPolicy, TouchPolicy};
use std::collections::HashMap;

/// Mock YubiKey implementation that simulates hardware behavior
pub struct MockYubiKey {
    pub serial: String,
    pub model: String,
    pub version: String,
    pub pin: String,
    pub pin_attempts_remaining: u8,
    pub is_blocked: bool,
    pub touch_required: bool,
    pub slots: HashMap<u8, MockPivSlot>,
}

/// Mock PIV slot data
#[derive(Debug, Clone)]
pub struct MockPivSlot {
    pub has_key: bool,
    pub public_key: Option<String>,
    pub certificate: Option<String>,
}

impl Default for MockPivSlot {
    fn default() -> Self {
        Self {
            has_key: false,
            public_key: None,
            certificate: None,
        }
    }
}

impl MockYubiKey {
    /// Create a new mock YubiKey with default settings
    pub fn new(serial: String) -> Self {
        let mut slots = HashMap::new();

        // Initialize retired key slots as available
        for slot_id in 0x82..=0x95 {
            slots.insert(slot_id, MockPivSlot::default());
        }

        // Add standard PIV slots
        slots.insert(0x9A, MockPivSlot::default());
        slots.insert(0x9C, MockPivSlot::default());
        slots.insert(0x9D, MockPivSlot::default());
        slots.insert(0x9E, MockPivSlot::default());

        Self {
            serial,
            model: "YubiKey 5 Series (Mock)".to_string(),
            version: "5.4.3".to_string(),
            pin: "123456".to_string(), // Default PIN
            pin_attempts_remaining: 3,
            is_blocked: false,
            touch_required: true,
            slots,
        }
    }

    /// Verify PIN and return remaining attempts
    pub fn verify_pin(&mut self, pin: &str) -> Result<(), YubiKeyError> {
        if self.is_blocked {
            return Err(YubiKeyError::PinBlocked);
        }

        if pin == self.pin {
            self.pin_attempts_remaining = 3; // Reset on successful auth
            Ok(())
        } else {
            self.pin_attempts_remaining -= 1;
            if self.pin_attempts_remaining == 0 {
                self.is_blocked = true;
                Err(YubiKeyError::PinBlocked)
            } else {
                Err(YubiKeyError::PinRequired(self.pin_attempts_remaining))
            }
        }
    }

    /// Generate a key in the specified slot
    pub fn generate_key(&mut self, slot: u8, _pin: &str) -> Result<String, YubiKeyError> {
        if self.is_blocked {
            return Err(YubiKeyError::PinBlocked);
        }

        let slot_data = self
            .slots
            .get_mut(&slot)
            .ok_or(YubiKeyError::SlotNotAvailable(slot))?;

        if slot_data.has_key {
            return Err(YubiKeyError::SlotInUse(slot));
        }

        // Simulate key generation
        let mock_public_key = format!(
            "age1yubikey1{:08x}{}",
            slot,
            generate_mock_key_data(&self.serial, slot)
        );
        slot_data.has_key = true;
        slot_data.public_key = Some(mock_public_key.clone());

        Ok(mock_public_key)
    }

    /// Get available slots (slots without keys)
    pub fn get_available_slots(&self) -> Vec<u8> {
        self.slots
            .iter()
            .filter(|(_, slot_data)| !slot_data.has_key)
            .map(|(&slot_id, _)| slot_id)
            .collect()
    }

    /// Check if a slot is available
    pub fn is_slot_available(&self, slot: u8) -> bool {
        self.slots.get(&slot).map_or(false, |s| !s.has_key)
    }

    /// Set PIN (for testing PIN changes)
    pub fn set_pin(&mut self, new_pin: String) {
        self.pin = new_pin;
        self.is_blocked = false;
        self.pin_attempts_remaining = 3;
    }

    /// Block the device (for testing blocked scenarios)
    pub fn block_device(&mut self) {
        self.is_blocked = true;
        self.pin_attempts_remaining = 0;
    }

    /// Unblock device with PUK (for testing recovery)
    pub fn unblock_with_puk(&mut self, _puk: &str) {
        self.is_blocked = false;
        self.pin_attempts_remaining = 3;
    }

    /// Convert to YubiKeyDevice for API compatibility
    pub fn to_yubikey_device(&self) -> YubiKeyDevice {
        let status = if self.is_blocked {
            DeviceStatus::Locked
        } else if self.pin_attempts_remaining < 3 {
            DeviceStatus::PinRequired
        } else {
            DeviceStatus::Ready
        };

        YubiKeyDevice {
            serial: self.serial.clone(),
            model: self.model.clone(),
            version: self.version.clone(),
            status,
            available_slots: self.get_available_slots(),
        }
    }
}

/// Generate mock key data for testing
fn generate_mock_key_data(serial: &str, slot: u8) -> String {
    use sha2::{Digest, Sha256};

    let input = format!("{}-{}-mock-key", serial, slot);
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    let result = hasher.finalize();

    // Take first 32 characters of hex for mock key data
    hex::encode(&result[..16])
}

/// Mock YubiKey manager for testing
pub struct MockYubiKeyManager {
    devices: HashMap<String, MockYubiKey>,
}

impl MockYubiKeyManager {
    /// Create new mock manager
    pub fn new() -> Self {
        Self {
            devices: HashMap::new(),
        }
    }

    /// Add a mock device
    pub fn add_device(&mut self, serial: String) -> &mut MockYubiKey {
        self.devices
            .entry(serial.clone())
            .or_insert_with(|| MockYubiKey::new(serial))
    }

    /// Remove a mock device
    pub fn remove_device(&mut self, serial: &str) {
        self.devices.remove(serial);
    }

    /// Get all connected devices
    pub fn list_devices(&self) -> Vec<YubiKeyDevice> {
        self.devices
            .values()
            .map(|d| d.to_yubikey_device())
            .collect()
    }

    /// Get a specific device
    pub fn get_device(&mut self, serial: &str) -> Option<&mut MockYubiKey> {
        self.devices.get_mut(serial)
    }

    /// Initialize a device with a key
    pub fn initialize_device(
        &mut self,
        serial: &str,
        pin: &str,
        slot: Option<u8>,
        _label: &str,
    ) -> Result<YubiKeyInfo, YubiKeyError> {
        let device = self
            .devices
            .get_mut(serial)
            .ok_or_else(|| YubiKeyError::DeviceNotFound(serial.to_string()))?;

        device.verify_pin(pin)?;

        let target_slot = slot.unwrap_or_else(|| {
            device
                .get_available_slots()
                .first()
                .copied()
                .unwrap_or(0x82)
        });

        let public_key = device.generate_key(target_slot, pin)?;

        Ok(YubiKeyInfo {
            serial: serial.to_string(),
            slot: target_slot,
            public_key,
            pin_policy: PinPolicy::Always,
            touch_policy: crate::crypto::yubikey::TouchPolicy::Always,
            label: format!("Mock YubiKey {}", serial),
        })
    }
}

impl Default for MockYubiKeyManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_yubikey_creation() {
        let mock = MockYubiKey::new("12345678".to_string());
        assert_eq!(mock.serial, "12345678");
        assert_eq!(mock.pin_attempts_remaining, 3);
        assert!(!mock.is_blocked);
        assert!(!mock.get_available_slots().is_empty());
    }

    #[test]
    fn test_pin_verification() {
        let mut mock = MockYubiKey::new("12345678".to_string());

        // Correct PIN should work
        assert!(mock.verify_pin("123456").is_ok());
        assert_eq!(mock.pin_attempts_remaining, 3);

        // Wrong PIN should reduce attempts
        assert!(mock.verify_pin("wrong").is_err());
        assert_eq!(mock.pin_attempts_remaining, 2);
    }

    #[test]
    fn test_pin_blocking() {
        let mut mock = MockYubiKey::new("12345678".to_string());

        // Exhaust PIN attempts
        assert!(mock.verify_pin("wrong").is_err());
        assert!(mock.verify_pin("wrong").is_err());
        assert!(mock.verify_pin("wrong").is_err());

        assert!(mock.is_blocked);
        assert_eq!(mock.pin_attempts_remaining, 0);

        // Further attempts should fail with PinBlocked
        assert!(matches!(
            mock.verify_pin("123456"),
            Err(YubiKeyError::PinBlocked)
        ));
    }

    #[test]
    fn test_key_generation() {
        let mut mock = MockYubiKey::new("12345678".to_string());
        let slot = 0x82;

        assert!(mock.is_slot_available(slot));

        let public_key = mock.generate_key(slot, "123456").unwrap();
        assert!(!public_key.is_empty());
        assert!(public_key.starts_with("age1yubikey1"));

        // Slot should no longer be available
        assert!(!mock.is_slot_available(slot));

        // Generating in same slot should fail
        assert!(matches!(
            mock.generate_key(slot, "123456"),
            Err(YubiKeyError::SlotInUse(_))
        ));
    }

    #[test]
    fn test_mock_manager() {
        let mut manager = MockYubiKeyManager::new();

        // Add devices
        manager.add_device("11111111".to_string());
        manager.add_device("22222222".to_string());

        let devices = manager.list_devices();
        assert_eq!(devices.len(), 2);

        // Test initialization
        let result = manager.initialize_device("11111111", "123456", Some(0x82), "Test Key");
        assert!(result.is_ok());

        let yubikey_info = result.unwrap();
        assert_eq!(yubikey_info.serial, "11111111");
        assert_eq!(yubikey_info.slot, 0x82);
        assert!(!yubikey_info.public_key.is_empty());
    }

    #[test]
    fn test_device_conversion() {
        let mock = MockYubiKey::new("12345678".to_string());
        let device = mock.to_yubikey_device();

        assert_eq!(device.serial, "12345678");
        assert!(matches!(device.status, DeviceStatus::Ready));
        assert!(!device.available_slots.is_empty());
    }
}
