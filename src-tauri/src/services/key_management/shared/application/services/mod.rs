//! Key Management Shared Application Services
//!
//! Business logic services for shared key management operations.

pub mod registry_service;

pub use registry_service::{KeyManagementError, KeyRegistryService};
