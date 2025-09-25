//! Vault metadata v2.0 with multi-recipient support
//!
//! This module implements the enhanced metadata structure that supports
//! multiple recipients including both passphrase and YubiKey protection modes.

use crate::key_management::yubikey::domain::models::ProtectionMode;
use crate::file_ops::external_manifest::ExternalManifest;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Enhanced vault metadata supporting multiple protection modes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMetadataV2 {
    pub version: String, // "2.0"
    pub protection_mode: ProtectionMode,
    pub created_at: DateTime<Utc>,
    pub recipients: Vec<RecipientInfo>,
    pub encryption_method: String, // "age"
    pub backward_compatible: bool, // true for hybrid/passphrase modes
    pub file_count: usize,
    pub total_size: u64,
    pub checksum: String,
}

/// Information about a recipient (passphrase or YubiKey)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipientInfo {
    pub recipient_type: RecipientType,
    pub public_key: String, // age-compatible recipient string
    pub label: String,
    pub created_at: DateTime<Utc>,
}

/// Type of recipient for multi-recipient encryption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RecipientType {
    Passphrase,
    YubiKey {
        serial: String,
        slot: u8,
        model: String,
    },
}

impl VaultMetadataV2 {
    /// Create new v2.0 metadata for a vault
    pub fn new(
        protection_mode: ProtectionMode,
        recipients: Vec<RecipientInfo>,
        file_count: usize,
        total_size: u64,
        checksum: String,
    ) -> Self {
        let backward_compatible = matches!(
            protection_mode,
            ProtectionMode::PassphraseOnly | ProtectionMode::Hybrid { .. }
        );

        Self {
            version: "2.0".to_string(),
            protection_mode,
            created_at: Utc::now(),
            recipients,
            encryption_method: "age".to_string(),
            backward_compatible,
            file_count,
            total_size,
            checksum,
        }
    }

    /// Convert v1.0 metadata to v2.0 format (backward compatibility)
    pub fn from_v1_metadata(v1: &ExternalManifest) -> Self {
        // Create a passphrase recipient from v1.0 metadata
        let passphrase_recipient = RecipientInfo {
            recipient_type: RecipientType::Passphrase,
            public_key: v1.encryption.public_key.clone(),
            label: v1.encryption.key_label.clone(),
            created_at: v1.vault_info.created,
        };

        Self::new(
            ProtectionMode::PassphraseOnly,
            vec![passphrase_recipient],
            v1.vault_info.total_files,
            0,              // v1 doesn't have total_size directly available
            "".to_string(), // v1 doesn't have a checksum field
        )
    }

    /// Check if this vault can be decrypted by v1.0 clients
    pub fn is_compatible_with_v1(&self) -> bool {
        self.backward_compatible
    }

    /// Get recipients of a specific type
    pub fn get_recipients_by_type(&self, recipient_type: &str) -> Vec<&RecipientInfo> {
        self.recipients
            .iter()
            .filter(|r| {
                matches!(
                    (&r.recipient_type, recipient_type),
                    (RecipientType::Passphrase, "passphrase")
                        | (RecipientType::YubiKey { .. }, "yubikey")
                )
            })
            .collect()
    }

    /// Get YubiKey recipients for a specific serial number
    pub fn get_yubikey_recipients_for_serial(&self, serial: &str) -> Vec<&RecipientInfo> {
        self.recipients
            .iter()
            .filter(|r| match &r.recipient_type {
                RecipientType::YubiKey { serial: s, .. } => s == serial,
                _ => false,
            })
            .collect()
    }

    /// Check if the vault requires a specific YubiKey
    pub fn requires_yubikey(&self, serial: &str) -> bool {
        match &self.protection_mode {
            ProtectionMode::YubiKeyOnly {
                serial: required_serial,
            } => required_serial == serial,
            ProtectionMode::Hybrid { yubikey_serial } => yubikey_serial == serial,
            ProtectionMode::PassphraseOnly => false,
        }
    }

    /// Get all age recipients for encryption
    pub fn get_age_recipients(&self) -> Vec<String> {
        self.recipients
            .iter()
            .map(|r| r.public_key.clone())
            .collect()
    }

    /// Add a new recipient to the vault metadata
    pub fn add_recipient(&mut self, recipient: RecipientInfo) {
        self.recipients.push(recipient);
    }

    /// Remove a recipient by label
    pub fn remove_recipient(&mut self, label: &str) -> Option<RecipientInfo> {
        self.recipients
            .iter()
            .position(|r| r.label == label)
            .map(|pos| self.recipients.remove(pos))
    }

