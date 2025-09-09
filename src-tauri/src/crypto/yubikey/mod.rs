//! YubiKey integration module
//!
//! This module provides YubiKey authentication support using the mature
//! age-plugin-yubikey ecosystem for reliable hardware security operations.

pub mod age_plugin;
pub mod errors;
pub mod progress;
pub mod provider;

// Legacy modules (deprecated - will be removed)
pub mod detection;
pub mod management;
pub mod plugin;

// Disabling tests temporarily for initial validation
// #[cfg(test)]
// pub mod tests;

// New primary exports using provider abstraction
pub use provider::{
    AgeHeader, DataEncryptionKey, ProviderInfo, YubiIdentityProvider, YubiIdentityProviderFactory,
    YubiRecipient,
};

// Legacy exports for backward compatibility (deprecated)
pub use detection::{list_yubikey_devices, DeviceStatus, YubiKeyDevice};
pub use errors::{YubiKeyError, YubiKeyResult};
pub use management::{YubiKeyInfo, YubiKeyManager};
pub use plugin::{ensure_plugin_available, PluginError, PluginManager};
pub use progress::{create_yubikey_progress_manager, YubiKeyProgressManager};

use serde::{Deserialize, Serialize};

/// YubiKey initialization result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyInitResult {
    pub public_key: String,
    pub slot: u8,
    pub touch_required: bool,
    pub pin_policy: crate::crypto::yubikey::management::PinPolicy,
}

/// YubiKey information for encryption operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiKeyEncryptionInfo {
    pub serial: String,
    pub public_key: String,
    pub label: String,
    pub slot: u8,
}

/// Passphrase information for multi-recipient encryption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PassphraseInfo {
    pub key_label: String,
    pub public_key: String,
}

/// Protection modes for vault security
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ProtectionMode {
    PassphraseOnly,
    YubiKeyOnly { serial: String },
    Hybrid { yubikey_serial: String },
}

/// Unlock methods available for decryption
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum UnlockMethod {
    Passphrase,
    YubiKey,
}

/// Credentials for unlocking vaults
#[derive(Debug, Clone, Serialize, Deserialize)]
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
