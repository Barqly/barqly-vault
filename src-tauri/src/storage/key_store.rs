//! Key storage operations for Barqly Vault.
//!
//! This module handles the storage, retrieval, and management of encrypted keys
//! with associated metadata. Includes LRU caching for improved performance.

use crate::storage::cache::get_cache;
use crate::storage::errors::StorageError;
use crate::storage::paths::{get_key_file_path, get_key_metadata_path};
use chrono::{DateTime, Utc};
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Information about a stored key
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct KeyInfo {
    /// User-friendly label for the key
    pub label: String,
    /// When the key was created
    pub created_at: DateTime<Utc>,
    /// Path to the encrypted key file
    pub file_path: PathBuf,
    /// Optional cached public key for performance
    pub public_key: Option<String>,
    /// Last time the key was accessed
    pub last_accessed: Option<DateTime<Utc>>,
}

impl KeyInfo {
    /// Create a new KeyInfo instance
    pub fn new(label: String, file_path: PathBuf, public_key: Option<String>) -> Self {
        Self {
            label,
            created_at: Utc::now(),
            file_path,
            public_key,
            last_accessed: None,
        }
    }

    /// Update the last accessed time
    pub fn mark_accessed(&mut self) {
        self.last_accessed = Some(Utc::now());
    }
}

/// Save an encrypted private key
///
/// # Arguments
/// * `label` - User-friendly label for the key
/// * `encrypted_key` - The encrypted key bytes
/// * `public_key` - Optional public key to cache
///
/// # Returns
/// Path where the key was saved
///
/// # Security
/// - Validates label doesn't contain path separators
/// - Sets restrictive file permissions (600 on Unix)
/// - Creates metadata file with key information
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyAlreadyExists` if a key with this label already exists
/// - `StorageError::IoError` if file operations fail
pub fn save_encrypted_key(
    label: &str,
    encrypted_key: &[u8],
    public_key: Option<&str>,
) -> Result<PathBuf, StorageError> {
    // Get the key file path
    let key_path = get_key_file_path(label)?;

    // Check if key already exists
    if key_path.exists() {
        return Err(StorageError::KeyAlreadyExists(label.to_string()));
    }

    // Write the encrypted key to file
    fs::write(&key_path, encrypted_key).map_err(StorageError::IoError)?;

    // Set restrictive permissions on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&key_path)
            .map_err(StorageError::IoError)?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&key_path, perms).map_err(StorageError::IoError)?;
    }

    // Create metadata file
    let metadata = KeyInfo::new(
        label.to_string(),
        key_path.clone(),
        public_key.map(|s| s.to_string()),
    );

    let meta_path = get_key_metadata_path(label)?;
    let metadata_json =
        serde_json::to_string_pretty(&metadata).map_err(StorageError::SerializationError)?;

    fs::write(&meta_path, metadata_json).map_err(StorageError::IoError)?;

    // Set restrictive permissions on metadata file too
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&meta_path)
            .map_err(StorageError::IoError)?
            .permissions();
        perms.set_mode(0o600);
        fs::set_permissions(&meta_path, perms).map_err(StorageError::IoError)?;
    }

    // Invalidate key list cache since we added a new key
    let cache = get_cache();
    cache.invalidate_key_list();

    Ok(key_path)
}

/// List all available keys
///
/// # Returns
/// Vector of KeyInfo for all stored keys, sorted by creation time (newest first)
///
/// # Performance
/// This function uses LRU caching to improve performance for repeated calls.
/// Cache entries are valid for 5 minutes and automatically invalidated when keys are modified.
///
/// # Errors
/// - `StorageError::IoError` if directory operations fail
/// - `StorageError::InvalidMetadata` if metadata files are corrupted
pub fn list_keys() -> Result<Vec<KeyInfo>, StorageError> {
    use crate::storage::paths::get_keys_dir;

    // Generate cache key based on keys directory path for cache isolation
    let keys_dir = get_keys_dir()?;
    let cache_key = format!("key_list_{}", keys_dir.to_string_lossy());

    // Try to get from cache first
    let cache = get_cache();
    if let Some(cached_keys) = cache.get_key_list(&cache_key) {
        return Ok(cached_keys);
    }

    // Cache miss - perform directory scan
    let mut keys = Vec::new();

    // Read all metadata files
    for entry in fs::read_dir(&keys_dir).map_err(StorageError::IoError)? {
        let entry = entry.map_err(StorageError::IoError)?;
        let path = entry.path();

        // Only process metadata files
        if let Some(extension) = path.extension() {
            if extension == "meta" {
                if let Ok(metadata_content) = fs::read_to_string(&path) {
                    if let Ok(key_info) = serde_json::from_str::<KeyInfo>(&metadata_content) {
                        // Verify the key file still exists
                        if key_info.file_path.exists() {
                            keys.push(key_info);
                        }
                    }
                }
            }
        }
    }

    // Sort by creation time (newest first)
    keys.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    // Cache the result for future calls
    cache.cache_key_list(cache_key, keys.clone());

    Ok(keys)
}

/// Load an encrypted key by label
///
/// # Arguments
/// * `label` - The label of the key to load
///
/// # Returns
/// The encrypted key bytes
///
/// # Security
/// - Validates file hasn't been tampered with (basic check)
/// - Checks file permissions before reading
/// - Updates last accessed time in metadata
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyNotFound` if the key doesn't exist
/// - `StorageError::IoError` if file operations fail
/// - `StorageError::FileCorruption` if the file appears corrupted
pub fn load_encrypted_key(label: &str) -> Result<Vec<u8>, StorageError> {
    debug_assert!(!label.is_empty(), "Key label cannot be empty");

    let key_path = get_key_file_path(label)?;

    // Check if key file exists
    if !key_path.exists() {
        return Err(StorageError::KeyNotFound(label.to_string()));
    }

    // Check file permissions on Unix systems
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let metadata = fs::metadata(&key_path).map_err(StorageError::IoError)?;
        let mode = metadata.permissions().mode();

        // Check if permissions are too permissive (should be 600)
        if mode & 0o777 != 0o600 {
            return Err(StorageError::FileCorruption(format!(
                "Key file has unsafe permissions: {mode:o}"
            )));
        }
    }

    // Read the encrypted key
    let encrypted_key = fs::read(&key_path).map_err(StorageError::IoError)?;

    // Update last accessed time in metadata
    update_key_metadata_access_time(label)?;

    Ok(encrypted_key)
}

