//! File service for YubiKey temporary file management
//!
//! This service handles temporary file operations needed for YubiKey encryption
//! and decryption workflows, including age-plugin-yubikey file operations.

use crate::prelude::*;
use crate::services::key_management::yubikey::{
    domain::errors::{YubiKeyError, YubiKeyResult},
    domain::models::Serial,
};
use async_trait::async_trait;
use std::io::Write;
use std::path::{Path, PathBuf};
use tempfile::{NamedTempFile, TempDir};
use tokio::fs;

/// File service trait for temporary file operations
#[async_trait]
pub trait FileService: Send + Sync + std::fmt::Debug {
    /// Create a secure temporary directory for YubiKey operations
    async fn create_temp_dir(&self, prefix: &str) -> YubiKeyResult<TempDirectory>;

    /// Create a temporary file for identity or recipient data
    async fn create_temp_file(&self, content: &str, suffix: &str) -> YubiKeyResult<TempFile>;

    /// Write data to a temporary file securely
    async fn write_temp_file(&self, data: &[u8], suffix: &str) -> YubiKeyResult<TempFile>;

    /// Read temporary file contents
    async fn read_temp_file(&self, path: &Path) -> YubiKeyResult<Vec<u8>>;

    /// Create temporary identity file for age-plugin-yubikey
    async fn create_identity_file(
        &self,
        serial: &Serial,
        identity_tag: &str,
    ) -> YubiKeyResult<TempFile>;

    /// Create temporary recipient file for age encryption
    async fn create_recipient_file(&self, recipient: &str) -> YubiKeyResult<TempFile>;

    /// Cleanup temporary files and directories
    async fn cleanup_temp_resources(&self, paths: Vec<PathBuf>) -> YubiKeyResult<()>;
}

/// Temporary directory wrapper with automatic cleanup
#[derive(Debug)]
pub struct TempDirectory {
    /// Inner temporary directory
    pub temp_dir: TempDir,
    /// Additional metadata
    pub prefix: String,
    /// Creation timestamp
    pub created_at: std::time::SystemTime,
}

impl TempDirectory {
    /// Get the path to the temporary directory
    pub fn path(&self) -> &Path {
        self.temp_dir.path()
    }

    /// Get directory prefix
    pub fn prefix(&self) -> &str {
        &self.prefix
    }

    /// Get creation timestamp
    pub fn created_at(&self) -> std::time::SystemTime {
        self.created_at
    }

    /// Create a file within this temporary directory
    pub async fn create_file(&self, name: &str) -> YubiKeyResult<PathBuf> {
        let file_path = self.path().join(name);
        fs::File::create(&file_path)
            .await
            .map_err(|e| YubiKeyError::file(format!("Failed to create temp file: {}", e)))?;
        Ok(file_path)
    }
}

/// Temporary file wrapper with metadata
#[derive(Debug)]
pub struct TempFile {
    /// Path to the temporary file
    pub path: PathBuf,
    /// File suffix/extension
    pub suffix: String,
    /// File size in bytes
    pub size: u64,
    /// Creation timestamp
    pub created_at: std::time::SystemTime,
}

impl TempFile {
    /// Get the path to the temporary file
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Get file suffix
    pub fn suffix(&self) -> &str {
        &self.suffix
    }

    /// Get file size
    pub fn size(&self) -> u64 {
        self.size
    }

    /// Get creation timestamp
    pub fn created_at(&self) -> std::time::SystemTime {
        self.created_at
    }
}

/// Default file service implementation
#[derive(Debug)]
pub struct DefaultFileService {
    /// Base temporary directory for YubiKey operations
    #[allow(dead_code)]
    base_temp_dir: Option<TempDir>,
}

impl DefaultFileService {
    /// Create new file service
    pub fn new() -> YubiKeyResult<Self> {
        Ok(Self {
            base_temp_dir: None,
        })
    }

    /// Initialize base temporary directory if needed
    #[allow(dead_code)]
    async fn ensure_base_temp_dir(&mut self) -> YubiKeyResult<&Path> {
        if self.base_temp_dir.is_none() {
            let temp_dir = TempDir::new().map_err(|e| {
                YubiKeyError::file(format!("Failed to create base temp dir: {}", e))
            })?;

            debug!("Created base temporary directory: {:?}", temp_dir.path());
            self.base_temp_dir = Some(temp_dir);
        }

        Ok(self.base_temp_dir.as_ref().unwrap().path())
    }

    /// Set restrictive permissions on a file (Unix only)
    #[cfg(unix)]
    async fn set_secure_permissions(&self, path: &Path) -> YubiKeyResult<()> {
        use std::os::unix::fs::PermissionsExt;

        let permissions = std::fs::Permissions::from_mode(0o600);
        fs::set_permissions(path, permissions)
            .await
            .map_err(|e| YubiKeyError::file(format!("Failed to set secure permissions: {}", e)))?;

        Ok(())
    }

