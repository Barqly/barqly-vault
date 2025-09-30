//! DEPRECATED: This module has been moved to services::key_management::shared::infrastructure::key_storage
//!
//! All functionality now provided by key_management domain infrastructure.
//! This module only exists for backward compatibility during migration.

// Re-export everything from new location
pub use crate::services::key_management::shared::infrastructure::key_storage::{
    KeyInfo, delete_key, get_key_info, key_exists, list_keys, load_encrypted_key,
    save_encrypted_key, save_encrypted_key_with_metadata, save_yubikey_metadata,
};
