//! Bootstrap Service
//!
//! Handles application startup initialization: device identity, manifest scanning,
//! and registry synchronization from vault manifests.

use crate::error::StorageError;
use crate::prelude::*;
use crate::services::key_management::shared::KeyRegistry;
use crate::services::key_management::shared::application::services::registry_service::{
    KeyRegistryService, MergeStrategy,
};
use crate::services::shared::infrastructure::{DeviceInfo, get_vaults_manifest_dir};
use crate::services::vault::infrastructure::persistence::metadata::VaultMetadata;

/// Bootstrap service for app initialization
#[derive(Debug)]
pub struct BootstrapService;

impl BootstrapService {
    pub fn new() -> Self {
        Self
    }

    /// Bootstrap application state on startup
    ///
    /// Performs:
    /// 1. Load/generate device.json
    /// 2. Scan vaults/ directory for manifests
    /// 3. Load key registry
    /// 4. Additive merge: manifests → registry
    /// 5. Detect and merge YubiKeys (TODO - future)
    /// 6. Save updated registry
    pub async fn bootstrap(&self) -> Result<BootstrapResult, StorageError> {
        info!("Starting application bootstrap");

        // Step 1: Load or generate device identity
        let device_info = DeviceInfo::load_or_create("2.0.0")?;

        info!(
            machine_id = %device_info.machine_id,
            machine_label = %device_info.machine_label,
            "Device identity loaded"
        );

        // Step 2: Scan for vault manifests
        let manifests = self.scan_vault_manifests().await?;

        info!(manifest_count = manifests.len(), "Scanned vault manifests");

        // Step 3: Load or create key registry
        let mut registry = KeyRegistry::load().map_err(|e| StorageError::InvalidFormat {
            path: std::path::PathBuf::from("registry"),
            message: format!("Failed to load registry: {}", e),
        })?;

        let initial_key_count = registry.keys.len();

        // Step 4: Additive merge from manifests to registry
        let merge_stats = self.merge_manifests_to_registry(&mut registry, &manifests)?;

        // Step 5: TODO - Detect and merge YubiKeys
        // let yubikey_stats = self.detect_and_merge_yubikeys(&mut registry).await?;

        // Step 6: Save updated registry (atomic write)
        registry
            .save()
            .map_err(|e| StorageError::SerializationFailed {
                message: format!("Failed to save registry: {}", e),
            })?;

        info!(
            initial_keys = initial_key_count,
            final_keys = registry.keys.len(),
            keys_added = merge_stats.keys_added,
            manifests_processed = merge_stats.manifests_processed,
            "Bootstrap completed successfully"
        );

        Ok(BootstrapResult {
            device_info,
            manifests_found: manifests.len(),
            keys_before: initial_key_count,
            keys_after: registry.keys.len(),
            keys_added: merge_stats.keys_added,
        })
    }

    /// Scan vaults manifest directory for all .manifest files
    async fn scan_vault_manifests(&self) -> Result<Vec<VaultMetadata>, StorageError> {
        let vaults_manifest_dir = get_vaults_manifest_dir()?;

        if !vaults_manifest_dir.exists() {
            info!("Vaults manifest directory doesn't exist yet, creating");
            return Ok(Vec::new());
        }

        let mut manifests = Vec::new();

        let entries =
            std::fs::read_dir(&vaults_manifest_dir).map_err(|e| StorageError::FileReadFailed {
                path: vaults_manifest_dir.clone(),
                source: e,
            })?;

        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();

            // Only process .manifest files
            if path.extension().is_some_and(|ext| ext == "manifest") {
                match std::fs::read_to_string(&path) {
                    Ok(content) => match serde_json::from_str::<VaultMetadata>(&content) {
                        Ok(manifest) => {
                            debug!(
                                vault = %manifest.label(),
                                revision = manifest.versioning.revision,
                                recipients = manifest.recipients().len(),
                                "Loaded vault manifest"
                            );
                            manifests.push(manifest);
                        }
                        Err(e) => {
                            warn!(
                                path = %path.display(),
                                error = %e,
                                "Failed to parse manifest file, skipping"
                            );
                        }
                    },
                    Err(e) => {
                        warn!(
                            path = %path.display(),
                            error = %e,
                            "Failed to read manifest file, skipping"
                        );
                    }
                }
            }
        }

        Ok(manifests)
    }

    /// Merge recipients from manifests into registry (additive only)
    ///
    /// Never removes keys from registry - preserves unattached keys.
    fn merge_manifests_to_registry(
        &self,
        registry: &mut KeyRegistry,
        manifests: &[VaultMetadata],
    ) -> Result<MergeStatistics, StorageError> {
        let registry_service = KeyRegistryService::new();
        let mut total_keys_added = 0;

        for manifest in manifests {
            let keys_added = registry_service
                .merge_keys_from_manifest(
                    manifest,
                    manifest.vault_id(),
                    MergeStrategy::Additive, // Bootstrap uses additive strategy
                )
                .map_err(|e| {
                    error!(error = %e, "Failed to merge keys from manifest");
                    StorageError::InvalidMetadata(format!("Failed to merge keys: {}", e))
                })?;
            total_keys_added += keys_added;
        }

        // Reload registry to update the passed-in registry reference
        *registry = registry_service.load_registry().map_err(|e| {
            error!(error = %e, "Failed to reload registry after merge");
            StorageError::InvalidMetadata(format!("Failed to reload registry: {}", e))
        })?;

        Ok(MergeStatistics {
            manifests_processed: manifests.len(),
            keys_added: total_keys_added,
        })
    }
}

impl Default for BootstrapService {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of bootstrap operation
#[derive(Debug, Clone)]
pub struct BootstrapResult {
    pub device_info: DeviceInfo,
    pub manifests_found: usize,
    pub keys_before: usize,
    pub keys_after: usize,
    pub keys_added: usize,
}

/// Statistics from manifest merge operation
#[derive(Debug, Clone)]
struct MergeStatistics {
    manifests_processed: usize,
    keys_added: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bootstrap_service_creation() {
        let _service = BootstrapService::new();
    }

    // NOTE: Tests for generate_key_id and recipient_to_key_entry moved to KeyRegistryService tests
}
