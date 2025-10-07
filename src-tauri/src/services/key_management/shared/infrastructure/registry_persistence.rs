//! Unified Key Registry
//!
//! Centralizes management of all encryption keys (passphrase and YubiKey) in a single registry.
//! This replaces the previous scattered approach of individual .meta files and separate manifests.

use crate::services::shared::infrastructure::io::atomic_write_sync;
use crate::services::shared::infrastructure::path_management::get_keys_dir;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tracing::{debug, info, warn};

/// Unified key entry that can represent any type of encryption key
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum KeyEntry {
    /// Passphrase-protected key stored as encrypted file
    #[serde(rename = "passphrase")]
    Passphrase {
        label: String,
        created_at: DateTime<Utc>,
        last_used: Option<DateTime<Utc>>,
        public_key: String,
        key_filename: String, // Relative to keys directory
    },
    /// YubiKey hardware token
    #[serde(rename = "yubikey")]
    Yubikey {
        label: String,
        created_at: DateTime<Utc>,
        last_used: Option<DateTime<Utc>>,
        serial: String,
        slot: u8,             // Retired slot number (1-20)
        piv_slot: u8,         // PIV slot mapping (82-95)
        recipient: String,    // age1yubikey...
        identity_tag: String, // AGE-PLUGIN-YUBIKEY-...
        model: String,        // Full YubiKey model name (e.g., "YubiKey 5C Nano")
        firmware_version: Option<String>,
        recovery_code_hash: String, // SHA256 hash for verification
    },
}

impl KeyEntry {
    /// Get the label of this key
    pub fn label(&self) -> &str {
        match self {
            KeyEntry::Passphrase { label, .. } => label,
            KeyEntry::Yubikey { label, .. } => label,
        }
    }

    /// Get creation timestamp
    pub fn created_at(&self) -> DateTime<Utc> {
        match self {
            KeyEntry::Passphrase { created_at, .. } => *created_at,
            KeyEntry::Yubikey { created_at, .. } => *created_at,
        }
    }

    /// Get last used timestamp
    pub fn last_used(&self) -> Option<DateTime<Utc>> {
        match self {
            KeyEntry::Passphrase { last_used, .. } => *last_used,
            KeyEntry::Yubikey { last_used, .. } => *last_used,
        }
    }

    /// Update last used timestamp
    pub fn update_last_used(&mut self) {
        let now = Utc::now();
        match self {
            KeyEntry::Passphrase { last_used, .. } => *last_used = Some(now),
            KeyEntry::Yubikey { last_used, .. } => *last_used = Some(now),
        }
    }

    /// Check if this is a passphrase key
    pub fn is_passphrase(&self) -> bool {
        matches!(self, KeyEntry::Passphrase { .. })
    }

    /// Check if this is a YubiKey
    pub fn is_yubikey(&self) -> bool {
        matches!(self, KeyEntry::Yubikey { .. })
    }

    /// Get YubiKey serial if this is a YubiKey entry
    pub fn yubikey_serial(&self) -> Option<&str> {
        match self {
            KeyEntry::Yubikey { serial, .. } => Some(serial),
            _ => None,
        }
    }

    /// Get passphrase key filename if this is a passphrase entry
    pub fn passphrase_filename(&self) -> Option<&str> {
        match self {
            KeyEntry::Passphrase { key_filename, .. } => Some(key_filename),
            _ => None,
        }
    }
}

/// Central registry for all encryption keys
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyRegistry {
    pub schema: String, // "barqly.vault.registry/1"
    /// Map of key_id -> KeyEntry
    pub keys: HashMap<String, KeyEntry>,
}