    /// Update protection mode (used when migrating vaults)
    pub fn update_protection_mode(&mut self, mode: ProtectionMode) {
        self.protection_mode = mode;
        self.backward_compatible = matches!(
            self.protection_mode,
            ProtectionMode::PassphraseOnly | ProtectionMode::Hybrid { .. }
        );
    }

    /// Validate metadata consistency
    pub fn validate(&self) -> Result<(), MetadataValidationError> {
        // Check version
        if self.version != "2.0" {
            return Err(MetadataValidationError::InvalidVersion(
                self.version.clone(),
            ));
        }

        // Check recipients exist
        if self.recipients.is_empty() {
            return Err(MetadataValidationError::NoRecipients);
        }

        // Validate protection mode consistency
        match &self.protection_mode {
            ProtectionMode::PassphraseOnly => {
                if !self
                    .recipients
                    .iter()
                    .any(|r| matches!(r.recipient_type, RecipientType::Passphrase))
                {
                    return Err(MetadataValidationError::ProtectionModeMismatch);
                }
            }
            ProtectionMode::YubiKeyOnly { serial } => {
                if !self.recipients.iter().any(|r| match &r.recipient_type {
                    RecipientType::YubiKey { serial: s, .. } => s == serial,
                    _ => false,
                }) {
                    return Err(MetadataValidationError::ProtectionModeMismatch);
                }
            }
            ProtectionMode::Hybrid { yubikey_serial } => {
                let has_passphrase = self
                    .recipients
                    .iter()
                    .any(|r| matches!(r.recipient_type, RecipientType::Passphrase));
                let has_yubikey = self.recipients.iter().any(|r| match &r.recipient_type {
                    RecipientType::YubiKey { serial: s, .. } => s == yubikey_serial,
                    _ => false,
                });

                if !has_passphrase || !has_yubikey {
                    return Err(MetadataValidationError::ProtectionModeMismatch);
                }
            }
        }

        // Validate age recipients format
        for recipient in &self.recipients {
            if !recipient.public_key.starts_with("age1") {
                return Err(MetadataValidationError::InvalidRecipientFormat(
                    recipient.label.clone(),
                ));
            }
        }

        Ok(())
    }
}

/// Metadata validation errors
#[derive(Debug, Clone)]
pub enum MetadataValidationError {
    InvalidVersion(String),
    NoRecipients,
    ProtectionModeMismatch,
    InvalidRecipientFormat(String),
}

impl std::fmt::Display for MetadataValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MetadataValidationError::InvalidVersion(v) => {
                write!(f, "Invalid metadata version: {v}")
            }
            MetadataValidationError::NoRecipients => {
                write!(f, "Metadata must have at least one recipient")
            }
            MetadataValidationError::ProtectionModeMismatch => {
                write!(f, "Protection mode doesn't match available recipients")
            }
            MetadataValidationError::InvalidRecipientFormat(label) => {
                write!(f, "Invalid recipient format for: {label}")
            }
        }
    }
}

impl std::error::Error for MetadataValidationError {}

impl RecipientInfo {
    /// Create a new passphrase recipient
    pub fn new_passphrase(public_key: String, label: String) -> Self {
        Self {
            recipient_type: RecipientType::Passphrase,
            public_key,
            label,
            created_at: Utc::now(),
        }
    }

    /// Create a new YubiKey recipient
    pub fn new_yubikey(
        public_key: String,
        label: String,
        serial: String,
        slot: u8,
        model: String,
    ) -> Self {
        Self {
            recipient_type: RecipientType::YubiKey {
                serial,
                slot,
                model,
            },
            public_key,
            label,
            created_at: Utc::now(),
        }
    }

    /// Get a human-readable description of this recipient
    pub fn get_description(&self) -> String {
        match &self.recipient_type {
            RecipientType::Passphrase => format!("Passphrase: {}", self.label),
            RecipientType::YubiKey {
                serial,
                slot,
                model,
            } => {
                format!("YubiKey {model}: {serial} (slot {slot})")
            }
        }
    }

    /// Check if this recipient can unlock the vault
    pub fn is_available(&self) -> bool {
        match &self.recipient_type {
            RecipientType::Passphrase => true, // Passphrases are always "available"
            RecipientType::YubiKey { serial, .. } => {
                // Check if the YubiKey is currently connected
                crate::crypto::yubikey::detection::find_yubikey_by_serial(serial).is_ok()
            }
        }
    }
}

/// Metadata storage operations
pub struct MetadataV2Storage;

