//! Archive manifest module for integrity tracking
//!
//! This module provides functionality for creating, verifying, and managing
//! archive manifests that track file integrity and metadata.

// Module exports
pub mod operations;
pub mod types;
pub mod verification;

// Re-export types for backward compatibility
pub use operations::{
    create_manifest_for_archive, create_manifest_from_archive, extract_and_verify_archive,
};
pub use types::{ArchiveManifest, FileManifestEntry, Manifest};
pub use verification::{calculate_manifest_hash, verify_manifest};
