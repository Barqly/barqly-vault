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

pub mod device_service;
pub mod identity_service;
pub mod registry_service;
pub mod file_service;

// Re-export traits and implementations
pub use device_service::{DeviceService, YkmanDeviceService};
pub use identity_service::{IdentityService, AgePluginIdentityService};
pub use registry_service::{RegistryService, VaultRegistryService};
pub use file_service::{FileService, TempFileService};

use crate::key_management::yubikey::models::Serial;
use crate::key_management::yubikey::errors::YubiKeyResult;
use async_trait::async_trait;
use std::sync::Arc;

/// Service factory for creating service instances
pub struct ServiceFactory {
    device_service: Arc<dyn DeviceService>,
    identity_service: Arc<dyn IdentityService>,
    registry_service: Arc<dyn RegistryService>,
    file_service: Arc<dyn FileService>,
}

impl std::fmt::Debug for ServiceFactory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ServiceFactory")
            .field("device_service", &"<dyn DeviceService>")
            .field("identity_service", &"<dyn IdentityService>")
            .field("registry_service", &"<dyn RegistryService>")
            .field("file_service", &"<dyn FileService>")
            .finish()
    }
}

impl ServiceFactory {
    /// Create a new service factory with default implementations
    pub async fn new() -> YubiKeyResult<Self> {
        let device_service = Arc::new(YkmanDeviceService::new().await?);
        let identity_service = Arc::new(AgePluginIdentityService::new().await?);
        let registry_service = Arc::new(VaultRegistryService::new().await?);
        let file_service = Arc::new(TempFileService::new()?);

        Ok(Self {
            device_service,
            identity_service,
            registry_service,
            file_service,
        })
    }

    /// Create a service factory with custom implementations (for testing)
    pub fn with_services(
        device_service: Arc<dyn DeviceService>,
        identity_service: Arc<dyn IdentityService>,
        registry_service: Arc<dyn RegistryService>,
        file_service: Arc<dyn FileService>,
    ) -> Self {
        Self {
            device_service,
            identity_service,
            registry_service,
            file_service,
        }
    }

    /// Get device service
    pub fn device_service(&self) -> Arc<dyn DeviceService> {
        self.device_service.clone()
    }

    /// Get identity service
    pub fn identity_service(&self) -> Arc<dyn IdentityService> {
        self.identity_service.clone()
    }

    /// Get registry service
    pub fn registry_service(&self) -> Arc<dyn RegistryService> {
        self.registry_service.clone()
    }

    /// Get file service
    pub fn file_service(&self) -> Arc<dyn FileService> {
        self.file_service.clone()
    }
}

/// Common service behavior that all services should implement
#[async_trait]
pub trait Service: Send + Sync + std::fmt::Debug {
    /// Initialize the service
    async fn initialize(&self) -> YubiKeyResult<()>;

    /// Check if service is healthy
    async fn health_check(&self) -> YubiKeyResult<ServiceHealth>;

    /// Get service metrics
    async fn get_metrics(&self) -> YubiKeyResult<ServiceMetrics>;

    /// Shutdown the service gracefully
    async fn shutdown(&self) -> YubiKeyResult<()>;
}

/// Service health status
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ServiceHealth {
    Healthy,
    Warning { message: String },
    Unhealthy { error: String },
}

/// Service metrics for monitoring
#[derive(Debug, Clone)]
pub struct ServiceMetrics {
    pub operations_count: u64,
    pub errors_count: u64,
    pub average_response_time_ms: f64,
    pub last_operation: Option<chrono::DateTime<chrono::Utc>>,
}

impl Default for ServiceMetrics {
    fn default() -> Self {
        Self {
            operations_count: 0,
            errors_count: 0,
            average_response_time_ms: 0.0,
            last_operation: None,
        }
    }
}

/// Validation trait for serial-scoped operations
pub trait SerialScoped {
    /// Validate that serial parameter is provided (enforces architectural requirement)
    fn validate_serial(&self, serial: &Serial) -> YubiKeyResult<()> {
        if serial.value().is_empty() {
            return Err(crate::key_management::yubikey::errors::YubiKeyError::serial_required(
                "operation",
            ));
        }
        Ok(())
    }

    /// Create operation context for logging and tracing
    fn create_operation_context(&self, operation: &str, serial: &Serial) -> OperationContext {
        OperationContext {
            operation: operation.to_string(),
            serial: serial.redacted(),
            started_at: chrono::Utc::now(),
        }
    }
}

/// Operation context for logging and tracing
#[derive(Debug, Clone)]
pub struct OperationContext {
    pub operation: String,
    pub serial: String, // Already redacted for security
    pub started_at: chrono::DateTime<chrono::Utc>,
}

impl OperationContext {
    /// Get operation duration
    pub fn duration(&self) -> chrono::Duration {
        chrono::Utc::now() - self.started_at
    }

    /// Create completion log entry
    pub fn completion_log(&self) -> String {
        format!(
            "Operation '{}' completed for YubiKey {} in {}ms",
            self.operation,
            self.serial,
            self.duration().num_milliseconds()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_operation_context() {
        let serial = Serial::new("12345678".to_string()).unwrap();

        struct TestService;
        impl SerialScoped for TestService {}

        let service = TestService;
        let context = service.create_operation_context("test_operation", &serial);

        assert_eq!(context.operation, "test_operation");
        assert!(context.serial.contains("***"));
        assert!(!context.serial.contains("12345678"));
    }

    #[test]
    fn test_serial_validation() {
        let serial = Serial::new("12345678".to_string()).unwrap();

        struct TestService;
        impl SerialScoped for TestService {}

        let service = TestService;
        assert!(service.validate_serial(&serial).is_ok());
    }

    #[test]
    fn test_service_metrics_default() {
        let metrics = ServiceMetrics::default();
        assert_eq!(metrics.operations_count, 0);
        assert_eq!(metrics.errors_count, 0);
        assert_eq!(metrics.average_response_time_ms, 0.0);
        assert!(metrics.last_operation.is_none());
    }

    #[test]
    fn test_service_health() {
        let healthy = ServiceHealth::Healthy;
        let warning = ServiceHealth::Warning {
            message: "Service degraded".to_string(),
        };
        let unhealthy = ServiceHealth::Unhealthy {
            error: "Service down".to_string(),
        };

        assert_eq!(healthy, ServiceHealth::Healthy);
        assert_ne!(healthy, warning);
        assert_ne!(warning, unhealthy);
    }
}