//! Vault management commands
//!
//! This module provides Tauri commands for managing vaults and their keys
//! in the new vault-centric architecture.

pub mod key_management;
pub mod key_operations;
pub mod vault_management;

// Re-export all commands
pub use key_management::*;
pub use key_operations::*;
pub use vault_management::*;

// Passphrase integration moved to commands::passphrase
// Re-export for backward compatibility
pub use crate::commands::passphrase::{
    AddPassphraseKeyRequest, AddPassphraseKeyResponse, add_passphrase_key_to_vault,
    validate_vault_passphrase_key,
};
