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
pub use infrastructure::{
    KeyEntry, KeyInfo, KeyRegistry, delete_key, generate_key_id, generate_recovery_code,
    get_key_info, key_exists, list_keys, load_encrypted_key, save_encrypted_key,
    save_encrypted_key_with_metadata, save_yubikey_metadata,
};

// Re-export application layer services
pub use application::{KeyManagementError, KeyRegistryService, UnifiedKeyListService};
