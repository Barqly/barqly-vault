//! Tauri Commands Bridge
//!
//! This module provides the secure interface between the frontend application
//! and the core Rust modules. All commands include proper validation,
//! error handling, and security checks.

pub mod command_types;
pub mod crypto;
pub mod file;
pub mod storage;
pub mod vault;

// Key management commands - organized by domain
pub mod key_management;

// Re-export command types for backward compatibility
// TODO: Remove this alias after updating all imports
pub use command_types as types;

// Re-export all commands for Tauri handler
pub use command_types::*;
pub use crypto::*;
pub use file::*;
pub use storage::*;
pub use vault::*;

// Re-export key management commands
pub use key_management::*;
