//! User-visible vault storage management
//!
//! This module manages the user-visible directories for encrypted vaults and recovered files:
//! - `~/Documents/Barqly-Vaults/` - Encrypted vaults and manifests
//! - `~/Documents/Barqly-Recovery/` - Decrypted/recovered files

use crate::storage::errors::StorageError;
use directories::UserDirs;
use std::path::PathBuf;

/// Get the user's Documents directory
fn get_documents_dir() -> Result<PathBuf, StorageError> {
    let user_dirs = UserDirs::new()
        .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("UserDirs")))?;

    user_dirs
        .document_dir()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("Documents")))
}

/// Get the Barqly-Vaults directory for encrypted vaults
///
/// Returns the path to `~/Documents/Barqly-Vaults/`
/// Creates the directory if it doesn't exist.
///
/// # Returns
/// Platform-specific path to the vaults directory
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
pub fn get_vaults_directory() -> Result<PathBuf, StorageError> {
    let documents = get_documents_dir()?;
    let vaults_dir = documents.join("Barqly-Vaults");

    eprintln!("[DEBUG] Vaults directory path: {:?}", vaults_dir);

    if !vaults_dir.exists() {
        eprintln!("[DEBUG] Vaults directory doesn't exist, attempting to create it...");
        std::fs::create_dir_all(&vaults_dir)
            .map_err(|e| {
                eprintln!("[ERROR] Failed to create vaults directory: {:?} - Error: {}", vaults_dir, e);
                StorageError::DirectoryCreationFailed(vaults_dir.clone())
            })?;
        eprintln!("[DEBUG] Successfully created vaults directory");
    } else {
        eprintln!("[DEBUG] Vaults directory already exists");
    }

    Ok(vaults_dir)
}

/// Get the Barqly-Recovery directory for decrypted files
///
/// Returns the path to `~/Documents/Barqly-Recovery/`
/// Creates the directory if it doesn't exist.
///
/// # Returns
/// Platform-specific path to the recovery directory
///
/// # Errors
/// - `StorageError::DirectoryCreationFailed` if the directory cannot be created
pub fn get_recovery_directory() -> Result<PathBuf, StorageError> {
    let documents = get_documents_dir()?;
    let recovery_dir = documents.join("Barqly-Recovery");

    if !recovery_dir.exists() {
        std::fs::create_dir_all(&recovery_dir)
            .map_err(|_| StorageError::DirectoryCreationFailed(recovery_dir.clone()))?;
    }

    Ok(recovery_dir)
}

/// Get the path for a vault's encrypted file
///
/// # Arguments
/// * `vault_name` - The user-friendly vault name (e.g., "Family Documents")
///
/// # Returns
/// Path to the `.age` file (e.g., `~/Documents/Barqly-Vaults/Family Documents.age`)
pub fn get_vault_file_path(vault_name: &str) -> Result<PathBuf, StorageError> {
    let vaults_dir = get_vaults_directory()?;
    Ok(vaults_dir.join(format!("{vault_name}.age")))
}

/// Get the path for a vault's manifest file
///
/// # Arguments
/// * `vault_name` - The user-friendly vault name (e.g., "Family Documents")
///
/// # Returns
/// Path to the `.manifest` file (e.g., `~/Documents/Barqly-Vaults/Family Documents.manifest`)
pub fn get_vault_manifest_path(vault_name: &str) -> Result<PathBuf, StorageError> {
    let vaults_dir = get_vaults_directory()?;
    Ok(vaults_dir.join(format!("{vault_name}.manifest")))
}

/// Get the recovery path for a specific vault
///
/// # Arguments
/// * `vault_name` - The user-friendly vault name (e.g., "Family Documents")
///
/// # Returns
/// Path to the recovery directory for this vault
pub fn get_vault_recovery_path(vault_name: &str) -> Result<PathBuf, StorageError> {
    let recovery_dir = get_recovery_directory()?;
    let vault_recovery = recovery_dir.join(vault_name);

    if !vault_recovery.exists() {
        std::fs::create_dir_all(&vault_recovery)
            .map_err(|_| StorageError::DirectoryCreationFailed(vault_recovery.clone()))?;
    }

    Ok(vault_recovery)
}

/// Validate a vault name for filesystem compatibility
///
/// # Rules
/// - Must not be empty
/// - Max 255 characters
/// - Only alphanumeric, spaces, hyphens, and underscores
/// - No leading/trailing spaces
///
/// # Arguments
/// * `name` - The vault name to validate
///
/// # Returns
/// - `Ok(())` if the name is valid
/// - `Err(StorageError)` with details if invalid
pub fn validate_vault_name(name: &str) -> Result<(), StorageError> {
    let trimmed = name.trim();

    if trimmed.is_empty() {
        return Err(StorageError::InvalidVaultName(
            "Vault name cannot be empty".to_string(),
        ));
    }

    if trimmed.len() > 255 {
        return Err(StorageError::InvalidVaultName(format!(
            "Vault name too long (max 255 characters, got {})",
            trimmed.len()
        )));
    }

    // Check for valid characters: alphanumeric, spaces, hyphens, underscores
    let valid_chars = trimmed
        .chars()
        .all(|c| c.is_alphanumeric() || c == ' ' || c == '-' || c == '_');

    if !valid_chars {
        return Err(StorageError::InvalidVaultName(
            "Vault name can only contain letters, numbers, spaces, hyphens, and underscores"
                .to_string(),
        ));
    }

    // Check for filesystem reserved names (Windows)
    #[cfg(target_os = "windows")]
    {
        let reserved = [
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];

        let upper_trimmed = trimmed.to_uppercase();
        if reserved.iter().any(|&r| upper_trimmed == r) {
            return Err(StorageError::InvalidVaultName(
                "Vault name is a reserved system name".to_string(),
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_vault_name() {
        // Valid names
        assert!(validate_vault_name("Family Documents").is_ok());
        assert!(validate_vault_name("Bitcoin-Keys-2024").is_ok());
        assert!(validate_vault_name("Tax_Records_2024").is_ok());
        assert!(validate_vault_name("Project 123").is_ok());

        // Invalid names
        assert!(validate_vault_name("").is_err());
        assert!(validate_vault_name("   ").is_err());
        assert!(validate_vault_name("Family/Documents").is_err());
        assert!(validate_vault_name("Family\\Documents").is_err());
        assert!(validate_vault_name("Family:Documents").is_err());
        assert!(validate_vault_name("Family*Documents").is_err());

        // Too long name
        let long_name = "a".repeat(256);
        assert!(validate_vault_name(&long_name).is_err());

        // Trimmed spaces
        // Both should succeed (trimming should work)
        assert!(validate_vault_name("  Family Documents  ").is_ok());
        assert!(validate_vault_name("Family Documents").is_ok());
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_reserved_names() {
        assert!(validate_vault_name("CON").is_err());
        assert!(validate_vault_name("con").is_err());
        assert!(validate_vault_name("PRN").is_err());
        assert!(validate_vault_name("AUX").is_err());
        assert!(validate_vault_name("COM1").is_err());
        assert!(validate_vault_name("LPT1").is_err());
    }
}
