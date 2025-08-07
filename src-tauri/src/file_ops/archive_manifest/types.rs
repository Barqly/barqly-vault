//! Data structures for archive manifest
//!
//! This module defines the core types used for archive manifest creation
//! and verification.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Manifest file containing metadata about archived files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Manifest {
    /// Manifest version
    pub version: String,
    /// Creation timestamp
    pub created: DateTime<Utc>,
    /// Archive information
    pub archive: ArchiveManifest,
    /// List of files in the archive
    pub files: Vec<FileManifestEntry>,
    /// Manifest hash for integrity verification
    pub manifest_hash: String,
}

/// Archive metadata in manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchiveManifest {
    /// Archive file path
    pub archive_path: PathBuf,
    /// Archive file size in bytes
    pub archive_size: u64,
    /// Archive SHA-256 hash
    pub archive_hash: String,
    /// Total uncompressed size
    pub total_uncompressed_size: u64,
    /// Number of files
    pub file_count: usize,
    /// Compression type
    pub compression: String,
    /// Archive format
    pub format: String,
}

/// File entry in manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileManifestEntry {
    /// File path relative to archive root
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
