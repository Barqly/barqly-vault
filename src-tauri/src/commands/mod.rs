//! Tauri Commands Bridge
//!
//! This module provides the secure interface between the frontend application
//! and the core Rust modules. All commands include proper validation,
//! error handling, and security checks.

pub mod crypto_commands;
pub mod file_commands;
pub mod storage_commands;
pub mod types;

// Re-export all commands for Tauri handler
pub use crypto_commands::*;
pub use file_commands::*;
pub use storage_commands::*;
pub use types::*;
