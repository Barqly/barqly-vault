//! File size validation utilities

use super::super::{FileOpsError, Result};
use crate::constants::*;
use std::path::Path;
use tracing::warn;

/// Validate file size against maximum allowed size
pub fn validate_file_size(path: &Path, max_size: u64) -> Result<()> {
    let metadata = std::fs::metadata(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let file_size = metadata.len();

    if file_size > max_size {
        return Err(FileOpsError::FileTooLarge {
            path: path.to_path_buf(),
            size: file_size,
            max: max_size,
        });
    }

    // Warn if file is large but still within limits
    if file_size > max_size / 2 {
        warn!(
            "Large file detected: {} ({:.1} MB)",
            path.display(),
            file_size as f64 / BYTES_PER_MB_F64
        );
    }

    Ok(())
}
