//! Manifest model for encrypted archives

use super::FileInfo;
use serde::Serialize;

/// Manifest for encrypted archives
#[derive(Debug, Serialize, specta::Type)]
pub struct Manifest {
    pub version: String,
    pub created_at: String,
    pub files: Vec<FileInfo>,
    pub total_size: u64,
    pub file_count: usize,
}
