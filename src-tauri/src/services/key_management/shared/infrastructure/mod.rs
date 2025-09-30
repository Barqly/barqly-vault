//! Infrastructure layer for shared key management
//!
//! Contains technical implementations for key registry persistence and related operations.

pub mod registry_persistence;

// Re-export key types for backward compatibility and convenience
pub use registry_persistence::{KeyEntry, KeyRegistry, generate_key_id, generate_recovery_code};