impl Default for KeyRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl KeyRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            schema: "barqly.vault.registry/1".to_string(),
            keys: HashMap::new(),
        }
    }

    /// Load registry from disk, creating new if it doesn't exist
    pub fn load() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let path = Self::get_registry_path()?;

        if !path.exists() {
            debug!("Key registry doesn't exist, creating new one");
            return Ok(Self::new());
        }

        let content = fs::read_to_string(&path)?;
        let registry: Self = serde_json::from_str(&content)?;

        debug!(
            key_count = registry.keys.len(),
            "Loaded key registry from disk"
        );

        Ok(registry)
    }

    /// Save registry to disk
    pub fn save(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let path = Self::get_registry_path()?;

        // Pretty print for readability
        let json = serde_json::to_string_pretty(self)?;

        // Atomic write to prevent corruption if process crashes mid-write
        atomic_write_sync(&path, json.as_bytes())?;

        // Set restrictive permissions on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&path, permissions)?;
        }

        debug!(key_count = self.keys.len(), "Saved key registry to disk");

        Ok(())
    }

    /// Register a new key in the registry
    pub fn register_key(&mut self, key_id: String, entry: KeyEntry) -> Result<(), String> {
        if self.keys.contains_key(&key_id) {
            return Err(format!("Key with ID '{}' already exists", key_id));
        }

        info!(
            key_id = %key_id,
            key_type = ?entry,
            label = entry.label(),
            "Registering new key"
        );

        self.keys.insert(key_id, entry);
        Ok(())
    }

    /// Update an existing key in the registry
    pub fn update_key(&mut self, key_id: &str, entry: KeyEntry) -> Result<(), String> {
        if !self.keys.contains_key(key_id) {
            return Err(format!("Key with ID '{}' not found", key_id));
        }

        debug!(
            key_id = %key_id,
            label = entry.label(),
            "Updating key in registry"
        );

        self.keys.insert(key_id.to_string(), entry);
        Ok(())
    }

    /// Add a new YubiKey entry to the registry
    #[allow(clippy::too_many_arguments)]
    pub fn add_yubikey_entry(
        &mut self,
        key_id: String, // Accept key_id as parameter instead of generating it
        label: String,
        serial: String,
        slot: u8,
        piv_slot: u8,
        recipient: String,
        identity_tag: String,
        model: String,
        firmware_version: Option<String>,
        recovery_code_hash: String,
    ) -> String {
        let entry = KeyEntry::Yubikey {
            label,
            created_at: chrono::Utc::now(),
            last_used: None,
            serial,
            slot,
            piv_slot,
            recipient,
            identity_tag,
            model,
            firmware_version,
            recovery_code_hash,
        };

        self.keys.insert(key_id.clone(), entry);
        key_id
    }

    /// Remove a key from the registry
    pub fn remove_key(&mut self, key_id: &str) -> Result<KeyEntry, String> {
        self.keys
            .remove(key_id)
            .ok_or_else(|| format!("Key with ID '{}' not found", key_id))
    }

    /// Get a key from the registry
    pub fn get_key(&self, key_id: &str) -> Option<&KeyEntry> {
        self.keys.get(key_id)
    }

    /// Get a mutable reference to a key
    pub fn get_key_mut(&mut self, key_id: &str) -> Option<&mut KeyEntry> {
        self.keys.get_mut(key_id)
    }

    /// Check if a key exists in the registry
    pub fn contains_key(&self, key_id: &str) -> bool {
        self.keys.contains_key(key_id)
    }

    /// List all key IDs
    pub fn key_ids(&self) -> Vec<String> {
        self.keys.keys().cloned().collect()
    }

    /// Get all passphrase keys
    pub fn passphrase_keys(&self) -> Vec<(&String, &KeyEntry)> {
        self.keys
            .iter()
            .filter(|(_, entry)| entry.is_passphrase())
            .collect()
    }

    /// Get all YubiKey entries
    pub fn yubikey_keys(&self) -> Vec<(&String, &KeyEntry)> {
        self.keys
            .iter()
            .filter(|(_, entry)| entry.is_yubikey())
            .collect()
    }

    /// Find YubiKey by serial number
    pub fn find_yubikey_by_serial(&self, serial: &str) -> Option<(&String, &KeyEntry)> {
        self.keys
            .iter()
            .find(|(_, entry)| entry.yubikey_serial() == Some(serial))
    }

    /// Mark a key as used (updates last_used timestamp)
    pub fn mark_key_used(&mut self, key_id: &str) -> Result<(), String> {
        let entry = self
            .keys
            .get_mut(key_id)
            .ok_or_else(|| format!("Key with ID '{}' not found", key_id))?;

        entry.update_last_used();
        Ok(())
    }

    /// Get the full file path for a passphrase key
    pub fn get_passphrase_key_path(
        &self,
        key_id: &str,
    ) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
        let entry = self
            .get_key(key_id)
            .ok_or_else(|| format!("Key with ID '{}' not found", key_id))?;

        match entry {
            KeyEntry::Passphrase { key_filename, .. } => {
                let keys_dir = get_keys_dir()?;
                Ok(keys_dir.join(key_filename))
            }
            _ => Err(format!("Key '{}' is not a passphrase key", key_id).into()),
        }
    }

    /// Get registry file path
    fn get_registry_path() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
        let keys_dir = get_keys_dir()?;
        Ok(keys_dir.join("barqly-vault-key-registry.json"))
    }

    /// Migrate from existing systems (for migration support)
    pub fn migrate_from_existing() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let registry = Self::new();

        // This will be implemented as we remove the old systems
        // For now, return empty registry
        warn!("Migration from existing systems not yet implemented");

        Ok(registry)
    }
}

