//! YubiKey device domain object with capabilities
//!
//! Represents a physical YubiKey device with its capabilities and state.
//! Replaces primitive obsession with proper domain modeling.

use crate::key_management::yubikey::domain::models::serial::Serial;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

/// YubiKey device with capabilities and state
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct YubiKeyDevice {
    /// Device serial number
    pub serial: Serial,
    /// Device name/model
    pub name: String,
    /// Firmware version
    pub firmware_version: Option<String>,
    /// Device form factor
    pub form_factor: FormFactor,
    /// Available interfaces
    pub interfaces: Vec<Interface>,
    /// Device capabilities
    pub capabilities: DeviceCapabilities,
    /// Current connection state
    pub connection_state: ConnectionState,
    /// Device health status
    pub health: DeviceHealth,
    /// Slot information
    pub slots: Vec<SlotInfo>,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

impl YubiKeyDevice {
    /// Create a new YubiKey device
    pub fn new(
        serial: Serial,
        name: String,
        form_factor: FormFactor,
        interfaces: Vec<Interface>,
    ) -> Self {
        Self {
            serial,
            name,
            firmware_version: None,
            form_factor,
            interfaces,
            capabilities: DeviceCapabilities::default(),
            connection_state: ConnectionState::Disconnected,
            health: DeviceHealth::Unknown,
            slots: Vec::new(),
            metadata: HashMap::new(),
        }
    }

    /// Create from detected device information
    pub fn from_detected_device(
        serial: Serial,
        name: String,
        form_factor: FormFactor,
        interfaces: Vec<Interface>,
        firmware_version: Option<String>,
    ) -> Self {
        let mut device = Self::new(serial, name, form_factor, interfaces);
        device.firmware_version = firmware_version;
        device.connection_state = ConnectionState::Connected;
        device.capabilities = DeviceCapabilities::detect_from_interfaces(&device.interfaces);
        device
    }

    /// Get the device serial number
    pub fn serial(&self) -> &Serial {
        &self.serial
    }

    /// Get redacted serial for logging
    pub fn serial_redacted(&self) -> String {
        self.serial.redacted()
    }

    /// Check if device supports a specific capability
    pub fn supports_capability(&self, capability: Capability) -> bool {
        match capability {
            Capability::PIV => self.capabilities.piv,
            Capability::OATH => self.capabilities.oath,
            Capability::FIDO2 => self.capabilities.fido2,
            Capability::OpenPGP => self.capabilities.openpgp,
            Capability::OTP => self.capabilities.otp,
        }
    }

    /// Check if device is available for operations
    pub fn is_available(&self) -> bool {
        matches!(self.connection_state, ConnectionState::Connected)
            && matches!(self.health, DeviceHealth::Healthy | DeviceHealth::Warning)
    }

    /// Check if device requires PIN
    pub fn requires_pin(&self) -> bool {
        self.capabilities.requires_pin()
    }

    /// Get available slot for operation
    pub fn get_available_slot(&self, slot_type: SlotType) -> Option<&SlotInfo> {
        self.slots
            .iter()
            .find(|slot| slot.slot_type == slot_type && slot.is_available())
    }

    /// Update connection state
    pub fn update_connection_state(&mut self, state: ConnectionState) {
        self.connection_state = state;
    }

    /// Update health status
    pub fn update_health(&mut self, health: DeviceHealth) {
        self.health = health;
    }

    /// Add slot information
    pub fn add_slot(&mut self, slot: SlotInfo) {
        // Remove existing slot of same type if present
        self.slots.retain(|s| s.slot_type != slot.slot_type);
        self.slots.push(slot);
    }

    /// Set metadata
    pub fn set_metadata(&mut self, key: String, value: String) {
        self.metadata.insert(key, value);
    }

    /// Get metadata
    pub fn get_metadata(&self, key: &str) -> Option<&String> {
        self.metadata.get(key)
    }

    /// Create device summary for display
    pub fn summary(&self) -> DeviceSummary {
        DeviceSummary {
            serial_redacted: self.serial_redacted(),
            name: self.name.clone(),
            form_factor: self.form_factor.clone(),
            connection_state: self.connection_state.clone(),
            health: self.health.clone(),
            capabilities: self.capabilities.summary(),
            available_slots: self.slots.len(),
        }
    }
}

/// Device form factor
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FormFactor {
    UsbA,
    UsbC,
    Lightning,
    NFC,
    Keychain,
    Nano,
    Unknown,
}

impl fmt::Display for FormFactor {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FormFactor::UsbA => write!(f, "USB-A"),
            FormFactor::UsbC => write!(f, "USB-C"),
            FormFactor::Lightning => write!(f, "Lightning"),
            FormFactor::NFC => write!(f, "NFC"),
            FormFactor::Keychain => write!(f, "Keychain"),
            FormFactor::Nano => write!(f, "Nano"),
            FormFactor::Unknown => write!(f, "Unknown"),
        }
    }
}

/// Device interface
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Interface {
    USB,
    NFC,
    Lightning,
    Smartcard,
}

