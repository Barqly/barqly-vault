//! Storage commands for key management and configuration
//!
//! This module provides Tauri commands that expose the storage module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandResponse, ErrorCode, ErrorHandler};
use crate::prelude::*;
use crate::storage::{delete_key, get_cache, list_keys, CacheMetrics};

/// Key metadata for frontend display
#[derive(Debug, Serialize, specta::Type)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: String,
    pub public_key: Option<String>,
}

/// Application configuration
#[derive(Debug, Serialize, Deserialize, specta::Type)]
pub struct AppConfig {
    pub version: String,
    pub default_key_label: Option<String>,
    pub remember_last_folder: bool,
    pub max_recent_files: usize,
}

/// Configuration update
#[derive(Debug, Deserialize, specta::Type)]
pub struct AppConfigUpdate {
    pub default_key_label: Option<String>,
    pub remember_last_folder: Option<bool>,
    pub max_recent_files: Option<usize>,
}

/// List all available keys
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn list_keys_command() -> CommandResponse<Vec<KeyMetadata>> {
    // Create error handler
    let error_handler = ErrorHandler::new();

    // Log operation start
    info!("Starting key listing operation");

    let keys =
        error_handler.handle_operation_error(list_keys(), "list_keys", ErrorCode::StorageFailed)?;

    let metadata: Vec<KeyMetadata> = keys
        .into_iter()
        .map(|key| KeyMetadata {
            label: key.label,
            created_at: key.created_at.to_rfc3339(),
            public_key: key.public_key,
        })
        .collect();

    // Log operation completion
    info!(
        key_count = metadata.len(),
        "Key listing operation completed successfully"
    );

    Ok(metadata)
}

/// Delete a key by ID
#[tauri::command]
#[specta::specta]
#[instrument(skip(key_id), fields(key_id = %key_id))]
pub async fn delete_key_command(key_id: String) -> CommandResponse<()> {
    // Create error handler
    let error_handler = ErrorHandler::new();

    // Log operation start
    info!(
        key_id = %key_id,
        "Starting key deletion operation"
    );

    // Validate key exists
    let keys =
        error_handler.handle_operation_error(list_keys(), "list_keys", ErrorCode::StorageFailed)?;

    if !keys.iter().any(|k| k.label == key_id) {
        return Err(error_handler
            .handle_validation_error("key_id", &format!("No key found with label '{key_id}'")));
    }

    // Delete the key
    error_handler.handle_operation_error(
        delete_key(&key_id),
        "delete_key",
        ErrorCode::StorageFailed,
    )?;

    // Log operation completion
    info!(
        key_id = %key_id,
        "Key deletion operation completed successfully"
    );

    Ok(())
}

/// Get application configuration
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn get_config() -> CommandResponse<AppConfig> {
    // Log operation start
    info!("Starting configuration retrieval");

    // TODO: Implement configuration loading from file
    // For now, return default configuration
    let config = AppConfig {
        version: env!("CARGO_PKG_VERSION").to_string(),
        default_key_label: None,
        remember_last_folder: true,
        max_recent_files: 10,
    };

    // Log operation completion
    info!(
        version = %config.version,
        remember_last_folder = config.remember_last_folder,
        max_recent_files = config.max_recent_files,
        "Configuration retrieval completed successfully"
    );

    Ok(config)
}

/// Update application configuration
#[tauri::command]
#[specta::specta]
#[instrument(skip(config))]
pub async fn update_config(config: AppConfigUpdate) -> CommandResponse<()> {
    // Create error handler (for future use)
    let _error_handler = ErrorHandler::new();

    // Log operation start
    info!("Starting configuration update");

    // TODO: Implement configuration validation and persistence
    // For now, just log the update
    info!(
        default_key_label = ?config.default_key_label,
        remember_last_folder = ?config.remember_last_folder,
        max_recent_files = ?config.max_recent_files,
        "Configuration update completed successfully"
    );

    Ok(())
}

/// Get cache performance metrics
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn get_cache_metrics() -> CommandResponse<CacheMetrics> {
    // Log operation start
    info!("Starting cache metrics retrieval");

    // Get cache metrics
    let cache = get_cache();
    let metrics = cache.get_metrics();

    // Log operation completion with metrics
    info!(
        hit_rate = format_args!("{:.2}%", metrics.hit_rate() * 100.0),
        key_list_hit_rate = format_args!("{:.2}%", metrics.key_list_hit_rate() * 100.0),
        total_requests = metrics.total_requests,
        cache_invalidations = metrics.cache_invalidations,
        "Cache metrics retrieval completed successfully"
    );

    Ok(metrics)
}
