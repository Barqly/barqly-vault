//! YubiKey integration module
//!
//! This module provides YubiKey authentication support using the mature
//! age-plugin-yubikey ecosystem for reliable hardware security operations.

pub mod age_plugin;
pub mod errors;
// pub mod manifest; // YubiKey manifest management - replaced by unified key registry
pub mod progress;
pub mod provider;
pub mod pty;
pub mod state_cache; // PTY automation for YubiKey operations

// Legacy modules (deprecated - will be removed)
pub mod detection;
pub mod management;
pub mod plugin;

// Disabling tests temporarily for initial validation
// #[cfg(test)]
// pub mod tests;

// New primary exports using provider abstraction
pub use age_plugin::{AgePluginProvider, AgePluginPtyProvider};
pub use provider::{
    AgeHeader, DataEncryptionKey, ProviderInfo, YubiIdentityProvider, YubiIdentityProviderFactory,
    YubiRecipient,
};

// Legacy exports for backward compatibility (deprecated)
pub use detection::{DeviceStatus, YubiKeyDevice};
pub use errors::{YubiKeyError, YubiKeyResult};
pub use management::{YubiKeyInfo, YubiKeyManager};
pub use plugin::{PluginError, PluginManager, ensure_plugin_available};
pub use progress::{YubiKeyProgressManager, create_yubikey_progress_manager};

use serde::{Deserialize, Serialize};

/// YubiKey initialization result
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyInitResult {
    pub public_key: String,
    pub slot: u8,
    pub touch_required: bool,
    pub pin_policy: crate::crypto::yubikey::management::PinPolicy,
}

/// YubiKey information for encryption operations
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct YubiKeyEncryptionInfo {
    pub serial: String,
    pub public_key: String,
    pub label: String,
    pub slot: u8,
}

/// Passphrase information for multi-recipient encryption
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct PassphraseInfo {
    pub key_label: String,
    pub public_key: String,
}

/// Protection modes for vault security
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub enum ProtectionMode {
    PassphraseOnly,
    YubiKeyOnly { serial: String },
    Hybrid { yubikey_serial: String },
}

/// Unlock methods available for decryption
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, specta::Type)]
pub enum UnlockMethod {
    Passphrase,
    YubiKey,
}

/// Credentials for unlocking vaults
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
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

/// Get public key from YubiKey device by serial number
///
/// This is a simplified implementation for multi-recipient encryption.
/// In a production system, public keys would be stored during key registration.
pub async fn get_public_key_from_device(serial: &str) -> YubiKeyResult<String> {
    // For now, return a placeholder since public keys should be stored
    // during key registration rather than retrieved from device each time
    // This is a design issue that should be addressed in key registration flow

    use crate::prelude::*;

    warn!(
        serial = %serial,
        "Using placeholder public key retrieval - public keys should be stored during registration"
    );

    // Return an error for now - public keys should be stored when keys are registered
    Err(YubiKeyError::InitializationFailed(
        "Public key retrieval from device not implemented - keys should be stored during registration".to_string()
    ))
}
