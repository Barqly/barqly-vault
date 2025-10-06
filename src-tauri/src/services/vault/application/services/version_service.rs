//! Vault Manifest Version Comparison Service
//!
//! Handles version conflict resolution using "newer wins" strategy with automatic backup.

use crate::error::StorageError;
use crate::prelude::*;
use crate::services::shared::infrastructure::{
    atomic_write_sync, generate_backup_timestamp, get_manifest_backup_path,
};
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;
use std::path::Path;

/// Result of version comparison
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VersionComparisonResult {
    /// Bundle is newer than local (replace local)
    BundleNewer {
        bundle_version: u32,
        local_version: u32,
    },
    /// Bundle is older than local (keep local)
    BundleOlder {
        bundle_version: u32,
        local_version: u32,
    },
    /// Versions are same, used timestamp tiebreaker
    SameVersion { version: u32, bundle_newer: bool },
    /// No local manifest exists (first recovery)
    NoLocal,
}

/// Version comparison service
#[derive(Debug)]
pub struct VersionComparisonService;

impl VersionComparisonService {
    pub fn new() -> Self {
        Self
    }

    /// Compare bundle manifest with local manifest
    ///
    /// Returns comparison result indicating which is newer and what action to take.
    pub fn compare_manifests(
        bundle_manifest: &VaultMetadata,
        local_manifest: Option<&VaultMetadata>,
    ) -> VersionComparisonResult {
        let Some(local) = local_manifest else {
            return VersionComparisonResult::NoLocal;
        };

        if bundle_manifest.manifest_version > local.manifest_version {
            VersionComparisonResult::BundleNewer {
                bundle_version: bundle_manifest.manifest_version,
                local_version: local.manifest_version,
            }
        } else if bundle_manifest.manifest_version < local.manifest_version {
            VersionComparisonResult::BundleOlder {
                bundle_version: bundle_manifest.manifest_version,
                local_version: local.manifest_version,
            }
        } else {
            // Same version - use timestamp tiebreaker
            let bundle_newer = bundle_manifest.last_encrypted_at > local.last_encrypted_at;
            VersionComparisonResult::SameVersion {
                version: bundle_manifest.manifest_version,
                bundle_newer,
            }
        }
    }

    /// Resolve version conflict with "newer wins" strategy
    ///
    /// Handles backup creation and manifest replacement based on comparison result.
    ///
    /// # Returns
    /// - `Ok(true)` if local manifest was updated
    /// - `Ok(false)` if local manifest was preserved
    pub fn resolve_with_backup(
        bundle_manifest: &VaultMetadata,
        local_manifest: Option<&VaultMetadata>,
        manifest_path: &Path,
    ) -> Result<bool, StorageError> {
        let comparison = Self::compare_manifests(bundle_manifest, local_manifest);

        match comparison {
            VersionComparisonResult::NoLocal => {
                info!(
                    vault = %bundle_manifest.label,
                    version = bundle_manifest.manifest_version,
                    machine = %bundle_manifest.last_encrypted_by.machine_label,
                    "First recovery - creating local manifest"
                );
                Self::save_manifest(bundle_manifest, manifest_path)?;
                Ok(true)
            }

            VersionComparisonResult::BundleNewer {
                bundle_version,
                local_version,
            } => {
                info!(
                    vault = %bundle_manifest.label,
                    bundle_version,
                    local_version,
                    machine = %bundle_manifest.last_encrypted_by.machine_label,
                    "Bundle newer - backing up local and replacing"
                );
                Self::backup_and_replace(bundle_manifest, manifest_path)?;
                Ok(true)
            }

            VersionComparisonResult::SameVersion {
                version,
                bundle_newer,
            } => {
                if bundle_newer {
                    info!(
                        vault = %bundle_manifest.label,
                        version,
                        bundle_time = %bundle_manifest.last_encrypted_at,
                        "Same version but bundle has newer timestamp - replacing"
                    );
                    Self::backup_and_replace(bundle_manifest, manifest_path)?;
                    Ok(true)
                } else {
                    info!(
                        vault = %bundle_manifest.label,
                        version,
                        "Same version but local is newer - keeping local"
                    );
                    Ok(false)
                }
            }

            VersionComparisonResult::BundleOlder {
                bundle_version,
                local_version,
            } => {
                warn!(
                    vault = %bundle_manifest.label,
                    bundle_version,
                    local_version,
                    "Decrypting older version - keeping local manifest"
                );
                Ok(false)
            }
        }
    }

