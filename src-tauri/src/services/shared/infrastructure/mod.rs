//! Shared Infrastructure
//!
//! Cross-domain infrastructure utilities used by multiple service domains.
//! Contains technical implementations that don't belong to any single domain.

pub mod caching;
pub mod error;
pub mod path_management;
pub mod progress;

// Re-export caching
pub use caching::{CacheMetrics, StorageCache, get_cache};

// Re-export path management
pub use path_management::{
    get_app_dir, get_config_dir, get_key_file_path, get_key_metadata_path, get_keys_dir,
    get_logs_dir, get_vault_manifest_path, get_vaults_directory, validate_vault_name,
};

// Re-export error handling
pub use error::ErrorHandler;

// Re-export progress tracking
pub use progress::{
    ENCRYPTION_IN_PROGRESS, PROGRESS_TRACKER, ProgressManager, get_global_progress,
    update_global_progress,
};
