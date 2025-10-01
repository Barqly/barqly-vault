//! File operations commands for file selection and manifest creation
//!
//! This module provides Tauri commands that expose the file_ops module
//! functionality to the frontend with proper validation and error handling.
//!
//! ## Commands
//!
//! - `select_files` - Open file/folder selection dialog
//! - `select_directory` - Open directory selection dialog
//! - `get_file_info` - Get information about files/folders
//! - `create_manifest` - Create manifest for file set

mod manifest;
mod selection;

// Re-export all public commands
pub use manifest::create_manifest;
pub use selection::{get_file_info, select_directory, select_files};

// Re-export data types
pub use selection::{FileInfo, FileSelection, SelectionType};

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