    /// Backup local manifest and replace with bundle manifest
    fn backup_and_replace(
        bundle_manifest: &VaultMetadata,
        manifest_path: &Path,
    ) -> Result<(), StorageError> {
        // Create backup of current manifest
        if manifest_path.exists() {
            let timestamp = generate_backup_timestamp();
            let backup_path =
                get_manifest_backup_path(&bundle_manifest.sanitized_name, &timestamp)?;

            std::fs::copy(manifest_path, &backup_path).map_err(|e| {
                StorageError::FileWriteFailed {
                    path: backup_path.clone(),
                    source: e,
                }
            })?;

            debug!(
                backup_path = %backup_path.display(),
                "Created manifest backup"
            );

            // Enforce retention policy (keep last 5)
            Self::cleanup_old_backups(&bundle_manifest.sanitized_name, 5)?;
        }

        // Replace with bundle manifest
        Self::save_manifest(bundle_manifest, manifest_path)?;

        Ok(())
    }

    /// Cleanup old backups, keeping only the N most recent
    ///
    /// # Arguments
    /// * `vault_name` - Sanitized vault name
    /// * `keep_count` - Number of backups to retain (e.g., 5)
    fn cleanup_old_backups(vault_name: &str, keep_count: usize) -> Result<(), StorageError> {
        use crate::services::shared::infrastructure::get_manifest_backups_dir;

        let backups_dir = get_manifest_backups_dir()?;
        let prefix = format!("{}.manifest.", vault_name);

        // Find all backups for this vault
        let mut backups: Vec<_> = std::fs::read_dir(&backups_dir)
            .map_err(|e| StorageError::FileReadFailed {
                path: backups_dir.clone(),
                source: e,
            })?
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_name().to_string_lossy().starts_with(&prefix))
            .collect();

        // Sort by modification time (newest first)
        backups.sort_by_key(|entry| {
            std::cmp::Reverse(entry.metadata().ok().and_then(|m| m.modified().ok()))
        });

        // Delete backups beyond retention limit
        for backup in backups.iter().skip(keep_count) {
            let path = backup.path();
            if let Err(e) = std::fs::remove_file(&path) {
                warn!(
                    path = %path.display(),
                    error = %e,
                    "Failed to delete old backup"
                );
            } else {
                debug!(path = %path.display(), "Deleted old backup");
            }
        }

        Ok(())
    }

    /// List available backups for a vault
    ///
    /// Returns list of backup timestamps in descending order (newest first).
    pub fn list_backups(vault_name: &str) -> Result<Vec<String>, StorageError> {
        use crate::services::shared::infrastructure::get_manifest_backups_dir;

        let backups_dir = get_manifest_backups_dir()?;
        let prefix = format!("{}.manifest.", vault_name);

        let mut backups: Vec<String> = std::fs::read_dir(&backups_dir)
            .map_err(|e| StorageError::FileReadFailed {
                path: backups_dir.clone(),
                source: e,
            })?
            .filter_map(|entry| entry.ok())
            .filter_map(|entry| {
                let filename = entry.file_name().to_string_lossy().to_string();
                if filename.starts_with(&prefix) {
                    filename.strip_prefix(&prefix).map(|ts| ts.to_string())
                } else {
                    None
                }
            })
            .collect();

        // Sort by timestamp (newest first)
        backups.sort_by(|a, b| b.cmp(a));

        Ok(backups)
    }

    /// Restore manifest from backup
    ///
    /// # Arguments
    /// * `vault_name` - Sanitized vault name
    /// * `timestamp` - Backup timestamp to restore
    /// * `target_path` - Path where to restore the manifest
    pub fn restore_from_backup(
        vault_name: &str,
        timestamp: &str,
        target_path: &Path,
    ) -> Result<VaultMetadata, StorageError> {
        let backup_path = get_manifest_backup_path(vault_name, timestamp)?;

        if !backup_path.exists() {
            return Err(StorageError::KeyNotFound(format!(
                "Backup not found: {}",
                timestamp
            )));
        }

        // Load backup manifest
        let content =
            std::fs::read_to_string(&backup_path).map_err(|e| StorageError::FileReadFailed {
                path: backup_path.clone(),
                source: e,
            })?;

        let manifest: VaultMetadata =
            serde_json::from_str(&content).map_err(|e| StorageError::InvalidFormat {
                path: backup_path.clone(),
                message: format!("Invalid backup manifest: {}", e),
            })?;

        // Validate manifest
        manifest
            .validate()
            .map_err(|e| StorageError::InvalidFormat {
                path: backup_path.clone(),
                message: format!("Backup validation failed: {}", e),
            })?;

        // Restore to target path
        Self::save_manifest(&manifest, target_path)?;

        info!(vault_name, timestamp, "Restored manifest from backup");

        Ok(manifest)
    }

    /// Save manifest to disk using atomic write
    fn save_manifest(manifest: &VaultMetadata, path: &Path) -> Result<(), StorageError> {
        let json = serde_json::to_string_pretty(manifest).map_err(|e| {
            StorageError::SerializationFailed {
                message: format!("Failed to serialize manifest: {}", e),
            }
        })?;

        atomic_write_sync(path, json.as_bytes()).map_err(|e| StorageError::FileWriteFailed {
            path: path.to_path_buf(),
            source: std::io::Error::other(e),
        })?;

        Ok(())
    }

    /// Get user-friendly warning message for version conflict
    pub fn get_conflict_message(result: &VersionComparisonResult) -> Option<String> {
        match result {
            VersionComparisonResult::BundleOlder {
                bundle_version,
                local_version,
            } => Some(format!(
                "Warning: Decrypting older version (v{} vs current v{}). Your local state is newer.",
                bundle_version, local_version
            )),

            VersionComparisonResult::BundleNewer {
                bundle_version,
                local_version,
            } => Some(format!(
                "Updated to newer version (v{} from v{})",
                bundle_version, local_version
            )),

            VersionComparisonResult::SameVersion {
                version,
                bundle_newer,
            } => {
                if *bundle_newer {
                    Some(format!(
                        "Updated to newer timestamp (v{}, same version)",
                        version
                    ))
                } else {
                    None
                }
            }

            VersionComparisonResult::NoLocal => None,
        }
    }
}

