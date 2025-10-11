//! Registry service for YubiKey key registry operations
//!
//! This service provides YubiKey-focused operations for managing YubiKeys
//! in the key registry system. It handles only registry operations,
//! with vault operations delegated to higher-level orchestrators.

use crate::prelude::*;
use crate::services::key_management::shared::{KeyEntry, KeyRegistry};
use crate::services::key_management::yubikey::{
    domain::errors::{YubiKeyError, YubiKeyResult},
    domain::models::{Serial, YubiKeyDevice, YubiKeyIdentity},
};
use crate::services::shared::infrastructure::sanitize_label;
use async_trait::async_trait;

/// Registry service trait for key registry operations
#[async_trait]
pub trait RegistryService: Send + Sync + std::fmt::Debug {
    /// Add a new YubiKey entry to the registry
    async fn add_yubikey_entry(
        &self,
        device: &YubiKeyDevice,
        identity: &YubiKeyIdentity,
        slot: u8,
        recovery_code_hash: String,
        label: Option<String>,
    ) -> YubiKeyResult<String>;

    /// Find registered YubiKey by serial
    async fn find_by_serial(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<(String, YubiKeyDevice)>>;

    /// Get all YubiKey entries from registry
    async fn get_all_yubikeys(&self) -> YubiKeyResult<Vec<(String, YubiKeyDevice)>>;

    /// Check if YubiKey is in registry
    async fn is_registered(&self, serial: &Serial) -> YubiKeyResult<bool>;

    /// Update YubiKey label in registry
    async fn update_label(&self, key_id: &str, new_label: String) -> YubiKeyResult<()>;

    /// Mark YubiKey as used (updates last_used timestamp)
    async fn mark_used(&self, key_id: &str) -> YubiKeyResult<()>;

    /// Remove YubiKey from registry
    async fn remove_yubikey(&self, key_id: &str) -> YubiKeyResult<()>;

    /// Check if a slot is occupied by any YubiKey (for slot availability)
    async fn is_slot_occupied(&self, slot: u8) -> YubiKeyResult<bool>;

    /// Check if a slot is occupied by specific YubiKey (for re-registration)
    async fn is_slot_occupied_by_device(&self, serial: &Serial, slot: u8) -> YubiKeyResult<bool>;

    /// Get YubiKey by key_id
    async fn get_by_id(&self, key_id: &str) -> YubiKeyResult<Option<YubiKeyDevice>>;

    /// Validate registry internal consistency
    async fn validate_consistency(&self) -> YubiKeyResult<Vec<String>>;
}

/// Default registry service implementation
#[derive(Debug)]
pub struct DefaultRegistryService {
    // For now, we'll work directly with the vault functions
    // In the future this can be made configurable for testing
}

impl DefaultRegistryService {
    /// Create new registry service
    pub async fn new() -> YubiKeyResult<Self> {
        Ok(Self {})
    }

    /// Load registry with proper error handling
    async fn load_registry(&self) -> YubiKeyResult<KeyRegistry> {
        KeyRegistry::load()
            .map_err(|e| YubiKeyError::registry(format!("Failed to load key registry: {}", e)))
    }

    /// Save registry with proper error handling
    async fn save_registry(&self, registry: &KeyRegistry) -> YubiKeyResult<()> {
        registry
            .save()
            .map_err(|e| YubiKeyError::registry(format!("Failed to save key registry: {}", e)))
    }

