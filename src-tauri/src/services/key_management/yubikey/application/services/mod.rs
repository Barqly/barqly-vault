//! Service layer for YubiKey operations
//!
//! This module provides the service interfaces that implement the business logic
//! for YubiKey operations. Each service is responsible for a specific domain and
//! implements the repository/service patterns.
//!
//! ## Service Architecture
//!
//! Each service follows the same pattern:
//! - Trait definition for testability and abstraction
//! - Concrete implementation with proper error handling
//! - Serial-scoped operations (MANDATORY architectural requirement)
//! - Comprehensive logging and observability
//!
//! ## Services Overview
//!
//! - `DeviceService`: Physical device detection and management
//! - `IdentityService`: Age-plugin identity operations (fixes identity bug)
//! - `RegistryService`: Key registry operations
//! - `FileService`: Temporary file and encryption operations

// Module declarations
pub mod device_service;
pub mod factory;
pub mod file_service;
pub mod identity_service;
pub mod metrics;
pub mod registry_service;
pub mod traits;

// Re-export service implementations
pub use device_service::{DeviceService, YkmanDeviceService};
pub use file_service::{DefaultFileService, FileService, TempDirectory, TempFile};
pub use identity_service::{AgePluginIdentityService, IdentityService};
pub use registry_service::{DefaultRegistryService, RegistryService};

// Re-export factory
pub use factory::ServiceFactory;

// Re-export traits
pub use traits::{SerialScoped, Service};

// Re-export metrics types
pub use metrics::{OperationContext, ServiceHealth, ServiceMetrics};

#[cfg(test)]
mod tests;
