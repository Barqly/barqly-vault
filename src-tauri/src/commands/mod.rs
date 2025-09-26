//! Tauri Commands Bridge
//!
//! This module provides the secure interface between the frontend application
//! and the core Rust modules. All commands include proper validation,
//! error handling, and security checks.

pub mod command_types;
pub mod crypto;
pub mod file_commands;
pub mod storage_commands;
pub mod vault_commands;

// New consolidated YubiKey command module
pub mod yubikey;

// Legacy YubiKey command modules - REMOVED in Milestone 6
// Files deleted: vault_yubikey_commands.rs, vault_yubikey_helpers.rs,
//                yubikey_crypto_commands.rs, yubikey_device_commands.rs

// Unified key management API
pub mod unified_key_commands;

// Re-export command types for backward compatibility
// TODO: Remove this alias after updating all imports
pub use command_types as types;

// Re-export all commands for Tauri handler
pub use command_types::*;
pub use crypto::*;
pub use file_commands::*;
pub use storage_commands::*;

// Re-export new consolidated YubiKey commands
pub use yubikey::*;

// Legacy YubiKey command re-exports - REMOVED in Milestone 6
// All functionality now available through: pub use yubikey::*;

// Re-export unified key management API
pub use unified_key_commands::*;
