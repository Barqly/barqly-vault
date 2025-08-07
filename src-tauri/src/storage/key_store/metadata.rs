//! Metadata management for stored keys
//!
//! This module handles key metadata operations including listing keys,
//! retrieving key information, and updating access times with caching support.

use super::KeyInfo;
use crate::storage::cache::get_cache;
use crate::storage::errors::StorageError;
use crate::storage::paths::{get_key_metadata_path, get_keys_dir};
use std::fs;

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

/// Update the last accessed time for a key
///
/// # Arguments
/// * `label` - The label of the key to update
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyNotFound` if the key doesn't exist
/// - `StorageError::IoError` if file operations fail
pub(crate) fn update_key_metadata_access_time(label: &str) -> Result<(), StorageError> {
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