    /// Set permissions (no-op on non-Unix)
    #[cfg(not(unix))]
    async fn set_secure_permissions(&self, _path: &Path) -> YubiKeyResult<()> {
        Ok(())
    }

    /// Get file size safely
    async fn get_file_size(&self, path: &Path) -> YubiKeyResult<u64> {
        let metadata = fs::metadata(path)
            .await
            .map_err(|e| YubiKeyError::file(format!("Failed to get file metadata: {}", e)))?;

        Ok(metadata.len())
    }
}

#[async_trait]
impl FileService for DefaultFileService {
    async fn create_temp_dir(&self, prefix: &str) -> YubiKeyResult<TempDirectory> {
        debug!("Creating temporary directory with prefix: {}", prefix);

        let temp_dir = TempDir::with_prefix(prefix)
            .map_err(|e| YubiKeyError::file(format!("Failed to create temp directory: {}", e)))?;

        let temp_directory = TempDirectory {
            temp_dir,
            prefix: prefix.to_string(),
            created_at: std::time::SystemTime::now(),
        };

        debug!("Created temporary directory: {:?}", temp_directory.path());
        Ok(temp_directory)
    }

    async fn create_temp_file(&self, content: &str, suffix: &str) -> YubiKeyResult<TempFile> {
        debug!("Creating temporary file with suffix: {}", suffix);

        let mut temp_file = NamedTempFile::with_suffix(suffix)
            .map_err(|e| YubiKeyError::file(format!("Failed to create temp file: {}", e)))?;

        // Write content to file
        temp_file
            .write_all(content.as_bytes())
            .map_err(|e| YubiKeyError::file(format!("Failed to write temp file: {}", e)))?;

        temp_file
            .flush()
            .map_err(|e| YubiKeyError::file(format!("Failed to flush temp file: {}", e)))?;

        let path = temp_file.path().to_path_buf();
        let size = self.get_file_size(&path).await?;

        // Set secure permissions
        self.set_secure_permissions(&path).await?;

        // Keep the temp file alive by persisting it
        let (_, persistent_path) = temp_file
            .keep()
            .map_err(|e| YubiKeyError::file(format!("Failed to persist temp file: {}", e)))?;

        let temp_file_wrapper = TempFile {
            path: persistent_path,
            suffix: suffix.to_string(),
            size,
            created_at: std::time::SystemTime::now(),
        };

        debug!("Created temporary file: {:?}", temp_file_wrapper.path());
        Ok(temp_file_wrapper)
    }

    async fn write_temp_file(&self, data: &[u8], suffix: &str) -> YubiKeyResult<TempFile> {
        debug!(
            "Writing {} bytes to temporary file with suffix: {}",
            data.len(),
            suffix
        );

        let mut temp_file = NamedTempFile::with_suffix(suffix)
            .map_err(|e| YubiKeyError::file(format!("Failed to create temp file: {}", e)))?;

        // Write data to file
        temp_file
            .write_all(data)
            .map_err(|e| YubiKeyError::file(format!("Failed to write temp file: {}", e)))?;

        temp_file
            .flush()
            .map_err(|e| YubiKeyError::file(format!("Failed to flush temp file: {}", e)))?;

        let path = temp_file.path().to_path_buf();

        // Set secure permissions
        self.set_secure_permissions(&path).await?;

        // Keep the temp file alive by persisting it
        let (_, persistent_path) = temp_file
            .keep()
            .map_err(|e| YubiKeyError::file(format!("Failed to persist temp file: {}", e)))?;

        let temp_file_wrapper = TempFile {
            path: persistent_path,
            suffix: suffix.to_string(),
            size: data.len() as u64,
            created_at: std::time::SystemTime::now(),
        };

        debug!(
            "Created temporary file with {} bytes: {:?}",
            data.len(),
            temp_file_wrapper.path()
        );
        Ok(temp_file_wrapper)
    }

    async fn read_temp_file(&self, path: &Path) -> YubiKeyResult<Vec<u8>> {
        debug!("Reading temporary file: {:?}", path);

        let data = fs::read(path)
            .await
            .map_err(|e| YubiKeyError::file(format!("Failed to read temp file: {}", e)))?;

        debug!("Read {} bytes from temporary file", data.len());
        Ok(data)
    }

    async fn create_identity_file(
        &self,
        serial: &Serial,
        identity_tag: &str,
    ) -> YubiKeyResult<TempFile> {
        debug!("Creating identity file for YubiKey: {}", serial.redacted());

        // Create identity file content in the format expected by age-plugin-yubikey
        let identity_content = format!(
            "# YubiKey identity for serial {}\n{}\n",
            serial.redacted(),
            identity_tag
        );

        let temp_file = self.create_temp_file(&identity_content, ".txt").await?;

        debug!("Created identity file: {:?}", temp_file.path());
        Ok(temp_file)
    }

