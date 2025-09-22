//! Vault persistence operations
//!
//! Handles saving and loading vaults from the file system.

use crate::logging::log_debug;
use crate::models::Vault;
use crate::storage::path_management::{
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
    let mut vault: Vault = serde_json::from_str(&content)?;

    // Check for migration needs
    if let Ok(migrated) = super::migration::migrate_vault_if_needed(&mut vault).await {
        if migrated {
            // Save migrated vault
            save_vault(&vault).await?;
        }
    }

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
        log_debug(&format!("Initial vault listing from: {:?}", vaults_dir));
    });

    let mut vaults = Vec::new();

    if vaults_dir.exists() {
        let mut entries = async_fs::read_dir(&vaults_dir).await
            .map_err(|e| {
                log_debug(&format!("Failed to read vaults directory: {}", e));
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
            else if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    // Skip temp files
                    if !stem.ends_with(".tmp") {
                        // Try to load as legacy vault
                        if let Ok(content) = async_fs::read_to_string(&path).await {
                            if let Ok(vault) = serde_json::from_str::<Vault>(&content) {
                                vaults.push(vault);
                            }
                        }
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
    #[ignore = "Requires filesystem write access to Documents folder"]
    async fn test_vault_persistence() {
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

        vault.add_key(passphrase_key).unwrap();

        // Save the vault
        save_vault(&vault).await.unwrap();

        // Load it back by name
        let loaded = load_vault_by_name(&vault.name).await.unwrap();

        // Verify
        assert_eq!(loaded.id, vault.id);
        assert_eq!(loaded.name, vault.name);
        assert_eq!(loaded.keys.len(), 1);
        assert_eq!(loaded.keys[0].label, "Main Password");

        // Clean up
        delete_vault_by_name(&vault.name).await.unwrap();
        assert!(!vault_exists_by_name(&vault.name).await);
    }

    #[tokio::test]
    #[ignore = "Requires filesystem write access to Documents folder"]
    async fn test_list_vaults() {
        // Create multiple vaults with filesystem-safe names
        let vault1 = Vault::new("test-vault-list-1".to_string(), None);
        let vault2 = Vault::new("test-vault-list-2".to_string(), None);

        save_vault(&vault1).await.unwrap();
        save_vault(&vault2).await.unwrap();

        // List vaults
        let vaults = list_vaults().await.unwrap();
        assert!(vaults.len() >= 2);

        // Clean up by name
        delete_vault_by_name(&vault1.name).await.unwrap();
        delete_vault_by_name(&vault2.name).await.unwrap();
    }
}