/// Device capabilities
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct DeviceCapabilities {
    pub piv: bool,
    pub oath: bool,
    pub fido2: bool,
    pub openpgp: bool,
    pub otp: bool,
}

impl DeviceCapabilities {
    /// Detect capabilities from available interfaces
    pub fn detect_from_interfaces(interfaces: &[Interface]) -> Self {
        let mut capabilities = Self::default();

        // Most YubiKeys support these capabilities if they have USB interface
        if interfaces.contains(&Interface::USB) {
            capabilities.piv = true;
            capabilities.oath = true;
            capabilities.otp = true;
        }

        // FIDO2 is available on newer devices
        if interfaces.contains(&Interface::USB) || interfaces.contains(&Interface::NFC) {
            capabilities.fido2 = true;
        }

        // OpenPGP support varies by model
        // This would need device-specific detection logic
        capabilities.openpgp = false;

        capabilities
    }

    /// Check if any capability requires PIN
    pub fn requires_pin(&self) -> bool {
        self.piv || self.fido2
    }

    /// Get capability summary
    pub fn summary(&self) -> Vec<String> {
        let mut caps = Vec::new();
        if self.piv {
            caps.push("PIV".to_string());
        }
        if self.oath {
            caps.push("OATH".to_string());
        }
        if self.fido2 {
            caps.push("FIDO2".to_string());
        }
        if self.openpgp {
            caps.push("OpenPGP".to_string());
        }
        if self.otp {
            caps.push("OTP".to_string());
        }
        caps
    }
}

/// Individual capability
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Capability {
    PIV,
    OATH,
    FIDO2,
    OpenPGP,
    OTP,
}

/// Device connection state
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectionState {
    Connected,
    Disconnected,
    Error { message: String },
    Busy,
}

impl fmt::Display for ConnectionState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConnectionState::Connected => write!(f, "Connected"),
            ConnectionState::Disconnected => write!(f, "Disconnected"),
            ConnectionState::Error { message } => write!(f, "Error: {}", message),
            ConnectionState::Busy => write!(f, "Busy"),
        }
    }
}

/// Device health status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum DeviceHealth {
    Healthy,
    Warning,
    Error { details: String },
    Unknown,
}

impl fmt::Display for DeviceHealth {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            DeviceHealth::Healthy => write!(f, "Healthy"),
            DeviceHealth::Warning => write!(f, "Warning"),
            DeviceHealth::Error { details } => write!(f, "Error: {}", details),
            DeviceHealth::Unknown => write!(f, "Unknown"),
        }
    }
}

/// Slot type for different cryptographic operations
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum SlotType {
    PivAuthentication,
    PivDigitalSignature,
    PivKeyManagement,
    PivCardAuthentication,
    AgePlugin,
    Custom(String),
}

impl fmt::Display for SlotType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SlotType::PivAuthentication => write!(f, "PIV Authentication"),
            SlotType::PivDigitalSignature => write!(f, "PIV Digital Signature"),
            SlotType::PivKeyManagement => write!(f, "PIV Key Management"),
            SlotType::PivCardAuthentication => write!(f, "PIV Card Authentication"),
            SlotType::AgePlugin => write!(f, "Age Plugin"),
            SlotType::Custom(name) => write!(f, "Custom: {}", name),
        }
    }
}

/// Information about a device slot
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SlotInfo {
    pub slot_type: SlotType,
    pub is_occupied: bool,
    pub requires_pin: bool,
    pub requires_touch: bool,
    pub algorithm: Option<String>,
    pub subject: Option<String>,
    pub certificate_present: bool,
}

impl SlotInfo {
    /// Create new slot info
    pub fn new(slot_type: SlotType) -> Self {
        Self {
            slot_type,
            is_occupied: false,
            requires_pin: false,
            requires_touch: false,
            algorithm: None,
            subject: None,
            certificate_present: false,
        }
    }

    /// Check if slot is available for use
    pub fn is_available(&self) -> bool {
        // For age-plugin, we need an occupied slot
        match self.slot_type {
            SlotType::AgePlugin => self.is_occupied,
            _ => !self.is_occupied,
        }
    }
}

