//! Shared Services Module
//!
//! Contains cross-domain shared infrastructure and utilities.

pub mod infrastructure;

pub use infrastructure::{
    CacheMetrics, StorageCache, get_app_dir, get_cache, get_config_dir, get_key_file_path,
    get_key_metadata_path, get_keys_dir, get_logs_dir, get_vaults_directory, validate_vault_name,
};

// Re-export key management shared functions for convenience
pub use crate::services::key_management::shared::{delete_key, list_keys};
