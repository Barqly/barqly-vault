//! Vault and key management models
//!
//! This module defines the core data structures for the vault-centric
//! architecture where vaults own and manage keys.

pub mod vault;

// Re-export main types
pub use vault::{KeyReference, KeyState, KeyType, Vault, VaultSummary};
