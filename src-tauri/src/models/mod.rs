//! Key management models
//!
//! This module defines data structures for key references.
//! Vault models have been moved to services/vault/domain/models/

pub mod key_reference;

// Re-export main types
pub use key_reference::{KeyReference, KeyState, KeyType};
