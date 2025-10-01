//! Key Management Shared Application Layer
//!
//! Business logic and use cases for shared key management operations.

pub mod manager;
pub mod services;

pub use manager::KeyManager;
pub use services::{KeyManagementError, KeyRegistryService, UnifiedKeyListService};
