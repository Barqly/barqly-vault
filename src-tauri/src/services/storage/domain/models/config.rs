//! Storage domain models for configuration and key metadata
//!
//! These models represent the domain entities for application configuration
//! and key metadata in the storage module, separate from presentation concerns.

use serde::{Deserialize, Serialize};

// Import command types for conversion
use crate::commands::storage::{
    AppConfig as CommandAppConfig, AppConfigUpdate as CommandAppConfigUpdate,
    KeyMetadata as CommandKeyMetadata,
};

/// Key metadata for storage operations
#[derive(Debug, Serialize, Clone)]
pub struct KeyMetadata {
    pub label: String,
    pub created_at: String,
    pub public_key: Option<String>,
}

/// Application configuration domain model
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppConfig {
    pub version: String,
    pub default_key_label: Option<String>,
    pub remember_last_folder: bool,
    pub max_recent_files: usize,
}

/// Configuration update domain model
#[derive(Debug, Deserialize, Clone)]
pub struct AppConfigUpdate {
    pub default_key_label: Option<String>,
    pub remember_last_folder: Option<bool>,
    pub max_recent_files: Option<usize>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            version: env!("CARGO_PKG_VERSION").to_string(),
            default_key_label: None,
            remember_last_folder: true,
            max_recent_files: 10,
        }
    }
}

// Conversions between service and command layer models

impl From<KeyMetadata> for CommandKeyMetadata {
    fn from(service: KeyMetadata) -> Self {
        Self {
            label: service.label,
            created_at: service.created_at,
            public_key: service.public_key,
        }
    }
}

impl From<CommandKeyMetadata> for KeyMetadata {
    fn from(command: CommandKeyMetadata) -> Self {
        Self {
            label: command.label,
            created_at: command.created_at,
            public_key: command.public_key,
        }
    }
}

impl From<AppConfig> for CommandAppConfig {
    fn from(service: AppConfig) -> Self {
        Self {
            version: service.version,
            default_key_label: service.default_key_label,
            remember_last_folder: service.remember_last_folder,
            max_recent_files: service.max_recent_files,
        }
    }
}

impl From<CommandAppConfig> for AppConfig {
    fn from(command: CommandAppConfig) -> Self {
        Self {
            version: command.version,
            default_key_label: command.default_key_label,
            remember_last_folder: command.remember_last_folder,
            max_recent_files: command.max_recent_files,
        }
    }
}

impl From<CommandAppConfigUpdate> for AppConfigUpdate {
    fn from(command: CommandAppConfigUpdate) -> Self {
        Self {
            default_key_label: command.default_key_label,
            remember_last_folder: command.remember_last_folder,
            max_recent_files: command.max_recent_files,
        }
    }
}

impl From<AppConfigUpdate> for CommandAppConfigUpdate {
    fn from(service: AppConfigUpdate) -> Self {
        Self {
            default_key_label: service.default_key_label,
            remember_last_folder: service.remember_last_folder,
            max_recent_files: service.max_recent_files,
        }
    }
}
