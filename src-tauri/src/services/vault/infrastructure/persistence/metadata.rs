//! Vault metadata with multi-recipient support
//!
//! This module implements the metadata structure that supports
//! multiple recipients including both passphrase and YubiKey protection modes.

use crate::services::key_management::yubikey::domain::models::ProtectionMode;
use crate::services::shared::infrastructure::DeviceInfo as MachineDeviceInfo;
use crate::services::vault::domain::models::VaultSummary;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Vault metadata supporting multiple protection modes (R2 enhanced schema)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultMetadata {
    // R2 Schema version tracking
    pub schema: String, // "barqly.vault.manifest/1"
    pub vault_id: String,
    pub label: String, // Display name (user-entered)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>, // Optional vault description
    pub sanitized_name: String, // Filesystem-safe name

    // Version control for conflict resolution
    pub encryption_revision: u32, // Increments on each encryption
    pub created_at: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_encrypted_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_encrypted_by: Option<LastEncryptedBy>,

    // File selection metadata (set during first encryption)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection_type: Option<SelectionType>, // Omitted until files selected
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_path: Option<String>, // Omitted for files-only selection

    // Encryption metadata
    pub encryption_method: String, // "age"

    // Encryption recipients
    pub recipients: Vec<RecipientInfo>,

    // File contents
    pub files: Vec<VaultFileEntry>,
    pub file_count: usize,
    pub total_size: u64,

    // Optional integrity verification
    #[serde(skip_serializing_if = "Option::is_none")]
    pub integrity: Option<IntegrityInfo>,
}

/// Machine information for tracking vault operations across devices
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LastEncryptedBy {
    pub machine_id: String,
    pub machine_label: String,
}

/// Type of file selection (folder vs individual files)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SelectionType {
    Folder,
    Files,
}

/// File entry in the vault with integrity information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultFileEntry {
    pub path: String, // Relative path from base_path
    pub size: u64,
    pub sha256: String, // File hash for verification
}

/// Optional integrity verification hashes
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IntegrityInfo {
    pub files_hash: String,    // SHA256 of concatenated file hashes
    pub manifest_hash: String, // SHA256 of manifest (excluding this field)
}

/// Information about a recipient (passphrase or YubiKey)
/// Links to KeyRegistry via key_id for lookups
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecipientInfo {
    pub key_id: String, // Registry key ID (e.g., "mbp1001-nauman", "keyref_313104201")
    pub recipient_type: RecipientType,
    pub public_key: String, // age-compatible recipient string (age1...)
    pub label: String,
    pub created_at: DateTime<Utc>,
}

/// Type of recipient for multi-recipient encryption
/// Enhanced to match KeyRegistry structure exactly
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum RecipientType {
    #[serde(rename = "passphrase")]
    Passphrase {
        key_filename: String, // Matches registry: relative to keys directory
    },
    #[serde(rename = "yubikey")]
    YubiKey {
        serial: String,
        slot: u8,                         // age-plugin slot (1-20)
        piv_slot: u8,                     // PIV slot (82-95)
        model: String,                    // YubiKey model
        identity_tag: String,             // AGE-PLUGIN-YUBIKEY-...
        firmware_version: Option<String>, // e.g. "5.7.1"
    },
}

