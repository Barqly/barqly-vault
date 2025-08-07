//! Helper functions for file commands
//!
//! This module contains shared utility functions used by multiple file commands.

use crate::commands::types::{CommandError, ErrorCode, ErrorHandler};
use crate::file_ops;

/// Create file selection with atomic validation to prevent TOCTOU
///
/// Note: This function is duplicated from crypto/file_helpers.rs
/// TODO: Consider consolidating into a single shared location
pub(crate) fn create_file_selection_atomic(
    file_paths: &[String],
    error_handler: &ErrorHandler,
) -> Result<file_ops::FileSelection, Box<CommandError>> {
    if file_paths.len() == 1 {
        // Atomic check: validate path exists and get metadata in single operation
        let path = std::path::Path::new(&file_paths[0]);

        // Use metadata to determine if it's a directory (atomic operation)
        let metadata = error_handler.handle_operation_error(
            std::fs::metadata(path),
            "get_file_metadata",
            ErrorCode::InvalidInput,
        )?;

        if metadata.is_dir() {
            Ok(file_ops::FileSelection::Folder(path.to_path_buf()))
        } else {
            Ok(file_ops::FileSelection::Files(
                file_paths.iter().map(|p| p.into()).collect(),
            ))
        }
    } else {
        Ok(file_ops::FileSelection::Files(
            file_paths.iter().map(|p| p.into()).collect(),
        ))
    }
}

/// Clean up temporary files with proper error handling
pub(crate) fn cleanup_temp_files(
    temp_archive_path: &std::path::Path,
    temp_dir: tempfile::TempDir,
    error_handler: &ErrorHandler,
) {
    // Clean up temp archive file
    if let Err(e) = std::fs::remove_file(temp_archive_path) {
        let _: Result<(), Box<CommandError>> = error_handler.handle_operation_error(
            Err(e),
            "cleanup_temp_archive",
            ErrorCode::InternalError,
        );
    }

    // Clean up temp directory
    if let Err(e) = temp_dir.close() {
        let _: Result<(), Box<CommandError>> = error_handler.handle_operation_error(
            Err(e),
            "cleanup_temp_directory",
            ErrorCode::InternalError,
        );
    }
}
