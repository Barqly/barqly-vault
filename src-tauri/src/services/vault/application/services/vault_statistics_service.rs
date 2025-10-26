//! Vault Statistics Service
//!
//! Aggregates vault statistics from manifest and key registry for the R2 UI.
//! Provides real-time data about vault usage, key status, and encryption history.

use crate::prelude::*;
use crate::services::key_management::shared::KeyRegistryService;
use crate::services::key_management::shared::domain::models::key_lifecycle::KeyLifecycleStatus;
use crate::services::shared::infrastructure::{get_vault_manifest_path, get_vaults_directory};
use crate::services::vault::infrastructure::persistence::metadata::{RecipientType, VaultMetadata};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Vault status based on encryption history
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, specta::Type)]
#[serde(rename_all = "snake_case")]
pub enum VaultStatus {
    /// Never encrypted (encryption_count = 0)
    New,
    /// Has been encrypted at least once
    Active,
    /// Archive exists but manifest is missing or corrupted
    Orphaned,
    /// Manifest exists but archive is missing
    Incomplete,
}

/// Statistics for a single vault
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct VaultStatistics {
    pub vault_id: String,
    pub vault_name: String,
    pub description: Option<String>,
    pub status: VaultStatus,
    pub encryption_count: u32,
    pub created_at: DateTime<Utc>,
    pub last_encrypted_at: Option<DateTime<Utc>>,
    pub last_encrypted_by: Option<String>,
    pub file_count: usize,
    pub total_size_bytes: u64,
    pub key_statistics: KeyStatistics,
    pub archive_exists: bool,
    pub manifest_exists: bool,
}

/// Key statistics for a vault
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct KeyStatistics {
    pub total_keys: usize,
    pub active_keys: usize,
    pub orphaned_keys: usize,
    pub passphrase_keys: usize,
    pub yubikey_keys: usize,
    pub key_details: Vec<KeyDetail>,
}

/// Detailed information about a key
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct KeyDetail {
    pub key_id: String,
    pub label: String,
    pub key_type: String, // "passphrase" or "yubikey"
    pub lifecycle_status: KeyLifecycleStatus,
    pub created_at: DateTime<Utc>,
    pub last_used: Option<DateTime<Utc>>,
    pub is_available: bool,
}

/// Summary statistics across all vaults
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct GlobalVaultStatistics {
    pub total_vaults: usize,
    pub active_vaults: usize,
    pub new_vaults: usize,
    pub orphaned_vaults: usize,
    pub total_encryptions: u32,
    pub total_files: usize,
    pub total_size_bytes: u64,
    pub vault_statistics: Vec<VaultStatistics>,
}

/// Service for aggregating vault statistics
pub struct VaultStatisticsService {
    key_registry: KeyRegistryService,
}

impl VaultStatisticsService {
    /// Create a new vault statistics service
    pub fn new() -> Self {
        Self {
            key_registry: KeyRegistryService::new(),
        }
    }

    /// Get statistics for a specific vault
    pub fn get_vault_statistics(
        &self,
        vault_name: &str,
    ) -> Result<VaultStatistics, Box<dyn std::error::Error + Send + Sync>> {
        let manifest_path = get_vault_manifest_path(vault_name)?;
        let vaults_dir = get_vaults_directory()?;
        let archive_path = vaults_dir.join(format!("{}.age", vault_name));

        let manifest_exists = manifest_path.exists();
        let archive_exists = archive_path.exists();

        // Determine vault status
        let (status, manifest_opt) = if !manifest_exists && archive_exists {
            (VaultStatus::Orphaned, None)
        } else if manifest_exists && !archive_exists {
            (
                VaultStatus::Incomplete,
                self.try_load_manifest(&manifest_path),
            )
        } else if manifest_exists {
            let manifest = self.try_load_manifest(&manifest_path);
            let status = if let Some(ref m) = manifest {
                if m.encryption_revision() == 0 {
                    VaultStatus::New
                } else {
                    VaultStatus::Active
                }
            } else {
                VaultStatus::Orphaned
            };
            (status, manifest)
        } else {
            return Err(format!("Vault '{}' not found", vault_name).into());
        };

        // Build statistics from manifest if available
        if let Some(manifest) = manifest_opt {
            self.build_statistics_from_manifest(manifest, status, archive_exists, manifest_exists)
        } else {
            // Return minimal statistics for orphaned/corrupted vaults
            self.build_minimal_statistics(vault_name, status, archive_exists, manifest_exists)
        }
    }

