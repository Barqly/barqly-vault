//! Manifest creation command
//!
//! This module provides the command for creating manifests from file sets,
//! which are used to track encrypted archive contents.

use super::Manifest;
use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use crate::prelude::*;
use crate::services::file::FileManager;

/// Create manifest for file set
#[tauri::command]
#[specta::specta]
#[instrument(skip(file_paths))]
pub async fn create_manifest(file_paths: Vec<String>) -> CommandResponse<Manifest> {
    let manager = FileManager::new();

    match manager.create_manifest(file_paths).await {
        Ok(manifest) => Ok(manifest),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::file::domain::FileError::ValidationFailed(_) => {
                    ErrorCode::InvalidInput
                }
                crate::services::file::domain::FileError::FileNotFound(_) => {
                    ErrorCode::FileNotFound
                }
                crate::services::file::domain::FileError::FileTooLarge(_) => {
                    ErrorCode::FileTooLarge
                }
                _ => ErrorCode::InternalError,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some(match e {
                crate::services::file::domain::FileError::ValidationFailed(_) => {
                    "Check file paths and try again".to_string()
                }
                crate::services::file::domain::FileError::FileNotFound(_) => {
                    "Ensure all files exist".to_string()
                }
                _ => "Check system resources and try again".to_string(),
            }),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}
