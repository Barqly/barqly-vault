//! Key reference types for frontend communication
//!
//! These types are used to communicate key information between the backend
//! and frontend. They represent a "view" of keys from the registry combined
//! with vault-specific state information.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Reference to a key that can unlock a vault (for frontend communication)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, specta::Type)]
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

        /// Firmware version for compatibility tracking
        #[serde(default)]
        firmware_version: Option<String>,
    },
}

/// State of a key in relation to the vault
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum KeyState {
    /// Key is available and can be used
    Active,

    /// Key is registered but not currently available (e.g., YubiKey not inserted)
    Registered,

    /// Key exists but is not associated with any vault
    Orphaned,
}

impl KeyReference {
    /// Create a KeyReference from a key registry entry
    pub fn from_registry_entry(
        key_id: String,
        entry: &crate::storage::KeyEntry,
        state: KeyState,
    ) -> Self {
        let (key_type, label, created_at, last_used) = match entry {
            crate::storage::KeyEntry::Passphrase {
                label,
                created_at,
                last_used,
                key_filename,
                ..
            } => (
                KeyType::Passphrase {
                    key_id: key_filename.clone(), // Use filename as key_id for backward compatibility
                },
                label.clone(),
                *created_at,
                *last_used,
            ),
            crate::storage::KeyEntry::Yubikey {
                label,
                created_at,
                last_used,
                serial,
                slot,
                piv_slot,
                firmware_version,
                ..
            } => (
                KeyType::Yubikey {
                    serial: serial.clone(),
                    slot_index: (*slot).saturating_sub(1), // Map slot 1-3 to UI slot_index 0-2
                    piv_slot: *piv_slot,
                    firmware_version: firmware_version.clone(),
                },
                label.clone(),
                *created_at,
                *last_used,
            ),
        };

        Self {
            id: key_id,
            key_type,
            label,
            state,
            created_at,
            last_used,
        }
    }

    /// Check if this is a passphrase key
    pub fn is_passphrase(&self) -> bool {
        matches!(self.key_type, KeyType::Passphrase { .. })
    }

    /// Check if this is a YubiKey
    pub fn is_yubikey(&self) -> bool {
        matches!(self.key_type, KeyType::Yubikey { .. })
    }

    /// Get YubiKey serial if this is a YubiKey reference
    pub fn yubikey_serial(&self) -> Option<&str> {
        match &self.key_type {
            KeyType::Yubikey { serial, .. } => Some(serial),
            _ => None,
        }
    }
}
