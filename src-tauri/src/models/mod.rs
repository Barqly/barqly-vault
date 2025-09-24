//! Vault and key management models
//!
//! This module defines the core data structures for the vault-centric
//! architecture where vaults store key IDs and reference a central key registry.

pub mod key_reference;
pub mod vault;

// Re-export main types
pub use key_reference::{KeyReference, KeyState, KeyType};
pub use vault::{ArchiveContent, EncryptedArchive, Vault, VaultSummary};
