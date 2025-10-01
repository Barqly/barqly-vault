//! Shared traits and abstractions for key management devices
//!
//! **FUTURE USE:** Not currently used in production. Reserved for future device extensibility.
//!
//! This module defines device-agnostic interfaces for Commands/UI when multiple hardware
//! security devices are supported (YubiKey, smart cards, HSM, FIDO2, etc.).
//! Provides unified key management experience across different device types.
//!
//! Currently only YubiKey and passphrase are implemented. These abstractions will be
//! used when adding additional hardware device support.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Debug;

/// Unique identifier for a hardware security device
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct DeviceId(String);

impl DeviceId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn value(&self) -> &str {
        &self.0
    }
}

/// Authentication credentials for device operations
#[derive(Debug, Clone)]
pub enum DeviceCredential {
    Pin(String),
    Password(String),
    Biometric,
    None,
}

/// Device capability flags
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DeviceCapability {
    Encryption,
    Decryption,
    Signing,
    KeyGeneration,
    TouchAuthentication,
    BiometricAuthentication,
    MultipleSlots,
}

/// Common result type for device operations
pub type DeviceResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;

/// Generic hardware security device information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    /// Device type (e.g., "YubiKey", "SmartCard")
    pub device_type: String,
    /// Unique device identifier (serial number, etc.)
    pub device_id: DeviceId,
    /// Human-readable device name
    pub name: String,
    /// Firmware/software version
    pub version: String,
    /// Supported capabilities
    pub capabilities: Vec<DeviceCapability>,
    /// Device-specific metadata
    pub metadata: HashMap<String, String>,
}

/// Generic cryptographic identity stored on a device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceIdentity {
    /// Identity identifier (recipient string, key ID, etc.)
    pub identity_id: String,
    /// Human-readable label
    pub label: String,
    /// Device this identity belongs to
    pub device_id: DeviceId,
    /// Slot or location on device
    pub slot: String,
    /// Identity-specific metadata
    pub metadata: HashMap<String, String>,
}

/// Configuration for device initialization
#[derive(Debug, Clone)]
pub struct DeviceInitConfig {
    /// Slot or location to initialize
    pub slot: String,
    /// Human-readable label
    pub label: String,
    /// PIN/password requirement policy
    pub pin_policy: PinPolicy,
    /// Touch requirement policy
    pub touch_policy: TouchPolicy,
    /// Additional device-specific configuration
    pub extra_config: HashMap<String, String>,
}

/// PIN/password requirement policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PinPolicy {
    Never,
    Once,
    Always,
}

/// Touch/user presence requirement policy
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TouchPolicy {
    Never,
    Always,
    Cached,
}

/// Core trait for hardware security devices
///
/// This trait defines the fundamental operations that any hardware security
/// device must implement to participate in the key management system.
#[async_trait]
pub trait HardwareSecurityDevice: Debug + Send + Sync {
    /// Get basic device information
    async fn get_device_info(&self) -> DeviceResult<DeviceInfo>;

    /// Check if device is currently connected and accessible
    async fn is_connected(&self) -> DeviceResult<bool>;

    /// Test device connectivity and basic functionality
    async fn test_connectivity(&self) -> DeviceResult<()>;

    /// Get health/status information
    async fn get_health_status(&self) -> DeviceResult<HashMap<String, String>>;
}

/// Trait for devices that can manage cryptographic identities
#[async_trait]
pub trait IdentityManager: HardwareSecurityDevice {
    /// List all identities stored on the device
    async fn list_identities(&self) -> DeviceResult<Vec<DeviceIdentity>>;

    /// Generate a new identity on the device
    async fn generate_identity(
        &self,
        config: DeviceInitConfig,
        credential: Option<DeviceCredential>,
    ) -> DeviceResult<DeviceIdentity>;

    /// Get specific identity by ID
    async fn get_identity(&self, identity_id: &str) -> DeviceResult<Option<DeviceIdentity>>;

    /// Remove identity from device
    async fn remove_identity(
        &self,
        identity_id: &str,
        credential: Option<DeviceCredential>,
    ) -> DeviceResult<()>;
}

/// Trait for encryption/decryption operations
#[async_trait]
pub trait CryptoProvider: HardwareSecurityDevice {
    /// Encrypt data using device identity
    async fn encrypt(
        &self,
        data: &[u8],
        identity_id: &str,
        recipients: &[String],
    ) -> DeviceResult<Vec<u8>>;

