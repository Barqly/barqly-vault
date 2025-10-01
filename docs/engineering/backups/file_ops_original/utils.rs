//! Common utilities for file operations
//!
//! This module provides shared utility functions used across
//! different file operation modules.

use crate::constants::IO_BUFFER_SIZE;
use crate::file_ops::{FileOpsError, Result};
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
