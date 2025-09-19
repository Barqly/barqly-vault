//! Vault model and key reference types
//!
//! Implements the vault-centric architecture where vaults own keys
//! and support multiple unlock methods (1 passphrase + up to 3 YubiKeys).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

/// A vault that contains encrypted data and references to its keys
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vault {
    /// Unique identifier for the vault
    pub id: String,

    /// User-friendly name for the vault
    pub name: String,

    /// Optional description
    pub description: Option<String>,

    /// When the vault was created
    pub created_at: DateTime<Utc>,

    /// Last time the vault was modified
    pub updated_at: DateTime<Utc>,

    /// References to keys that can unlock this vault
    pub keys: Vec<KeyReference>,

    /// Whether this is the currently active vault
    pub is_current: bool,
}

/// Reference to a key that can unlock a vault
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct KeyReference {
    /// Type of key
    #[serde(flatten)]
    pub key_type: KeyType,

    /// Unique identifier for this key reference
    pub id: String,

    /// User-friendly label
    pub label: String,

    /// Current state of the key
    pub state: KeyState,

    /// When this key was added to the vault
    pub created_at: DateTime<Utc>,

    /// Last time this key was used
    pub last_used: Option<DateTime<Utc>>,
}

/// Type of key with type-specific data
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum KeyType {
    /// Passphrase-based key
    Passphrase {
        /// Reference to the stored key file
        key_id: String,
    },

    /// YubiKey hardware token
    Yubikey {
        /// Serial number of the YubiKey
        serial: String,

        /// Slot index (0-2) for UI display
        slot_index: u8,

        /// Actual PIV retired slot number (82-95)
        piv_slot: u8,
    },
}

/// State of a key in relation to the vault
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum KeyState {
    /// Key is available and can be used
    Active,

    /// Key is registered but not currently available (e.g., YubiKey not inserted)
    Registered,

    /// Key exists but is not associated with any vault
    Orphaned,
}

/// Summary information about a vault (for listing)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub key_count: usize,
    pub is_current: bool,
}

impl Vault {
    /// Create a new vault
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = Utc::now();
        Self {
            id: generate_vault_id(),
            name,
            description,
            created_at: now,
            updated_at: now,
            keys: Vec::new(),
            is_current: false,
        }
    }

    /// Add a key reference to this vault
    pub fn add_key(&mut self, key: KeyReference) -> Result<(), String> {
        // Check for duplicates
        if self.keys.iter().any(|k| k.id == key.id) {
            return Err("Key already exists in vault".to_string());
        }

        // Validate constraints
        let passphrase_count = self
            .keys
            .iter()
            .filter(|k| matches!(k.key_type, KeyType::Passphrase { .. }))
            .count();

        let yubikey_count = self
            .keys
            .iter()
            .filter(|k| matches!(k.key_type, KeyType::Yubikey { .. }))
            .count();

        match &key.key_type {
            KeyType::Passphrase { .. } if passphrase_count >= 1 => {
                return Err("Vault already has a passphrase key".to_string());
            }
            KeyType::Yubikey { .. } if yubikey_count >= 3 => {
                return Err("Vault already has maximum number of YubiKeys (3)".to_string());
            }
            _ => {}
        }

        self.keys.push(key);
        self.updated_at = Utc::now();
        Ok(())
    }

    /// Remove a key reference from this vault
    pub fn remove_key(&mut self, key_id: &str) -> Result<(), String> {
        let initial_len = self.keys.len();
        self.keys.retain(|k| k.id != key_id);

        if self.keys.len() == initial_len {
            return Err("Key not found in vault".to_string());
        }

        self.updated_at = Utc::now();
        Ok(())
    }

    /// Get a summary of this vault
    pub fn to_summary(&self) -> VaultSummary {
        VaultSummary {
            id: self.id.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            created_at: self.created_at,
            key_count: self.keys.len(),
            is_current: self.is_current,
        }
    }

    /// Check if vault has any active keys
    pub fn has_active_keys(&self) -> bool {
        self.keys.iter().any(|k| k.state == KeyState::Active)
    }

    /// Get all YubiKey serials referenced by this vault
    pub fn get_yubikey_serials(&self) -> HashSet<String> {
        self.keys
            .iter()
            .filter_map(|k| match &k.key_type {
                KeyType::Yubikey { serial, .. } => Some(serial.clone()),
                _ => None,
            })
            .collect()
    }
}

/// Generate a unique vault ID
fn generate_vault_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.gen();
    bs58::encode(bytes).into_string()
}
