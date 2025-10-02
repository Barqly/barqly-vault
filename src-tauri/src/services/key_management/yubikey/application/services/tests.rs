//! Tests for service module

use super::*;
use crate::services::key_management::yubikey::domain::errors::YubiKeyResult;
use crate::services::key_management::yubikey::domain::models::{
    Serial, YubiKeyDevice, YubiKeyIdentity,
};
use async_trait::async_trait;
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
    async fn list_connected_devices(
        &self,
    ) -> YubiKeyResult<Vec<crate::services::key_management::yubikey::domain::models::YubiKeyDevice>>
    {
        Ok(vec![])
    }

    async fn detect_device(
        &self,
        _serial: &Serial,
    ) -> YubiKeyResult<
        Option<crate::services::key_management::yubikey::domain::models::YubiKeyDevice>,
    > {
        Ok(None)
    }

    async fn is_device_connected(&self, _serial: &Serial) -> YubiKeyResult<bool> {
        Ok(false)
    }

    async fn validate_pin(
        &self,
        _serial: &Serial,
        _pin: &crate::services::key_management::yubikey::domain::models::Pin,
    ) -> YubiKeyResult<bool> {
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
    async fn generate_identity(
        &self,
        _serial: &Serial,
        _pin: &crate::services::key_management::yubikey::domain::models::Pin,
        _slot: u8,
    ) -> YubiKeyResult<crate::services::key_management::yubikey::domain::models::YubiKeyIdentity>
    {
        let serial = Serial::new("12345678".to_string()).unwrap();
        Ok(
            crate::services::key_management::yubikey::domain::models::YubiKeyIdentity::new(
                "age1yubikey1test123".to_string(),
                serial.clone(),
                "age1yubikey1test123".to_string(),
            )
            .expect("Valid test identity"),
        )
    }

    async fn encrypt_with_recipient(
        &self,
        _recipient: &str,
        _data: &[u8],
    ) -> YubiKeyResult<Vec<u8>> {
        Ok(b"encrypted_data".to_vec())
    }

    async fn decrypt_with_identity(
        &self,
        _serial: &Serial,
        _identity_tag: &str,
        _encrypted_data: &[u8],
    ) -> YubiKeyResult<Vec<u8>> {
        Ok(b"decrypted_data".to_vec())
    }

    async fn get_existing_identity(
        &self,
        _serial: &Serial,
    ) -> YubiKeyResult<Option<YubiKeyIdentity>> {
        Ok(Some(
            crate::services::key_management::yubikey::domain::models::YubiKeyIdentity::new(
                "age1yubikey1existing123".to_string(),
                _serial.clone(),
                "age1yubikey1existing123".to_string(),
            )
            .expect("Valid test identity"),
        ))
    }

    async fn has_identity(&self, _serial: &Serial) -> YubiKeyResult<bool> {
        Ok(true)
    }

    async fn list_identities(&self, _serial: &Serial) -> YubiKeyResult<Vec<YubiKeyIdentity>> {
        Ok(vec![
            crate::services::key_management::yubikey::domain::models::YubiKeyIdentity::new(
                "age1yubikey1test123".to_string(),
                _serial.clone(),
                "age1yubikey1test123".to_string(),
            )
            .expect("Valid test identity"),
        ])
    }
}

#[derive(Debug)]
struct MockRegistryService;

#[async_trait]
impl RegistryService for MockRegistryService {
    async fn add_yubikey_entry(
        &self,
        _device: &crate::services::key_management::yubikey::domain::models::YubiKeyDevice,
        _identity: &crate::services::key_management::yubikey::domain::models::YubiKeyIdentity,
        _slot: u8,
        _recovery_code_hash: String,
        _label: Option<String>,
    ) -> YubiKeyResult<String> {
        Ok("entry_id_123".to_string())
    }

    async fn find_by_serial(
        &self,
        _serial: &Serial,
    ) -> YubiKeyResult<
        Option<(
            String,
            crate::services::key_management::yubikey::domain::models::YubiKeyDevice,
        )>,
    > {
        Ok(None)
    }

    async fn get_all_yubikeys(
        &self,
    ) -> YubiKeyResult<
        Vec<(
            String,
            crate::services::key_management::yubikey::domain::models::YubiKeyDevice,
        )>,
    > {
        Ok(vec![])
    }

    async fn is_slot_occupied(&self, _slot: u8) -> YubiKeyResult<bool> {
        Ok(false)
    }

    async fn is_registered(&self, _serial: &Serial) -> YubiKeyResult<bool> {
        Ok(false)
    }

    async fn update_label(&self, _key_id: &str, _new_label: String) -> YubiKeyResult<()> {
        Ok(())
    }

    async fn mark_used(&self, _key_id: &str) -> YubiKeyResult<()> {
        Ok(())
    }

    async fn remove_yubikey(&self, _key_id: &str) -> YubiKeyResult<()> {
        Ok(())
    }

    async fn is_slot_occupied_by_device(&self, _serial: &Serial, _slot: u8) -> YubiKeyResult<bool> {
        Ok(false)
    }

    async fn get_by_id(&self, _key_id: &str) -> YubiKeyResult<Option<YubiKeyDevice>> {
        Ok(None)
    }

    async fn validate_consistency(&self) -> YubiKeyResult<Vec<String>> {
        Ok(vec![])
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

    async fn create_identity_file(
        &self,
        _serial: &Serial,
        _identity_tag: &str,
    ) -> YubiKeyResult<TempFile> {
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
