//! Vault Persistence Infrastructure
//!
//! Handles vault metadata storage using JSON file persistence.

pub mod metadata;
pub mod vault_persistence;

// Re-export main vault operations
pub use vault_persistence::{
    delete_vault, get_current_vault, get_vault, list_vaults, load_vault, save_vault, vault_exists,
};

// Re-export metadata types
pub use metadata::{MetadataStorage, RecipientInfo, RecipientType, VaultMetadata};
