//! Vault management commands
//!
//! This module provides Tauri commands for managing vaults and their keys
//! in the new vault-centric architecture.

pub mod key_management;
pub mod key_operations;
pub mod passphrase_integration;
pub mod vault_management;
pub mod yubikey_integration;

// Re-export all commands
pub use key_management::*;
pub use key_operations::*;
pub use passphrase_integration::*;
pub use vault_management::*;
pub use yubikey_integration::*;
