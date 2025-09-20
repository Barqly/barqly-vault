//! Vault CRUD operations
//!
//! Commands for creating, listing, and managing vaults.

use crate::commands::command_types::{CommandError, CommandResponse, ErrorCode};
use crate::models::{Vault, VaultSummary};
use crate::storage::vault_store;
use serde::{Deserialize, Serialize};
use tracing::instrument;

/// Input for creating a new vault
#[derive(Debug, Deserialize)]
pub struct CreateVaultRequest {
    pub name: String,
    pub description: Option<String>,
}

/// Response from vault creation
#[derive(Debug, Serialize)]
pub struct CreateVaultResponse {
    pub vault: VaultSummary,
}

/// Response containing list of vaults
#[derive(Debug, Serialize)]
pub struct ListVaultsResponse {
    pub vaults: Vec<VaultSummary>,
}

/// Response containing current vault
#[derive(Debug, Serialize)]
pub struct GetCurrentVaultResponse {
    pub vault: Option<VaultSummary>,
}

/// Input for setting current vault
#[derive(Debug, Deserialize)]
pub struct SetCurrentVaultRequest {
    pub vault_id: String,
}

/// Response from setting current vault
#[derive(Debug, Serialize)]
pub struct SetCurrentVaultResponse {
    pub success: bool,
    pub vault: VaultSummary,
}

/// Input for deleting a vault
#[derive(Debug, Deserialize)]
pub struct DeleteVaultRequest {
    pub vault_id: String,
    pub force: bool, // If true, delete even if vault has keys
}

/// Response from vault deletion
#[derive(Debug, Serialize)]
pub struct DeleteVaultResponse {
    pub success: bool,
    pub message: String,
}

/// Create a new vault
#[tauri::command]
#[instrument(skip_all, fields(name = %input.name))]
pub async fn create_vault(input: CreateVaultRequest) -> CommandResponse<CreateVaultResponse> {
    // Validate input
    if input.name.trim().is_empty() {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Vault name cannot be empty".to_string(),
            details: Some("Please provide a valid vault name".to_string()),
            recovery_guidance: Some("Enter a descriptive name for your vault".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Create new vault
    let vault = Vault::new(input.name.trim().to_string(), input.description);

    // Save vault
    match vault_store::save_vault(&vault).await {
        Ok(_) => Ok(CreateVaultResponse {
            vault: vault.to_summary(),
        }),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: "Failed to save vault".to_string(),
            details: Some(e.to_string()),
            recovery_guidance: Some("Check disk space and permissions".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// List all vaults
#[tauri::command]
#[instrument]
pub async fn list_vaults() -> CommandResponse<ListVaultsResponse> {
    match vault_store::list_vaults().await {
        Ok(vaults) => {
            let summaries: Vec<VaultSummary> = vaults.into_iter().map(|v| v.to_summary()).collect();

            Ok(ListVaultsResponse { vaults: summaries })
        }
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
#[instrument]
pub async fn get_current_vault() -> CommandResponse<GetCurrentVaultResponse> {
    // This endpoint is deprecated - UI should track the current vault
    // Return None for now to maintain API compatibility
    Ok(GetCurrentVaultResponse { vault: None })
}

/// Set the current active vault (deprecated - UI should track this)
#[tauri::command]
#[instrument(skip_all, fields(vault_id = %input.vault_id))]
pub async fn set_current_vault(
    input: SetCurrentVaultRequest,
) -> CommandResponse<SetCurrentVaultResponse> {
    // This endpoint is deprecated - UI should track the current vault
    // Just verify the vault exists and return success
    let vault = match vault_store::load_vault(&input.vault_id).await {
        Ok(v) => v,
        Err(_) => {
            return Err(Box::new(CommandError {
                code: ErrorCode::KeyNotFound, // Using KeyNotFound for vault not found
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
#[instrument(skip_all, fields(vault_id = %input.vault_id, force = %input.force))]
pub async fn delete_vault(input: DeleteVaultRequest) -> CommandResponse<DeleteVaultResponse> {
    // Load the vault to check if it exists and has keys
    let vault = match vault_store::load_vault(&input.vault_id).await {
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

    // Check if vault has keys and force flag is not set
    if !vault.keys.is_empty() && !input.force {
        return Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: "Vault has associated keys".to_string(),
            details: Some(format!("Vault has {} key(s)", vault.keys.len())),
            recovery_guidance: Some("Remove all keys first or use force=true".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        }));
    }

    // Delete the vault
    match vault_store::delete_vault(&input.vault_id).await {
        Ok(_) => Ok(DeleteVaultResponse {
            success: true,
            message: format!("Vault '{}' deleted successfully", vault.name),
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
