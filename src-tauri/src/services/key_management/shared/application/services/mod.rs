//! Key Management Shared Application Services
//!
//! Business logic services for shared key management operations.

pub mod registry_service;
// TODO: Complete UnifiedKeyListService implementation
// pub mod unified_key_list_service;

pub use registry_service::{KeyManagementError, KeyRegistryService};
// pub use unified_key_list_service::UnifiedKeyListService;