    /// Decrypt data using device identity
    async fn decrypt(
        &self,
        encrypted_data: &[u8],
        identity_id: &str,
        credential: Option<DeviceCredential>,
    ) -> DeviceResult<Vec<u8>>;
}

/// Trait for digital signing operations
#[async_trait]
pub trait SigningProvider: HardwareSecurityDevice {
    /// Sign data using device identity
    async fn sign(
        &self,
        data: &[u8],
        identity_id: &str,
        credential: Option<DeviceCredential>,
    ) -> DeviceResult<Vec<u8>>;

    /// Verify signature (if device supports verification)
    async fn verify(&self, data: &[u8], signature: &[u8], identity_id: &str) -> DeviceResult<bool>;
}

/// Factory trait for creating device instances
#[async_trait]
pub trait DeviceFactory: Debug + Send + Sync {
    /// Device type this factory creates
    fn device_type(&self) -> &str;

    /// Discover available devices of this type
    async fn discover_devices(&self) -> DeviceResult<Vec<DeviceInfo>>;

    /// Create device instance by ID
    async fn create_device(
        &self,
        device_id: &DeviceId,
    ) -> DeviceResult<Box<dyn HardwareSecurityDevice>>;

    /// Create device with specific capabilities
    async fn create_device_with_capabilities(
        &self,
        device_id: &DeviceId,
        required_capabilities: &[DeviceCapability],
    ) -> DeviceResult<Box<dyn HardwareSecurityDevice>>;
}

/// Registry for managing multiple device types
pub trait DeviceRegistry: Debug + Send + Sync {
    /// Register a device factory
    fn register_factory(&mut self, factory: Box<dyn DeviceFactory>);

    /// Get all registered device types
    fn get_device_types(&self) -> Vec<String>;

    /// Create device factory by type
    fn get_factory(&self, device_type: &str) -> Option<&dyn DeviceFactory>;

    /// Discover all devices across all registered types
    #[allow(async_fn_in_trait)]
    async fn discover_all_devices(&self) -> DeviceResult<Vec<DeviceInfo>>;
}

/// Event types for device operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DeviceEvent {
    /// Device connected
    DeviceConnected { device_id: DeviceId },
    /// Device disconnected
    DeviceDisconnected { device_id: DeviceId },
    /// Identity generated
    IdentityGenerated {
        device_id: DeviceId,
        identity_id: String,
    },
    /// Identity removed
    IdentityRemoved {
        device_id: DeviceId,
        identity_id: String,
    },
    /// Operation completed
    OperationCompleted {
        device_id: DeviceId,
        operation: String,
        duration_ms: u64,
    },
    /// Operation failed
    OperationFailed {
        device_id: DeviceId,
        operation: String,
        error: String,
    },
    /// User interaction required (PIN, touch, etc.)
    UserInteractionRequired {
        device_id: DeviceId,
        interaction_type: String,
        message: String,
    },
}

/// Event handler for device operations
#[async_trait]
pub trait DeviceEventHandler: Debug + Send + Sync {
    /// Handle device event
    async fn handle_event(&self, event: DeviceEvent) -> DeviceResult<()>;
}

/// Configuration for device operations
#[derive(Debug, Clone)]
pub struct DeviceConfig {
    /// Operation timeout in seconds
    pub timeout_secs: u64,
    /// Maximum retry attempts
    pub max_retries: u32,
    /// Enable event publishing
    pub enable_events: bool,
    /// Device-specific configuration
    pub device_config: HashMap<String, String>,
}

impl Default for DeviceConfig {
    fn default() -> Self {
        Self {
            timeout_secs: 30,
            max_retries: 3,
            enable_events: true,
            device_config: HashMap::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_device_id_creation() {
        let id = DeviceId::new("12345678");
        assert_eq!(id.value(), "12345678");
    }

    #[test]
    fn test_device_info_serialization() {
        let info = DeviceInfo {
            device_type: "TestDevice".to_string(),
            device_id: DeviceId::new("test123"),
            name: "Test Device".to_string(),
            version: "1.0".to_string(),
            capabilities: vec![DeviceCapability::Encryption],
            metadata: HashMap::new(),
        };

        let serialized = serde_json::to_string(&info).unwrap();
        let deserialized: DeviceInfo = serde_json::from_str(&serialized).unwrap();
        assert_eq!(info.device_type, deserialized.device_type);
    }
}
