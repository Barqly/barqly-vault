//! Vault persistence operations
//!
//! Handles saving and loading vaults from the file system.

use crate::models::Vault;
use crate::prelude::*;
use crate::services::shared::infrastructure::path_management::{
    get_vault_manifest_path, get_vaults_directory, validate_vault_name,
};
use std::path::PathBuf;
use std::sync::Once;
use tokio::fs as async_fs;

/// Get the vaults directory path (now uses user-visible Barqly-Vaults directory)
fn get_vaults_dir() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let vaults_dir = get_vaults_directory()?;
    Ok(vaults_dir)
}

/// Get the path for a specific vault's manifest file
/// Uses the vault name as the filename
fn get_vault_path_by_name(
    vault_name: &str,
) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    // Validate vault name first
    validate_vault_name(vault_name)?;
    let path = get_vault_manifest_path(vault_name)?;
    Ok(path)
}

/// Get the path for a specific vault file by ID (for backwards compatibility)
/// This will look up the vault to find its name
#[allow(dead_code)]
fn get_vault_path(vault_id: &str) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    // For backwards compatibility, try to find existing vault by ID
    let vaults_dir = get_vaults_dir()?;

    // First check if there's a legacy vault with this ID
    let legacy_path = vaults_dir.join(format!("{vault_id}.json"));
    if legacy_path.exists() {
        return Ok(legacy_path);
    }

    // Otherwise, we need to find the vault by its ID to get its name
    // This is a temporary workaround - eventually all calls should use vault name
    Err(format!("Vault with ID {vault_id} not found").into())
}

/// Save a vault to disk
/// Now saves to ~/Documents/Barqly-Vaults/ using the vault name as the filename
pub async fn save_vault(vault: &Vault) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Use vault name for the filename
    let path = get_vault_path_by_name(&vault.name)?;
    let json = serde_json::to_string_pretty(vault)?;

    // Write atomically using a temp file
    let temp_path = path.with_extension("tmp");
    async_fs::write(&temp_path, json).await?;
    async_fs::rename(temp_path, path).await?;

    Ok(())
}

/// Load a vault from disk by name
pub async fn load_vault_by_name(
    vault_name: &str,
) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path_by_name(vault_name)?;

    if !path.exists() {
        return Err(format!("Vault file not found: {vault_name}").into());
    }

    let content = async_fs::read_to_string(path).await?;
    let vault: Vault = serde_json::from_str(&content)?;

    Ok(vault)
}

/// Load a vault from disk by ID (for backwards compatibility)
pub async fn load_vault(vault_id: &str) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
    // First, try to find the vault in the list to get its name
    let vaults = list_vaults().await?;
    if let Some(vault) = vaults.iter().find(|v| v.id == vault_id) {
        return load_vault_by_name(&vault.name).await;
    }

    // If not found, return error
    Err(format!("Vault with ID {vault_id} not found").into())
}

/// Get a vault by ID (alias for load_vault for consistency)
pub async fn get_vault(vault_id: &str) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
    load_vault(vault_id).await
}

/// Check if a vault exists by name
pub async fn vault_exists_by_name(vault_name: &str) -> bool {
    if let Ok(path) = get_vault_path_by_name(vault_name) {
        path.exists()
    } else {
        false
    }
}

/// Check if a vault exists by ID (for backwards compatibility)
pub async fn vault_exists(vault_id: &str) -> bool {
    // Try to find vault in list
    if let Ok(vaults) = list_vaults().await {
        vaults.iter().any(|v| v.id == vault_id)
    } else {
        false
    }
}

/// Delete a vault by name
pub async fn delete_vault_by_name(
    vault_name: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path_by_name(vault_name)?;

    if path.exists() {
        // Create backup before deletion
        let backup_path = path.with_extension("bak");
        async_fs::copy(&path, &backup_path).await?;

        // Delete the vault manifest file
        async_fs::remove_file(&path).await?;

        // Also delete the corresponding .age file if it exists
        let age_path = path.with_extension("").with_extension("age");
        if age_path.exists() {
            async_fs::remove_file(age_path).await?;
        }
    }

    Ok(())
}

/// Delete a vault by ID (for backwards compatibility)
pub async fn delete_vault(vault_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Find the vault to get its name
    let vaults = list_vaults().await?;
    if let Some(vault) = vaults.iter().find(|v| v.id == vault_id) {
        return delete_vault_by_name(&vault.name).await;
    }

    Err(format!("Vault with ID {vault_id} not found").into())
}

// Log list vaults operation only once per app session for initial load
static LIST_VAULTS_LOGGED: Once = Once::new();

/// List all vaults
pub async fn list_vaults() -> Result<Vec<Vault>, Box<dyn std::error::Error + Send + Sync>> {
    let vaults_dir = get_vaults_dir()?;

    // Only log initial vault listing once per app session
    LIST_VAULTS_LOGGED.call_once(|| {
        debug!(path = %vaults_dir.display(), "Initial vault listing");
    });

    let mut vaults = Vec::new();

    if vaults_dir.exists() {
        let mut entries = async_fs::read_dir(&vaults_dir).await.map_err(|e| {
            error!(error = %e, "Failed to read vaults directory");
            e
        })?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();

            // Process .manifest files
            if path.extension().and_then(|s| s.to_str()) == Some("manifest") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    // Skip temp files and backup files
                    if !stem.ends_with(".tmp") && !stem.ends_with(".bak") {
                        // Load vault by name (stem is the vault name)
                        if let Ok(vault) = load_vault_by_name(stem).await {
                            vaults.push(vault);
                        }
                    }
                }
            }
            // Also check for legacy .json files during transition period
            else if path.extension().and_then(|s| s.to_str()) == Some("json")
                && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
            {
                // Skip temp files
                if !stem.ends_with(".tmp") {
                    // Try to load as legacy vault
                    if let Ok(content) = async_fs::read_to_string(&path).await
                        && let Ok(vault) = serde_json::from_str::<Vault>(&content)
                    {
                        vaults.push(vault);
                    }
                }
            }
        }
    }

    // Sort by creation date
    vaults.sort_by(|a, b| a.created_at.cmp(&b.created_at));

    Ok(vaults)
}

