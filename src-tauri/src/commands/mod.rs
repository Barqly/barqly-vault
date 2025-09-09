//! Tauri Commands Bridge
//!
//! This module provides the secure interface between the frontend application
//! and the core Rust modules. All commands include proper validation,
//! error handling, and security checks.

pub mod command_types;
pub mod crypto;
pub mod file_commands;
pub mod storage_commands;
pub mod yubikey_commands;

// Re-export command types for backward compatibility
// TODO: Remove this alias after updating all imports
pub use command_types as types;

// Re-export all commands for Tauri handler
pub use command_types::*;
pub use crypto::*;
pub use file_commands::*;
pub use storage_commands::*;
pub use yubikey_commands::*;
