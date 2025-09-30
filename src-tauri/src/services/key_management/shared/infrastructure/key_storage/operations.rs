//! Core CRUD operations for key storage
//!
//! This module contains the main operations for saving, loading, and deleting
//! encrypted keys with proper security measures.

use super::{update_key_metadata_access_time, validate_key_file};
use crate::storage::cache::get_cache;
use crate::storage::errors::StorageError;
use crate::storage::path_management::{get_key_file_path, get_key_metadata_path};
use rand::Rng;
use std::fs;
use std::path::PathBuf;

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
    _public_key: Option<&str>,
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

    // Note: Metadata file creation disabled since we now use unified key registry
    // The registry (barqly-vault-key-registry.json) handles all key metadata centrally
    // Legacy .agekey.meta files are no longer needed

    // Invalidate key list cache since we added a new key
    let cache = get_cache();
    cache.invalidate_key_list();

    Ok(key_path)
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

    // Validate file permissions and integrity
    validate_key_file(&key_path)?;

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
        let random_data: Vec<u8> = (0..file_size).map(|_| rng.r#gen()).collect();

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

/// Save an encrypted key with associated metadata
///
/// This function saves both the encrypted key and its metadata, supporting
/// multi-recipient encryption modes.
///
/// # Arguments
/// * `label` - The label for the key
/// * `encrypted_key` - The encrypted key bytes
/// * `public_key` - Optional public key string
/// * `metadata` - The vault metadata containing recipient information
///
/// # Returns
/// The path where the key was saved
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyAlreadyExists` if a key with this label already exists
/// - `StorageError::IoError` if file operations fail
pub fn save_encrypted_key_with_metadata(
    label: &str,
    encrypted_key: &[u8],
    _public_key: Option<&str>,
    metadata: &crate::services::vault::VaultMetadata,
) -> Result<PathBuf, StorageError> {
    // First save the encrypted key using the existing function
    let key_path = save_encrypted_key(label, encrypted_key, _public_key)?;

    // Then save the v2 metadata
    let metadata_path = get_key_metadata_path(label)?.with_file_name(format!("{label}.v2.json"));
    crate::services::vault::MetadataStorage::save_metadata(metadata, &metadata_path)?;

    Ok(key_path)
}

/// Save YubiKey metadata without an encrypted private key
///
/// For YubiKey-only mode, we don't store an encrypted private key since
/// the YubiKey itself holds the identity.
///
/// # Arguments
/// * `label` - The label for the key
/// * `metadata` - The vault metadata containing YubiKey recipient information
/// * `public_key` - Optional public key string (YubiKey recipient string)
///
/// # Returns
/// The path where the metadata was saved
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label is unsafe
/// - `StorageError::KeyAlreadyExists` if a key with this label already exists
/// - `StorageError::IoError` if file operations fail
pub fn save_yubikey_metadata(
    label: &str,
    metadata: &crate::services::vault::VaultMetadata,
    _public_key: Option<&str>,
) -> Result<PathBuf, StorageError> {
    // Get the key file path (even though we won't store an encrypted key)
    let key_path = get_key_file_path(label)?;

    // Check if key already exists
    if key_path.exists() {
        return Err(StorageError::KeyAlreadyExists(label.to_string()));
    }

    // Create a placeholder file to indicate this key exists
    // This helps with key listing and prevents duplicate labels
    let placeholder_content = b"YubiKey-protected key (no encrypted data stored)";
    fs::write(&key_path, placeholder_content).map_err(StorageError::IoError)?;

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

    // Note: Metadata file creation disabled since we now use unified key registry
    // The registry (barqly-vault-key-registry.json) handles all key metadata centrally
    // Legacy .agekey.meta files are no longer needed

    // Save the v2 metadata
    let metadata_path = get_key_metadata_path(label)?.with_file_name(format!("{label}.v2.json"));
    crate::services::vault::MetadataStorage::save_metadata(metadata, &metadata_path)?;

    // Invalidate key list cache since we added a new key
    let cache = get_cache();
    cache.invalidate_key_list();

    Ok(key_path)
}
