//! Vault CRUD operations
//!
//! Commands for creating, listing, and managing vaults.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::services::vault::VaultManager;
use crate::services::vault::domain::models::VaultSummary;
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// Input for creating a new vault
#[derive(Debug, Deserialize, specta::Type)]
pub struct CreateVaultRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Response from vault creation
#[derive(Debug, Serialize, specta::Type)]
pub struct CreateVaultResponse {
    pub vault: VaultSummary,
}

/// Response containing list of vaults
#[derive(Debug, Serialize, specta::Type)]
pub struct ListVaultsResponse {
    pub vaults: Vec<VaultSummary>,
}

/// Response containing current vault
#[derive(Debug, Serialize, specta::Type)]
pub struct GetCurrentVaultResponse {
    pub vault: Option<VaultSummary>,
}

/// Input for setting current vault
#[derive(Debug, Deserialize, specta::Type)]
pub struct SetCurrentVaultRequest {
    pub vault_id: String,
}

/// Response from setting current vault
#[derive(Debug, Serialize, specta::Type)]
pub struct SetCurrentVaultResponse {
    pub success: bool,
    pub vault: VaultSummary,
}

/// Input for deleting a vault
#[derive(Debug, Deserialize, specta::Type)]
pub struct DeleteVaultRequest {
    pub vault_id: String,
    pub force: bool, // If true, delete even if vault has keys
}

/// Response from vault deletion
#[derive(Debug, Serialize, specta::Type)]
pub struct DeleteVaultResponse {
    pub success: bool,
    pub message: String,
}

/// Create a new vault
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(name = %input.name))]
pub async fn create_vault(input: CreateVaultRequest) -> CommandResponse<CreateVaultResponse> {
    let manager = VaultManager::new();

    match manager.create_vault(input.name, input.description).await {
        Ok(vault_summary) => Ok(CreateVaultResponse {
            vault: vault_summary,
        }),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::vault::domain::VaultError::InvalidName(_) => {
                    ErrorCode::InvalidInput
                }
                crate::services::vault::domain::VaultError::AlreadyExists(_) => {
                    ErrorCode::VaultAlreadyExists
                }
                _ => ErrorCode::StorageFailed,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some(match e {
                crate::services::vault::domain::VaultError::InvalidName(_) => {
                    "Enter a valid vault name".to_string()
                }
                crate::services::vault::domain::VaultError::AlreadyExists(_) => {
                    "Choose a different vault name".to_string()
                }
                _ => "Check disk space and permissions".to_string(),
            }),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// List all vaults
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn list_vaults() -> CommandResponse<ListVaultsResponse> {
    let manager = VaultManager::new();

    match manager.list_vaults().await {
        Ok(vaults) => Ok(ListVaultsResponse { vaults }),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to list vaults".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Check application data directory".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Get the current active vault (deprecated - UI should track this)
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn get_current_vault() -> CommandResponse<GetCurrentVaultResponse> {
    // This endpoint is deprecated - UI should track the current vault
    // Return None for now to maintain API compatibility
    Ok(GetCurrentVaultResponse { vault: None })
}

/// Set the current active vault (deprecated - UI should track this)
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn set_current_vault(
    input: SetCurrentVaultRequest,
) -> CommandResponse<SetCurrentVaultResponse> {
    // This endpoint is deprecated - UI should track the current vault
    // Just verify the vault exists and return success
    let manager = VaultManager::new();
    let vault = match manager.get_vault(&input.vault_id).await {
        Ok(v) => v,
        Err(_) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::VaultNotFound,
                message: format!("Vault '{}' not found", input.vault_id),
                details: None,
                recovery_guidance: Some("Check vault ID and try again".to_string()),
                user_actionable: true,
                trace_id: None,
                span_id: None,
            }));
        }
    };

    // Just return success with the vault summary
    Ok(SetCurrentVaultResponse {
        success: true,
        vault: vault.to_summary(),
    })
}

/// Delete a vault
#[tauri::command]
#[specta::specta]
#[instrument(skip_all, fields(vault_id = %input.vault_id, force = %input.force))]
pub async fn delete_vault(input: DeleteVaultRequest) -> CommandResponse<DeleteVaultResponse> {
    // Load the vault to check if it exists and has keys
    let manager = VaultManager::new();
    let vault = match manager.get_vault(&input.vault_id).await {
        Ok(v) => v,
        Err(_) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::KeyNotFound,
                message: format!("Vault '{}' not found", input.vault_id),
                details: None,
                recovery_guidance: None,
                user_actionable: false,
                trace_id: None,
                span_id: None,
            }));
        }
    };

    // Check if vault has recipients and force flag is not set
    if !vault.recipients().is_empty() && !input.force {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Vault has associated keys".to_string(),
            details: Some(format!("Vault has {} key(s)", vault.recipients().len())),
            recovery_guidance: Some("Remove all keys first or use force=true".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Delete the vault using VaultManager
    let manager = VaultManager::new();
    match manager.delete_vault(&input.vault_id, input.force).await {
        Ok(_) => Ok(DeleteVaultResponse {
            success: true,
            message: format!("Vault '{}' deleted successfully", vault.label()),
        }),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to delete vault".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: None,
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}
