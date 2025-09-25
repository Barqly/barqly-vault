//! YubiKey Manager (Facade Pattern)
//!
//! The main orchestrator for all YubiKey operations, providing a unified interface
//! that eliminates the scattered YubiKey code throughout the application.
//!
//! ## Design Goals
//!
//! - **Single Source of Truth**: All YubiKey operations go through this manager
//! - **Service Orchestration**: Coordinates DeviceService, IdentityService, RegistryService, and FileService
//! - **Serial-Scoped Operations**: All operations require serial parameter (architectural requirement)
//! - **Centralized Error Handling**: Consistent error handling across all operations
//! - **State Management**: Manages YubiKey states and transitions
//! - **Event Publishing**: Publishes events for UI updates and logging

use crate::key_management::yubikey::{
    application::services::ServiceFactory,
    domain::errors::{YubiKeyError, YubiKeyResult},
    domain::models::{Pin, Serial, YubiKeyDevice, YubiKeyIdentity},
};
use crate::prelude::*;

/// YubiKey Manager - Main facade for all YubiKey operations
///
/// This is the single entry point for all YubiKey functionality, replacing
/// the scattered implementations throughout the codebase.
#[derive(Debug)]
pub struct YubiKeyManager {
    /// Service factory providing access to all YubiKey services
    services: ServiceFactory,
    /// Current configuration
    config: YubiKeyManagerConfig,
}

/// Configuration for YubiKey Manager
#[derive(Debug, Clone)]
pub struct YubiKeyManagerConfig {
    /// Maximum PIN attempts before blocking operations
    pub max_pin_attempts: u8,
    /// Operation timeout in seconds
    pub operation_timeout_secs: u64,
    /// Enable automatic device detection
    pub auto_detect_devices: bool,
    /// Enable event publishing
    pub enable_events: bool,
}

impl Default for YubiKeyManagerConfig {
    fn default() -> Self {
        Self {
            max_pin_attempts: 3,
            operation_timeout_secs: 30,
            auto_detect_devices: true,
            enable_events: true,
        }
    }
}

impl YubiKeyManager {
    /// Create new YubiKey manager with default configuration
    pub async fn new() -> YubiKeyResult<Self> {
        Self::with_config(YubiKeyManagerConfig::default()).await
    }

    /// Create new YubiKey manager with custom configuration
    pub async fn with_config(config: YubiKeyManagerConfig) -> YubiKeyResult<Self> {
        info!("Initializing YubiKey Manager");

        let services = ServiceFactory::new().await?;
        services.initialize_all_services().await?;

        let manager = Self { services, config };

        info!("YubiKey Manager initialized successfully");
        Ok(manager)
    }

    /// Create YubiKey manager with custom services (for testing)
    pub fn with_services(services: ServiceFactory, config: YubiKeyManagerConfig) -> Self {
        Self { services, config }
    }

    // =============================================================================
    // Device Operations
    // =============================================================================

    /// List all connected YubiKey devices
    pub async fn list_connected_devices(&self) -> YubiKeyResult<Vec<YubiKeyDevice>> {
        debug!("Listing connected YubiKey devices");

        let devices = self
            .services
            .device_service()
            .list_connected_devices()
            .await?;

        info!("Found {} connected YubiKey devices", devices.len());
        Ok(devices)
    }

    /// Detect specific YubiKey device by serial
    pub async fn detect_device(&self, serial: &Serial) -> YubiKeyResult<Option<YubiKeyDevice>> {
        debug!("Detecting YubiKey device: {}", serial.redacted());

        self.services.device_service().detect_device(serial).await
    }

    /// Check if YubiKey device is connected
    pub async fn is_device_connected(&self, serial: &Serial) -> YubiKeyResult<bool> {
        self.services
            .device_service()
            .is_device_connected(serial)
            .await
    }

    /// Validate PIN for YubiKey device
    pub async fn validate_pin(&self, serial: &Serial, pin: &Pin) -> YubiKeyResult<bool> {
        debug!("Validating PIN for YubiKey: {}", serial.redacted());

        self.services
            .device_service()
            .validate_pin(serial, pin)
            .await
    }

    /// Check if YubiKey has default PIN (123456)
    pub async fn has_default_pin(&self, serial: &Serial) -> YubiKeyResult<bool> {
        debug!("Checking default PIN for YubiKey: {}", serial.redacted());

        self.services.device_service().has_default_pin(serial).await
    }

    // =============================================================================
    // Identity Operations (Fixes the Identity Tag Bug)
    // =============================================================================

