//! Device Registry Implementation
//!
//! **FUTURE USE:** Not currently used in production. Reserved for future device extensibility.
//!
//! This module provides a registry for managing multiple hardware device types,
//! offering device-agnostic interfaces for Commands/UI when multiple devices are supported.
//! Demonstrates the factory pattern for extensibility.
//!
//! Currently only YubiKey and passphrase are implemented. This registry will be used
//! when adding support for smart cards, HSM, FIDO2, or other hardware devices.

use super::traits::{DeviceCapability, DeviceFactory, DeviceInfo, DeviceResult};
use std::collections::HashMap;

/// Registry for managing multiple hardware security device types
#[derive(Debug)]
pub struct DeviceRegistry {
    factories: HashMap<String, Box<dyn DeviceFactory>>,
}

impl DeviceRegistry {
    /// Create a new device registry
    pub fn new() -> Self {
        Self {
            factories: HashMap::new(),
        }
    }

    /// Register a device factory
    pub fn register_factory(&mut self, factory: Box<dyn DeviceFactory>) {
        let device_type = factory.device_type().to_string();
        self.factories.insert(device_type, factory);
    }

    /// Get all registered device types
    pub fn get_device_types(&self) -> Vec<String> {
        self.factories.keys().cloned().collect()
    }

    /// Get device factory by type
    pub fn get_factory(&self, device_type: &str) -> Option<&dyn DeviceFactory> {
        self.factories.get(device_type).map(|f| f.as_ref())
    }

    /// Discover all devices across all registered types
    pub async fn discover_all_devices(&self) -> DeviceResult<Vec<DeviceInfo>> {
        let mut all_devices = Vec::new();

        for factory in self.factories.values() {
            match factory.discover_devices().await {
                Ok(mut devices) => {
                    all_devices.append(&mut devices);
                }
                Err(e) => {
                    // Log error but continue with other device types
                    tracing::error!(
                        "Failed to discover {} devices: {}",
                        factory.device_type(),
                        e
                    );
                }
            }
        }

        Ok(all_devices)
    }

    /// Discover devices with specific capabilities
    pub async fn discover_devices_with_capabilities(
        &self,
        required_capabilities: &[DeviceCapability],
    ) -> DeviceResult<Vec<DeviceInfo>> {
        let all_devices = self.discover_all_devices().await?;

        let filtered_devices = all_devices
            .into_iter()
            .filter(|device| {
                required_capabilities
                    .iter()
                    .all(|cap| device.capabilities.contains(cap))
            })
            .collect();

        Ok(filtered_devices)
    }

    /// Get device count by type
    pub async fn get_device_count_by_type(&self) -> DeviceResult<HashMap<String, usize>> {
        let mut counts = HashMap::new();

        for factory in self.factories.values() {
            let devices = factory.discover_devices().await.unwrap_or_default();
            counts.insert(factory.device_type().to_string(), devices.len());
        }

        Ok(counts)
    }

    /// Check if any devices are available
    pub async fn has_devices(&self) -> bool {
        let devices = self.discover_all_devices().await.unwrap_or_default();
        !devices.is_empty()
    }

    /// Get registry statistics
    pub async fn get_statistics(&self) -> RegistryStatistics {
        let device_counts = self.get_device_count_by_type().await.unwrap_or_default();
        let total_devices: usize = device_counts.values().sum();
        let device_types = self.get_device_types();

        RegistryStatistics {
            total_device_types: device_types.len(),
            total_devices,
            device_counts,
            registered_types: device_types,
        }
    }
}

impl Default for DeviceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Statistics about the device registry
#[derive(Debug, Clone)]
pub struct RegistryStatistics {
    pub total_device_types: usize,
    pub total_devices: usize,
    pub device_counts: HashMap<String, usize>,
    pub registered_types: Vec<String>,
}

// Ensure the registry is thread-safe
unsafe impl Send for DeviceRegistry {}
unsafe impl Sync for DeviceRegistry {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::key_management::shared::domain::traits::{
        DeviceId, HardwareSecurityDevice,
    };
    use async_trait::async_trait;

    // Mock device factory for testing
    struct MockDeviceFactory {
        device_type: String,
        mock_devices: Vec<DeviceInfo>,
    }