    /// Get statistics for all vaults
    pub fn get_all_vault_statistics(
        &self,
    ) -> Result<GlobalVaultStatistics, Box<dyn std::error::Error + Send + Sync>> {
        use crate::services::vault::infrastructure::VaultRepository;

        // Use VaultRepository to get all manifests (same source as listVaults)
        let repository = VaultRepository::new();
        let manifests = tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current().block_on(async {
                repository.list_vaults().await
            })
        })?;

        debug!(
            manifest_count = manifests.len(),
            "Found vault manifests for statistics"
        );

        // Collect statistics for each vault using sanitized_name
        let mut vault_statistics = Vec::new();
        for manifest in manifests {
            let vault_name = &manifest.vault.sanitized_name;
            match self.get_vault_statistics(vault_name) {
                Ok(stats) => {
                    debug!(
                        vault_name = %vault_name,
                        file_count = stats.file_count,
                        "Retrieved vault statistics"
                    );
                    vault_statistics.push(stats);
                }
                Err(e) => {
                    warn!(
                        vault_name = %vault_name,
                        error = %e,
                        "Failed to get vault statistics, skipping"
                    );
                }
            }
        }

        // Aggregate global statistics
        let total_vaults = vault_statistics.len();
        let active_vaults = vault_statistics
            .iter()
            .filter(|v| v.status == VaultStatus::Active)
            .count();
        let new_vaults = vault_statistics
            .iter()
            .filter(|v| v.status == VaultStatus::New)
            .count();
        let orphaned_vaults = vault_statistics
            .iter()
            .filter(|v| v.status == VaultStatus::Orphaned)
            .count();
        let total_encryptions: u32 = vault_statistics.iter().map(|v| v.encryption_count).sum();
        let total_files: usize = vault_statistics.iter().map(|v| v.file_count).sum();
        let total_size_bytes: u64 = vault_statistics.iter().map(|v| v.total_size_bytes).sum();

        Ok(GlobalVaultStatistics {
            total_vaults,
            active_vaults,
            new_vaults,
            orphaned_vaults,
            total_encryptions,
            total_files,
            total_size_bytes,
            vault_statistics,
        })
    }

    /// Build statistics from vault manifest
    fn build_statistics_from_manifest(
        &self,
        manifest: VaultMetadata,
        status: VaultStatus,
        archive_exists: bool,
        manifest_exists: bool,
    ) -> Result<VaultStatistics, Box<dyn std::error::Error + Send + Sync>> {
        let key_statistics = self.build_key_statistics(&manifest)?;

        Ok(VaultStatistics {
            vault_id: manifest.vault_id().to_string(),
            vault_name: manifest.label().to_string(),
            description: manifest.vault.description.clone(),
            status,
            encryption_count: manifest.encryption_revision(),
            created_at: manifest.created_at(),
            last_encrypted_at: manifest.last_encrypted_at(),
            last_encrypted_by: manifest
                .last_encrypted_by()
                .map(|by| by.machine_label.clone()),
            file_count: manifest.file_count(),
            total_size_bytes: manifest.total_size(),
            key_statistics,
            archive_exists,
            manifest_exists,
        })
    }

    /// Build minimal statistics for corrupted/orphaned vaults
    fn build_minimal_statistics(
        &self,
        vault_name: &str,
        status: VaultStatus,
        archive_exists: bool,
        manifest_exists: bool,
    ) -> Result<VaultStatistics, Box<dyn std::error::Error + Send + Sync>> {
        // Try to get archive size if it exists
        let total_size_bytes = if archive_exists {
            let vaults_dir = get_vaults_directory()?;
            let archive_path = vaults_dir.join(format!("{}.age", vault_name));
            std::fs::metadata(&archive_path)
                .map(|m| m.len())
                .unwrap_or(0)
        } else {
            0
        };

        Ok(VaultStatistics {
            vault_id: format!("orphaned_{}", vault_name),
            vault_name: vault_name.to_string(),
            description: None,
            status,
            encryption_count: 0,
            created_at: Utc::now(), // We don't know the real creation date
            last_encrypted_at: None,
            last_encrypted_by: None,
            file_count: 0,
            total_size_bytes,
            key_statistics: KeyStatistics {
                total_keys: 0,
                active_keys: 0,
                orphaned_keys: 0,
                passphrase_keys: 0,
                yubikey_keys: 0,
                key_details: vec![],
            },
            archive_exists,
            manifest_exists,
        })
    }

    /// Build key statistics from manifest
    fn build_key_statistics(
        &self,
        manifest: &VaultMetadata,
    ) -> Result<KeyStatistics, Box<dyn std::error::Error + Send + Sync>> {
        let mut key_details = Vec::new();
        let mut active_keys = 0;
        let mut orphaned_keys = 0;
        let mut passphrase_keys = 0;
        let mut yubikey_keys = 0;

        // Get registry for lifecycle status
        let registry = self.key_registry.load_registry()?;

        for recipient in manifest.recipients() {
            // Get lifecycle status from registry
            let lifecycle_status = registry
                .get_key(&recipient.key_id)
                .map(|entry| entry.lifecycle_status())
                .unwrap_or(KeyLifecycleStatus::PreActivation);

            // Get last used from registry
            let last_used = registry
                .get_key(&recipient.key_id)
                .and_then(|entry| entry.last_used());

            // Determine key type and availability
            let (key_type, is_available) = match &recipient.recipient_type {
                RecipientType::Passphrase { .. } => {
                    passphrase_keys += 1;
                    ("passphrase".to_string(), true)
                }
                RecipientType::YubiKey { .. } => {
                    yubikey_keys += 1;
                    // For now, assume YubiKey is available if it's in the registry
                    // Real availability check would require hardware detection
                    ("yubikey".to_string(), lifecycle_status.is_operational())
                }
            };

            // Count active vs orphaned
            if lifecycle_status == KeyLifecycleStatus::Active {
                active_keys += 1;
            } else if lifecycle_status == KeyLifecycleStatus::Suspended
                || lifecycle_status == KeyLifecycleStatus::PreActivation
            {
                orphaned_keys += 1;
            }

            key_details.push(KeyDetail {
                key_id: recipient.key_id.clone(),
                label: recipient.label.clone(),
                key_type,
                lifecycle_status,
                created_at: recipient.created_at,
                last_used,
                is_available,
            });
        }

        Ok(KeyStatistics {
            total_keys: key_details.len(),
            active_keys,
            orphaned_keys,
            passphrase_keys,
            yubikey_keys,
            key_details,
        })
    }

    /// Try to load a manifest, returning None if it fails
    fn try_load_manifest(&self, path: &Path) -> Option<VaultMetadata> {
        match std::fs::read_to_string(path) {
            Ok(content) => match serde_json::from_str::<VaultMetadata>(&content) {
                Ok(manifest) => {
                    if manifest.validate().is_ok() {
                        Some(manifest)
                    } else {
                        warn!(path = %path.display(), "Manifest validation failed");
                        None
                    }
                }
                Err(e) => {
                    warn!(path = %path.display(), error = %e, "Failed to parse manifest");
                    None
                }
            },
            Err(e) => {
                warn!(path = %path.display(), error = %e, "Failed to read manifest");
                None
            }
        }
    }

    /// Get statistics with caching (for performance optimization)
    pub fn get_cached_statistics(
        &self,
        vault_name: &str,
        cache: &mut HashMap<String, (VaultStatistics, std::time::Instant)>,
        cache_duration: std::time::Duration,
    ) -> Result<VaultStatistics, Box<dyn std::error::Error + Send + Sync>> {
        // Check cache
        if let Some((cached_stats, timestamp)) = cache.get(vault_name)
            && timestamp.elapsed() < cache_duration
        {
            debug!(vault_name, "Returning cached vault statistics");
            return Ok(cached_stats.clone());
        }

        // Get fresh statistics
        let stats = self.get_vault_statistics(vault_name)?;

        // Update cache
        cache.insert(
            vault_name.to_string(),
            (stats.clone(), std::time::Instant::now()),
        );

        Ok(stats)
    }
}

impl Default for VaultStatisticsService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_status_determination() {
        // Test status logic
        assert_eq!(
            VaultStatus::New,
            VaultStatus::New // New vault with no encryptions
        );
        assert_eq!(
            VaultStatus::Active,
            VaultStatus::Active // Vault with at least one encryption
        );
        assert_eq!(
            VaultStatus::Orphaned,
            VaultStatus::Orphaned // Archive exists but no manifest
        );
        assert_eq!(
            VaultStatus::Incomplete,
            VaultStatus::Incomplete // Manifest exists but no archive
        );
    }

    #[test]
    fn test_statistics_service_creation() {
        let service = VaultStatisticsService::new();
        // Service should be created successfully
        let _ = service;
    }
}
