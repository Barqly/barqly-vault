//! Shared abstractions for key management devices
//!
//! This module provides common traits, types, and utilities that can be shared
//! across different hardware security device implementations (YubiKey, smartcard, etc.).

pub mod application;
pub mod infrastructure;
pub mod registry;
pub mod traits;

// Re-export key types for convenience
pub use traits::{
    CryptoProvider, DeviceCapability, DeviceConfig, DeviceCredential, DeviceEvent,
    DeviceEventHandler, DeviceFactory, DeviceId, DeviceIdentity, DeviceInfo, DeviceInitConfig,
    DeviceResult, HardwareSecurityDevice, IdentityManager, PinPolicy, SigningProvider, TouchPolicy,
};

// Re-export registry types
pub use registry::{DeviceRegistry, RegistryStatistics};

// Re-export key registry infrastructure types
pub use infrastructure::{KeyEntry, KeyRegistry, generate_key_id, generate_recovery_code};

// Re-export application layer services
pub use application::{KeyManagementError, KeyRegistryService, UnifiedKeyListService};
