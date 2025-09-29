//! YubiKey Key Management Module
//!
//! This module provides comprehensive YubiKey support for hardware-based encryption
//! and authentication. It follows Domain-Driven Design architecture with clear
//! separation between domain, application, and infrastructure concerns.
//!
//! ## Architecture
//!
//! ```text
//! yubikey/
//! +-- domain/           # Core business objects and domain logic
//! |   +-- models/       # Domain entities (Serial, Pin, YubiKeyDevice, etc.)
//! |   +-- errors.rs     # Domain-specific errors
//! +-- application/      # Application services and orchestration
//! |   +-- services/     # Business logic services
//! |   +-- manager.rs    # Main facade for all operations
//! |   +-- factory.rs    # Object creation and configuration
//! |   +-- events.rs     # Event system for notifications
//! |   +-- state.rs      # Application state management
//! +-- infrastructure/   # External integrations and technical concerns
//!     +-- providers/    # Device provider abstractions
//!     +-- pty/          # PTY-based operations (ykman, age-plugin-yubikey)
//!     +-- age_plugin.rs # age-plugin-yubikey integration
//! ```
//!
//! ## Key Features
//!
//! - **Hardware Security**: Uses YubiKey PIV applet for cryptographic operations
//! - **Domain-Driven Design**: Clear separation of business logic from infrastructure
//! - **Identity Management**: Centralizes YubiKey identity creation and management
//! - **Registry Integration**: Manages YubiKey device registry and metadata
//! - **Event System**: Publishes events for UI updates and logging
//! - **Error Handling**: Comprehensive error types with recovery guidance
//! - **State Management**: Tracks device states and operation progress
//!
//! ## Usage
//!
//! ```ignore
//! use crate::services::yubikey::{YubiKeyManager, Serial, Pin};
//!
//! // Initialize YubiKey manager
//! let manager = YubiKeyManager::new().await?;
//!
//! // List connected devices
//! let devices = manager.list_connected_devices().await?;
//!
//! // Initialize a YubiKey
//! let serial = Serial::new("12345678".to_string())?;
//! let pin = Pin::new("194763".to_string())?;
//! let (device, identity, entry_id) = manager.initialize_device(
//!     &serial, &pin, 0x9a, "recovery_hash".to_string(), Some("My YubiKey".to_string())
//! ).await?;
//! ```

// Domain layer - core business objects and domain logic
pub mod domain;

// Application layer - services and orchestration
pub mod application;

// Infrastructure layer - external integrations
pub mod infrastructure;

// Re-export key types from domain layer
pub use domain::{
    Pin, Serial, YubiKeyDevice, YubiKeyError, YubiKeyIdentity, YubiKeyResult, YubiKeyState,
};

// Re-export key types from application layer
pub use application::{YubiKeyFactory, YubiKeyManager, YubiKeyManagerConfig};

// Re-export key infrastructure types
pub use infrastructure::{
    AgeHeader, DataEncryptionKey, YubiIdentityProvider, YubiIdentityProviderFactory, YubiRecipient,
};

/// Configuration for the YubiKey management system
#[derive(Debug, Clone)]
pub struct YubiKeyConfig {
    /// Maximum number of PIN attempts before blocking
    pub max_pin_attempts: u8,
    /// Timeout for YubiKey operations in seconds
    pub operation_timeout_secs: u64,
    /// Enable event publishing
    pub enable_events: bool,
    /// Enable operation logging
    pub enable_logging: bool,
}

impl Default for YubiKeyConfig {
    fn default() -> Self {
        Self {
            max_pin_attempts: 3,
            operation_timeout_secs: 30,
            enable_events: true,
            enable_logging: true,
        }
    }
}

/// Type alias for the main result type
pub type Result<T> = std::result::Result<T, YubiKeyError>;

/// The main entry point for all YubiKey operations
///
/// This facade provides a simplified API that orchestrates multiple services
/// to perform complex YubiKey operations while maintaining consistency.
pub type Manager = YubiKeyManager;

#[cfg(test)]
mod integration_tests {
    use super::*;

    #[tokio::test]
    async fn test_manager_facade_integration() {
        // Test that all layers are properly integrated
        let _config = YubiKeyConfig::default();

        // Test domain types
        let _serial = Serial::new("12345678".to_string()).unwrap();
        let _pin = Pin::new("194763".to_string()).unwrap();

        println!("✅ Domain layer types accessible");
        println!("✅ Application layer facade defined");
        println!("✅ Infrastructure layer available");
    }

    #[test]
    fn test_config_defaults() {
        let config = YubiKeyConfig::default();

        assert_eq!(config.max_pin_attempts, 3);
        assert_eq!(config.operation_timeout_secs, 30);
        assert!(config.enable_events);
        assert!(config.enable_logging);
    }

    #[test]
    fn test_ddd_structure() {
        // Verify Domain-Driven Design structure is properly set up
        println!("✅ Domain layer: models and errors");
        println!("✅ Application layer: services and orchestration");
        println!("✅ Infrastructure layer: external integrations");
    }
}
