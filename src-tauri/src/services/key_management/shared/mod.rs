//! Shared abstractions for key management devices
//!
//! This module provides common traits, types, and utilities that can be shared
//! across different hardware security device implementations (YubiKey, smartcard, etc.).

pub mod application;
pub mod domain;
pub mod infrastructure;

// Re-export domain types for convenience
pub use domain::registry::{DeviceRegistry, RegistryStatistics};
pub use domain::traits::{
    CryptoProvider, DeviceCapability, DeviceConfig, DeviceCredential, DeviceEvent,
    DeviceEventHandler, DeviceFactory, DeviceId, DeviceIdentity, DeviceInfo, DeviceInitConfig,
    DeviceResult, HardwareSecurityDevice, IdentityManager, PinPolicy, SigningProvider, TouchPolicy,
};

// Re-export key registry infrastructure types
pub use infrastructure::{
    KeyEntry, KeyInfo, KeyRegistry, delete_key, generate_key_id, generate_recovery_code,
    get_key_info, key_exists, list_keys, load_encrypted_key, save_encrypted_key,
    save_encrypted_key_with_metadata, save_yubikey_metadata,
};

// Re-export application layer services and manager
pub use application::{KeyManagementError, KeyManager, KeyRegistryService, UnifiedKeyListService};

// Re-export domain types
pub use domain::models::{KeyReference, KeyState, KeyType};
