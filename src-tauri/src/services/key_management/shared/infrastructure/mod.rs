//! Infrastructure layer for shared key management
//!
//! Contains technical implementations for key registry persistence and related operations.

pub mod key_storage;
pub mod registry_persistence;

// Re-export key types for backward compatibility and convenience
pub use registry_persistence::{KeyEntry, KeyRegistry, generate_recovery_code};

// Re-export key storage functions (replacing storage::key_store)
pub use key_storage::{
    KeyInfo, delete_key, get_key_info, key_exists, list_keys, load_encrypted_key,
    save_encrypted_key, save_encrypted_key_with_metadata, save_yubikey_metadata,
};
