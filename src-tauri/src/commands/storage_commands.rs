//! Storage commands for key management and configuration
//!
//! This module provides Tauri commands that expose the storage module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandResponse, ErrorCode, ErrorHandler};
use crate::logging::{log_operation, SpanContext};
use crate::storage::{delete_key, get_cache, list_keys, CacheMetrics};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tracing::instrument;

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
    // Create span context for operation tracing
    let span_context = SpanContext::new("list_keys");

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Log operation start with structured context
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting key listing operation",
        &span_context,
        HashMap::new(),
    );

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
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("key_count".to_string(), metadata.len().to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Key listing operation completed successfully",
        &span_context,
        completion_attributes,
    );

    Ok(metadata)
}

/// Delete a key by ID
#[tauri::command]
#[instrument(skip(key_id), fields(key_id = %key_id))]
pub async fn delete_key_command(key_id: String) -> CommandResponse<()> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("delete_key").with_attribute("key_id", &key_id);

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Log operation start with structured context
    let mut attributes = HashMap::new();
    attributes.insert("key_id".to_string(), key_id.clone());
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting key deletion operation",
        &span_context,
        attributes,
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
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("key_id".to_string(), key_id);
    log_operation(
        crate::logging::LogLevel::Info,
        "Key deletion operation completed successfully",
        &span_context,
        completion_attributes,
    );

    Ok(())
}

/// Get application configuration
#[tauri::command]
#[instrument]
pub async fn get_config() -> CommandResponse<AppConfig> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("get_config");

    // Log operation start with structured context
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting configuration retrieval",
        &span_context,
        HashMap::new(),
    );

    // TODO: Implement configuration loading from file
    // For now, return default configuration
    let config = AppConfig {
        version: env!("CARGO_PKG_VERSION").to_string(),
        default_key_label: None,
        remember_last_folder: true,
        max_recent_files: 10,
    };

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert("version".to_string(), config.version.clone());
    completion_attributes.insert(
        "remember_last_folder".to_string(),
        config.remember_last_folder.to_string(),
    );
    completion_attributes.insert(
        "max_recent_files".to_string(),
        config.max_recent_files.to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Configuration retrieval completed successfully",
        &span_context,
        completion_attributes,
    );

    Ok(config)
}

/// Update application configuration
#[tauri::command]
#[instrument(skip(config))]
pub async fn update_config(config: AppConfigUpdate) -> CommandResponse<()> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("update_config");

    // Create error handler with span context (for future use)
    let _error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Log operation start with structured context
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting configuration update",
        &span_context,
        HashMap::new(),
    );

    // TODO: Implement configuration validation and persistence
    // For now, just log the update with structured attributes
    let mut update_attributes = HashMap::new();

    if let Some(label) = &config.default_key_label {
        update_attributes.insert("default_key_label".to_string(), label.clone());
    }

    if let Some(remember) = config.remember_last_folder {
        update_attributes.insert("remember_last_folder".to_string(), remember.to_string());
    }

    if let Some(max_files) = config.max_recent_files {
        update_attributes.insert("max_recent_files".to_string(), max_files.to_string());
    }

    // Log operation completion with all update attributes
    log_operation(
        crate::logging::LogLevel::Info,
        "Configuration update completed successfully",
        &span_context,
        update_attributes,
    );

    Ok(())
}

/// Get cache performance metrics
#[tauri::command]
#[instrument]
pub async fn get_cache_metrics() -> CommandResponse<CacheMetrics> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("get_cache_metrics");

    // Log operation start with structured context
    log_operation(
        crate::logging::LogLevel::Info,
        "Starting cache metrics retrieval",
        &span_context,
        HashMap::new(),
    );

    // Get cache metrics
    let cache = get_cache();
    let metrics = cache.get_metrics();

    // Log operation completion with metrics
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert(
        "hit_rate".to_string(),
        format!("{:.2}%", metrics.hit_rate() * 100.0),
    );
    completion_attributes.insert(
        "key_list_hit_rate".to_string(),
        format!("{:.2}%", metrics.key_list_hit_rate() * 100.0),
    );
    completion_attributes.insert(
        "total_requests".to_string(),
        metrics.total_requests.to_string(),
    );
    completion_attributes.insert(
        "cache_invalidations".to_string(),
        metrics.cache_invalidations.to_string(),
    );

    log_operation(
        crate::logging::LogLevel::Info,
        "Cache metrics retrieval completed successfully",
        &span_context,
        completion_attributes,
    );

    Ok(metrics)
}
