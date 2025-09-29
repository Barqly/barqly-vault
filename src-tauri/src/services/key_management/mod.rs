//! Key Management Service Layer
//!
//! This module provides a unified architecture for managing all types of cryptographic keys
//! used in the vault system. It consolidates key operations, state management, and security
//! policies under a single, cohesive API.
//!
//! Structure:
//! - passphrase/ - Passphrase-based key management DDD layer
//! - yubikey/ - YubiKey hardware security module DDD layer
//! - shared/ - Common abstractions and utilities

pub mod passphrase;
pub mod shared;
pub mod yubikey;

// Re-export main types for convenience
pub use yubikey::{
    Pin, Serial, YubiKeyDevice, YubiKeyError, YubiKeyIdentity, YubiKeyManager, YubiKeyResult,
    YubiKeyState,
};

// Re-export passphrase types
pub use passphrase::{PassphraseError, PassphraseManager};

/// Key management system version for compatibility tracking
pub const KEY_MANAGEMENT_VERSION: &str = "1.0.0";
