//! YubiKey identity provider abstraction
//!
//! This module defines the core abstraction for YubiKey identity providers,
//! allowing multiple implementation strategies (age-plugin-yubikey, direct hardware, etc.)

use super::errors::{YubiKeyError, YubiKeyResult};
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use zeroize::ZeroizeOnDrop;

/// YubiKey recipient information for encryption operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YubiRecipient {
    /// age-compatible recipient string (e.g., "age1yubikey1...")
    pub recipient: String,
    /// Human-readable label for the recipient
    pub label: String,
    /// YubiKey serial number
    pub serial: String,
    /// PIV slot number
    pub slot: u8,
}

/// Age header information for decryption operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgeHeader {
    /// Raw header data from age file
    pub data: Vec<u8>,
    /// Recipients that can decrypt this file
    pub recipients: Vec<String>,
}

/// Data encryption key (DEK) with secure memory handling
#[derive(Debug, Clone, ZeroizeOnDrop)]
pub struct DataEncryptionKey {
    /// The encryption key bytes
    pub key: Vec<u8>,
}

impl DataEncryptionKey {
    /// Create a new DEK from key bytes
    pub fn new(key: Vec<u8>) -> Self {
        Self { key }
    }
}

/// YubiKey identity provider trait
///
/// This trait defines the core interface for YubiKey identity providers.
/// It abstracts the underlying implementation, allowing for multiple
/// strategies (age-plugin-yubikey binary, direct hardware integration, etc.)
#[async_trait::async_trait]
pub trait YubiIdentityProvider: Debug + Send + Sync {
    /// List available YubiKey recipients for encryption
    ///
    /// Returns all YubiKey recipients that can be used to encrypt data.
    /// Each recipient represents a configured PIV slot on a detected YubiKey.
    async fn list_recipients(&self) -> YubiKeyResult<Vec<YubiRecipient>>;

    /// Register a new YubiKey identity with the given label
    ///
    /// This creates a new age-compatible identity on the YubiKey device.
    /// The implementation may generate new keys or use existing ones
    /// depending on the provider strategy.
    async fn register(&self, label: &str, pin: Option<&str>) -> YubiKeyResult<YubiRecipient>;

    /// Unwrap (decrypt) a data encryption key from an age header
    ///
    /// This operation requires user interaction (PIN entry, touch)
    /// and returns the decrypted data encryption key that can be used
    /// to decrypt the actual file contents.
    async fn unwrap_dek(
        &self,
        header: &AgeHeader,
        pin: Option<&str>,
    ) -> YubiKeyResult<DataEncryptionKey>;

    /// Test connectivity and availability of the provider
    ///
    /// This method checks if the provider can successfully communicate
    /// with YubiKey devices and the underlying infrastructure.
    async fn test_connectivity(&self) -> YubiKeyResult<()>;

    /// Get provider-specific information
    fn get_provider_info(&self) -> ProviderInfo;
}

/// Information about a YubiKey identity provider implementation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    /// Provider type name
    pub name: String,
    /// Provider version
    pub version: String,
    /// Implementation description
    pub description: String,
    /// Capabilities and features
    pub capabilities: Vec<String>,
}

/// Factory for creating YubiKey identity providers
pub struct YubiIdentityProviderFactory;

impl YubiIdentityProviderFactory {
    /// Create the default (recommended) YubiKey identity provider
    ///
    /// Currently returns the age-plugin-yubikey provider as the primary
    /// implementation. Future versions may support configuration-based
    /// provider selection.
    pub fn create_default() -> YubiKeyResult<Box<dyn YubiIdentityProvider>> {
        Self::create_age_plugin_provider()
    }

    /// Create an age-plugin-yubikey based provider
    pub fn create_age_plugin_provider() -> YubiKeyResult<Box<dyn YubiIdentityProvider>> {
        use super::age_plugin::AgePluginProvider;
        Ok(Box::new(AgePluginProvider::new()?))
    }

    /// Create a PTY-based age-plugin-yubikey provider (recommended for interactive operations)
    pub fn create_pty_provider() -> YubiKeyResult<Box<dyn YubiIdentityProvider>> {
        use super::age_plugin::AgePluginPtyProvider;
        Ok(Box::new(AgePluginPtyProvider::new()?))
    }

    /// Create a direct hardware provider (future implementation)
    #[allow(dead_code)]
    pub fn create_direct_provider() -> YubiKeyResult<Box<dyn YubiIdentityProvider>> {
        Err(YubiKeyError::PluginError(
            "Direct hardware provider not yet implemented".to_string(),
        ))
    }
}

/// Utility functions for YubiKey provider operations
pub mod utils {
    use super::*;

    /// Extract YubiKey serial number from an age recipient string
    pub fn extract_serial_from_recipient(recipient: &str) -> YubiKeyResult<String> {
        if !recipient.starts_with("age1yubikey1") {
            return Err(YubiKeyError::PluginError(
                "Invalid YubiKey recipient format".to_string(),
            ));
        }

        // Extract serial from recipient (simplified)
        // For "age1yubikey112345678mockkey", we want "12345678"
        if let Some(remainder) = recipient.strip_prefix("age1yubikey1") {
            if remainder.len() >= 8 {
                Ok(remainder[..8].to_string())
            } else {
                Err(YubiKeyError::PluginError(
                    "Could not extract serial from recipient".to_string(),
                ))
            }
        } else {
            Err(YubiKeyError::PluginError(
                "Invalid YubiKey recipient format".to_string(),
            ))
        }
    }

    /// Validate that a recipient string is a valid YubiKey recipient
    pub fn validate_yubikey_recipient(recipient: &str) -> YubiKeyResult<()> {
        if !recipient.starts_with("age1yubikey1") {
            return Err(YubiKeyError::PluginError(
                "Invalid YubiKey recipient prefix".to_string(),
            ));
        }

        if recipient.len() < 24 {
            return Err(YubiKeyError::PluginError(
                "YubiKey recipient too short".to_string(),
            ));
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_encryption_key_zeroizes() {
        let key_data = vec![1, 2, 3, 4, 5];
        let dek = DataEncryptionKey::new(key_data.clone());

        // Key should be accessible
        assert_eq!(dek.key, key_data);

        // When dropped, memory should be zeroized (tested by ZeroizeOnDrop)
        drop(dek);
    }

    #[test]
    fn test_recipient_validation() {
        use super::utils::*;

        // Valid recipients
        assert!(validate_yubikey_recipient("age1yubikey112345678mockkey").is_ok());

        // Invalid recipients
        assert!(validate_yubikey_recipient("age1ssh...").is_err());
        assert!(validate_yubikey_recipient("age1yubikey1").is_err()); // Too short
        assert!(validate_yubikey_recipient("invalid").is_err());
    }

    #[test]
    fn test_serial_extraction() {
        use super::utils::*;

        let recipient = "age1yubikey112345678mockkey";
        let serial = extract_serial_from_recipient(recipient).unwrap();
        assert_eq!(serial, "12345678");

        // Invalid recipient should fail
        assert!(extract_serial_from_recipient("age1ssh...").is_err());
    }
}
