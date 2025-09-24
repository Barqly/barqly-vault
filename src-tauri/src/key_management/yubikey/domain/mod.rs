//! YubiKey Domain Layer
//!
//! Contains core domain objects, models, and domain-specific errors.
//! This layer encapsulates the essential business concepts and rules.

pub mod models;
pub mod errors;

// Re-export key domain types
pub use models::*;
pub use errors::{YubiKeyError, YubiKeyResult};