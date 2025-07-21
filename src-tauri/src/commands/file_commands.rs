//! File operations commands for file selection and manifest creation
//!
//! This module provides Tauri commands that expose the file_ops module
//! functionality to the frontend with proper validation and error handling.

use super::types::{CommandError, CommandResponse, ErrorCode};
use crate::file_ops;
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
}

/// Manifest for encrypted archives
#[derive(Debug, Serialize)]
pub struct Manifest {
    pub version: String,
    pub created_at: String,
    pub files: Vec<FileInfo>,
    pub total_size: u64,
    pub file_count: usize,
}

/// Select files or folder for encryption
#[tauri::command]
#[instrument(skip(_window), fields(selection_type = ?selection_type))]
pub async fn select_files(
    selection_type: SelectionType,
    _window: Window,
) -> CommandResponse<FileSelection> {
    info!(
        "Opening file dialog for selection type: {:?}",
        selection_type
    );

    // TODO: Implement native file dialog integration
    // For now, return a placeholder response

    let selection_type_str = match selection_type {
        SelectionType::Files => "files",
        SelectionType::Folder => "folder",
    };

    Ok(FileSelection {
        paths: vec!["/path/to/selected/file.txt".to_string()],
        total_size: 1024,
        file_count: 1,
        selection_type: selection_type_str.to_string(),
    })
}

/// Get file/folder information
#[tauri::command]
#[instrument(skip(paths))]
pub async fn get_file_info(paths: Vec<String>) -> CommandResponse<Vec<FileInfo>> {
    info!("Getting file info for {} paths", paths.len());

    // TODO: Implement actual file system operations
    // For now, return placeholder file info

    let file_infos: Vec<FileInfo> = paths
        .into_iter()
        .map(|path| {
            let path_buf = PathBuf::from(&path);

            // Get file metadata with proper error handling
            let metadata = std::fs::metadata(&path_buf)
                .map_err(|e| CommandError::operation(ErrorCode::FileNotFound, e.to_string()))?;

            Ok(FileInfo {
                path: path.clone(),
                name: path_buf
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                size: metadata.len(),
                is_file: metadata.is_file(),
                is_directory: metadata.is_dir(),
            })
        })
        .collect::<Result<Vec<FileInfo>, CommandError>>()?;

    Ok(file_infos)
}

/// Create manifest for file set
#[tauri::command]
#[instrument(skip(file_paths))]
pub async fn create_manifest(file_paths: Vec<String>) -> CommandResponse<Manifest> {
    info!("Creating manifest for {} files", file_paths.len());

    // Validate input
    if file_paths.is_empty() {
        return Err(CommandError::validation(
            "No files provided for manifest creation",
        ));
    }

    // Create file selection from input paths
    let file_selection = if file_paths.len() == 1 {
        // Check if it's a directory
        let path = std::path::Path::new(&file_paths[0]);
        if path.is_dir() {
            file_ops::FileSelection::Folder(path.to_path_buf())
        } else {
            file_ops::FileSelection::Files(file_paths.iter().map(|p| p.into()).collect())
        }
    } else {
        file_ops::FileSelection::Files(file_paths.iter().map(|p| p.into()).collect())
    };

    // Validate the file selection
    let config = file_ops::FileOpsConfig::default();
    file_ops::validate_selection(&file_selection, &config)
        .map_err(|e| CommandError::operation(ErrorCode::InvalidInput, e.to_string()))?;

    // Create staging area to get file information
    let mut staging = file_ops::StagingArea::new()
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))?;

    staging
        .stage_files(&file_selection)
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))?;

    // Get file information from staging area
    let file_infos = staging.staged_files().to_vec();

    // Create a temporary archive to generate manifest
    let temp_dir = tempfile::tempdir()
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))?;
    let temp_archive_path = temp_dir.path().join("temp_archive.tar.gz");

    // Create archive operation
    let archive_operation = file_ops::create_archive(&file_selection, &temp_archive_path, &config)
        .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))?;

    // Create manifest using file_ops module
    let file_ops_manifest = file_ops::create_manifest_for_archive(
        &archive_operation,
        &file_infos,
        None, // No external manifest file
    )
    .map_err(|e| CommandError::operation(ErrorCode::InternalError, e.to_string()))?;

    // Convert file_ops manifest to command manifest format
    let command_files: Vec<FileInfo> = file_ops_manifest
        .files
        .iter()
        .map(|entry| FileInfo {
            path: entry.path.to_string_lossy().to_string(),
            name: entry
                .path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string(),
            size: entry.size,
            is_file: true,
            is_directory: false,
        })
        .collect();

    let command_manifest = Manifest {
        version: file_ops_manifest.version,
        created_at: file_ops_manifest.created.to_rfc3339(),
        files: command_files,
        total_size: file_ops_manifest.archive.total_uncompressed_size,
        file_count: file_ops_manifest.archive.file_count,
    };

    // Clean up temporary files
    let _ = std::fs::remove_file(&temp_archive_path);
    let _ = temp_dir.close();

    info!(
        "Manifest created successfully: {} files, {} bytes",
        command_manifest.file_count, command_manifest.total_size
    );

    Ok(command_manifest)
}