    impl std::fmt::Debug for MockDeviceFactory {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            f.debug_struct("MockDeviceFactory")
                .field("device_type", &self.device_type)
                .finish()
        }
    }

    #[async_trait]
    impl DeviceFactory for MockDeviceFactory {
        fn device_type(&self) -> &str {
            &self.device_type
        }

        async fn discover_devices(&self) -> DeviceResult<Vec<DeviceInfo>> {
            Ok(self.mock_devices.clone())
        }

        async fn create_device(
            &self,
            _device_id: &DeviceId,
        ) -> DeviceResult<Box<dyn HardwareSecurityDevice>> {
            unimplemented!("Mock factory doesn't create real devices")
        }

        async fn create_device_with_capabilities(
            &self,
            _device_id: &DeviceId,
            _required_capabilities: &[DeviceCapability],
        ) -> DeviceResult<Box<dyn HardwareSecurityDevice>> {
            unimplemented!("Mock factory doesn't create real devices")
        }
    }

    #[tokio::test]
    async fn test_device_registry_registration() {
        let mut registry = DeviceRegistry::new();

        // Register mock factories
        let yubikey_factory = MockDeviceFactory {
            device_type: "YubiKey".to_string(),
            mock_devices: vec![],
        };

        let smartcard_factory = MockDeviceFactory {
            device_type: "SmartCard".to_string(),
            mock_devices: vec![],
        };

        registry.register_factory(Box::new(yubikey_factory));
        registry.register_factory(Box::new(smartcard_factory));

        // Test registered types
        let types = registry.get_device_types();
        assert!(types.contains(&"YubiKey".to_string()));
        assert!(types.contains(&"SmartCard".to_string()));
        assert_eq!(types.len(), 2);
    }

    #[tokio::test]
    async fn test_device_discovery() {
        let mut registry = DeviceRegistry::new();

        // Create mock device info
        let mock_device = DeviceInfo {
            device_type: "TestDevice".to_string(),
            device_id: DeviceId::new("test123"),
            name: "Test Device".to_string(),
            version: "1.0".to_string(),
            capabilities: vec![DeviceCapability::Encryption],
            metadata: HashMap::new(),
        };

        let factory = MockDeviceFactory {
            device_type: "TestDevice".to_string(),
            mock_devices: vec![mock_device],
        };

        registry.register_factory(Box::new(factory));

        // Test device discovery
        let devices = registry.discover_all_devices().await.unwrap();
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].device_type, "TestDevice");
    }

    #[tokio::test]
    async fn test_capability_filtering() {
        let mut registry = DeviceRegistry::new();

        let encryption_device = DeviceInfo {
            device_type: "EncryptionDevice".to_string(),
            device_id: DeviceId::new("enc123"),
            name: "Encryption Only".to_string(),
            version: "1.0".to_string(),
            capabilities: vec![DeviceCapability::Encryption],
            metadata: HashMap::new(),
        };

        let full_device = DeviceInfo {
            device_type: "FullDevice".to_string(),
            device_id: DeviceId::new("full123"),
            name: "Full Featured".to_string(),
            version: "1.0".to_string(),
            capabilities: vec![
                DeviceCapability::Encryption,
                DeviceCapability::Decryption,
                DeviceCapability::Signing,
            ],
            metadata: HashMap::new(),
        };

        registry.register_factory(Box::new(MockDeviceFactory {
            device_type: "Mixed".to_string(),
            mock_devices: vec![encryption_device, full_device],
        }));

        // Test capability filtering
        let encryption_capable = registry
            .discover_devices_with_capabilities(&[DeviceCapability::Encryption])
            .await
            .unwrap();
        assert_eq!(encryption_capable.len(), 2);

        let signing_capable = registry
            .discover_devices_with_capabilities(&[DeviceCapability::Signing])
            .await
            .unwrap();
        assert_eq!(signing_capable.len(), 1);
        assert_eq!(signing_capable[0].name, "Full Featured");
    }

    #[tokio::test]
    async fn test_registry_statistics() {
        let mut registry = DeviceRegistry::new();

        registry.register_factory(Box::new(MockDeviceFactory {
            device_type: "Type1".to_string(),
            mock_devices: vec![
                DeviceInfo {
                    device_type: "Type1".to_string(),
                    device_id: DeviceId::new("device1"),
                    name: "Device 1".to_string(),
                    version: "1.0".to_string(),
                    capabilities: vec![],
                    metadata: HashMap::new(),
                },
                DeviceInfo {
                    device_type: "Type1".to_string(),
                    device_id: DeviceId::new("device2"),
                    name: "Device 2".to_string(),
                    version: "1.0".to_string(),
                    capabilities: vec![],
                    metadata: HashMap::new(),
                },
            ],
        }));

        let stats = registry.get_statistics().await;
        assert_eq!(stats.total_device_types, 1);
        assert_eq!(stats.total_devices, 2);
        assert_eq!(stats.device_counts.get("Type1"), Some(&2));
    }
}