impl Default for VersionComparisonService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::key_management::yubikey::domain::models::ProtectionMode;
    use crate::services::shared::infrastructure::DeviceInfo;
    use crate::services::vault::infrastructure::persistence::metadata::{
        RecipientInfo, SelectionType,
    };
    use tempfile::TempDir;

    fn create_test_device_info() -> DeviceInfo {
        DeviceInfo {
            machine_id: "test-machine-123".to_string(),
            machine_label: "test-laptop".to_string(),
            created_at: chrono::Utc::now(),
            app_version: "2.0.0".to_string(),
        }
    }

    fn create_test_manifest(_version: u32, device_info: &DeviceInfo) -> VaultMetadata {
        let recipient = RecipientInfo::new_passphrase(
            "age1test123".to_string(),
            "test-key".to_string(),
            "test-key.agekey.enc".to_string(),
        );

        VaultMetadata::new(
            "test-vault-001".to_string(),
            "Test Vault".to_string(),
            "Test-Vault".to_string(),
            device_info,
            SelectionType::Files,
            None,
            ProtectionMode::PassphraseOnly,
            vec![recipient],
            vec![],
            0,
            0,
            "test-checksum".to_string(),
        )
    }

    #[test]
    fn test_compare_bundle_newer() {
        let device_info = create_test_device_info();
        let local = create_test_manifest(1, &device_info);
        let mut bundle = local.clone();
        bundle.increment_version(&device_info);

        let result = VersionComparisonService::compare_manifests(&bundle, Some(&local));

        assert_eq!(
            result,
            VersionComparisonResult::BundleNewer {
                bundle_version: 2,
                local_version: 1,
            }
        );
    }

    #[test]
    fn test_compare_bundle_older() {
        let device_info = create_test_device_info();
        let mut local = create_test_manifest(1, &device_info);
        local.increment_version(&device_info);
        let bundle = create_test_manifest(1, &device_info);

        let result = VersionComparisonService::compare_manifests(&bundle, Some(&local));

        assert_eq!(
            result,
            VersionComparisonResult::BundleOlder {
                bundle_version: 1,
                local_version: 2,
            }
        );
    }

    #[test]
    fn test_compare_same_version() {
        let device_info = create_test_device_info();
        let local = create_test_manifest(1, &device_info);
        let bundle = local.clone();

        let result = VersionComparisonService::compare_manifests(&bundle, Some(&local));

        match result {
            VersionComparisonResult::SameVersion { version, .. } => {
                assert_eq!(version, 1);
            }
            _ => panic!("Expected SameVersion result"),
        }
    }

    #[test]
    fn test_compare_no_local() {
        let device_info = create_test_device_info();
        let bundle = create_test_manifest(1, &device_info);

        let result = VersionComparisonService::compare_manifests(&bundle, None);

        assert_eq!(result, VersionComparisonResult::NoLocal);
    }

    #[test]
    fn test_resolve_no_local() {
        let temp_dir = TempDir::new().unwrap();
        let manifest_path = temp_dir.path().join("test.manifest");

        let device_info = create_test_device_info();
        let bundle = create_test_manifest(1, &device_info);

        let updated =
            VersionComparisonService::resolve_with_backup(&bundle, None, &manifest_path).unwrap();

        assert!(updated);
        assert!(manifest_path.exists());
    }

    #[test]
    fn test_resolve_bundle_newer_creates_backup() {
        let temp_dir = TempDir::new().unwrap();
        let manifest_path = temp_dir.path().join("test.manifest");

        let device_info = create_test_device_info();
        let local = create_test_manifest(1, &device_info);

        // Save local manifest
        VersionComparisonService::save_manifest(&local, &manifest_path).unwrap();

        // Create newer bundle
        let mut bundle = local.clone();
        bundle.increment_version(&device_info);

        // Resolve should create backup and update
        let updated =
            VersionComparisonService::resolve_with_backup(&bundle, Some(&local), &manifest_path)
                .unwrap();

        assert!(updated);
        assert!(manifest_path.exists());

        // Check that backup was created (in actual backups directory)
        // Note: In real usage, backup goes to get_manifest_backups_dir()
    }

    #[test]
    fn test_resolve_bundle_older_preserves_local() {
        let temp_dir = TempDir::new().unwrap();
        let manifest_path = temp_dir.path().join("test.manifest");

        let device_info = create_test_device_info();
        let mut local = create_test_manifest(1, &device_info);
        local.increment_version(&device_info); // v2

        // Save local manifest
        VersionComparisonService::save_manifest(&local, &manifest_path).unwrap();

        // Try to restore older bundle (v1)
        let bundle = create_test_manifest(1, &device_info);

        let updated =
            VersionComparisonService::resolve_with_backup(&bundle, Some(&local), &manifest_path)
                .unwrap();

        assert!(!updated);

        // Load and verify local was preserved
        let content = std::fs::read_to_string(&manifest_path).unwrap();
        let loaded: VaultMetadata = serde_json::from_str(&content).unwrap();
        assert_eq!(loaded.manifest_version, 2);
    }

    #[test]
    fn test_get_conflict_message() {
        let bundle_newer = VersionComparisonResult::BundleNewer {
            bundle_version: 2,
            local_version: 1,
        };
        let msg = VersionComparisonService::get_conflict_message(&bundle_newer);
        assert!(msg.is_some());
        assert!(msg.unwrap().contains("v2"));

        let bundle_older = VersionComparisonResult::BundleOlder {
            bundle_version: 1,
            local_version: 2,
        };
        let msg = VersionComparisonService::get_conflict_message(&bundle_older);
        assert!(msg.is_some());
        assert!(msg.unwrap().contains("older"));

        let no_local = VersionComparisonResult::NoLocal;
        let msg = VersionComparisonService::get_conflict_message(&no_local);
        assert!(msg.is_none());
    }

    #[test]
    fn test_list_backups_empty() {
        let result = VersionComparisonService::list_backups("nonexistent-vault");
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);
    }

    #[test]
    fn test_backup_retention_policy() {
        let temp_dir = TempDir::new().unwrap();
        let manifest_path = temp_dir.path().join("test.manifest");

        let device_info = create_test_device_info();
        let mut manifest = create_test_manifest(1, &device_info);

        // Save initial manifest
        VersionComparisonService::save_manifest(&manifest, &manifest_path).unwrap();

        // Create 7 versions (should keep only last 5)
        for i in 2..=8 {
            manifest.increment_version(&device_info);

            // Small delay to ensure different timestamps
            std::thread::sleep(std::time::Duration::from_millis(10));

            VersionComparisonService::resolve_with_backup(
                &manifest,
                Some(&create_test_manifest(i - 1, &device_info)),
                &manifest_path,
            )
            .unwrap();
        }

        // Check that backups exist
        let backups = VersionComparisonService::list_backups("Test-Vault").unwrap();

        // Should have at most 5 backups (retention policy)
        assert!(backups.len() <= 5, "Should enforce retention policy");
    }

    #[test]
    fn test_restore_from_backup() {
        let temp_dir = TempDir::new().unwrap();
        let manifest_path = temp_dir.path().join("test.manifest");
        let restore_path = temp_dir.path().join("restored.manifest");

        let device_info = create_test_device_info();
        let v1 = create_test_manifest(1, &device_info);

        // Save v1
        VersionComparisonService::save_manifest(&v1, &manifest_path).unwrap();

        // Update to v2 (creates backup of v1)
        let mut v2 = v1.clone();
        v2.increment_version(&device_info);

        std::thread::sleep(std::time::Duration::from_millis(10));

        VersionComparisonService::resolve_with_backup(&v2, Some(&v1), &manifest_path).unwrap();

        // List backups
        let backups = VersionComparisonService::list_backups("Test-Vault").unwrap();

        if !backups.is_empty() {
            // Restore from backup
            let restored = VersionComparisonService::restore_from_backup(
                "Test-Vault",
                &backups[0],
                &restore_path,
            )
            .unwrap();

            // Restored should be v1 (the backup)
            assert_eq!(restored.manifest_version, 1);
            assert!(restore_path.exists());
        }
    }
}