/// Device summary for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceSummary {
    pub serial_redacted: String,
    pub name: String,
    pub form_factor: FormFactor,
    pub connection_state: ConnectionState,
    pub health: DeviceHealth,
    pub capabilities: Vec<String>,
    pub available_slots: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::key_management::yubikey::domain::models::serial::Serial;

    fn create_test_serial() -> Serial {
        Serial::new("12345678".to_string()).unwrap()
    }

    #[test]
    fn test_device_creation() {
        let serial = create_test_serial();
        let device = YubiKeyDevice::new(
            serial.clone(),
            "YubiKey 5 NFC".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB, Interface::NFC],
        );

        assert_eq!(device.serial(), &serial);
        assert_eq!(device.name, "YubiKey 5 NFC");
        assert_eq!(device.form_factor, FormFactor::UsbA);
        assert_eq!(device.connection_state, ConnectionState::Disconnected);
    }

    #[test]
    fn test_from_detected_device() {
        let serial = create_test_serial();
        let device = YubiKeyDevice::from_detected_device(
            serial.clone(),
            "YubiKey 5 NFC".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB, Interface::NFC],
            Some("5.4.3".to_string()),
        );

        assert_eq!(device.serial(), &serial);
        assert_eq!(device.firmware_version, Some("5.4.3".to_string()));
        assert_eq!(device.connection_state, ConnectionState::Connected);
        assert!(device.capabilities.piv);
        assert!(device.capabilities.fido2);
    }

    #[test]
    fn test_capability_support() {
        let serial = create_test_serial();
        let mut device = YubiKeyDevice::new(
            serial,
            "YubiKey 5".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB],
        );

        device.capabilities.piv = true;
        device.capabilities.fido2 = true;

        assert!(device.supports_capability(Capability::PIV));
        assert!(device.supports_capability(Capability::FIDO2));
        assert!(!device.supports_capability(Capability::OpenPGP));
    }

    #[test]
    fn test_availability() {
        let serial = create_test_serial();
        let mut device = YubiKeyDevice::new(
            serial,
            "YubiKey 5".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB],
        );

        // Initially not available
        assert!(!device.is_available());

        // Make connected and healthy
        device.update_connection_state(ConnectionState::Connected);
        device.update_health(DeviceHealth::Healthy);
        assert!(device.is_available());

        // Error state makes unavailable
        device.update_health(DeviceHealth::Error {
            details: "PIN blocked".to_string(),
        });
        assert!(!device.is_available());
    }

    #[test]
    fn test_slot_management() {
        let serial = create_test_serial();
        let mut device = YubiKeyDevice::new(
            serial,
            "YubiKey 5".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB],
        );

        let mut slot = SlotInfo::new(SlotType::AgePlugin);
        slot.is_occupied = true;
        slot.requires_pin = true;

        device.add_slot(slot.clone());
        assert_eq!(device.slots.len(), 1);

        let found_slot = device.get_available_slot(SlotType::AgePlugin);
        assert!(found_slot.is_some());
        assert!(found_slot.unwrap().is_available()); // Age plugin needs occupied slot
    }

    #[test]
    fn test_metadata() {
        let serial = create_test_serial();
        let mut device = YubiKeyDevice::new(
            serial,
            "YubiKey 5".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB],
        );

        device.set_metadata("vendor_id".to_string(), "1050".to_string());
        device.set_metadata("product_id".to_string(), "0407".to_string());

        assert_eq!(device.get_metadata("vendor_id"), Some(&"1050".to_string()));
        assert_eq!(device.get_metadata("product_id"), Some(&"0407".to_string()));
        assert_eq!(device.get_metadata("nonexistent"), None);
    }

    #[test]
    fn test_device_summary() {
        let serial = create_test_serial();
        let device = YubiKeyDevice::from_detected_device(
            serial,
            "YubiKey 5 NFC".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB, Interface::NFC],
            Some("5.4.3".to_string()),
        );

        let summary = device.summary();
        assert!(summary.serial_redacted.contains("***"));
        assert_eq!(summary.name, "YubiKey 5 NFC");
        assert!(!summary.capabilities.is_empty());
    }

    #[test]
    fn test_capabilities_detection() {
        let caps = DeviceCapabilities::detect_from_interfaces(&[Interface::USB, Interface::NFC]);

        assert!(caps.piv);
        assert!(caps.oath);
        assert!(caps.fido2);
        assert!(caps.otp);
        assert!(!caps.openpgp); // Needs specific detection

        assert!(caps.requires_pin()); // PIV and FIDO2 require PIN
    }

    #[test]
    fn test_form_factor_display() {
        assert_eq!(FormFactor::UsbA.to_string(), "USB-A");
        assert_eq!(FormFactor::UsbC.to_string(), "USB-C");
        assert_eq!(FormFactor::NFC.to_string(), "NFC");
    }

    #[test]
    fn test_slot_availability() {
        let mut piv_slot = SlotInfo::new(SlotType::PivAuthentication);
        assert!(piv_slot.is_available()); // Empty PIV slot is available

        piv_slot.is_occupied = true;
        assert!(!piv_slot.is_available()); // Occupied PIV slot not available

        let mut age_slot = SlotInfo::new(SlotType::AgePlugin);
        assert!(!age_slot.is_available()); // Empty age slot not available

        age_slot.is_occupied = true;
        assert!(age_slot.is_available()); // Occupied age slot is available
    }

    #[test]
    fn test_serialization() {
        let serial = create_test_serial();
        let device = YubiKeyDevice::from_detected_device(
            serial,
            "YubiKey 5 NFC".to_string(),
            FormFactor::UsbA,
            vec![Interface::USB, Interface::NFC],
            Some("5.4.3".to_string()),
        );

        let json = serde_json::to_string(&device).unwrap();
        let deserialized: YubiKeyDevice = serde_json::from_str(&json).unwrap();

        assert_eq!(device.serial(), deserialized.serial());
        assert_eq!(device.name, deserialized.name);
        assert_eq!(device.capabilities, deserialized.capabilities);
    }
}
