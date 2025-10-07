//! User-visible vault storage management
//!
//! This module manages the user-visible directories for encrypted vaults and recovered files:
//! - `~/Documents/Barqly-Vaults/` - Encrypted vaults and manifests
//! - `~/Documents/Barqly-Recovery/` - Decrypted/recovered files

use crate::error::StorageError;
use crate::prelude::*;
use directories::UserDirs;
use std::path::PathBuf;
use std::sync::Once;

use super::directories::{get_manifest_backups_dir, get_vaults_manifest_dir};

/// Get the user's Documents directory
fn get_documents_dir() -> Result<PathBuf, StorageError> {
    let user_dirs = UserDirs::new()
        .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("UserDirs")))?;

    user_dirs
        .document_dir()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| StorageError::DirectoryCreationFailed(PathBuf::from("Documents")))
}

// Log vault directory creation only once per app session
static VAULTS_DIR_LOGGED: Once = Once::new();

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

    // Only log directory info once per app session
    VAULTS_DIR_LOGGED.call_once(|| {
        debug!(path = %vaults_dir.display(), "Vaults directory path");
    });

    if !vaults_dir.exists() {
        debug!("Creating vaults directory");
        std::fs::create_dir_all(&vaults_dir).map_err(|e| {
            error!(error = %e, "Failed to create vaults directory");
            StorageError::DirectoryCreationFailed(vaults_dir.clone())
        })?;
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

/// Get the path for a vault's manifest file (NON-SYNC location - R2)
///
/// Returns manifest path in non-sync storage for security and version control.
///
/// # Arguments
/// * `vault_name` - The sanitized vault name (filesystem-safe)
///
/// # Returns
/// Path to manifest in non-sync: `~/Library/.../vaults/Vault-001.manifest`
pub fn get_vault_manifest_path(vault_name: &str) -> Result<PathBuf, StorageError> {
    let vaults_manifest_dir = get_vaults_manifest_dir()?;
    Ok(vaults_manifest_dir.join(format!("{vault_name}.manifest")))
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

/// Get backup path for a vault manifest
///
/// Returns path with timestamp: `~/Library/.../backups/manifest/Vault-001.manifest.<timestamp>`
///
/// # Arguments
/// * `vault_name` - The sanitized vault name
/// * `timestamp` - Timestamp string (e.g., "2025-10-05_163000")
pub fn get_manifest_backup_path(
    vault_name: &str,
    timestamp: &str,
) -> Result<PathBuf, StorageError> {
    let backups_dir = get_manifest_backups_dir()?;
    Ok(backups_dir.join(format!("{vault_name}.manifest.{timestamp}")))
}

/// Generate timestamp string for backup filenames
///
/// Returns: "2025-10-05_163000" format
pub fn generate_backup_timestamp() -> String {
    chrono::Utc::now().format("%Y-%m-%d_%H%M%S").to_string()
}

/// Sanitized vault name containing both filesystem-safe and display versions
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SanitizedVaultName {
    /// Filesystem-safe name (sanitized)
    pub sanitized: String,
    /// Original display name (preserved for UI)
    pub display: String,
}

/// Sanitize a vault name for filesystem compatibility
///
/// Converts user-entered vault labels into filesystem-safe names while preserving
/// the original for display purposes.
///
/// # Sanitization Rules
/// 1. Remove emojis and non-ASCII characters
/// 2. Replace invalid characters (`/\:*?"<>|`) with hyphens
/// 3. Collapse multiple hyphens and spaces
/// 4. Trim leading/trailing hyphens and spaces
/// 5. Max 200 characters (filesystem safety)
/// 6. Prevent leading dot (Unix hidden files)
/// 7. Check for reserved names (Windows: CON, PRN, etc.)
///
/// # Arguments
/// * `name` - The user-entered vault name
///
/// # Returns
/// - `Ok(SanitizedVaultName)` with both sanitized and display versions
/// - `Err(StorageError)` if name is empty or invalid after sanitization
///
/// # Examples
/// ```ignore
/// let result = sanitize_vault_name("My Family Photos! 🎉 / Test");
/// // sanitized: "My-Family-Photos-Test"
/// // display:   "My Family Photos! 🎉 / Test"
/// ```
pub fn sanitize_vault_name(name: &str) -> Result<SanitizedVaultName, StorageError> {
    // Delegate to shared label sanitization
    let result = super::super::label_sanitization::sanitize_label(name)?;

    Ok(SanitizedVaultName {
        sanitized: result.sanitized,
        display: result.display,
    })
}

/// Collapse multiple consecutive hyphens and spaces into single hyphens
fn collapse_separators(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut last_was_separator = false;

    for c in s.chars() {
        let is_separator = c == '-' || c == ' ';

        if is_separator {
            if !last_was_separator {
                result.push('-');
                last_was_separator = true;
            }
        } else {
            result.push(c);
            last_was_separator = false;
        }
    }

    result
}

/// Check if name is a Windows reserved name
fn check_reserved_names(name: &str) -> Result<(), StorageError> {
    #[cfg(target_os = "windows")]
    {
        let reserved = [
            "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
            "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
        ];

        let upper_name = name.to_uppercase();
        if reserved.iter().any(|&r| upper_name == r) {
            return Err(StorageError::InvalidVaultName(
                "Vault name is a reserved system name".to_string(),
            ));
        }
    }

    let _ = name; // Suppress unused warning on non-Windows
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== Sanitization Tests =====

    #[test]
    fn test_sanitize_vault_name_basic() {
        let result = sanitize_vault_name("Family Documents").unwrap();
        assert_eq!(result.sanitized, "Family-Documents");
        assert_eq!(result.display, "Family Documents");
    }

    #[test]
    fn test_sanitize_vault_name_emojis() {
        let result = sanitize_vault_name("My Family Photos! 🎉").unwrap();
        assert_eq!(result.sanitized, "My-Family-Photos!");
        assert_eq!(result.display, "My Family Photos! 🎉");
    }

    #[test]
    fn test_sanitize_vault_name_complex_emojis() {
        let result = sanitize_vault_name("Photos 🎉 / 📸 Test").unwrap();
        // Emoji removed, slash becomes hyphen, multiple hyphens collapse
        assert_eq!(result.sanitized, "Photos-Test");
        assert_eq!(result.display, "Photos 🎉 / 📸 Test");
    }

    #[test]
    fn test_sanitize_vault_name_invalid_chars() {
        let result = sanitize_vault_name("Family/Documents\\Test:File*Name").unwrap();
        // All invalid chars become hyphens, then collapsed
        assert_eq!(result.sanitized, "Family-Documents-Test-File-Name");
    }

    #[test]
    fn test_sanitize_vault_name_multiple_hyphens() {
        let result = sanitize_vault_name("Test  ---  Name").unwrap();
        // Multiple spaces and hyphens collapse into single hyphen
        assert_eq!(result.sanitized, "Test-Name");
    }

    #[test]
    fn test_sanitize_vault_name_leading_trailing() {
        let result = sanitize_vault_name("  -  Test Name  -  ").unwrap();
        // Leading/trailing hyphens and spaces trimmed
        assert_eq!(result.sanitized, "Test-Name");
    }

    #[test]
    fn test_sanitize_vault_name_max_length() {
        let long_name = "a".repeat(250);
        let result = sanitize_vault_name(&long_name).unwrap();
        // Should truncate to 200 chars
        assert_eq!(result.sanitized.len(), 200);
    }

    #[test]
    fn test_sanitize_vault_name_leading_dot() {
        let result = sanitize_vault_name(".hidden").unwrap();
        // Leading dot should be prefixed with "vault-"
        assert_eq!(result.sanitized, "vault-hidden");
    }

    #[test]
    fn test_sanitize_vault_name_empty() {
        let result = sanitize_vault_name("");
        assert!(result.is_err());
    }

    #[test]
    fn test_sanitize_vault_name_only_invalid() {
        let result = sanitize_vault_name("///:::***");
        assert!(result.is_err());
        assert!(
            result
                .unwrap_err()
                .to_string()
                .contains("only invalid characters")
        );
    }

    #[test]
    fn test_sanitize_vault_name_unicode() {
        // Non-ASCII characters should be removed
        let result = sanitize_vault_name("Tëst Nämé").unwrap();
        assert_eq!(result.sanitized, "Tst-Nm");
        assert_eq!(result.display, "Tëst Nämé");
    }

    #[test]
    fn test_sanitize_vault_name_path_traversal() {
        let result = sanitize_vault_name("../../etc/passwd").unwrap();
        // Dots and slashes become hyphens, collapsed, leading dot gets vault- prefix
        assert_eq!(result.sanitized, "vault-.-..-etc-passwd");
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_sanitize_vault_name_windows_reserved() {
        assert!(sanitize_vault_name("CON").is_err());
        assert!(sanitize_vault_name("PRN").is_err());
        assert!(sanitize_vault_name("AUX").is_err());
        assert!(sanitize_vault_name("COM1").is_err());
        assert!(sanitize_vault_name("LPT1").is_err());
    }

    #[test]
    fn test_collapse_separators() {
        assert_eq!(collapse_separators("a   b"), "a-b");
        assert_eq!(collapse_separators("a---b"), "a-b");
        assert_eq!(collapse_separators("a - - b"), "a-b");
        assert_eq!(collapse_separators("a  -  -  b"), "a-b");
    }

    #[test]
    fn test_sanitize_vault_name_real_world_examples() {
        // Bitcoin wallet backup
        let result = sanitize_vault_name("Bitcoin Wallet 💰 - 2024").unwrap();
        // Emoji removed, hyphens collapsed
        assert_eq!(result.sanitized, "Bitcoin-Wallet-2024");

        // Tax documents
        let result = sanitize_vault_name("Tax Documents (2023/2024)").unwrap();
        assert!(result.sanitized.contains("Tax-Documents"));

        // Family photos
        let result = sanitize_vault_name("Family Photos 📸 Summer").unwrap();
        assert_eq!(result.sanitized, "Family-Photos-Summer");
    }
}
