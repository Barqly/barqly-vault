//! # File Operations Module
//!
//! Provides secure file and folder operations for encryption workflows.
//!
//! ## Security Considerations
//! - Path validation prevents directory traversal attacks
//! - Staging area uses secure temporary directories
//! - All operations are atomic where possible
//! - File permissions are preserved during operations
//!
//! ## Example
//! ```no_run
//! use barqly_vault_lib::services::file::infrastructure::file_operations;
//! use std::path::Path;
//!
//! let selection = file_operations::FileSelection::Files(vec!["/path/to/file1.txt".into()]);
//! let output_path = Path::new("/output/dir/archive.tar.gz");
//! let config = file_operations::FileOpsConfig::default();
//! let archive = file_operations::create_archive(&selection, output_path, &config).unwrap();
//! ```

pub mod archive_manifest;
pub mod archive_operations;
pub mod errors;
pub mod external_manifest;
pub mod selection;
pub mod staging;
pub mod utils;
pub mod validation;

use crate::constants::*;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

pub use archive_manifest::{Manifest, verify_manifest};
pub use archive_operations::{create_archive, create_archive_with_file_info, extract_archive};
pub use errors::FileOpsError;
pub use external_manifest::{
    ExternalManifest, create_external_manifest_for_archive, generate_external_manifest_path,
};
pub use selection::{FileSelection, SelectionType};
pub use staging::StagingArea;
pub use utils::{read_archive_with_size_check, collect_files_with_metadata, CollectedFile};
pub use validation::{
    contains_traversal_attempt, validate_and_create_output_directory, validate_file_size,
    validate_paths,
};

/// Result type for file operations
pub type Result<T> = std::result::Result<T, FileOpsError>;

/// Progress callback for long-running operations
pub type ProgressCallback = Box<dyn Fn(u64, u64) + Send + Sync>;

/// Configuration for file operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOpsConfig {
    /// Maximum file size in bytes (soft limit with warnings)
    pub max_file_size: u64,
    /// Maximum total archive size in bytes
    pub max_archive_size: u64,
    /// Whether to preserve file permissions
    pub preserve_permissions: bool,
    /// Compression level (1-9, higher = smaller but slower)
    pub compression_level: u32,
}

impl Default for FileOpsConfig {
    fn default() -> Self {
        Self {
            max_file_size: MAX_FILE_SIZE,
            max_archive_size: MAX_TOTAL_ARCHIVE_SIZE,
            preserve_permissions: true,
            compression_level: 6,
        }
    }
}

/// Information about a file operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    /// File path
    pub path: PathBuf,
    /// File size in bytes
    pub size: u64,
    /// File modification time
    pub modified: DateTime<Utc>,
    /// SHA-256 hash of file contents
    pub hash: String,
    /// File permissions (Unix only)
    #[cfg(unix)]
    pub permissions: u32,
}

/// Information about an archive
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveInfo {
    /// Compressed size in bytes
    pub compressed_size: u64,
    /// Uncompressed size in bytes
    pub uncompressed_size: u64,
    /// Number of files in archive
    pub file_count: usize,
    /// Archive SHA-256 hash
    pub archive_hash: String,
}

/// Information about an archive operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveOperation {
    /// Archive file path
    pub archive_path: PathBuf,
    /// Manifest file path (if external)
    pub manifest_path: Option<PathBuf>,
    /// Total size of archive
    pub total_size: u64,
    /// Number of files in archive
    pub file_count: usize,
    /// Creation timestamp
    pub created: DateTime<Utc>,
    /// Archive hash for integrity verification
    pub archive_hash: String,
}

// Re-export main functions for convenience
pub use archive_manifest::create_manifest_for_archive;
pub use archive_operations::create_archive_with_progress;
pub use selection::validate_selection;
pub use staging::create_staging_area;
