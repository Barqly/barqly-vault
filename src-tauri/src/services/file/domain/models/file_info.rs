//! File information model

use serde::Serialize;

/// File information
#[derive(Debug, Serialize, specta::Type)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_file: bool,
    pub is_directory: bool,
    pub file_count: Option<usize>, // For directories, the number of files inside
}
