//! Vault persistence operations
//!
//! Handles saving and loading vault metadata from the file system.

use crate::prelude::*;
use crate::services::shared::infrastructure::io::atomic_write;
use crate::services::shared::infrastructure::path_management::{
    get_vault_manifest_path, get_vaults_manifest_dir, sanitize_vault_name,
};
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;
use std::path::PathBuf;
use std::sync::Once;
use tokio::fs as async_fs;

/// Get the vaults manifest directory path (non-sync location for vault metadata)
fn get_vaults_dir() -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    let vaults_dir = get_vaults_manifest_dir()?;
    Ok(vaults_dir)
}

/// Get the path for a specific vault's manifest file
/// Uses the vault name as the filename
fn get_vault_path_by_name(
    vault_name: &str,
) -> Result<PathBuf, Box<dyn std::error::Error + Send + Sync>> {
    // Sanitize vault name
    let sanitized = sanitize_vault_name(vault_name)?;
    let path = get_vault_manifest_path(&sanitized.sanitized)?;
    Ok(path)
}

/// Save vault metadata to disk
/// Saves to non-sync location: ~/Library/.../vaults/ using the sanitized name as the filename
pub async fn save_vault(
    metadata: &VaultMetadata,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Use sanitized name for the filename
    let path = get_vault_path_by_name(&metadata.vault.sanitized_name)?;
    let json = serde_json::to_string_pretty(metadata)?;

    // Atomic write with sync_all() for durability
    atomic_write(&path, json.as_bytes()).await?;

    Ok(())
}

/// Load vault metadata from disk by name
pub async fn load_vault_by_name(
    vault_name: &str,
) -> Result<VaultMetadata, Box<dyn std::error::Error + Send + Sync>> {
    let path = get_vault_path_by_name(vault_name)?;

    if !path.exists() {
        return Err(format!("Vault file not found: {vault_name}").into());
    }

    let content = async_fs::read_to_string(path).await?;
    let metadata: VaultMetadata = serde_json::from_str(&content)?;

    Ok(metadata)
}

/// Load vault metadata from disk by ID
pub async fn load_vault(
    vault_id: &str,
) -> Result<VaultMetadata, Box<dyn std::error::Error + Send + Sync>> {
    let vaults = list_vaults().await?;
    if let Some(metadata) = vaults.iter().find(|v| v.vault_id() == vault_id) {
        return load_vault_by_name(&metadata.vault.sanitized_name).await;
    }

    Err(format!("Vault with ID {vault_id} not found").into())
}

/// Get vault metadata by ID (alias for load_vault for consistency)
pub async fn get_vault(
    vault_id: &str,
) -> Result<VaultMetadata, Box<dyn std::error::Error + Send + Sync>> {
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

/// Check if a vault exists by ID
pub async fn vault_exists(vault_id: &str) -> bool {
    // Try to find vault in list
    if let Ok(vaults) = list_vaults().await {
        vaults.iter().any(|v| v.vault_id() == vault_id)
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

/// Delete a vault by ID
pub async fn delete_vault(vault_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Find the vault to get its name
    let vaults = list_vaults().await?;
    if let Some(metadata) = vaults.iter().find(|v| v.vault_id() == vault_id) {
        return delete_vault_by_name(&metadata.vault.sanitized_name).await;
    }

    Err(format!("Vault with ID {vault_id} not found").into())
}

// Log list vaults operation only once per app session for initial load
static LIST_VAULTS_LOGGED: Once = Once::new();

/// List all vaults
pub async fn list_vaults() -> Result<Vec<VaultMetadata>, Box<dyn std::error::Error + Send + Sync>> {
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
                        // Load vault metadata by name (stem is the vault name)
                        if let Ok(metadata) = load_vault_by_name(stem).await {
                            vaults.push(metadata);
                        }
                    }
                }
            }
            // Also check for .json vault files (legacy support)
            else if path.extension().and_then(|s| s.to_str()) == Some("json")
                && let Some(stem) = path.file_stem().and_then(|s| s.to_str())
            {
                // Skip temp files, try to load as VaultMetadata
                if !stem.ends_with(".tmp")
                    && let Ok(content) = async_fs::read_to_string(&path).await
                    && let Ok(metadata) = serde_json::from_str::<VaultMetadata>(&content)
                {
                    vaults.push(metadata);
                }
            }
        }
    }

    // Sort by creation date
    vaults.sort_by_key(|a| a.created_at());

    Ok(vaults)
}

