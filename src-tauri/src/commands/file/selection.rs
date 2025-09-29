//! File and directory selection commands
//!
//! This module provides commands for selecting files and directories,
//! and retrieving information about selected items.

use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use tauri::Window;
use tracing::instrument;

/// File selection type
#[derive(Debug, Deserialize, specta::Type)]
pub enum SelectionType {
    Files,
    Folder,
}

/// File selection result
#[derive(Debug, Serialize, specta::Type)]
pub struct FileSelection {
    pub paths: Vec<String>,
    pub total_size: u64,
    pub file_count: usize,
    pub selection_type: String,
}

/// File information
#[derive(Debug, Serialize, specta::Type)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub is_file: bool,
    pub is_directory: bool,
    pub file_count: Option<usize>, // For directories, the number of files inside
}

/// Select files or folder for encryption
#[tauri::command]
#[specta::specta]
#[instrument(skip(_window), fields(selection_type = ?selection_type))]
pub async fn select_files(
    selection_type: SelectionType,
    _window: Window,
) -> CommandResponse<FileSelection> {
    let manager = crate::services::file::FileManager::new();

    let selection_type_str = match selection_type {
        SelectionType::Files => "files",
        SelectionType::Folder => "folder",
    };

    match manager.select_files(selection_type_str).await {
        Ok(selection) => Ok(selection),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::file::domain::FileError::ValidationFailed(_) => {
                    ErrorCode::InvalidInput
                }
                _ => ErrorCode::InternalError,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check selection type and try again".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Select a directory for output
#[tauri::command]
#[specta::specta]
#[instrument(skip(_window))]
pub async fn select_directory(title: Option<String>, _window: Window) -> CommandResponse<String> {
    let manager = crate::services::file::FileManager::new();

    match manager.select_directory(title).await {
        Ok(path) => Ok(path),
        Err(e) => Err(Box::new(CommandError {
            code: ErrorCode::InvalidInput,
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Please type the path manually".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}

/// Get file/folder information
#[tauri::command]
#[specta::specta]
#[instrument(skip(paths))]
pub async fn get_file_info(paths: Vec<String>) -> CommandResponse<Vec<FileInfo>> {
    let manager = crate::services::file::FileManager::new();

    match manager.get_file_info(paths).await {
        Ok(file_infos) => Ok(file_infos),
        Err(e) => Err(Box::new(CommandError {
            code: match e {
                crate::services::file::domain::FileError::FileNotFound(_) => {
                    ErrorCode::FileNotFound
                }
                crate::services::file::domain::FileError::PermissionDenied(_) => {
                    ErrorCode::PermissionDenied
                }
                _ => ErrorCode::InternalError,
            },
            message: e.to_string(),
            details: None,
            recovery_guidance: Some("Check file paths and permissions".to_string()),
            user_actionable: true,
            trace_id: None,
            span_id: None,
        })),
    }
}
