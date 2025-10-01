//! Common utilities for file operations
//!
//! This module provides shared utility functions used across
//! different file operation modules.

use super::{FileOpsError, Result};
use crate::constants::IO_BUFFER_SIZE;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

/// Calculate SHA-256 hash of a file
pub fn calculate_file_hash(path: &Path) -> Result<String> {
    debug_assert!(
        !path.as_os_str().is_empty(),
        "Path cannot be empty for hash calculation"
    );

    let mut file = File::open(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; IO_BUFFER_SIZE];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| FileOpsError::HashCalculationFailed {
                message: format!("Failed to read file: {e}"),
            })?;

        if n == 0 {
            break;
        }

        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

/// Read archive file with size validation to prevent memory exhaustion
///
/// This is the canonical method for safely reading archives.
/// Validates file size before reading to prevent memory exhaustion attacks.
pub fn read_archive_with_size_check(path: &Path, max_size: u64) -> Result<Vec<u8>> {
    // Check file size before reading
    let metadata = std::fs::metadata(path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to get file metadata for {}", path.display()),
        source: e,
    })?;

    if metadata.len() > max_size {
        return Err(FileOpsError::ArchiveTooLarge {
            size: metadata.len(),
            max: max_size,
        });
    }

    // Read file
    std::fs::read(path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to read archive file: {}", path.display()),
        source: e,
    })
}