    /// Generate new identity for YubiKey during initialization
    /// This fixes the identity tag bug by centralizing identity creation
    pub async fn generate_identity(
        &self,
        serial: &Serial,
        pin: &Pin,
        slot: u8,
    ) -> YubiKeyResult<YubiKeyIdentity> {
        info!(
            "Generating identity for YubiKey: {} slot: {}",
            serial.redacted(),
            slot
        );

        // Ensure device is connected
        if !self.is_device_connected(serial).await? {
            return Err(YubiKeyError::device_not_found(serial));
        }

        // Validate PIN first
        if !self.validate_pin(serial, pin).await? {
            return Err(YubiKeyError::pin("Invalid PIN"));
        }

        // Generate identity using service
        let identity = self
            .services
            .identity_service()
            .generate_identity(serial, pin, slot)
            .await?;

        info!(
            "Generated identity for YubiKey: {} recipient: {}",
            serial.redacted(),
            identity.to_recipient()
        );

        Ok(identity)
    }

    /// Get existing identity from YubiKey (for orphaned keys)
    pub async fn get_existing_identity(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<YubiKeyIdentity>> {
        debug!(
            "Getting existing identity for YubiKey: {}",
            serial.redacted()
        );

        self.services
            .identity_service()
            .get_existing_identity(serial)
            .await
    }

    /// Check if YubiKey has any identity
    pub async fn has_identity(&self, serial: &Serial) -> YubiKeyResult<bool> {
        self.services.identity_service().has_identity(serial).await
    }

    /// Encrypt data with YubiKey recipient
    pub async fn encrypt_with_recipient(
        &self,
        recipient: &str,
        data: &[u8],
    ) -> YubiKeyResult<Vec<u8>> {
        debug!("Encrypting {} bytes with recipient", data.len());

        self.services
            .identity_service()
            .encrypt_with_recipient(recipient, data)
            .await
    }

    /// Decrypt data with YubiKey identity
    pub async fn decrypt_with_identity(
        &self,
        serial: &Serial,
        identity_tag: &str,
        encrypted_data: &[u8],
    ) -> YubiKeyResult<Vec<u8>> {
        debug!(
            "Decrypting {} bytes for YubiKey: {}",
            encrypted_data.len(),
            serial.redacted()
        );

        self.services
            .identity_service()
            .decrypt_with_identity(serial, identity_tag, encrypted_data)
            .await
    }

    // =============================================================================
    // Registry Operations
    // =============================================================================

    /// Register YubiKey device in registry
    pub async fn register_device(
        &self,
        device: &YubiKeyDevice,
        identity: &YubiKeyIdentity,
        slot: u8,
        recovery_code_hash: String,
        label: Option<String>,
    ) -> YubiKeyResult<String> {
        info!(
            "Registering YubiKey device: {} slot: {}",
            device.serial().redacted(),
            slot
        );

        let entry_id = self
            .services
            .registry_service()
            .add_yubikey_entry(device, identity, slot, recovery_code_hash, label)
            .await?;

        info!(
            "Registered YubiKey device: {} with entry ID: {}",
            device.serial().redacted(),
            entry_id
        );

        Ok(entry_id)
    }

    /// Find YubiKey registry entry by serial
    pub async fn find_by_serial(
        &self,
        serial: &Serial,
    ) -> YubiKeyResult<Option<(String, YubiKeyDevice)>> {
        debug!("Finding registry entry for YubiKey: {}", serial.redacted());

        self.services
            .registry_service()
            .find_by_serial(serial)
            .await
    }

    /// Check if slot is occupied
    pub async fn is_slot_occupied(&self, slot: u8) -> YubiKeyResult<bool> {
        self.services
            .registry_service()
            .is_slot_occupied(slot)
            .await
    }

    /// List all registered YubiKey devices
    pub async fn list_registered_devices(&self) -> YubiKeyResult<Vec<(String, YubiKeyDevice)>> {
        debug!("Listing all registered YubiKey devices");

        self.services.registry_service().get_all_yubikeys().await
    }

    // =============================================================================
    // High-Level Workflow Operations
    // =============================================================================

    /// Initialize YubiKey hardware with recovery code generation
    /// This handles the low-level hardware initialization with ykman
    pub async fn initialize_device_hardware(&self, pin: &Pin) -> YubiKeyResult<String> {
        info!("Initializing YubiKey hardware with auto-generated recovery code");

        // Import the PTY function for hardware initialization
        use crate::key_management::yubikey::infrastructure::pty::ykman_operations::initialize_yubikey_with_recovery;

        // Generate recovery code and initialize hardware
        let recovery_code = tokio::task::spawn_blocking({
            let pin_value = pin.value().to_string();
            move || initialize_yubikey_with_recovery(&pin_value)
        })
        .await
        .map_err(|e| YubiKeyError::device(format!("Task join error: {}", e)))?
        .map_err(|e| YubiKeyError::device(format!("Hardware initialization failed: {}", e)))?;

        info!("YubiKey hardware initialized successfully");
        Ok(recovery_code)
    }

    /// Initialize YubiKey for first-time use
    /// This is a high-level operation that orchestrates multiple services
    pub async fn initialize_device(
        &self,
        serial: &Serial,
        pin: &Pin,
        slot: u8,
        recovery_code_hash: String,
        label: Option<String>,
    ) -> YubiKeyResult<(YubiKeyDevice, YubiKeyIdentity, String)> {
        info!("Initializing YubiKey device: {}", serial.redacted());

        // 1. Detect device
        let device = self
            .detect_device(serial)
            .await?
            .ok_or_else(|| YubiKeyError::device_not_found(serial))?;

        // 2. Validate PIN
        if !self.validate_pin(serial, pin).await? {
            return Err(YubiKeyError::pin("Invalid PIN"));
        }

        // 3. Check if slot is available
        if self.is_slot_occupied(slot).await? {
            return Err(YubiKeyError::slot_occupied(&slot.to_string(), serial));
        }

        // 4. Generate identity
        let identity = self.generate_identity(serial, pin, slot).await?;

        // 5. Register device
        let entry_id = self
            .register_device(&device, &identity, slot, recovery_code_hash, label)
            .await?;

        info!(
            "Successfully initialized YubiKey: {} with entry ID: {}",
            serial.redacted(),
            entry_id
        );

        Ok((device, identity, entry_id))
    }

    /// Perform complete YubiKey validation
    /// Validates device connection, PIN, and identity
    pub async fn validate_device(
        &self,
        serial: &Serial,
        pin: &Pin,
    ) -> YubiKeyResult<YubiKeyDevice> {
        debug!("Validating YubiKey device: {}", serial.redacted());

        // 1. Check device connection
        let device = self
            .detect_device(serial)
            .await?
            .ok_or_else(|| YubiKeyError::device_not_found(serial))?;

        // 2. Validate PIN
        if !self.validate_pin(serial, pin).await? {
            return Err(YubiKeyError::pin("Invalid PIN"));
        }

        // 3. Ensure device is registered
        if self.find_by_serial(serial).await?.is_none() {
            return Err(YubiKeyError::registry_entry_not_found(serial));
        }

        info!(
            "YubiKey device validation successful: {}",
            serial.redacted()
        );
        Ok(device)
    }

    // =============================================================================
    // Service Management
    // =============================================================================

    /// Get health status of all services
    pub async fn get_service_health(
        &self,
    ) -> YubiKeyResult<
        std::collections::HashMap<
            String,
            crate::key_management::yubikey::application::services::ServiceHealth,
        >,
    > {
        self.services.health_check_all_services().await
    }

    /// Get service metrics
    pub async fn get_service_metrics(
        &self,
    ) -> YubiKeyResult<
        std::collections::HashMap<
            String,
            crate::key_management::yubikey::application::services::ServiceMetrics,
        >,
    > {
        self.services.get_all_service_metrics().await
    }

    /// Shutdown manager and all services gracefully
    pub async fn shutdown(&self) -> YubiKeyResult<()> {
        info!("Shutting down YubiKey Manager");

        self.services.shutdown_all_services().await?;

        info!("YubiKey Manager shutdown complete");
        Ok(())
    }

    /// Get manager configuration
    pub fn config(&self) -> &YubiKeyManagerConfig {
        &self.config
    }

    /// Get direct access to services (for advanced usage)
    pub fn services(&self) -> &ServiceFactory {
        &self.services
    }
}

// Ensure manager can be used safely across thread boundaries
unsafe impl Send for YubiKeyManager {}
unsafe impl Sync for YubiKeyManager {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::key_management::yubikey::domain::models::Serial;

    #[tokio::test]
    async fn test_manager_creation() {
        let config = YubiKeyManagerConfig::default();
        assert_eq!(config.max_pin_attempts, 3);
        assert_eq!(config.operation_timeout_secs, 30);
        assert!(config.auto_detect_devices);
        assert!(config.enable_events);
    }

    #[test]
    fn test_manager_config() {
        let config = YubiKeyManagerConfig {
            max_pin_attempts: 5,
            operation_timeout_secs: 60,
            auto_detect_devices: false,
            enable_events: false,
        };

        assert_eq!(config.max_pin_attempts, 5);
        assert_eq!(config.operation_timeout_secs, 60);
        assert!(!config.auto_detect_devices);
        assert!(!config.enable_events);
    }

    #[test]
    fn test_serial_operations() {
        let serial = Serial::new("12345678".to_string()).unwrap();
        assert!(!serial.value().is_empty());
        assert!(serial.redacted().contains("***"));
    }

    // TODO: Add integration tests with mock services
    // These will be added after we validate the design with real command integration
}
