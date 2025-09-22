//! Manifest creation command
//!
//! This module provides the command for creating manifests from file sets,
//! which are used to track encrypted archive contents.

use super::{cleanup_temp_files, create_file_selection_atomic, FileInfo, Manifest};
use crate::commands::types::{CommandResponse, ErrorCode, ErrorHandler};
use crate::file_ops;
use crate::logging::{log_operation, SpanContext};
use std::collections::HashMap;
use tracing::{info, instrument};

/// Create manifest for file set
#[tauri::command]
#[specta::specta]
#[instrument(skip(file_paths))]
pub async fn create_manifest(file_paths: Vec<String>) -> CommandResponse<Manifest> {
    // Create span context for operation tracing
    let span_context = SpanContext::new("create_manifest")
        .with_attribute("file_count", file_paths.len().to_string());

    // Create error handler with span context
    let error_handler = ErrorHandler::new().with_span(span_context.clone());

    // Log operation start
    let mut attributes = HashMap::new();
    attributes.insert("file_count".to_string(), file_paths.len().to_string());
    log_operation(
        crate::logging::LogLevel::Info,
        "Creating manifest",
        &span_context,
        attributes,
    );

    info!("Creating manifest for {} files", file_paths.len());

    // Validate input with structured error handling
    if file_paths.is_empty() {
        return Err(error_handler
            .handle_validation_error("file_paths", "No files provided for manifest creation"));
    }

    // Create file selection from input paths with atomic validation
    let file_selection = create_file_selection_atomic(&file_paths, &error_handler)?;

    // Validate the file selection
    let config = file_ops::FileOpsConfig::default();
    error_handler.handle_operation_error(
        file_ops::validate_selection(&file_selection, &config),
        "validate_selection",
        ErrorCode::InvalidInput,
    )?;

    // Create staging area to get file information
    let mut staging = error_handler.handle_operation_error(
        file_ops::StagingArea::new(),
        "create_staging_area",
        ErrorCode::InternalError,
    )?;

    error_handler.handle_operation_error(
        staging.stage_files(&file_selection),
        "stage_files",
        ErrorCode::InternalError,
    )?;

    // Get file information from staging area
    let file_infos = staging.staged_files().to_vec();

    // Create a temporary archive to generate manifest
    let temp_dir = error_handler.handle_operation_error(
        tempfile::tempdir(),
        "create_temp_directory",
        ErrorCode::InternalError,
    )?;
    let temp_archive_path = temp_dir.path().join("temp_archive.tar.gz");

    // Create archive operation
    let archive_operation = error_handler.handle_operation_error(
        file_ops::create_archive(&file_selection, &temp_archive_path, &config),
        "create_archive",
        ErrorCode::InternalError,
    )?;

    // Create manifest using file_ops module
    let file_ops_manifest = error_handler.handle_operation_error(
        file_ops::create_manifest_for_archive(
            &archive_operation,
            &file_infos,
            None, // No external manifest file
        ),
        "create_manifest_for_archive",
        ErrorCode::InternalError,
    )?;

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
            file_count: None,
        })
        .collect();

    let command_manifest = Manifest {
        version: file_ops_manifest.version,
        created_at: file_ops_manifest.created.to_rfc3339(),
        files: command_files,
        total_size: file_ops_manifest.archive.total_uncompressed_size,
        file_count: file_ops_manifest.archive.file_count,
    };

    // Clean up temporary files with proper error handling
    cleanup_temp_files(&temp_archive_path, temp_dir, &error_handler);

    // Log operation completion
    let mut completion_attributes = HashMap::new();
    completion_attributes.insert(
        "file_count".to_string(),
        command_manifest.file_count.to_string(),
    );
    completion_attributes.insert(
        "total_size".to_string(),
        command_manifest.total_size.to_string(),
    );
    log_operation(
        crate::logging::LogLevel::Info,
        "Manifest created successfully",
        &span_context,
        completion_attributes,
    );

    info!(
        "Manifest created successfully: {} files, {} bytes",
        command_manifest.file_count, command_manifest.total_size
    );

    Ok(command_manifest)
}
