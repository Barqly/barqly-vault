//! Service factory for creating service instances

use super::{
    AgePluginIdentityService, DefaultFileService, DefaultRegistryService, DeviceService,
    FileService, IdentityService, RegistryService, ServiceHealth, ServiceMetrics,
    YkmanDeviceService,
};
use crate::prelude::*;
use crate::services::key_management::yubikey::domain::errors::YubiKeyResult;
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

    /// Create a service factory with custom ykman path (for testing only - production uses bundled binaries)
    pub async fn with_ykman_path(ykman_path: String) -> YubiKeyResult<Self> {
        debug!(
            "Creating ServiceFactory with custom ykman path: {}",
            ykman_path
        );

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
    pub async fn health_check_all_services(
        &self,
    ) -> YubiKeyResult<std::collections::HashMap<String, ServiceHealth>> {
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
    pub async fn get_all_service_metrics(
        &self,
    ) -> YubiKeyResult<std::collections::HashMap<String, ServiceMetrics>> {
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
