//! Unified Key Management Module
//!
//! Provides type conversions and utilities for the unified key API.

pub mod type_conversions;

// Re-export for convenience
pub use type_conversions::{
    convert_available_yubikey_to_unified, convert_passphrase_to_unified,
    convert_yubikey_to_unified,
};
