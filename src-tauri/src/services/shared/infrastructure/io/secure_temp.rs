//! Secure temporary file handling with proper cleanup
//!
//! Provides secure temporary files with restrictive permissions and
//! secure deletion (overwrite before unlink).

use crate::error::StorageError;
use std::fs::{File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use tempfile::NamedTempFile;
use tracing::{debug, info};

/// Secure temporary file with automatic cleanup
///
/// Creates temp file with 0600 permissions (owner-only).
/// Provides secure_delete() for overwriting before deletion.
pub struct SecureTempFile {
    inner: Option<NamedTempFile>,
    path: PathBuf,
}

impl SecureTempFile {
    /// Create a new secure temporary file with restrictive permissions
    pub fn new() -> Result<Self, StorageError> {
        let temp_file = NamedTempFile::new().map_err(|e| StorageError::FileWriteFailed {
            path: PathBuf::from("/tmp"),
            source: e,
        })?;

        let path = temp_file.path().to_path_buf();

        // Set restrictive permissions (owner-only read/write)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&path)
                .map_err(|e| StorageError::FileReadFailed {
                    path: path.clone(),
                    source: e,
                })?
                .permissions();
            perms.set_mode(0o600);
            std::fs::set_permissions(&path, perms).map_err(|e| StorageError::FileWriteFailed {
                path: path.clone(),
                source: e,
            })?;
        }

        debug!(path = %path.display(), "Created secure temp file with 0600 permissions");

        Ok(Self {
            inner: Some(temp_file),
            path,
        })
    }

    /// Get the path to the temporary file
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Securely delete the temporary file
    ///
    /// Overwrites with zeros, syncs to disk, then deletes.
    /// Prevents forensic recovery of sensitive data.
    pub fn secure_delete(mut self) -> Result<(), StorageError> {
        if let Some(temp) = self.inner.take() {
            let path = temp.path().to_path_buf();

            info!(path = %path.display(), "Securely deleting temp file");

            // Get file size
            let metadata = std::fs::metadata(&path).map_err(|e| StorageError::FileReadFailed {
                path: path.clone(),
                source: e,
            })?;
            let file_size = metadata.len();

            // Close the NamedTempFile to release handle
            let (_, temp_path) = temp.keep().map_err(|e| StorageError::FileWriteFailed {
                path: path.clone(),
                source: e.error,
            })?;

            // Overwrite with zeros
            let mut file = OpenOptions::new()
                .write(true)
                .open(&temp_path)
                .map_err(|e| StorageError::FileWriteFailed {
                    path: temp_path.clone(),
                    source: e,
                })?;

            let zero_buffer = vec![0u8; 8192];
            let mut written = 0u64;

            while written < file_size {
                let to_write = std::cmp::min(zero_buffer.len() as u64, file_size - written);
                file.write_all(&zero_buffer[..to_write as usize])
                    .map_err(|e| StorageError::FileWriteFailed {
                        path: temp_path.clone(),
                        source: e,
                    })?;
                written += to_write;
            }

            // Force sync to disk
            file.sync_all().map_err(|e| StorageError::FileWriteFailed {
                path: temp_path.clone(),
                source: e,
            })?;

            drop(file);

            // Delete file
            std::fs::remove_file(&temp_path).map_err(|e| StorageError::FileWriteFailed {
                path: temp_path.clone(),
                source: e,
            })?;

            debug!(path = %temp_path.display(), size = file_size, "Secure deletion completed");
        }

        Ok(())
    }
}

impl Drop for SecureTempFile {
    fn drop(&mut self) {
        // Normal cleanup if secure_delete wasn't called
        if let Some(temp) = self.inner.take() {
            debug!("SecureTempFile dropped, auto-cleanup via NamedTempFile");
            drop(temp); // NamedTempFile auto-deletes
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_secure_temp_file_creation() {
        let temp = SecureTempFile::new().unwrap();
        assert!(temp.path().exists());
    }

    #[test]
    fn test_secure_deletion() {
        let temp = SecureTempFile::new().unwrap();
        let path = temp.path().to_path_buf();

        // Write some data
        std::fs::write(&path, b"sensitive data").unwrap();
        assert!(path.exists());

        // Secure delete
        temp.secure_delete().unwrap();
        assert!(!path.exists());
    }
}