impl VaultMetadata {
    /// Create new vault metadata with full schema
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        vault_id: String,
        label: String,
        description: Option<String>,
        sanitized_name: String,
        _device_info: &MachineDeviceInfo,
        selection_type: Option<SelectionType>,
        base_path: Option<String>,
        recipients: Vec<RecipientInfo>,
        files: Vec<VaultFileEntry>,
        file_count: usize,
        total_size: u64,
    ) -> Self {
        let now = Utc::now();

        Self {
            schema: "barqly.vault.manifest/1".to_string(),
            vault_id,
            label,
            description,
            sanitized_name,
            encryption_revision: 1,
            created_at: now,
            last_encrypted_at: None, // Set during first encryption
            last_encrypted_by: None, // Set during first encryption
            selection_type,
            base_path,
            encryption_method: "age".to_string(),
            recipients,
            files,
            file_count,
            total_size,
            integrity: None,
        }
    }

    /// Increment manifest version (for re-encryption)
    pub fn increment_version(&mut self, device_info: &MachineDeviceInfo) {
        self.encryption_revision += 1;
        self.last_encrypted_at = Some(Utc::now());
        self.last_encrypted_by = Some(LastEncryptedBy {
            machine_id: device_info.machine_id.clone(),
            machine_label: device_info.machine_label.clone(),
        });
    }

    /// Compare versions with another manifest
    /// Returns: (is_newer, is_same_version)
    pub fn compare_version(&self, other: &VaultMetadata) -> (bool, bool) {
        let self_time = self.last_encrypted_at.unwrap_or(self.created_at);
        let other_time = other.last_encrypted_at.unwrap_or(other.created_at);

        let is_newer = self.encryption_revision > other.encryption_revision
            || (self.encryption_revision == other.encryption_revision && self_time > other_time);
        let is_same = self.encryption_revision == other.encryption_revision;
        (is_newer, is_same)
    }

    /// Get recipients of a specific type
    pub fn get_recipients_by_type(&self, recipient_type: &str) -> Vec<&RecipientInfo> {
        self.recipients
            .iter()
            .filter(|r| {
                matches!(
                    (&r.recipient_type, recipient_type),
                    (RecipientType::Passphrase { .. }, "passphrase")
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

    /// Derive protection mode from recipients
    pub fn protection_mode(&self) -> ProtectionMode {
        let has_passphrase = self
            .recipients
            .iter()
            .any(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }));

        let yubikey_serial = self
            .recipients
            .iter()
            .find_map(|r| match &r.recipient_type {
                RecipientType::YubiKey { serial, .. } => Some(serial.clone()),
                _ => None,
            });

        match (has_passphrase, yubikey_serial) {
            (false, Some(serial)) => ProtectionMode::YubiKeyOnly { serial },
            (true, Some(serial)) => ProtectionMode::Hybrid {
                yubikey_serial: serial,
            },
            _ => ProtectionMode::PassphraseOnly,
        }
    }

    /// Check if the vault requires a specific YubiKey
    pub fn requires_yubikey(&self, serial: &str) -> bool {
        match self.protection_mode() {
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

    /// Check if vault has passphrase fallback (can decrypt without YubiKey)
    pub fn has_passphrase_fallback(&self) -> bool {
        matches!(
            self.protection_mode(),
            ProtectionMode::PassphraseOnly | ProtectionMode::Hybrid { .. }
        )
    }

    /// Validate metadata consistency
    pub fn validate(&self) -> Result<(), MetadataValidationError> {
        // Check schema version
        if !self.schema.starts_with("barqly.vault.manifest/") {
            return Err(MetadataValidationError::InvalidVersion(self.schema.clone()));
        }

        // Check recipients exist
        if self.recipients.is_empty() {
            return Err(MetadataValidationError::NoRecipients);
        }

        // Validate protection mode consistency
        match self.protection_mode() {
            ProtectionMode::PassphraseOnly => {
                if !self
                    .recipients
                    .iter()
                    .any(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }))
                {
                    return Err(MetadataValidationError::ProtectionModeMismatch);
                }
            }
            ProtectionMode::YubiKeyOnly { serial } => {
                if !self.recipients.iter().any(|r| match &r.recipient_type {
                    RecipientType::YubiKey { serial: s, .. } => s == &serial,
                    _ => false,
                }) {
                    return Err(MetadataValidationError::ProtectionModeMismatch);
                }
            }
            ProtectionMode::Hybrid { yubikey_serial } => {
                let has_passphrase = self
                    .recipients
                    .iter()
                    .any(|r| matches!(r.recipient_type, RecipientType::Passphrase { .. }));
                let has_yubikey = self.recipients.iter().any(|r| match &r.recipient_type {
                    RecipientType::YubiKey { serial: s, .. } => s == &yubikey_serial,
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

    /// Convert to VaultSummary for UI display
    pub fn to_summary(&self) -> VaultSummary {
        VaultSummary {
            id: self.vault_id.clone(),
            name: self.label.clone(),
            description: self.description.clone(),
            created_at: self.created_at,
            key_count: self.recipients.len(),
        }
    }

    /// Get key IDs from recipients (registry references)
    pub fn get_key_ids(&self) -> Vec<String> {
        self.recipients.iter().map(|r| r.key_id.clone()).collect()
    }

    /// Check if vault has any keys
    pub fn has_keys(&self) -> bool {
        !self.recipients.is_empty()
    }

    /// Get the number of keys in this vault
    pub fn key_count(&self) -> usize {
        self.recipients.len()
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
    pub fn new_passphrase(
        key_id: String,
        public_key: String,
        label: String,
        key_filename: String,
    ) -> Self {
        Self {
            key_id,
            recipient_type: RecipientType::Passphrase { key_filename },
            public_key,
            label,
            created_at: Utc::now(),
        }
    }

    /// Create a new YubiKey recipient (R2 enhanced with all metadata)
    #[allow(clippy::too_many_arguments)]
    pub fn new_yubikey(
        key_id: String,
        public_key: String,
        label: String,
        serial: String,
        slot: u8,
        piv_slot: u8,
        model: String,
        identity_tag: String,
        firmware_version: Option<String>,
    ) -> Self {
        Self {
            key_id,
            recipient_type: RecipientType::YubiKey {
                serial,
                slot,
                piv_slot,
                model,
                identity_tag,
                firmware_version,
            },
            public_key,
            label,
            created_at: Utc::now(),
        }
    }

    /// Get a human-readable description of this recipient
    pub fn get_description(&self) -> String {
        match &self.recipient_type {
            RecipientType::Passphrase { .. } => format!("Passphrase: {}", self.label),
            RecipientType::YubiKey {
                serial,
                slot,
                model,
                ..
            } => {
                format!("YubiKey {model}: {serial} (slot {slot})")
            }
        }
    }

    /// Check if this recipient can unlock the vault
    pub fn is_available(&self) -> bool {
        match &self.recipient_type {
            RecipientType::Passphrase { .. } => true, // Passphrases are always available
            RecipientType::YubiKey { serial, .. } => {
                // Always return true - actual device detection happens during decryption
                let _ = serial;
                true
            }
        }
    }
}

/// Metadata storage operations
pub struct MetadataStorage;

impl MetadataStorage {
    /// Save metadata current to file
    pub fn save_metadata(metadata: &VaultMetadata, path: &PathBuf) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(metadata)?;
        std::fs::write(path, json)
    }

    /// Load metadata current from file
    pub fn load_metadata(path: &PathBuf) -> Result<VaultMetadata, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let metadata: VaultMetadata = serde_json::from_str(&content)?;
        metadata.validate()?;
        Ok(metadata)
    }

    /// Check if a metadata file is valid format
    pub fn is_valid_metadata(path: &PathBuf) -> bool {
        if let Ok(content) = std::fs::read_to_string(path)
            && let Ok(value) = serde_json::from_str::<serde_json::Value>(&content)
            && let Some(schema) = value.get("schema").and_then(|v| v.as_str())
        {
            return schema.starts_with("barqly.vault.manifest/");
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::shared::infrastructure::DeviceInfo;
    use tempfile::TempDir;

    fn create_test_device_info() -> DeviceInfo {
        DeviceInfo {
            machine_id: "test-machine-123".to_string(),
            machine_label: "test-laptop".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        }
    }

    fn create_test_metadata(
        vault_id: &str,
        vault_name: &str,
        recipients: Vec<RecipientInfo>,
    ) -> VaultMetadata {
        let device_info = create_test_device_info();

        VaultMetadata::new(
            vault_id.to_string(),
            vault_name.to_string(),
            Some(format!("Test vault: {}", vault_name)),
            vault_name.replace(' ', "-"),
            &device_info,
            Some(SelectionType::Files),
            None,
            recipients,
            vec![],
            0,
            0,
        )
    }

    #[test]
    fn test_passphrase_only_metadata() {
        let recipient = RecipientInfo::new_passphrase(
            "test-key".to_string(),
            "age1test123".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let metadata = create_test_metadata("vault-001", "Test Vault", vec![recipient]);

        assert_eq!(metadata.schema, "barqly.vault.manifest/1");
        assert!(metadata.has_passphrase_fallback());
        assert!(metadata.validate().is_ok());
    }

    #[test]
    fn test_yubikey_only_metadata() {
        let recipient = RecipientInfo::new_yubikey(
            "keyref_123456781".to_string(),
            "age1yubikey123".to_string(),
            "my-yubikey".to_string(),
            "12345678".to_string(),
            1,    // slot
            0x82, // piv_slot
            "YubiKey 5 Series".to_string(),
            "AGE-PLUGIN-YUBIKEY-TEST123".to_string(),
            Some("5.7.1".to_string()),
        );

        let metadata = create_test_metadata("vault-002", "YubiKey Vault", vec![recipient]);

        assert_eq!(metadata.schema, "barqly.vault.manifest/1");
        assert!(!metadata.has_passphrase_fallback());
        assert!(metadata.validate().is_ok());
    }

    #[test]
    fn test_hybrid_mode_metadata() {
        let passphrase_recipient = RecipientInfo::new_passphrase(
            "backup-key".to_string(),
            "age1test123".to_string(),
            "backup-key".to_string(),
            "backup-key.agekey.enc".to_string(),
        );

        let yubikey_recipient = RecipientInfo::new_yubikey(
            "keyref_876543211".to_string(),
            "age1yubikey456".to_string(),
            "primary-yubikey".to_string(),
            "87654321".to_string(),
            1,    // slot
            0x83, // piv_slot
            "YubiKey 5 Series".to_string(),
            "AGE-PLUGIN-YUBIKEY-TEST456".to_string(),
            Some("5.7.1".to_string()),
        );

        let metadata = create_test_metadata(
            "vault-003",
            "Hybrid Vault",
            vec![passphrase_recipient, yubikey_recipient],
        );

        assert_eq!(metadata.schema, "barqly.vault.manifest/1");
        assert!(metadata.has_passphrase_fallback());
        assert!(metadata.validate().is_ok());
        assert_eq!(metadata.recipients.len(), 2);
    }

    #[test]
    fn test_metadata_validation_failure() {
        // Create metadata with no recipients (should fail validation)
        let metadata = create_test_metadata(
            "vault-004",
            "Empty Vault",
            vec![], // Empty recipients
        );

        assert!(metadata.validate().is_err());
    }

    #[test]
    fn test_metadata_storage() {
        let temp_dir = TempDir::new().unwrap();
        let metadata_path = temp_dir.path().join("metadata.json");

        let recipient = RecipientInfo::new_passphrase(
            "test-key".to_string(),
            "age1test123".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        let original_metadata = create_test_metadata("vault-005", "Storage Test", vec![recipient]);

        // Save metadata
        MetadataStorage::save_metadata(&original_metadata, &metadata_path).unwrap();

        // Load metadata
        let loaded_metadata = MetadataStorage::load_metadata(&metadata_path).unwrap();

        assert_eq!(original_metadata.schema, loaded_metadata.schema);
        assert_eq!(
            original_metadata.recipients.len(),
            loaded_metadata.recipients.len()
        );
        assert!(MetadataStorage::is_valid_metadata(&metadata_path));
    }

    #[test]
    fn test_encryption_revision_increment() {
        let device_info = create_test_device_info();

        let mut metadata = create_test_metadata("vault-006", "Version Test", vec![]);

        assert_eq!(metadata.encryption_revision, 1);

        metadata.increment_version(&device_info);
        assert_eq!(metadata.encryption_revision, 2);
        assert_eq!(
            metadata.last_encrypted_by.as_ref().unwrap().machine_id,
            "test-machine-123"
        );
    }

    #[test]
    fn test_version_comparison() {
        let device_info = create_test_device_info();

        let metadata_v1 = create_test_metadata("vault-007", "Comparison Test", vec![]);

        let mut metadata_v2 = metadata_v1.clone();
        metadata_v2.increment_version(&device_info);

        // v2 should be newer than v1
        let (is_newer, is_same) = metadata_v2.compare_version(&metadata_v1);
        assert!(is_newer);
        assert!(!is_same);

        // v1 should not be newer than v2
        let (is_newer, _) = metadata_v1.compare_version(&metadata_v2);
        assert!(!is_newer);
    }
}
