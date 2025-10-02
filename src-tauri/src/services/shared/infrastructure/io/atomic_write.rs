//! Atomic file write operations
//!
//! Provides safe, atomic file writing using the write-rename pattern to prevent
//! data corruption if the process crashes mid-write.

use std::path::Path;
use tokio::fs as async_fs;
use tokio::io::AsyncWriteExt;

/// Atomically write data to a file using the write-rename pattern
///
/// This function ensures atomic writes by:
/// 1. Writing data to a temporary file
/// 2. Syncing the temp file to disk (ensures durability)
/// 3. Atomically renaming the temp file to the target path
///
/// If the process crashes during steps 1-2, the original file remains untouched.
/// The rename operation (step 3) is atomic on POSIX systems, ensuring the file
/// is never partially written.
///
/// # Arguments
/// * `path` - The target file path
/// * `data` - The data to write
///
/// # Returns
/// * `Ok(())` on success
/// * `Err` if any I/O operation fails
pub async fn atomic_write(
    path: &Path,
    data: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Create temp file path with .tmp extension
    let temp_path = path.with_extension("tmp");

    // Write to temp file
    let mut file = async_fs::File::create(&temp_path).await?;
    file.write_all(data).await?;

    // Sync to disk (ensures durability - data is physically written)
    file.sync_all().await?;

    // Close file before rename
    drop(file);

    // Atomic rename (POSIX guarantees atomicity)
    async_fs::rename(&temp_path, path).await?;

    Ok(())
}

/// Synchronous version of atomic_write for non-async contexts
///
/// See `atomic_write` for details on the atomic write pattern.
pub fn atomic_write_sync(
    path: &Path,
    data: &[u8],
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use std::fs;
    use std::io::Write;

    // Create temp file path with .tmp extension
    let temp_path = path.with_extension("tmp");

    // Write to temp file
    let mut file = fs::File::create(&temp_path)?;
    file.write_all(data)?;

    // Sync to disk (ensures durability)
    file.sync_all()?;

    // Close file before rename
    drop(file);

    // Atomic rename
    fs::rename(&temp_path, path)?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_atomic_write_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.json");

        let data = b"{\"test\": \"data\"}";
        atomic_write(&file_path, data).await.unwrap();

        assert!(file_path.exists());
        let content = async_fs::read(&file_path).await.unwrap();
        assert_eq!(content, data);
    }

    #[tokio::test]
    async fn test_atomic_write_overwrites_existing() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.json");

        // Write initial data
        let data1 = b"initial";
        atomic_write(&file_path, data1).await.unwrap();

        // Overwrite with new data
        let data2 = b"updated";
        atomic_write(&file_path, data2).await.unwrap();

        let content = async_fs::read(&file_path).await.unwrap();
        assert_eq!(content, data2);
    }

    #[tokio::test]
    async fn test_atomic_write_no_temp_file_left_behind() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.json");

        let data = b"{\"test\": \"data\"}";
        atomic_write(&file_path, data).await.unwrap();

        // Verify temp file doesn't exist
        let temp_path = file_path.with_extension("tmp");
        assert!(!temp_path.exists());
    }

    #[test]
    fn test_atomic_write_sync_creates_file() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("test.json");

        let data = b"{\"test\": \"data\"}";
        atomic_write_sync(&file_path, data).unwrap();

        assert!(file_path.exists());
        let content = std::fs::read(&file_path).unwrap();
        assert_eq!(content, data);
    }
}