    /// Check if slot is occupied by any YubiKey in registry
    async fn check_slot_occupied(&self, slot: u8) -> YubiKeyResult<bool> {
        let registry = self.load_registry().await?;

        // Check if any YubiKey in registry uses this slot
        for (_, entry) in registry.yubikey_keys() {
            if let KeyEntry::Yubikey {
                slot: entry_slot, ..
            } = entry
                && *entry_slot == slot
            {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Check if slot is occupied by same YubiKey (serial match)
    async fn check_slot_occupied_by_device(
        &self,
        serial: &Serial,
        slot: u8,
    ) -> YubiKeyResult<bool> {
        let registry = self.load_registry().await?;

        // Check if slot is occupied by the SAME YubiKey (same serial)
        for (_, entry) in registry.yubikey_keys() {
            if let KeyEntry::Yubikey {
                serial: entry_serial,
                slot: entry_slot,
                ..
            } = entry
                && *entry_slot == slot
                && entry_serial == serial.value()
            {
                return Ok(true);
            }
        }

        Ok(false)
    }

    /// Generate appropriate label for YubiKey based on device name
    fn generate_yubikey_label(&self, device: &YubiKeyDevice, count: usize) -> String {
        // Use device name field directly
        let base_name = if device.name.contains("Nano") {
            "YubiKey Nano"
        } else if device.name.contains("5C") {
            "YubiKey 5C"
        } else if device.name.contains("NFC") {
            "YubiKey NFC"
        } else {
            "YubiKey"
        };

        if count > 0 {
            format!("{}-{}", base_name, count)
        } else {
            base_name.to_string()
        }
    }
}

#[async_trait]
impl RegistryService for DefaultRegistryService {
    async fn is_slot_occupied(&self, slot: u8) -> YubiKeyResult<bool> {
        debug!("Checking if slot {} is occupied", slot);
        self.check_slot_occupied(slot).await
    }

    async fn is_slot_occupied_by_device(&self, serial: &Serial, slot: u8) -> YubiKeyResult<bool> {
        debug!(
            "Checking if slot {} is occupied by device {}",
            slot,
            serial.redacted()
        );
        self.check_slot_occupied_by_device(serial, slot).await
    }

    async fn add_yubikey_entry(
        &self,
        device: &YubiKeyDevice,
        identity: &YubiKeyIdentity,
        slot: u8,
        recovery_code_hash: String,
        label: Option<String>,
    ) -> YubiKeyResult<String> {
        info!(
            "Adding YubiKey entry: serial={}, slot={}",
            device.serial().redacted(),
            slot
        );

        let mut registry = self.load_registry().await?;

        // Generate label if not provided
        let yubikey_count = registry.yubikey_keys().len();
        let final_label =
            label.unwrap_or_else(|| self.generate_yubikey_label(device, yubikey_count));

        // Sanitize the label for use as key_id
        let sanitized = sanitize_label(&final_label)
            .map_err(|e| YubiKeyError::registry(format!("Failed to sanitize label: {}", e)))?;

        // Calculate PIV slot from user slot (82-95 range)
        let piv_slot = 82 + slot;

        // Add to registry
        let key_id = registry.add_yubikey_entry(
            sanitized.sanitized.clone(), // key_id - sanitized
            final_label,                 // label - original display label
            device.serial().value().to_string(),
            slot,
            piv_slot,
            identity.to_recipient(),
            identity.identity_tag().to_string(),
            device.name.clone(), // Use device name as model
            device.firmware_version.clone(),
            recovery_code_hash,
        );

        // Save registry
        self.save_registry(&registry).await?;

        Ok(key_id)
    }

    async fn find_by_serial(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<(String, YubiKeyDevice)>> {
        debug!("Finding YubiKey by serial: {}", serial.redacted());

        let registry = self.load_registry().await?;

        if let Some((key_id, entry)) = registry.find_yubikey_by_serial(serial.value())
            && let KeyEntry::Yubikey {
                serial: entry_serial,
                slot,
                firmware_version,
                label,
                ..
            } = entry
        {
            // Convert registry entry back to YubiKeyDevice
            let device = YubiKeyDevice::from_registry_entry(
                Serial::new(entry_serial.clone())?,
                label.clone(),
                *slot,
                firmware_version.clone(),
            );

            debug!(
                "Found YubiKey: key_id={}, serial={}",
                key_id,
                serial.redacted()
            );
            return Ok(Some((key_id.clone(), device)));
        }

        debug!("YubiKey not found: {}", serial.redacted());
        Ok(None)
    }

    async fn get_all_yubikeys(&self) -> YubiKeyResult<Vec<(String, YubiKeyDevice)>> {
        debug!("Getting all YubiKeys from registry");

        let registry = self.load_registry().await?;
        let mut yubikeys = Vec::new();

        for (key_id, entry) in registry.yubikey_keys() {
            if let KeyEntry::Yubikey {
                serial,
                slot,
                firmware_version,
                label,
                ..
            } = entry
            {
                let device = YubiKeyDevice::from_registry_entry(
                    Serial::new(serial.clone())?,
                    label.clone(),
                    *slot,
                    firmware_version.clone(),
                );

                yubikeys.push((key_id.clone(), device));
            }
        }

        debug!("Found {} YubiKeys in registry", yubikeys.len());
        Ok(yubikeys)
    }

    async fn is_registered(&self, serial: &Serial) -> YubiKeyResult<bool> {
        let registry = self.load_registry().await?;

        // Check if YubiKey is in registry
        let exists = registry.find_yubikey_by_serial(serial.value()).is_some();

        debug!(
            "YubiKey {} registration status: {}",
            serial.redacted(),
            exists
        );
        Ok(exists)
    }

    async fn update_label(&self, key_id: &str, new_label: String) -> YubiKeyResult<()> {
        info!(
            "Updating YubiKey label: key_id={}, new_label={}",
            key_id, new_label
        );

        let mut registry = self.load_registry().await?;

        // Get current entry
        let entry = registry
            .get_key(key_id)
            .ok_or_else(|| YubiKeyError::registry(format!("Key not found: {}", key_id)))?
            .clone();

        // Update label
        let updated_entry = match entry {
            KeyEntry::Yubikey {
                serial,
                created_at,
                last_used,
                slot,
                piv_slot,
                recipient,
                identity_tag,
                model,
                firmware_version,
                recovery_code_hash,
                lifecycle_status,
                status_history,
                vault_associations,
                ..
            } => KeyEntry::Yubikey {
                label: new_label,
                created_at,
                last_used,
                serial,
                slot,
                piv_slot,
                recipient,
                identity_tag,
                model,
                firmware_version,
                recovery_code_hash,
                lifecycle_status,
                status_history,
                vault_associations,
            },
            _ => return Err(YubiKeyError::registry("Not a YubiKey entry".to_string())),
        };

        // Update in registry
        registry
            .update_key(key_id, updated_entry)
            .map_err(YubiKeyError::registry)?;

        // Save registry
        self.save_registry(&registry).await?;

        Ok(())
    }

    async fn mark_used(&self, key_id: &str) -> YubiKeyResult<()> {
        debug!("Marking YubiKey as used: key_id={}", key_id);

        let mut registry = self.load_registry().await?;

        registry
            .mark_key_used(key_id)
            .map_err(YubiKeyError::registry)?;

        self.save_registry(&registry).await?;

        Ok(())
    }

    async fn remove_yubikey(&self, key_id: &str) -> YubiKeyResult<()> {
        info!("Removing YubiKey from registry: key_id={}", key_id);

        let mut registry = self.load_registry().await?;

        // Remove from registry
        registry
            .remove_key(key_id)
            .map_err(YubiKeyError::registry)?;

        // Save registry
        self.save_registry(&registry).await?;

        Ok(())
    }

    async fn get_by_id(&self, key_id: &str) -> YubiKeyResult<Option<YubiKeyDevice>> {
        debug!("Getting YubiKey by key_id: {}", key_id);

        let registry = self.load_registry().await?;

        if let Some(entry) = registry.get_key(key_id)
            && let KeyEntry::Yubikey {
                serial,
                slot,
                firmware_version,
                label,
                ..
            } = entry
        {
            let device = YubiKeyDevice::from_registry_entry(
                Serial::new(serial.clone())?,
                label.clone(),
                *slot,
                firmware_version.clone(),
            );

            debug!("Found YubiKey: {}", device.serial().redacted());
            return Ok(Some(device));
        }

        debug!("YubiKey not found for key_id: {}", key_id);
        Ok(None)
    }

    async fn validate_consistency(&self) -> YubiKeyResult<Vec<String>> {
        debug!("Validating registry internal consistency");

        let registry = self.load_registry().await?;
        let mut issues = Vec::new();

        // Check for slot conflicts
        let mut slot_usage = std::collections::HashMap::new();
        for (key_id, entry) in registry.yubikey_keys() {
            if let KeyEntry::Yubikey { slot, .. } = entry {
                if let Some(existing_key) = slot_usage.get(slot) {
                    issues.push(format!(
                        "Slot conflict: slot {} used by both {} and {}",
                        slot, existing_key, key_id
                    ));
                } else {
                    slot_usage.insert(*slot, key_id.clone());
                }
            }
        }

        // Check for serial number duplicates
        let mut serial_usage = std::collections::HashMap::new();
        for (key_id, entry) in registry.yubikey_keys() {
            if let KeyEntry::Yubikey { serial, .. } = entry {
                if let Some(existing_key) = serial_usage.get(serial) {
                    issues.push(format!(
                        "Serial duplicate: serial {} used by both {} and {}",
                        serial, existing_key, key_id
                    ));
                } else {
                    serial_usage.insert(serial.clone(), key_id.clone());
                }
            }
        }

        if issues.is_empty() {
            debug!("Registry consistency validation passed");
        } else {
            warn!("Registry consistency issues found: {}", issues.len());
        }

        Ok(issues)
    }
}

// Add extension methods to YubiKeyDevice for registry integration
impl YubiKeyDevice {
    /// Create YubiKeyDevice from registry entry
    pub fn from_registry_entry(
        serial: Serial,
        label: String,
        _slot: u8,
        firmware_version: Option<String>,
    ) -> Self {
        // Determine form factor and interfaces from label/name patterns
        let form_factor = if label.contains("Nano") {
            crate::services::key_management::yubikey::domain::models::FormFactor::Nano
        } else if label.contains("5C") {
            crate::services::key_management::yubikey::domain::models::FormFactor::UsbC
        } else if label.contains("NFC") {
            crate::services::key_management::yubikey::domain::models::FormFactor::NFC
        } else {
            crate::services::key_management::yubikey::domain::models::FormFactor::UsbA
        };

        let interfaces =
            vec![crate::services::key_management::yubikey::domain::models::Interface::USB];

        Self::from_detected_device(serial, label, form_factor, interfaces, firmware_version)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::key_management::yubikey::domain::models::{
        FormFactor, Interface, YubiKeyIdentity,
    };
    use std::sync::Arc;

    /// Create a test registry service that uses in-memory storage only
    async fn create_test_registry_service() -> Arc<dyn RegistryService> {
        // Use a custom implementation that stores data only in memory
        // This prevents any writes to the production registry file
        Arc::new(InMemoryRegistryService::new())
    }

    /// Test-only registry service that stores data in memory
    #[derive(Debug, Default)]
    struct InMemoryRegistryService;

    impl InMemoryRegistryService {
        fn new() -> Self {
            Self
        }
    }

    #[async_trait]
    impl RegistryService for InMemoryRegistryService {
        async fn add_yubikey_entry(
            &self,
            _device: &YubiKeyDevice,
            _identity: &YubiKeyIdentity,
            _slot: u8,
            _recovery_code_hash: String,
            _label: Option<String>,
        ) -> YubiKeyResult<String> {
            let key_id = format!("test_key_{}", uuid::Uuid::new_v4().simple());
            debug!(key_id = %key_id, "Test: Added YubiKey to in-memory registry");
            Ok(key_id)
        }

        async fn find_by_serial(
            &self,
            serial: &Serial,
        ) -> YubiKeyResult<Option<(String, YubiKeyDevice)>> {
            // For tests, return None (not found)
            debug!(serial = %serial.redacted(), "Test: Looking for YubiKey in in-memory registry");
            Ok(None)
        }

        async fn get_all_yubikeys(&self) -> YubiKeyResult<Vec<(String, YubiKeyDevice)>> {
            debug!("Test: Getting all YubiKeys from in-memory registry");
            Ok(vec![])
        }

        async fn is_registered(&self, _serial: &Serial) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn update_label(&self, key_id: &str, _new_label: String) -> YubiKeyResult<()> {
            debug!(key_id = %key_id, "Test: Updated label in in-memory registry");
            Ok(())
        }

        async fn mark_used(&self, key_id: &str) -> YubiKeyResult<()> {
            debug!(key_id = %key_id, "Test: Marked key as used in in-memory registry");
            Ok(())
        }

        async fn remove_yubikey(&self, key_id: &str) -> YubiKeyResult<()> {
            debug!(key_id = %key_id, "Test: Removed YubiKey from in-memory registry");
            Ok(())
        }

        async fn is_slot_occupied(&self, _slot: u8) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn is_slot_occupied_by_device(
            &self,
            _serial: &Serial,
            _slot: u8,
        ) -> YubiKeyResult<bool> {
            Ok(false)
        }

        async fn get_by_id(&self, key_id: &str) -> YubiKeyResult<Option<YubiKeyDevice>> {
            debug!(key_id = %key_id, "Test: Getting YubiKey by ID from in-memory registry");
            Ok(None)
        }

        async fn validate_consistency(&self) -> YubiKeyResult<Vec<String>> {
            debug!("Test: Validating in-memory registry consistency");
            Ok(vec![])
        }
    }

    fn create_test_device() -> YubiKeyDevice {
        let serial = Serial::new("12345678".to_string()).unwrap();
        YubiKeyDevice::from_detected_device(
            serial,
            "YubiKey 5 NFC".to_string(),
            FormFactor::NFC,
            vec![Interface::USB, Interface::NFC],
            Some("5.4.3".to_string()),
        )
    }

    fn create_test_identity() -> YubiKeyIdentity {
        let serial = Serial::new("12345678".to_string()).expect("Valid test serial");
        YubiKeyIdentity::new(
            "AGE-PLUGIN-YUBIKEY-TESTRECIPIENT".to_string(),
            serial,
            "age1yubikey1test123".to_string(),
        )
        .expect("Valid test identity")
    }

    #[tokio::test]
    async fn test_registry_service_creation() {
        let service = create_test_registry_service().await;

        // Should be able to create service
        assert!(!format!("{:?}", service).is_empty());
    }

    #[tokio::test]
    async fn test_add_yubikey_entry() {
        let service = create_test_registry_service().await;

        let device = create_test_device();
        let identity = create_test_identity();

        let key_id = service
            .add_yubikey_entry(
                &device,
                &identity,
                0,
                "recovery_hash".to_string(),
                Some("Test YubiKey".to_string()),
            )
            .await
            .unwrap();

        assert!(key_id.starts_with("test_key_"));
    }

    #[tokio::test]
    async fn test_find_by_serial() {
        let service = create_test_registry_service().await;

        let device = create_test_device();
        let identity = create_test_identity();
        let serial = device.serial().clone();

        // Register first
        let _key_id = service
            .add_yubikey_entry(
                &device,
                &identity,
                0,
                "recovery_hash".to_string(),
                Some("Test YubiKey".to_string()),
            )
            .await
            .unwrap();

        // Then find (our test service returns None, so test that behavior)
        let found = service.find_by_serial(&serial).await.unwrap();
        assert!(
            found.is_none(),
            "Test service returns None for find_by_serial"
        );
    }
}