/// Delete a key by label
///
/// # Arguments
/// * `label` - The label of the key to delete
///
/// # Security
/// - Overwrites file with random data before deletion (best effort)
/// - Deletes both key file and metadata file
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyNotFound` if the key doesn't exist
/// - `StorageError::IoError` if file operations fail
pub fn delete_key(label: &str) -> Result<(), StorageError> {
    debug_assert!(!label.is_empty(), "Key label cannot be empty");

    let key_path = get_key_file_path(label)?;
    let meta_path = get_key_metadata_path(label)?;

    // Check if key exists
    if !key_path.exists() {
        return Err(StorageError::KeyNotFound(label.to_string()));
    }

    // Overwrite key file with random data before deletion
    if let Ok(metadata) = fs::metadata(&key_path) {
        let file_size = metadata.len() as usize;
        let mut rng = rand::thread_rng();
        let random_data: Vec<u8> = (0..file_size).map(|_| rng.gen()).collect();

        // Try to overwrite (ignore errors as this is best effort)
        let _ = fs::write(&key_path, &random_data);
    }

    // Delete the files
    fs::remove_file(&key_path).map_err(StorageError::IoError)?;

    // Delete metadata file if it exists
    if meta_path.exists() {
        fs::remove_file(&meta_path).map_err(StorageError::IoError)?;
    }

    // Invalidate key list cache since we deleted a key
    let cache = get_cache();
    cache.invalidate_key_list();

    Ok(())
}

/// Update the last accessed time for a key
///
/// # Arguments
/// * `label` - The label of the key to update
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyNotFound` if the key doesn't exist
/// - `StorageError::IoError` if file operations fail
fn update_key_metadata_access_time(label: &str) -> Result<(), StorageError> {
    let meta_path = get_key_metadata_path(label)?;

    if !meta_path.exists() {
        return Ok(()); // No metadata file, skip update
    }

    // Use a more robust approach for concurrent access
    // Read current metadata with retry logic
    let mut retries = 3;
    let mut metadata_content = String::new();

    while retries > 0 {
        match fs::read_to_string(&meta_path) {
            Ok(content) => {
                metadata_content = content;
                break;
            }
            Err(_) => {
                retries -= 1;
                if retries == 0 {
                    return Ok(()); // Skip update if we can't read the file
                }
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
        }
    }

    // Try to parse the metadata, but don't fail if it's corrupted
    let mut key_info: KeyInfo = match serde_json::from_str(&metadata_content) {
        Ok(info) => info,
        Err(_) => {
            // If metadata is corrupted, skip the update
            return Ok(());
        }
    };

    // Update last accessed time
    key_info.mark_accessed();

    // Write updated metadata with retry logic
    let updated_metadata =
        serde_json::to_string_pretty(&key_info).map_err(StorageError::SerializationError)?;

    retries = 3;
    while retries > 0 {
        match fs::write(&meta_path, &updated_metadata) {
            Ok(_) => break,
            Err(_) => {
                retries -= 1;
                if retries == 0 {
                    return Ok(()); // Skip update if we can't write the file
                }
                std::thread::sleep(std::time::Duration::from_millis(10));
            }
        }
    }

    Ok(())
}

/// Get key information by label
///
/// # Arguments
/// * `label` - The label of the key
///
/// # Returns
/// KeyInfo for the specified key
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyNotFound` if the key doesn't exist
/// - `StorageError::InvalidMetadata` if metadata is corrupted
pub fn get_key_info(label: &str) -> Result<KeyInfo, StorageError> {
    let meta_path = get_key_metadata_path(label)?;

    if !meta_path.exists() {
        return Err(StorageError::KeyNotFound(label.to_string()));
    }

    let metadata_content = fs::read_to_string(&meta_path).map_err(StorageError::IoError)?;

    let key_info: KeyInfo = serde_json::from_str(&metadata_content)
        .map_err(|e| StorageError::InvalidMetadata(e.to_string()))?;

    Ok(key_info)
}

/// Check if a key exists
///
/// # Arguments
/// * `label` - The label to check
///
/// # Returns
/// `true` if the key exists, `false` otherwise
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
pub fn key_exists(label: &str) -> Result<bool, StorageError> {
    let key_path = get_key_file_path(label)?;
    Ok(key_path.exists())
}
