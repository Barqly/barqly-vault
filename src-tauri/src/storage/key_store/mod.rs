//! Key storage operations for Barqly Vault.
//!
//! This module handles the storage, retrieval, and management of encrypted keys
//! with associated metadata. Includes LRU caching for improved performance.
//!
//! ## Architecture
//!
//! The key_store module is organized into:
//! - Core operations (save, load, delete)
//! - Metadata management with caching
//! - Security validation
//!
//! ## Security
//!
//! All key files are stored with restrictive permissions (600 on Unix) and
//! validated before access. Keys are overwritten with random data before deletion.

mod metadata;
mod operations;
mod validation;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

// Re-export public functions
pub use metadata::{get_key_info, list_keys};
pub use operations::{
    delete_key, key_exists, load_encrypted_key, save_encrypted_key,
    save_encrypted_key_with_metadata, save_yubikey_metadata,
};

// Internal-only exports for use within this module
pub(crate) use metadata::update_key_metadata_access_time;
pub(crate) use validation::validate_key_file;

/// Information about a stored key
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct KeyInfo {
    /// User-friendly label for the key
    pub label: String,
    /// When the key was created
    pub created_at: DateTime<Utc>,
    /// Path to the encrypted key file
    pub file_path: PathBuf,
    /// Optional cached public key for performance
    pub public_key: Option<String>,
    /// Last time the key was accessed
    pub last_accessed: Option<DateTime<Utc>>,
}

impl KeyInfo {
    /// Create a new KeyInfo instance
    pub fn new(label: String, file_path: PathBuf, public_key: Option<String>) -> Self {
        Self {
            label,
            created_at: Utc::now(),
            file_path,
            public_key,
            last_accessed: None,
        }
    }

    /// Update the last accessed time
    pub fn mark_accessed(&mut self) {
        self.last_accessed = Some(Utc::now());
    }
}
