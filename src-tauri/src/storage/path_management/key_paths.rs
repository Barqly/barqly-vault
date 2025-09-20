//! Key file path generation utilities
//!
//! This module provides functions for generating paths to key files
//! and their associated metadata files.

use super::directories::get_keys_dir;
use super::validation::is_safe_label;
use crate::storage::errors::StorageError;
use std::path::PathBuf;

/// Get the path to a key file by label
///
/// # Arguments
/// * `label` - The key label
///
/// # Returns
/// The full path to the key file
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label contains unsafe characters
pub fn get_key_file_path(label: &str) -> Result<PathBuf, StorageError> {
    // Validate the label
    if !is_safe_label(label) {
        return Err(StorageError::InvalidLabel(label.to_string()));
    }

    let keys_dir = get_keys_dir()?;
    let filename = format!("{label}.agekey.enc");
    let key_path = keys_dir.join(filename);

    Ok(key_path)
}

/// Get the path to a key metadata file by label
///
/// # Arguments
/// * `label` - The key label
///
/// # Returns
/// The full path to the key metadata file
///
/// # Errors
/// - `StorageError::InvalidLabel` if the label contains unsafe characters
pub fn get_key_metadata_path(label: &str) -> Result<PathBuf, StorageError> {
    // Validate the label
    if !is_safe_label(label) {
        return Err(StorageError::InvalidLabel(label.to_string()));
    }

    let keys_dir = get_keys_dir()?;
    let filename = format!("{label}.agekey.meta");
    let meta_path = keys_dir.join(filename);

    Ok(meta_path)
}
