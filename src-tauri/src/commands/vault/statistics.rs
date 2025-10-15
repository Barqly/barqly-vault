//! Vault Statistics Commands
//!
//! Provides commands for retrieving vault statistics for the R2 UI.

use crate::prelude::*;
use crate::services::vault::application::services::{
    GlobalVaultStatistics, VaultStatistics, VaultStatisticsService,
};
use serde::{Deserialize, Serialize};

/// Request for getting single vault statistics
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct GetVaultStatisticsRequest {
    /// The vault ID (deterministic unique identifier)
    pub vault_id: String,
}

/// Response containing vault statistics
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct GetVaultStatisticsResponse {
    pub success: bool,
    pub statistics: Option<VaultStatistics>,
    pub error: Option<String>,
}

/// Request for getting all vault statistics (can be empty)
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct GetAllVaultStatisticsRequest {
    /// Optional filter by vault status
    pub status_filter: Option<String>, // "new", "active", "orphaned", "incomplete"
}

/// Response containing global vault statistics
#[derive(Debug, Clone, Serialize, Deserialize, specta::Type)]
pub struct GetAllVaultStatisticsResponse {
    pub success: bool,
    pub statistics: Option<GlobalVaultStatistics>,
    pub error: Option<String>,
}

/// Get statistics for a specific vault
///
/// This command aggregates vault statistics from the manifest and key registry.
/// It provides real-time data about vault usage, key status, and encryption history.
#[tauri::command]
#[specta::specta]
pub async fn get_vault_statistics(
    request: GetVaultStatisticsRequest,
) -> Result<GetVaultStatisticsResponse, String> {
    debug!(vault_id = %request.vault_id, "Getting vault statistics");

    // Validate vault ID
    if request.vault_id.is_empty() {
        return Ok(GetVaultStatisticsResponse {
            success: false,
            statistics: None,
            error: Some("Vault ID cannot be empty".to_string()),
        });
    }

    // Get vault to retrieve sanitized name
    use crate::services::vault::VaultManager;
    let vault_manager = VaultManager::new();

    let vault = match vault_manager.get_vault(&request.vault_id).await {
        Ok(v) => v,
        Err(e) => {
            return Ok(GetVaultStatisticsResponse {
                success: false,
                statistics: None,
                error: Some(format!("Vault not found: {}", e)),
            });
        }
    };

    let sanitized_name = &vault.vault.sanitized_name;

    // Create service and get statistics
    let service = VaultStatisticsService::new();

    match service.get_vault_statistics(sanitized_name) {
        Ok(statistics) => {
            info!(
                vault_id = %request.vault_id,
                status = ?statistics.status,
                key_count = statistics.key_statistics.total_keys,
                file_count = statistics.file_count,
                "Successfully retrieved vault statistics"
            );

            Ok(GetVaultStatisticsResponse {
                success: true,
                statistics: Some(statistics),
                error: None,
            })
        }
        Err(e) => {
            error!(
                vault_id = %request.vault_id,
                error = %e,
                "Failed to get vault statistics"
            );

            Ok(GetVaultStatisticsResponse {
                success: false,
                statistics: None,
                error: Some(format!("Failed to get vault statistics: {}", e)),
            })
        }
    }
}

/// Get statistics for all vaults
///
/// This command retrieves aggregated statistics across all vaults in the system.
/// It provides a comprehensive overview of vault usage and key management.
#[tauri::command]
#[specta::specta]
pub async fn get_all_vault_statistics(
    request: GetAllVaultStatisticsRequest,
) -> Result<GetAllVaultStatisticsResponse, String> {
    debug!(?request.status_filter, "Getting all vault statistics");

    // Create service and get statistics
    let service = VaultStatisticsService::new();

    match service.get_all_vault_statistics() {
        Ok(mut statistics) => {
            // Apply status filter if provided
            if let Some(filter) = request.status_filter {
                use crate::services::vault::application::services::VaultStatus;

                let status = match filter.to_lowercase().as_str() {
                    "new" => Some(VaultStatus::New),
                    "active" => Some(VaultStatus::Active),
                    "orphaned" => Some(VaultStatus::Orphaned),
                    "incomplete" => Some(VaultStatus::Incomplete),
                    _ => None,
                };

                if let Some(status) = status {
                    statistics.vault_statistics.retain(|v| v.status == status);

                    // Recalculate aggregated counts
                    statistics.total_vaults = statistics.vault_statistics.len();
                    statistics.active_vaults = statistics
                        .vault_statistics
                        .iter()
                        .filter(|v| v.status == VaultStatus::Active)
                        .count();
                    statistics.new_vaults = statistics
                        .vault_statistics
                        .iter()
                        .filter(|v| v.status == VaultStatus::New)
                        .count();
                    statistics.orphaned_vaults = statistics
                        .vault_statistics
                        .iter()
                        .filter(|v| v.status == VaultStatus::Orphaned)
                        .count();
                    statistics.total_encryptions = statistics
                        .vault_statistics
                        .iter()
                        .map(|v| v.encryption_count)
                        .sum();
                    statistics.total_files = statistics
                        .vault_statistics
                        .iter()
                        .map(|v| v.file_count)
                        .sum();
                    statistics.total_size_bytes = statistics
                        .vault_statistics
                        .iter()
                        .map(|v| v.total_size_bytes)
                        .sum();
                }
            }

            info!(
                total_vaults = statistics.total_vaults,
                active_vaults = statistics.active_vaults,
                orphaned_vaults = statistics.orphaned_vaults,
                "Successfully retrieved all vault statistics"
            );

            Ok(GetAllVaultStatisticsResponse {
                success: true,
                statistics: Some(statistics),
                error: None,
            })
        }
        Err(e) => {
            error!(error = %e, "Failed to get all vault statistics");

            Ok(GetAllVaultStatisticsResponse {
                success: false,
                statistics: None,
                error: Some(format!("Failed to get vault statistics: {}", e)),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_request_validation() {
        // Test empty vault ID
        let request = GetVaultStatisticsRequest {
            vault_id: "".to_string(),
        };
        assert!(request.vault_id.is_empty());

        // Test valid vault ID
        let request = GetVaultStatisticsRequest {
            vault_id: "7Bw3eqLGahnF5DXZyMa8Jz".to_string(),
        };
        assert!(!request.vault_id.is_empty());
    }

    #[test]
    fn test_status_filter() {
        let request = GetAllVaultStatisticsRequest {
            status_filter: Some("active".to_string()),
        };
        assert_eq!(request.status_filter, Some("active".to_string()));

        let request = GetAllVaultStatisticsRequest {
            status_filter: None,
        };
        assert!(request.status_filter.is_none());
    }
}
