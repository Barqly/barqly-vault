//! Tauri Commands Bridge
//!
//! This module provides the secure interface between the frontend application
//! and the core Rust modules. All commands include proper validation,
//! error handling, and security checks.

pub mod crypto;
pub mod file;
pub mod vault;

// Key management commands - organized by domain
pub mod key_management;

// Re-export types from root types module for backward compatibility
pub use crate::types as command_types;
pub use crate::types;

// Re-export all types for Tauri handler
pub use crate::types::*;
pub use crypto::*;
pub use file::*;
pub use vault::*;

// Re-export key management commands
pub use key_management::*;
