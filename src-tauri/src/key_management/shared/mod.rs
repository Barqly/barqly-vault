//! Shared abstractions for key management devices
//!
//! This module provides common traits, types, and utilities that can be shared
//! across different hardware security device implementations (YubiKey, smartcard, etc.).

pub mod traits;
pub mod registry;

// Re-export key types for convenience
pub use traits::{
    DeviceCapability, DeviceConfig, DeviceCredential, DeviceEvent, DeviceEventHandler,
    DeviceFactory, DeviceId, DeviceIdentity, DeviceInfo, DeviceInitConfig,
    DeviceResult, HardwareSecurityDevice, IdentityManager, CryptoProvider, SigningProvider,
    PinPolicy, TouchPolicy,
};

// Re-export registry types
pub use registry::{DeviceRegistry, RegistryStatistics};