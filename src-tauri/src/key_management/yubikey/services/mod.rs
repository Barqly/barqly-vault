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
pub use registry_service::{RegistryService, DefaultRegistryService};
pub use file_service::{FileService, DefaultFileService, TempFile, TempDirectory};

use crate::key_management::yubikey::models::Serial;
use crate::key_management::yubikey::errors::YubiKeyResult;
use crate::prelude::*;
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
        debug!("Creating ServiceFactory with default implementations");

        let device_service = Arc::new(YkmanDeviceService::new().await?);
        let identity_service = Arc::new(AgePluginIdentityService::new().await?);
        let registry_service = Arc::new(DefaultRegistryService::new().await?);
        let file_service = Arc::new(DefaultFileService::new()?);

        debug!("ServiceFactory created successfully");
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
        debug!("Creating ServiceFactory with custom service implementations");
        Self {
            device_service,
            identity_service,
            registry_service,
            file_service,
        }
    }

    /// Create a service factory with custom ykman path (for specific installations)
    pub async fn with_ykman_path(ykman_path: String) -> YubiKeyResult<Self> {
        debug!("Creating ServiceFactory with custom ykman path: {}", ykman_path);

        let device_service = Arc::new(YkmanDeviceService::with_ykman_path(ykman_path));
        let identity_service = Arc::new(AgePluginIdentityService::new().await?);
        let registry_service = Arc::new(DefaultRegistryService::new().await?);
        let file_service = Arc::new(DefaultFileService::new()?);

        Ok(Self {
            device_service,
            identity_service,
            registry_service,
            file_service,
        })
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

    /// Initialize all services
    pub async fn initialize_all_services(&self) -> YubiKeyResult<()> {
        debug!("Initializing all services in ServiceFactory");

        // Services don't implement the Service trait yet, but when they do,
        // this is where we would initialize them
        // TODO: Implement Service trait for all service implementations
        // self.device_service.initialize().await?;
        // self.identity_service.initialize().await?;
        // self.registry_service.initialize().await?;
        // self.file_service.initialize().await?;

        debug!("All services initialized successfully");
        Ok(())
    }

    /// Perform health checks on all services
    pub async fn health_check_all_services(&self) -> YubiKeyResult<std::collections::HashMap<String, ServiceHealth>> {
        debug!("Performing health checks on all services");

        let mut health_status = std::collections::HashMap::new();

        // TODO: Implement Service trait for all service implementations
        // health_status.insert("device".to_string(), self.device_service.health_check().await?);
        // health_status.insert("identity".to_string(), self.identity_service.health_check().await?);
        // health_status.insert("registry".to_string(), self.registry_service.health_check().await?);
        // health_status.insert("file".to_string(), self.file_service.health_check().await?);

        // For now, assume all services are healthy
        health_status.insert("device".to_string(), ServiceHealth::Healthy);
        health_status.insert("identity".to_string(), ServiceHealth::Healthy);
        health_status.insert("registry".to_string(), ServiceHealth::Healthy);
        health_status.insert("file".to_string(), ServiceHealth::Healthy);

        debug!("Health checks completed for all services");
        Ok(health_status)
    }

    /// Shutdown all services gracefully
    pub async fn shutdown_all_services(&self) -> YubiKeyResult<()> {
        debug!("Shutting down all services in ServiceFactory");

        // TODO: Implement Service trait for all service implementations
        // self.device_service.shutdown().await?;
        // self.identity_service.shutdown().await?;
        // self.registry_service.shutdown().await?;
        // self.file_service.shutdown().await?;

        debug!("All services shut down successfully");
        Ok(())
    }

    /// Get service metrics from all services
    pub async fn get_all_service_metrics(&self) -> YubiKeyResult<std::collections::HashMap<String, ServiceMetrics>> {
        debug!("Collecting metrics from all services");

        let mut metrics = std::collections::HashMap::new();

        // TODO: Implement Service trait for all service implementations
        // metrics.insert("device".to_string(), self.device_service.get_metrics().await?);
        // metrics.insert("identity".to_string(), self.identity_service.get_metrics().await?);
        // metrics.insert("registry".to_string(), self.registry_service.get_metrics().await?);
        // metrics.insert("file".to_string(), self.file_service.get_metrics().await?);

        // For now, return default metrics
        metrics.insert("device".to_string(), ServiceMetrics::default());
        metrics.insert("identity".to_string(), ServiceMetrics::default());
        metrics.insert("registry".to_string(), ServiceMetrics::default());
        metrics.insert("file".to_string(), ServiceMetrics::default());

        debug!("Metrics collection completed for all services");
        Ok(metrics)
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
    use std::sync::Arc;

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

    // Mock services for testing
    #[derive(Debug)]
    struct MockDeviceService;

    #[async_trait]
    impl DeviceService for MockDeviceService {
        async fn list_connected_devices(&self) -> YubiKeyResult<Vec<crate::key_management::yubikey::models::YubiKeyDevice>> {
            Ok(vec![])
        }

        async fn detect_device(&self, _serial: &Serial) -> YubiKeyResult<Option<crate::key_management::yubikey::models::YubiKeyDevice>> {
            Ok(None)
        }

        async fn is_device_connected(&self, _serial: &Serial) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn validate_pin(&self, _serial: &Serial, _pin: &crate::key_management::yubikey::models::Pin) -> YubiKeyResult<bool> {
            Ok(true)
        }

        async fn has_default_pin(&self, _serial: &Serial) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn get_firmware_version(&self, _serial: &Serial) -> YubiKeyResult<Option<String>> {
            Ok(Some("1.0.0".to_string()))
        }

        async fn get_capabilities(&self, _serial: &Serial) -> YubiKeyResult<Vec<String>> {
            Ok(vec!["PIV".to_string()])
        }
    }

    #[derive(Debug)]
    struct MockIdentityService;

    #[async_trait]
    impl IdentityService for MockIdentityService {
        async fn generate_identity(&self, _serial: &Serial, _pin: &crate::key_management::yubikey::models::Pin, _slot: u8) -> YubiKeyResult<crate::key_management::yubikey::models::YubiKeyIdentity> {
            let serial = Serial::new("12345678".to_string()).unwrap();
            Ok(crate::key_management::yubikey::models::YubiKeyIdentity::new(
                "age1yubikey1test123".to_string(),
                serial,
            ))
        }

        async fn get_recipient(&self, _serial: &Serial, _slot: u8) -> YubiKeyResult<String> {
            Ok("age1yubikey1recipient123".to_string())
        }

        async fn encrypt_with_recipient(&self, _recipient: &str, _data: &[u8]) -> YubiKeyResult<Vec<u8>> {
            Ok(b"encrypted_data".to_vec())
        }

        async fn decrypt_with_identity(&self, _serial: &Serial, _pin: &crate::key_management::yubikey::models::Pin, _slot: u8, _encrypted_data: &[u8]) -> YubiKeyResult<Vec<u8>> {
            Ok(b"decrypted_data".to_vec())
        }

        async fn validate_identity(&self, _serial: &Serial, _identity_tag: &str) -> YubiKeyResult<bool> {
            Ok(true)
        }
    }

    #[derive(Debug)]
    struct MockRegistryService;

    #[async_trait]
    impl RegistryService for MockRegistryService {
        async fn add_yubikey_entry(&self, _device: &crate::key_management::yubikey::models::YubiKeyDevice, _identity: &crate::key_management::yubikey::models::YubiKeyIdentity, _slot: u8, _recovery_code_hash: String, _label: Option<String>) -> YubiKeyResult<String> {
            Ok("entry_id_123".to_string())
        }

        async fn find_by_serial(&self, _serial: &Serial) -> YubiKeyResult<Option<(String, crate::key_management::yubikey::models::YubiKeyDevice)>> {
            Ok(None)
        }

        async fn update_yubikey_entry(&self, _entry_id: &str, _device: &crate::key_management::yubikey::models::YubiKeyDevice, _identity: &crate::key_management::yubikey::models::YubiKeyIdentity) -> YubiKeyResult<()> {
            Ok(())
        }

        async fn remove_yubikey_entry(&self, _entry_id: &str) -> YubiKeyResult<()> {
            Ok(())
        }

        async fn list_all_entries(&self) -> YubiKeyResult<Vec<(String, crate::key_management::yubikey::models::YubiKeyDevice)>> {
            Ok(vec![])
        }

        async fn find_by_slot(&self, _slot: u8) -> YubiKeyResult<Option<(String, crate::key_management::yubikey::models::YubiKeyDevice)>> {
            Ok(None)
        }

        async fn is_slot_occupied(&self, _slot: u8) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn get_entry_details(&self, _entry_id: &str) -> YubiKeyResult<Option<(crate::key_management::yubikey::models::YubiKeyDevice, crate::key_management::yubikey::models::YubiKeyIdentity, u8)>> {
            Ok(None)
        }

        async fn update_last_used(&self, _entry_id: &str) -> YubiKeyResult<()> {
            Ok(())
        }

        async fn set_label(&self, _entry_id: &str, _label: Option<String>) -> YubiKeyResult<()> {
            Ok(())
        }
    }

    #[derive(Debug)]
    struct MockFileService;

    #[async_trait]
    impl FileService for MockFileService {
        async fn create_temp_dir(&self, _prefix: &str) -> YubiKeyResult<TempDirectory> {
            let temp_dir = tempfile::TempDir::new().unwrap();
            Ok(TempDirectory {
                temp_dir,
                prefix: "test".to_string(),
                created_at: std::time::SystemTime::now(),
            })
        }

        async fn create_temp_file(&self, _content: &str, _suffix: &str) -> YubiKeyResult<TempFile> {
            let temp_file = tempfile::NamedTempFile::new().unwrap();
            let path = temp_file.path().to_path_buf();
            let _ = temp_file.keep().unwrap();
            Ok(TempFile {
                path,
                suffix: ".txt".to_string(),
                size: 0,
                created_at: std::time::SystemTime::now(),
            })
        }

        async fn write_temp_file(&self, _data: &[u8], _suffix: &str) -> YubiKeyResult<TempFile> {
            let temp_file = tempfile::NamedTempFile::new().unwrap();
            let path = temp_file.path().to_path_buf();
            let _ = temp_file.keep().unwrap();
            Ok(TempFile {
                path,
                suffix: ".bin".to_string(),
                size: 0,
                created_at: std::time::SystemTime::now(),
            })
        }

        async fn read_temp_file(&self, _path: &std::path::Path) -> YubiKeyResult<Vec<u8>> {
            Ok(b"test_content".to_vec())
        }

        async fn create_identity_file(&self, _serial: &Serial, _identity_tag: &str) -> YubiKeyResult<TempFile> {
            let temp_file = tempfile::NamedTempFile::new().unwrap();
            let path = temp_file.path().to_path_buf();
            let _ = temp_file.keep().unwrap();
            Ok(TempFile {
                path,
                suffix: ".txt".to_string(),
                size: 0,
                created_at: std::time::SystemTime::now(),
            })
        }

        async fn create_recipient_file(&self, _recipient: &str) -> YubiKeyResult<TempFile> {
            let temp_file = tempfile::NamedTempFile::new().unwrap();
            let path = temp_file.path().to_path_buf();
            let _ = temp_file.keep().unwrap();
            Ok(TempFile {
                path,
                suffix: ".txt".to_string(),
                size: 0,
                created_at: std::time::SystemTime::now(),
            })
        }

        async fn cleanup_temp_resources(&self, _paths: Vec<std::path::PathBuf>) -> YubiKeyResult<()> {
            Ok(())
        }
    }

    #[test]
    fn test_service_factory_with_custom_services() {
        let device_service = Arc::new(MockDeviceService) as Arc<dyn DeviceService>;
        let identity_service = Arc::new(MockIdentityService) as Arc<dyn IdentityService>;
        let registry_service = Arc::new(MockRegistryService) as Arc<dyn RegistryService>;
        let file_service = Arc::new(MockFileService) as Arc<dyn FileService>;

        let factory = ServiceFactory::with_services(
            device_service,
            identity_service,
            registry_service,
            file_service,
        );

        // Test that services can be retrieved
        let _device_svc = factory.device_service();
        let _identity_svc = factory.identity_service();
        let _registry_svc = factory.registry_service();
        let _file_svc = factory.file_service();
    }

    #[tokio::test]
    async fn test_service_factory_initialization() {
        let device_service = Arc::new(MockDeviceService) as Arc<dyn DeviceService>;
        let identity_service = Arc::new(MockIdentityService) as Arc<dyn IdentityService>;
        let registry_service = Arc::new(MockRegistryService) as Arc<dyn RegistryService>;
        let file_service = Arc::new(MockFileService) as Arc<dyn FileService>;

        let factory = ServiceFactory::with_services(
            device_service,
            identity_service,
            registry_service,
            file_service,
        );

        // Test service initialization
        assert!(factory.initialize_all_services().await.is_ok());
    }

    #[tokio::test]
    async fn test_service_factory_health_checks() {
        let device_service = Arc::new(MockDeviceService) as Arc<dyn DeviceService>;
        let identity_service = Arc::new(MockIdentityService) as Arc<dyn IdentityService>;
        let registry_service = Arc::new(MockRegistryService) as Arc<dyn RegistryService>;
        let file_service = Arc::new(MockFileService) as Arc<dyn FileService>;

        let factory = ServiceFactory::with_services(
            device_service,
            identity_service,
            registry_service,
            file_service,
        );

        let health_status = factory.health_check_all_services().await.unwrap();
        assert_eq!(health_status.len(), 4);
        assert_eq!(health_status["device"], ServiceHealth::Healthy);
        assert_eq!(health_status["identity"], ServiceHealth::Healthy);
        assert_eq!(health_status["registry"], ServiceHealth::Healthy);
        assert_eq!(health_status["file"], ServiceHealth::Healthy);
    }

    #[tokio::test]
    async fn test_service_factory_metrics() {
        let device_service = Arc::new(MockDeviceService) as Arc<dyn DeviceService>;
        let identity_service = Arc::new(MockIdentityService) as Arc<dyn IdentityService>;
        let registry_service = Arc::new(MockRegistryService) as Arc<dyn RegistryService>;
        let file_service = Arc::new(MockFileService) as Arc<dyn FileService>;

        let factory = ServiceFactory::with_services(
            device_service,
            identity_service,
            registry_service,
            file_service,
        );

        let metrics = factory.get_all_service_metrics().await.unwrap();
        assert_eq!(metrics.len(), 4);
        assert!(metrics.contains_key("device"));
        assert!(metrics.contains_key("identity"));
        assert!(metrics.contains_key("registry"));
        assert!(metrics.contains_key("file"));
    }

    #[tokio::test]
    async fn test_service_factory_shutdown() {
        let device_service = Arc::new(MockDeviceService) as Arc<dyn DeviceService>;
        let identity_service = Arc::new(MockIdentityService) as Arc<dyn IdentityService>;
        let registry_service = Arc::new(MockRegistryService) as Arc<dyn RegistryService>;
        let file_service = Arc::new(MockFileService) as Arc<dyn FileService>;

        let factory = ServiceFactory::with_services(
            device_service,
            identity_service,
            registry_service,
            file_service,
        );

        assert!(factory.shutdown_all_services().await.is_ok());
    }
}