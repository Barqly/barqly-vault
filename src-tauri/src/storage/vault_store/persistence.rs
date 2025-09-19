//! Vault persistence operations
//!
//! Handles saving and loading vaults from the file system.

use crate::models::Vault;
use crate::storage::path_management::get_app_dir;
use std::fs;
use std::path::PathBuf;
use tokio::fs as async_fs;

/// Get the vaults directory path
fn get_vaults_dir() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let data_dir = get_app_dir()?;
    let vaults_dir = data_dir.join("vaults");

    // Ensure directory exists
    if !vaults_dir.exists() {
        fs::create_dir_all(&vaults_dir)?;
    }

    Ok(vaults_dir)
}

/// Get the path for a specific vault file
fn get_vault_path(vault_id: &str) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let vaults_dir = get_vaults_dir()?;
    Ok(vaults_dir.join(format!("{vault_id}.json")))
}

/// Save a vault to disk
pub async fn save_vault(vault: &Vault) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path(&vault.id)?;
    let json = serde_json::to_string_pretty(vault)?;

    // Write atomically using a temp file
    let temp_path = path.with_extension("tmp");
    async_fs::write(&temp_path, json).await?;
    async_fs::rename(temp_path, path).await?;

    Ok(())
}

/// Load a vault from disk
pub async fn load_vault(vault_id: &str) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path(vault_id)?;

    if !path.exists() {
        return Err(format!("Vault file not found: {vault_id}").into());
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

/// Get a vault by ID (alias for load_vault for consistency)
pub async fn get_vault(vault_id: &str) -> Result<Vault, Box<dyn std::error::Error + Send + Sync>> {
    load_vault(vault_id).await
}

/// Check if a vault exists
pub async fn vault_exists(vault_id: &str) -> bool {
    if let Ok(path) = get_vault_path(vault_id) {
        path.exists()
    } else {
        false
    }
}

/// Delete a vault
pub async fn delete_vault(vault_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path(vault_id)?;

    if path.exists() {
        // Create backup before deletion
        let backup_path = path.with_extension("bak");
        async_fs::copy(&path, &backup_path).await?;

        // Delete the vault file
        async_fs::remove_file(path).await?;
    }

    Ok(())
}

/// List all vaults
pub async fn list_vaults() -> Result<Vec<Vault>, Box<dyn std::error::Error + Send + Sync>> {
    let vaults_dir = get_vaults_dir()?;
    let mut vaults = Vec::new();

    if vaults_dir.exists() {
        let mut entries = async_fs::read_dir(vaults_dir).await?;

        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();

            // Only process .json files
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    // Skip temp files
                    if !stem.ends_with(".tmp") {
                        if let Ok(vault) = load_vault(stem).await {
                            vaults.push(vault);
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

/// Get the current active vault
pub async fn get_current_vault() -> Result<Option<Vault>, Box<dyn std::error::Error + Send + Sync>>
{
    let vaults = list_vaults().await?;
    Ok(vaults.into_iter().find(|v| v.is_current))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{KeyReference, KeyState, KeyType};
    use chrono::Utc;

    #[tokio::test]
    async fn test_vault_persistence() {
        // Create a test vault
        let mut vault = Vault::new("Test Vault".to_string(), Some("Description".to_string()));
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

        // Load it back
        let loaded = load_vault(&vault.id).await.unwrap();

        // Verify
        assert_eq!(loaded.id, vault.id);
        assert_eq!(loaded.name, vault.name);
        assert_eq!(loaded.keys.len(), 1);
        assert_eq!(loaded.keys[0].label, "Main Password");

        // Clean up
        delete_vault(&vault.id).await.unwrap();
        assert!(!vault_exists(&vault.id).await);
    }

    #[tokio::test]
    async fn test_list_vaults() {
        // Create multiple vaults
        let vault1 = Vault::new("Vault 1".to_string(), None);
        let vault2 = Vault::new("Vault 2".to_string(), None);

        save_vault(&vault1).await.unwrap();
        save_vault(&vault2).await.unwrap();

        // List vaults
        let vaults = list_vaults().await.unwrap();
        assert!(vaults.len() >= 2);

        // Clean up
        delete_vault(&vault1.id).await.unwrap();
        delete_vault(&vault2.id).await.unwrap();
    }
}