    async fn create_recipient_file(&self, recipient: &str) -> YubiKeyResult<TempFile> {
        debug!("Creating recipient file");

        // Create recipient file content
        let recipient_content = format!("{}\n", recipient);

        let temp_file = self.create_temp_file(&recipient_content, ".txt").await?;

        debug!("Created recipient file: {:?}", temp_file.path());
        Ok(temp_file)
    }

    async fn cleanup_temp_resources(&self, paths: Vec<PathBuf>) -> YubiKeyResult<()> {
        debug!("Cleaning up {} temporary resources", paths.len());

        let mut cleanup_errors = Vec::new();

        for path in paths {
            debug!("Cleaning up: {:?}", path);

            // Try to remove file/directory
            let result = if path.is_dir() {
                fs::remove_dir_all(&path).await
            } else {
                fs::remove_file(&path).await
            };

            if let Err(e) = result {
                warn!("Failed to cleanup temp resource {:?}: {}", path, e);
                cleanup_errors.push(format!("{:?}: {}", path, e));
            }
        }

        if !cleanup_errors.is_empty() {
            return Err(YubiKeyError::file(format!(
                "Failed to cleanup {} temp resources: {}",
                cleanup_errors.len(),
                cleanup_errors.join(", ")
            )));
        }

        Ok(())
    }
}

// Implement Drop for automatic cleanup
impl Drop for TempFile {
    fn drop(&mut self) {
        if self.path.exists() {
            if let Err(e) = std::fs::remove_file(&self.path) {
                warn!("Failed to cleanup temp file {:?}: {}", self.path, e);
            } else {
                debug!("Automatically cleaned up temp file: {:?}", self.path);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_file_service_creation() {
        let service = DefaultFileService::new().unwrap();
        assert!(!format!("{:?}", service).is_empty());
    }

    #[tokio::test]
    async fn test_create_temp_dir() {
        let service = DefaultFileService::new().unwrap();
        let temp_dir = service.create_temp_dir("yubikey_test").await.unwrap();

        assert!(temp_dir.path().exists());
        assert!(temp_dir.path().is_dir());
        assert_eq!(temp_dir.prefix(), "yubikey_test");
    }

    #[tokio::test]
    async fn test_create_temp_file() {
        let service = DefaultFileService::new().unwrap();
        let temp_file = service
            .create_temp_file("test content", ".txt")
            .await
            .unwrap();

        assert!(temp_file.path().exists());
        assert_eq!(temp_file.suffix(), ".txt");
        assert!(temp_file.size() > 0);
    }

    #[tokio::test]
    async fn test_write_and_read_temp_file() {
        let service = DefaultFileService::new().unwrap();
        let test_data = b"test data for yubikey";

        let temp_file = service.write_temp_file(test_data, ".bin").await.unwrap();
        let read_data = service.read_temp_file(temp_file.path()).await.unwrap();

        assert_eq!(test_data, &read_data[..]);
        assert_eq!(temp_file.size(), test_data.len() as u64);
    }

    #[tokio::test]
    async fn test_create_identity_file() {
        let service = DefaultFileService::new().unwrap();
        let serial = Serial::new("12345678".to_string()).unwrap();
        let identity_tag = "age1yubikey1test123";

        let identity_file = service
            .create_identity_file(&serial, identity_tag)
            .await
            .unwrap();
        let content = service.read_temp_file(identity_file.path()).await.unwrap();
        let content_str = String::from_utf8(content).unwrap();

        assert!(content_str.contains(identity_tag));
        assert!(content_str.contains("YubiKey identity"));
    }

    #[tokio::test]
    async fn test_create_recipient_file() {
        let service = DefaultFileService::new().unwrap();
        let recipient = "age1yubikey1recipient123";

        let recipient_file = service.create_recipient_file(recipient).await.unwrap();
        let content = service.read_temp_file(recipient_file.path()).await.unwrap();
        let content_str = String::from_utf8(content).unwrap();

        assert!(content_str.contains(recipient));
    }

    #[tokio::test]
    async fn test_cleanup_temp_resources() {
        let service = DefaultFileService::new().unwrap();
        let temp_file1 = service.create_temp_file("test1", ".txt").await.unwrap();
        let temp_file2 = service.create_temp_file("test2", ".txt").await.unwrap();

        let paths = vec![
            temp_file1.path().to_path_buf(),
            temp_file2.path().to_path_buf(),
        ];

        // Files should exist
        assert!(paths[0].exists());
        assert!(paths[1].exists());

        // Cleanup
        service.cleanup_temp_resources(paths.clone()).await.unwrap();

        // Files should be gone
        assert!(!paths[0].exists());
        assert!(!paths[1].exists());
    }
}
