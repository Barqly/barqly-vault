//! Shared file operation utilities for crypto commands
//!
//! This module provides common file handling functions used by both
//! encryption and decryption operations to avoid code duplication
//! and maintain consistency across crypto operations.

use crate::commands::types::{CommandError, ErrorCode, ErrorHandler};
use crate::file_ops;
use std::path::Path;

/// Create file selection with atomic validation to prevent TOCTOU
///
/// This function safely creates a FileSelection from provided paths,
/// performing atomic metadata checks to determine if paths are files or directories.
pub fn create_file_selection_atomic(
    file_paths: &[String],
    error_handler: &ErrorHandler,
) -> Result<file_ops::FileSelection, Box<CommandError>> {
    if file_paths.len() == 1 {
        // Atomic check: validate path exists and get metadata in single operation
        let path = Path::new(&file_paths[0]);

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

/// Validate output directory and create it if necessary
///
/// Ensures the output directory exists and is writable.
/// Creates the directory if it doesn't exist.
pub fn validate_output_directory(path: &Path) -> Result<(), std::io::Error> {
    // If directory doesn't exist, try to create it
    if !path.exists() {
        // Attempt to create the directory (including parent directories)
        std::fs::create_dir_all(path).map_err(|e| {
            std::io::Error::new(
                std::io::ErrorKind::PermissionDenied,
                format!(
                    "Failed to create output directory '{}': {}",
                    path.display(),
                    e
                ),
            )
        })?;
    }

    // Check if it's actually a directory
    if !path.is_dir() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            format!(
                "Output path exists but is not a directory: {}",
                path.display()
            ),
        ));
    }

    // Check write permissions by attempting to create a temporary test file
    let test_file = path.join(format!(".barqly_write_test_{}", std::process::id()));
    match std::fs::write(&test_file, b"test") {
        Ok(_) => {
            // Clean up test file
            let _ = std::fs::remove_file(test_file);
            Ok(())
        }
        Err(e) => Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            format!("Cannot write to output directory: {e}"),
        )),
    }
}

/// Read archive file with memory safety checks
///
/// Validates file size before reading to prevent memory exhaustion attacks.
pub fn read_archive_file_safely(
    archive_path: &std::path::Path,
    error_handler: &ErrorHandler,
) -> Result<Vec<u8>, Box<CommandError>> {
    // Check file size before reading to prevent memory exhaustion
    let metadata = error_handler.handle_operation_error(
        std::fs::metadata(archive_path),
        "get_archive_metadata",
        ErrorCode::EncryptionFailed,
    )?;

    // Use constant from constants module
    if metadata.len() > crate::constants::MAX_ARCHIVE_SIZE {
        return Err(error_handler.handle_validation_error(
            "archive_size",
            &format!(
                "Archive too large: {} bytes (max: {} bytes)",
                metadata.len(),
                crate::constants::MAX_ARCHIVE_SIZE
            ),
        ));
    }

    // Read file with proper error handling
    error_handler.handle_operation_error(
        std::fs::read(archive_path),
        "read_archive_file",
        ErrorCode::EncryptionFailed,
    )
}

/// Clean up temporary file with proper error handling
///
/// Attempts to remove a temporary file. Errors are logged but don't fail the operation.
pub fn cleanup_temp_file(temp_path: &std::path::Path, error_handler: &ErrorHandler) {
    if let Err(e) = std::fs::remove_file(temp_path) {
        // Log cleanup failure but don't fail the operation
        let _: Result<(), Box<CommandError>> = error_handler.handle_operation_error(
            Err(e),
            "cleanup_temp_file",
            ErrorCode::InternalError,
        );
    }
}