/// Generate a Base58 recovery code for YubiKey setup
pub fn generate_recovery_code() -> String {
    use rand::Rng;

    const BASE58_CHARS: &[u8] = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const CODE_LENGTH: usize = 8;

    let mut rng = rand::thread_rng();
    let code: String = (0..CODE_LENGTH)
        .map(|_| {
            let idx = rng.gen_range(0..BASE58_CHARS.len());
            BASE58_CHARS[idx] as char
        })
        .collect();

    code
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_registry() -> KeyRegistry {
        let mut registry = KeyRegistry::new();

        // Add a passphrase key
        let passphrase_entry = KeyEntry::Passphrase {
            label: "Test Passphrase".to_string(),
            created_at: Utc::now(),
            last_used: None,
            public_key: "age1test123...".to_string(),
            key_filename: "test.agekey.enc".to_string(),
        };
        registry
            .register_key("keyref_test1".to_string(), passphrase_entry)
            .unwrap();

        // Add a YubiKey
        let yubikey_entry = KeyEntry::Yubikey {
            label: "Test YubiKey".to_string(),
            created_at: Utc::now(),
            last_used: None,
            serial: "12345678".to_string(),
            slot: 1,
            piv_slot: 82,
            recipient: "age1yubikey...".to_string(),
            identity_tag: "AGE-PLUGIN-YUBIKEY-...".to_string(),
            model: "YubiKey 5C Nano".to_string(),
            firmware_version: None,
            recovery_code_hash: "abcd1234...".to_string(),
        };
        registry
            .register_key("keyref_test2".to_string(), yubikey_entry)
            .unwrap();

        registry
    }

    #[test]
    fn test_key_registry_creation() {
        let registry = KeyRegistry::new();
        assert_eq!(registry.schema, "barqly.vault.registry/1");
        assert!(registry.keys.is_empty());
    }

    #[test]
    fn test_key_registration() {
        let registry = create_test_registry();
        assert_eq!(registry.keys.len(), 2);
        assert!(registry.contains_key("keyref_test1"));
        assert!(registry.contains_key("keyref_test2"));
    }

    #[test]
    fn test_key_type_filtering() {
        let registry = create_test_registry();

        let passphrase_keys = registry.passphrase_keys();
        assert_eq!(passphrase_keys.len(), 1);

        let yubikey_keys = registry.yubikey_keys();
        assert_eq!(yubikey_keys.len(), 1);
    }

    #[test]
    fn test_yubikey_serial_lookup() {
        let registry = create_test_registry();

        let found = registry.find_yubikey_by_serial("12345678");
        assert!(found.is_some());

        let not_found = registry.find_yubikey_by_serial("99999999");
        assert!(not_found.is_none());
    }

    #[test]
    fn test_key_usage_tracking() {
        let mut registry = create_test_registry();

        // Initially no last_used
        let key = registry.get_key("keyref_test1").unwrap();
        assert!(key.last_used().is_none());

        // Mark as used
        registry.mark_key_used("keyref_test1").unwrap();

        // Should now have last_used timestamp
        let key = registry.get_key("keyref_test1").unwrap();
        assert!(key.last_used().is_some());
    }
}
