//! YubiKey Domain Layer
//!
//! Contains core domain objects, models, and domain-specific errors.
//! This layer encapsulates the essential business concepts and rules.

pub mod errors;
pub mod models;

// Re-export key domain types
pub use errors::{YubiKeyError, YubiKeyResult};
pub use models::*;
