//! Vault storage module
//!
//! Provides persistence for vaults using JSON file storage.

pub mod persistence;

// Re-export main functions
pub use persistence::{
    delete_vault, get_current_vault, get_vault, list_vaults, load_vault, save_vault, vault_exists,
};