/// Get the current active vault (deprecated - UI should track this)
pub async fn get_current_vault()
-> Result<Option<VaultMetadata>, Box<dyn std::error::Error + Send + Sync>> {
    // Deprecated - UI should track the current vault
    // Return None for compatibility
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::services::shared::infrastructure::DeviceInfo;
    use crate::services::vault::infrastructure::persistence::metadata::RecipientInfo;
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
            metadata: &VaultMetadata,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", metadata.vault.sanitized_name));
            let json = serde_json::to_string_pretty(metadata)?;
            tokio::fs::write(path, json).await?;
            Ok(())
        }

        async fn temp_load_vault_by_name(
            vault_name: &str,
            base_dir: &Path,
        ) -> Result<VaultMetadata, Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", vault_name));
            let content = tokio::fs::read_to_string(path).await?;
            let metadata: VaultMetadata = serde_json::from_str(&content)?;
            Ok(metadata)
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

        // Create device info
        let device_info = DeviceInfo {
            machine_id: "test-machine".to_string(),
            machine_label: "test-laptop".to_string(),
            created_at: Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        // Create a test vault metadata with filesystem-safe name
        let recipient = RecipientInfo::new_passphrase(
            "key_1".to_string(),
            "age1test123".to_string(),
            "Main Password".to_string(),
            "key_1.agekey.enc".to_string(),
        );

        let metadata = VaultMetadata::new(
            "test_vault_123".to_string(),
            "test-vault-persistence".to_string(),
            Some("Description".to_string()),
            "test-vault-persistence".to_string(),
            &device_info,
            None,
            vec![recipient],
            vec![],
            0,
            0,
        );

        // Save the vault using temp directory
        temp_save_vault(&metadata, temp_path).await.unwrap();

        // Load it back by name
        let loaded = temp_load_vault_by_name(&metadata.vault.sanitized_name, temp_path)
            .await
            .unwrap();

        // Verify
        assert_eq!(loaded.vault_id(), metadata.vault_id());
        assert_eq!(loaded.label(), metadata.label());
        assert_eq!(loaded.recipients().len(), 1);
        assert_eq!(loaded.recipients()[0].label, "Main Password");

        // Clean up
        temp_delete_vault_by_name(&metadata.vault.sanitized_name, temp_path)
            .await
            .unwrap();
        assert!(!temp_vault_exists_by_name(&metadata.vault.sanitized_name, temp_path).await);
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
            metadata: &VaultMetadata,
            base_dir: &Path,
        ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
            let path = base_dir.join(format!("{}.manifest", metadata.vault.sanitized_name));
            let json = serde_json::to_string_pretty(metadata)?;
            tokio::fs::write(path, json).await?;
            Ok(())
        }

        async fn temp_list_vaults(
            base_dir: &Path,
        ) -> Result<Vec<VaultMetadata>, Box<dyn std::error::Error + Send + Sync>> {
            let mut vaults = Vec::new();
            let mut entries = tokio::fs::read_dir(base_dir).await?;

            while let Some(entry) = entries.next_entry().await? {
                let path = entry.path();
                if let Some(extension) = path.extension()
                    && extension == "manifest"
                {
                    let content = tokio::fs::read_to_string(&path).await?;
                    let metadata: VaultMetadata = serde_json::from_str(&content)?;
                    vaults.push(metadata);
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

        // Create device info
        let device_info = DeviceInfo {
            machine_id: "test-machine".to_string(),
            machine_label: "test-laptop".to_string(),
            created_at: Utc::now(),
            app_version: "2.0.0".to_string(),
        };

        // Create multiple vaults with filesystem-safe names
        let metadata1 = VaultMetadata::new(
            "vault1_id".to_string(),
            "test-vault-list-1".to_string(),
            None,
            "test-vault-list-1".to_string(),
            &device_info,
            None,
            vec![],
            vec![],
            0,
            0,
        );

        let metadata2 = VaultMetadata::new(
            "vault2_id".to_string(),
            "test-vault-list-2".to_string(),
            None,
            "test-vault-list-2".to_string(),
            &device_info,
            None,
            vec![],
            vec![],
            0,
            0,
        );

        temp_save_vault(&metadata1, temp_path).await.unwrap();
        temp_save_vault(&metadata2, temp_path).await.unwrap();

        // List vaults
        let vaults = temp_list_vaults(temp_path).await.unwrap();
        assert_eq!(vaults.len(), 2);

        // Verify both vaults are present
        let vault_names: Vec<String> = vaults.iter().map(|v| v.label().to_string()).collect();
        assert!(vault_names.contains(&"test-vault-list-1".to_string()));
        assert!(vault_names.contains(&"test-vault-list-2".to_string()));

        // Clean up by name
        temp_delete_vault_by_name(&metadata1.vault.sanitized_name, temp_path)
            .await
            .unwrap();
        temp_delete_vault_by_name(&metadata2.vault.sanitized_name, temp_path)
            .await
            .unwrap();
    }
}
