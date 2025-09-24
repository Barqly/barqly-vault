//! Vault model and key reference types
//!
//! Implements the vault-centric architecture where vaults own keys
//! and support multiple unlock methods (1 passphrase + up to 3 YubiKeys).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// A vault that contains encrypted data and references to its keys
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct Vault {
    /// Schema version for backward compatibility
    pub manifest_version: String,

    /// App version that created/last updated this vault
    pub app_version: String,

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

    /// IDs of keys that can unlock this vault (stored in key registry)
    pub keys: Vec<String>,

    /// Encrypted archives created from this vault
    #[serde(default)]
    pub encrypted_archives: Vec<EncryptedArchive>,
}

/// Information about an encrypted archive created from this vault
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct EncryptedArchive {
    /// Name of the encrypted file
    pub filename: String,

    /// When the encryption was performed
    pub encrypted_at: DateTime<Utc>,

    /// Total number of files in the archive
    pub total_files: u64,

    /// Human-readable total size
    pub total_size: String,

    /// List of files/directories in the archive
    pub contents: Vec<ArchiveContent>,
}

/// Information about a file/directory in an encrypted archive
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct ArchiveContent {
    /// File or directory name
    pub file: String,

    /// Human-readable size
    pub size: String,

    /// SHA-256 hash of the file content
    pub hash: String,
}

/// Summary information about a vault (for listing)
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct VaultSummary {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub key_count: usize,
}

impl Vault {
    /// Create a new vault
    pub fn new(name: String, description: Option<String>) -> Self {
        let now = Utc::now();
        Self {
            manifest_version: "0.1.0".to_string(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            id: generate_vault_id(),
            name,
            description,
            created_at: now,
            updated_at: now,
            keys: Vec::new(),
            encrypted_archives: Vec::new(),
        }
    }

    /// Add a key ID to this vault (key must exist in registry)
    pub fn add_key_id(&mut self, key_id: String) -> Result<(), String> {
        // Check for duplicates
        if self.keys.contains(&key_id) {
            return Err("Key already exists in vault".to_string());
        }

        // Note: Validation of key type constraints (1 passphrase, max 3 YubiKeys)
        // will be done at the command level where we have access to the key registry

        self.keys.push(key_id);
        self.updated_at = Utc::now();
        self.app_version = env!("CARGO_PKG_VERSION").to_string();
        Ok(())
    }

    /// Remove a key ID from this vault
    pub fn remove_key(&mut self, key_id: &str) -> Result<(), String> {
        let initial_len = self.keys.len();
        self.keys.retain(|k| k != key_id);

        if self.keys.len() == initial_len {
            return Err("Key not found in vault".to_string());
        }

        self.updated_at = Utc::now();
        self.app_version = env!("CARGO_PKG_VERSION").to_string();
        Ok(())
    }

    /// Add an encrypted archive to this vault
    pub fn add_encrypted_archive(&mut self, archive: EncryptedArchive) {
        self.encrypted_archives.push(archive);
        self.updated_at = Utc::now();
        self.app_version = env!("CARGO_PKG_VERSION").to_string();
    }

    /// Get a summary of this vault
    pub fn to_summary(&self) -> VaultSummary {
        VaultSummary {
            id: self.id.clone(),
            name: self.name.clone(),
            description: self.description.clone(),
            created_at: self.created_at,
            key_count: self.keys.len(),
        }
    }

    /// Get the key IDs for this vault
    pub fn get_key_ids(&self) -> &[String] {
        &self.keys
    }

    /// Check if vault has any keys
    pub fn has_keys(&self) -> bool {
        !self.keys.is_empty()
    }

    /// Get the number of keys in this vault
    pub fn key_count(&self) -> usize {
        self.keys.len()
    }
}

/// Generate a unique vault ID
fn generate_vault_id() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let bytes: [u8; 16] = rng.r#gen();
    bs58::encode(bytes).into_string()
}
