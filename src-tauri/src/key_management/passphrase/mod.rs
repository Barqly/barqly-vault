//! Passphrase Key Management Module
//!
//! Following Domain-Driven Design (DDD) architecture:
//! - domain: Pure business logic (validation rules, models, errors)
//! - application: Use cases and orchestration (services, manager)
//! - infrastructure: External integrations (key derivation, storage)

pub mod application;
pub mod domain;
pub mod infrastructure;

pub mod events;
pub mod models;
pub mod services;
pub mod state;

pub use application::{
    GeneratedKey, GenerationError, PassphraseManager, ValidationError, VaultIntegrationError,
};
pub use domain::{calculate_strength_score, PassphraseError, PassphraseStrength, ValidationResult};
pub use infrastructure::{
    decrypt_private_key, encrypt_private_key, generate_keypair, PassphraseKeyRepository,
    StorageError,
};