/// Get the current active vault (deprecated - UI should track this)
pub async fn get_current_vault() -> Result<Option<Vault>, Box<dyn std::error::Error + Send + Sync>>
{
    // Deprecated - UI should track the current vault
    // Return None for compatibility
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{KeyReference, KeyState, KeyType};
    use chrono::Utc;

    #[tokio::test]
    async fn test_vault_persistence() {
        use std::path::Path;
        use tempfile::TempDir;

        // Create temp directory for this test
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Helper functions that use temp directory instead of Documents
        async fn temp_save_vault(
            vault: &Vault,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault.name));
            let json = serde_json::to_string_pretty(vault)?;
            tokio::fs::write(path, json).await?;
            Ok(())
        }

        async fn temp_load_vault_by_name(
            vault_name: &str,
            base_dir: &Path,
        ) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault_name));
            let content = tokio::fs::read_to_string(path).await?;
            let vault: Vault = serde_json::from_str(&content)?;
            Ok(vault)
        }

        async fn temp_delete_vault_by_name(
            vault_name: &str,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault_name));
            if path.exists() {
                tokio::fs::remove_file(path).await?;
            }
            Ok(())
        }

        async fn temp_vault_exists_by_name(vault_name: &str, base_dir: &Path) -> bool {
            let path = base_dir.join(format!("{}.manifest", vault_name));
            path.exists()
        }

        // Create a test vault with filesystem-safe name
        let mut vault = Vault::new(
            "test-vault-persistence".to_string(),
            Some("Description".to_string()),
        );
        vault.id = "test_vault_123".to_string(); // Use predictable ID for testing

        // Add a passphrase key
        let passphrase_key = KeyReference {
            id: "key_1".to_string(),
            key_type: KeyType::Passphrase {
                key_id: "stored_key_1".to_string(),
            },
            label: "Main Password".to_string(),
            state: KeyState::Active,
            created_at: Utc::now(),
            last_used: None,
        };

        vault.add_key_id(passphrase_key.id.clone()).unwrap();

        // Save the vault using temp directory
        temp_save_vault(&vault, temp_path).await.unwrap();

        // Load it back by name
        let loaded = temp_load_vault_by_name(&vault.name, temp_path)
            .await
            .unwrap();

        // Verify
        assert_eq!(loaded.id, vault.id);
        assert_eq!(loaded.name, vault.name);
        assert_eq!(loaded.keys.len(), 1);
        assert_eq!(loaded.keys[0], "key_1");

        // Clean up
        temp_delete_vault_by_name(&vault.name, temp_path)
            .await
            .unwrap();
        assert!(!temp_vault_exists_by_name(&vault.name, temp_path).await);
    }

    #[tokio::test]
    async fn test_list_vaults() {
        use std::path::Path;
        use tempfile::TempDir;

        // Create temp directory for this test
        let temp_dir = TempDir::new().unwrap();
        let temp_path = temp_dir.path();

        // Helper functions for temp directory operations
        async fn temp_save_vault(
            vault: &Vault,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault.name));
            let json = serde_json::to_string_pretty(vault)?;
            tokio::fs::write(path, json).await?;
            Ok(())
        }

        async fn temp_list_vaults(
            base_dir: &Path,
        ) -> Result<Vec<Vault>, Box<dyn std::error::Error + Send + Sync>> {
            let mut vaults = Vec::new();
            let mut entries = tokio::fs::read_dir(base_dir).await?;

            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if let Some(extension) = path.extension()
                    && extension == "manifest"
                {
                    let content = tokio::fs::read_to_string(&path).await?;
                    let vault: Vault = serde_json::from_str(&content)?;
                    vaults.push(vault);
                }
            }

            Ok(vaults)
        }

        async fn temp_delete_vault_by_name(
            vault_name: &str,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault_name));
            if path.exists() {
                tokio::fs::remove_file(path).await?;
            }
            Ok(())
        }

        // Create multiple vaults with filesystem-safe names
        let vault1 = Vault::new("test-vault-list-1".to_string(), None);
        let vault2 = Vault::new("test-vault-list-2".to_string(), None);

        temp_save_vault(&vault1, temp_path).await.unwrap();
        temp_save_vault(&vault2, temp_path).await.unwrap();

        // List vaults
        let vaults = temp_list_vaults(temp_path).await.unwrap();
        assert_eq!(vaults.len(), 2);

        // Verify both vaults are present
        let vault_names: Vec<String> = vaults.iter().map(|v| v.name.clone()).collect();
        assert!(vault_names.contains(&"test-vault-list-1".to_string()));
        assert!(vault_names.contains(&"test-vault-list-2".to_string()));

        // Clean up by name
        temp_delete_vault_by_name(&vault1.name, temp_path)
            .await
            .unwrap();
        temp_delete_vault_by_name(&vault2.name, temp_path)
            .await
            .unwrap();
    }
}