impl MetadataV2Storage {
    /// Save metadata v2.0 to file
    pub fn save_metadata(metadata: &VaultMetadataV2, path: &PathBuf) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(metadata)?;
        std::fs::write(path, json)
    }

    /// Load metadata v2.0 from file
    pub fn load_metadata(path: &PathBuf) -> Result<VaultMetadataV2, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let metadata: VaultMetadataV2 = serde_json::from_str(&content)?;
        metadata.validate()?;
        Ok(metadata)
    }

    /// Check if a metadata file is v2.0 format
    pub fn is_v2_metadata(path: &PathBuf) -> bool {
        if let Ok(content) = std::fs::read_to_string(path)
            && let Ok(value) = serde_json::from_str::<serde_json::Value>(&content)
            && let Some(version) = value.get("version").and_then(|v| v.as_str())
        {
            return version == "2.0";
        }
        false
    }

    /// Migrate v1.0 metadata to v2.0 format
    pub fn migrate_from_v1(
        v1_path: &PathBuf,
        v2_path: &PathBuf,
    ) -> Result<VaultMetadataV2, Box<dyn std::error::Error>> {
        // Load v1.0 metadata
        let v1_content = std::fs::read_to_string(v1_path)?;
        let v1_metadata: ExternalManifest = serde_json::from_str(&v1_content)?;

        // Convert to v2.0
        let v2_metadata = VaultMetadataV2::from_v1_metadata(&v1_metadata);

        // Save v2.0 metadata
        Self::save_metadata(&v2_metadata, v2_path)?;

        Ok(v2_metadata)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_passphrase_only_metadata() {
        let recipient =
            RecipientInfo::new_passphrase("age1test123".to_string(), "test-key".to_string());

        let metadata = VaultMetadataV2::new(
            ProtectionMode::PassphraseOnly,
            vec![recipient],
            5,
            1024,
            "checksum123".to_string(),
        );

        assert_eq!(metadata.version, "2.0");
        assert!(metadata.backward_compatible);
        assert!(metadata.validate().is_ok());
    }

    #[test]
    fn test_yubikey_only_metadata() {
        let recipient = RecipientInfo::new_yubikey(
            "age1yubikey123".to_string(),
            "my-yubikey".to_string(),
            "12345678".to_string(),
            0x82,
            "YubiKey 5 Series".to_string(),
        );

        let metadata = VaultMetadataV2::new(
            ProtectionMode::YubiKeyOnly {
                serial: "12345678".to_string(),
            },
            vec![recipient],
            3,
            512,
            "checksum456".to_string(),
        );

        assert_eq!(metadata.version, "2.0");
        assert!(!metadata.backward_compatible);
        assert!(metadata.validate().is_ok());
    }

    #[test]
    fn test_hybrid_mode_metadata() {
        let passphrase_recipient =
            RecipientInfo::new_passphrase("age1test123".to_string(), "backup-key".to_string());

        let yubikey_recipient = RecipientInfo::new_yubikey(
            "age1yubikey456".to_string(),
            "primary-yubikey".to_string(),
            "87654321".to_string(),
            0x83,
            "YubiKey 5 Series".to_string(),
        );

        let metadata = VaultMetadataV2::new(
            ProtectionMode::Hybrid {
                yubikey_serial: "87654321".to_string(),
            },
            vec![passphrase_recipient, yubikey_recipient],
            10,
            2048,
            "checksum789".to_string(),
        );

        assert_eq!(metadata.version, "2.0");
        assert!(metadata.backward_compatible);
        assert!(metadata.validate().is_ok());
        assert_eq!(metadata.recipients.len(), 2);
    }

    #[test]
    fn test_metadata_validation_failure() {
        let metadata = VaultMetadataV2 {
            version: "1.0".to_string(), // Invalid version
            protection_mode: ProtectionMode::PassphraseOnly,
            created_at: Utc::now(),
            recipients: vec![],
            encryption_method: "age".to_string(),
            backward_compatible: true,
            file_count: 0,
            total_size: 0,
            checksum: "test".to_string(),
        };

        assert!(metadata.validate().is_err());
    }

    #[test]
    fn test_metadata_storage() {
        let temp_dir = TempDir::new().unwrap();
        let metadata_path = temp_dir.path().join("metadata.json");

        let recipient =
            RecipientInfo::new_passphrase("age1test123".to_string(), "test-key".to_string());

        let original_metadata = VaultMetadataV2::new(
            ProtectionMode::PassphraseOnly,
            vec![recipient],
            1,
            100,
            "test-checksum".to_string(),
        );

        // Save metadata
        MetadataV2Storage::save_metadata(&original_metadata, &metadata_path).unwrap();

        // Load metadata
        let loaded_metadata = MetadataV2Storage::load_metadata(&metadata_path).unwrap();

        assert_eq!(original_metadata.version, loaded_metadata.version);
        assert_eq!(
            original_metadata.recipients.len(),
            loaded_metadata.recipients.len()
        );
        assert!(MetadataV2Storage::is_v2_metadata(&metadata_path));
    }
}
