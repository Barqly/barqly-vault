//! File and directory selection commands
//!
//! This module provides commands for selecting files and directories,
//! and retrieving information about selected items.

use crate::commands::types::{CommandError, CommandResponse, ErrorCode};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Window;
use tracing::{info, instrument};

/// File selection type
#[derive(Debug, Deserialize)]
pub enum SelectionType {
    Files,
    Folder,
}

/// File selection result
#[derive(Debug, Serialize)]
pub struct FileSelection {
    pub paths: Vec<String>,
    pub total_size: u64,
    pub file_count: usize,
    pub selection_type: String,
}

/// File information
#[derive(Debug, Serialize)]
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
#[instrument(skip(_window), fields(selection_type = ?selection_type))]
pub async fn select_files(
    selection_type: SelectionType,
    _window: Window,
) -> CommandResponse<FileSelection> {
    // For now, we'll use the placeholder implementation since file dialog requires async runtime setup
    // TODO: Implement proper dialog integration with tauri-plugin-dialog

    info!(
        "Opening file dialog for selection type: {:?}",
        selection_type
    );

    // Placeholder paths for testing - frontend will need to implement dialog
    let paths: Vec<String> = vec![];

    if paths.is_empty() {
        // Return a placeholder response for now - frontend handles actual dialog
        // This allows the UI to work while we implement proper dialog integration
        let selection_type_str = match selection_type {
            SelectionType::Files => "files",
            SelectionType::Folder => "folder",
        };

        return Ok(FileSelection {
            paths: vec![],
            total_size: 0,
            file_count: 0,
            selection_type: selection_type_str.to_string(),
        });
    }

    // Calculate total size and file count when we have actual paths
    let mut total_size = 0u64;
    let mut file_count = 0usize;

    // Process paths once dialog integration is complete
    for path_str in &paths {
        let path = std::path::Path::new(path_str);
        if path.is_file() {
            if let Ok(metadata) = std::fs::metadata(path) {
                total_size += metadata.len();
                file_count += 1;
            }
        } else if path.is_dir() {
            // Count all files in directory recursively
            if let Ok(entries) = walkdir::WalkDir::new(path)
                .into_iter()
                .filter_map(Result::ok)
                .filter(|e| e.file_type().is_file())
                .try_fold((0u64, 0usize), |(size, count), entry| {
                    entry.metadata().map(|m| (size + m.len(), count + 1))
                })
            {
                total_size += entries.0;
                file_count += entries.1;
            }
        }
    }

    let selection_type_str = match selection_type {
        SelectionType::Files => "files",
        SelectionType::Folder => "folder",
    };

    Ok(FileSelection {
        paths,
        total_size,
        file_count,
        selection_type: selection_type_str.to_string(),
    })
}

/// Select a directory for output
#[tauri::command]
#[instrument(skip(_window))]
pub async fn select_directory(_title: Option<String>, _window: Window) -> CommandResponse<String> {
    // TODO: Implement proper dialog integration with tauri-plugin-dialog
    // For now, return an error that the frontend can handle gracefully

    info!("Directory selection dialog requested - pending implementation");

    Err(Box::new(CommandError::validation(
        "Directory selection dialog integration pending. Please type the path manually.",
    )))
}

/// Get file/folder information
#[tauri::command]
#[instrument(skip(paths))]
pub async fn get_file_info(paths: Vec<String>) -> CommandResponse<Vec<FileInfo>> {
    info!("Getting file info for {} paths", paths.len());

    let file_infos: Vec<FileInfo> = paths
        .into_iter()
        .map(|path| {
            let path_buf = PathBuf::from(&path);

            // Get file metadata with proper error handling
            let metadata = std::fs::metadata(&path_buf)
                .map_err(|e| CommandError::operation(ErrorCode::FileNotFound, e.to_string()))?;

            // Calculate size and file count - for directories, calculate recursively
            let (size, file_count) = if metadata.is_dir() {
                // Calculate total size and count of all files in directory recursively
                let mut total_size = 0u64;
                let mut total_count = 0usize;

                for entry in walkdir::WalkDir::new(&path_buf)
                    .into_iter()
                    .filter_map(|e| e.ok())
                    .filter(|e| e.file_type().is_file())
                {
                    if let Ok(m) = entry.metadata() {
                        total_size += m.len();
                        total_count += 1;
                    }
                }

                (total_size, Some(total_count))
            } else {
                (metadata.len(), None)
            };

            Ok(FileInfo {
                path: path.clone(),
                name: path_buf
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                size,
                is_file: metadata.is_file(),
                is_directory: metadata.is_dir(),
                file_count,
            })
        })
        .collect::<Result<Vec<FileInfo>, CommandError>>()?;

    Ok(file_infos)
}
