//! Shared Infrastructure
//!
//! Cross-domain infrastructure utilities used by multiple service domains.
//! Contains technical implementations that don't belong to any single domain.

pub mod caching;
pub mod device_identity;
pub mod error;
pub mod io;
pub mod path_management;
pub mod progress;

// Re-export caching
pub use caching::{CacheMetrics, StorageCache, get_cache};

// Re-export device identity
pub use device_identity::DeviceInfo;

// Re-export path management
pub use path_management::{
    SanitizedVaultName, get_app_dir, get_config_dir, get_key_file_path, get_key_metadata_path,
    get_keys_dir, get_logs_dir, get_vault_manifest_path, get_vaults_directory, sanitize_vault_name,
    validate_vault_name,
};

// Re-export error handling
pub use error::ErrorHandler;

// Re-export I/O utilities
pub use io::{atomic_write, atomic_write_sync};

// Re-export progress tracking
pub use progress::{
    ENCRYPTION_IN_PROGRESS, PROGRESS_TRACKER, ProgressManager, get_global_progress,
    update_global_progress,
};
