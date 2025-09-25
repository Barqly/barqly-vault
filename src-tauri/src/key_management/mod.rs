//! Centralized Key Management System
//!
//! This module provides a unified architecture for managing all types of cryptographic keys
//! used in the vault system. It consolidates key operations, state management, and security
//! policies under a single, cohesive API.
//!
//! ## Architecture Overview
//!
//! The key management system follows Domain-Driven Design principles with the following structure:
//!
//! ```
//! key_management/
//! ├── yubikey/           # YubiKey hardware security module
//! │   ├── models/        # Domain objects (Serial, Pin, YubiKeyDevice, etc.)
//! │   ├── services/      # Business logic (DeviceService, IdentityService, etc.)
//! │   ├── state/         # State management and caching
//! │   └── events/        # Event system for key operations
//! ├── passphrase/        # Passphrase-based key management
//! │   ├── models/        # Domain objects (PassphraseKey, Strength, etc.)
//! │   ├── services/      # Business logic (ValidationService, DerivationService, etc.)
//! │   ├── state/         # State management and caching
//! │   └── events/        # Event system for passphrase operations
//! └── common/            # Shared abstractions and utilities
//!     ├── traits/        # Common interfaces (KeyProvider, KeyValidator, etc.)
//!     ├── security/      # Security policies and validation
//!     └── registry/      # Unified key registry and lifecycle management
//! ```
//!
//! ## Key Features
//!
//! - **Unified Key Registry**: Single source of truth for all registered keys
//! - **Type Safety**: Strong typing prevents key type confusion and security bugs
//! - **Secure State Management**: Centralized state with automatic cleanup and security policies
//! - **Event-Driven Architecture**: Reactive system for key lifecycle events
//! - **Multi-Provider Support**: Extensible architecture for future key types
//! - **Security First**: Built-in security validations and audit trails
//!
//! ## Usage
//!
//! ```rust
//! use crate::key_management::{KeyManager, KeyType};
//!
//! // Get unified key manager
//! let key_manager = KeyManager::new().await?;
//!
//! // List all registered keys regardless of type
//! let keys = key_manager.list_keys().await?;
//!
//! // Get keys by type
//! let yubikeys = key_manager.get_keys_by_type(KeyType::YubiKey).await?;
//! let passphrases = key_manager.get_keys_by_type(KeyType::Passphrase).await?;
//! ```

pub mod passphrase;
pub mod shared;
pub mod yubikey; // Shared device abstractions and traits

// TODO: Implement common abstractions after passphrase refactoring is complete
// pub mod common;

// Re-export main types for convenience
pub use yubikey::{
    Pin, Serial, YubiKeyDevice, YubiKeyError, YubiKeyIdentity, YubiKeyManager, YubiKeyResult,
    YubiKeyState,
};

// TODO: Add passphrase re-exports after implementation
// pub use passphrase::{PassphraseManager, PassphraseKey, PassphraseError};

/// Key management system version for compatibility tracking
pub const KEY_MANAGEMENT_VERSION: &str = "1.0.0";

/// Supported key types in the unified system
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub enum KeyType {
    /// Hardware YubiKey PIV authentication
    YubiKey,
    /// Passphrase-derived key encryption
    Passphrase,
    // Future key types can be added here:
    // Fido2,
    // SmartCard,
    // BiometricKey,
}

/// Key management errors
#[derive(Debug, thiserror::Error)]
pub enum KeyManagementError {
    #[error("YubiKey operation failed: {0}")]
    YubiKey(#[from] YubiKeyError),

    // TODO: Add after passphrase refactoring
    // #[error("Passphrase operation failed: {0}")]
    // Passphrase(#[from] PassphraseError),
    #[error("Key type not supported: {key_type:?}")]
    UnsupportedKeyType { key_type: KeyType },

    #[error("Key registry error: {message}")]
    Registry { message: String },
}

pub type KeyManagementResult<T> = Result<T, KeyManagementError>;
