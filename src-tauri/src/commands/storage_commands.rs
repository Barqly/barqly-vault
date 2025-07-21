//! Storage commands for key management and configuration
//!
//! This module provides Tauri commands that expose the storage module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandError, CommandResponse, ErrorCode};
use crate::storage::{delete_key, list_keys};
use serde::{Deserialize, Serialize};
use tracing::{info, instrument};

/// Key metadata for frontend display
#[derive(Debug, Serialize)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: String,
    pub public_key: Option<String>,
}

/// Application configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct AppConfig {
    pub version: String,
    pub default_key_label: Option<String>,
    pub remember_last_folder: bool,
    pub max_recent_files: usize,
}

/// Configuration update
#[derive(Debug, Deserialize)]
pub struct AppConfigUpdate {
    pub default_key_label: Option<String>,
    pub remember_last_folder: Option<bool>,
    pub max_recent_files: Option<usize>,
}

/// List all available keys
#[tauri::command]
#[instrument]
pub async fn list_keys_command() -> CommandResponse<Vec<KeyMetadata>> {
    info!("Listing available keys");

    let keys = list_keys()
        .map_err(|e| CommandError::operation(ErrorCode::StorageFailed, e.to_string()))?;

    let metadata: Vec<KeyMetadata> = keys
        .into_iter()
        .map(|key| KeyMetadata {
            label: key.label,
            created_at: key.created_at.to_rfc3339(),
            public_key: key.public_key,
        })
        .collect();

    info!("Found {} keys", metadata.len());
    Ok(metadata)
}

/// Delete a key by ID
#[tauri::command]
#[instrument(skip(key_id), fields(key_id = %key_id))]
pub async fn delete_key_command(key_id: String) -> CommandResponse<()> {
    info!("Deleting key: {}", key_id);

    // Validate key exists
    let keys = list_keys()
        .map_err(|e| CommandError::operation(ErrorCode::StorageFailed, e.to_string()))?;

    if !keys.iter().any(|k| k.label == key_id) {
        return Err(CommandError::not_found(format!(
            "No key found with label '{key_id}'"
        )));
    }

    // Delete the key
    delete_key(&key_id)
        .map_err(|e| CommandError::operation(ErrorCode::StorageFailed, e.to_string()))?;

    info!("Key deleted successfully: {}", key_id);
    Ok(())
}

/// Get application configuration
#[tauri::command]
#[instrument]
pub async fn get_config() -> CommandResponse<AppConfig> {
    info!("Getting application configuration");

    // TODO: Implement configuration loading from file
    // For now, return default configuration
    Ok(AppConfig {
        version: env!("CARGO_PKG_VERSION").to_string(),
        default_key_label: None,
        remember_last_folder: true,
        max_recent_files: 10,
    })
}

/// Update application configuration
#[tauri::command]
#[instrument(skip(config))]
pub async fn update_config(config: AppConfigUpdate) -> CommandResponse<()> {
    info!("Updating application configuration");

    // TODO: Implement configuration validation and persistence
    // For now, just log the update
    if let Some(label) = &config.default_key_label {
        info!("Setting default key label: {}", label);
    }

    if let Some(remember) = config.remember_last_folder {
        info!("Setting remember last folder: {}", remember);
    }

    if let Some(max_files) = config.max_recent_files {
        info!("Setting max recent files: {}", max_files);
    }

    Ok(())
}
