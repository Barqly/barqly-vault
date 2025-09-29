//! Storage commands for key management and configuration
//!
//! This module provides Tauri commands that expose the storage module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandError, CommandResponse, ErrorCode};
use crate::prelude::*;
use crate::storage::CacheMetrics;

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
    let manager = crate::services::storage::StorageManager::new();

    match manager.list_keys().await {
        Ok(metadata) => Ok(metadata.into_iter().map(|m| m.into()).collect()),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check storage system".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Delete a key by ID
#[tauri::command]
#[specta::specta]
#[instrument(skip(key_id), fields(key_id = %key_id))]
pub async fn delete_key_command(key_id: String) -> CommandResponse<()> {
    let manager = crate::services::storage::StorageManager::new();

    match manager.delete_key(key_id.clone()).await {
        Ok(_) => Ok(()),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::storage::domain::StorageError::KeyDeletionFailed(_) => {
                    ErrorCode::KeyNotFound
                }
                crate::services::storage::domain::StorageError::ConfigurationInvalid(_) => {
                    ErrorCode::InvalidInput
                }
                _ => ErrorCode::StorageFailed,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check key ID and try again".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Get application configuration
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn get_config() -> CommandResponse<AppConfig> {
    let manager = crate::services::storage::StorageManager::new();

    match manager.get_config().await {
        Ok(config) => Ok(config.into()),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::ConfigurationError,
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check configuration system".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Update application configuration
#[tauri::command]
#[specta::specta]
#[instrument(skip(config))]
pub async fn update_config(config: AppConfigUpdate) -> CommandResponse<()> {
    let manager = crate::services::storage::StorageManager::new();

    match manager.update_config(config.into()).await {
        Ok(_) => Ok(()),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::storage::domain::StorageError::ConfigurationInvalid(_) => {
                    ErrorCode::InvalidInput
                }
                _ => ErrorCode::ConfigurationError,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check configuration values".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Get cache performance metrics
#[tauri::command]
#[specta::specta]
#[instrument]
pub async fn get_cache_metrics() -> CommandResponse<CacheMetrics> {
    let manager = crate::services::storage::StorageManager::new();

    match manager.get_cache_metrics().await {
        Ok(metrics) => Ok(metrics),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::StorageFailed,
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check cache system".to_string()),
            user_actionable: false,
            trace_id: None,
            span_id: None,
        })),
    }
}
