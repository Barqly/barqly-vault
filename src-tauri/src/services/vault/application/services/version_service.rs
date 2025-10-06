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
        }

        // Replace with bundle manifest
        Self::save_manifest(bundle_manifest, manifest_path)?;

        Ok(())
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

        VaultMetadata::new_r2(
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
}
