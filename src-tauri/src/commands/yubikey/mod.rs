//! YubiKey Command Module
//!
//! This module provides a clean, organized API for YubiKey operations.
//! All YubiKey commands are consolidated here with proper visibility controls.
//!
//! Public API:
//! - Device operations (list, init, register)
//! - Vault integration (add to vault, list for vault)
//! - Crypto operations (decrypt)
//!
//! Internal implementation is hidden using `mod internal` pattern.

// Public command modules - these expose #[tauri::command] functions
pub mod crypto_commands;
pub mod device_commands;
pub mod vault_commands;

// Internal implementation was moved directly into command files for simplicity

// Re-export key types for convenience
pub use crypto_commands::*;
pub use device_commands::*;
pub use vault_commands::*;
