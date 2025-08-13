//! Archive creation functionality
//!
//! This module handles the creation of TAR.GZ archives from file selections.

use crate::file_ops::staging::StagingArea;
use crate::file_ops::utils::calculate_file_hash;
use crate::file_ops::validation::validate_archive_path;
use crate::file_ops::{
    ArchiveInfo, ArchiveOperation, FileOpsConfig, FileOpsError, FileSelection, ProgressCallback,
    Result,
};
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs::File;
use std::path::Path;
use tar::Builder;
use tracing::info;

/// Create a TAR.GZ archive from file selection
pub fn create_archive(
    selection: &FileSelection,
    output_path: &Path,
    config: &FileOpsConfig,
) -> Result<ArchiveOperation> {
    debug_assert!(
        !output_path.as_os_str().is_empty(),
        "Output path cannot be empty"
    );
    debug_assert!(
        config.max_archive_size > 0,
        "Max archive size must be positive"
    );

    info!(
        "Creating archive: {} -> {}",
        match selection {
            FileSelection::Files(files) => format!("{} files", files.len()),
            FileSelection::Folder(folder) => format!("folder: {}", folder.display()),
        },
        output_path.display()
    );

    // Validate output path
    validate_archive_path(output_path)?;

    // Create staging area
    let mut staging = StagingArea::new()?;
    staging.stage_files(selection)?;

    // Create archive
    let archive_info = create_tar_gz(&staging, output_path, config)?;

    // Create archive operation info
    let operation = ArchiveOperation {
        archive_path: output_path.to_path_buf(),
        manifest_path: None, // Will be set by manifest module
        total_size: archive_info.compressed_size,
        file_count: staging.file_count(),
        created: chrono::Utc::now(),
        archive_hash: archive_info.archive_hash,
    };

    info!(
        "Archive created successfully: {} bytes, {} files",
        operation.total_size, operation.file_count
    );

    Ok(operation)
}

/// Create a TAR.GZ archive with progress reporting
pub fn create_archive_with_progress(
    selection: &FileSelection,
    output_path: &Path,
    config: &FileOpsConfig,
    progress_callback: Option<ProgressCallback>,
) -> Result<ArchiveOperation> {
    info!("Creating archive with progress reporting");

    // Validate output path
    validate_archive_path(output_path)?;

    // Create staging area
    let mut staging = StagingArea::new()?;
    staging.stage_files(selection)?;

    let total_size = staging.total_size();
    let mut processed_size = 0u64;

    // Create archive with progress
    let archive_info =
        create_tar_gz_with_progress(&staging, output_path, config, &mut |bytes_processed| {
            processed_size += bytes_processed;
            if let Some(callback) = &progress_callback {
                callback(processed_size, total_size);
            }
        })?;

    // Create archive operation info
    let operation = ArchiveOperation {
        archive_path: output_path.to_path_buf(),
        manifest_path: None,
        total_size: archive_info.compressed_size,
        file_count: staging.file_count(),
        created: chrono::Utc::now(),
        archive_hash: archive_info.archive_hash,
    };

    info!(
        "Archive created with progress: {} bytes, {} files",
        operation.total_size, operation.file_count
    );

    Ok(operation)
}

/// Create archive and return operation info, file information, and staging path for external manifest
pub fn create_archive_with_file_info(
    selection: &FileSelection,
    output_path: &Path,
    config: &FileOpsConfig,
) -> Result<(
    ArchiveOperation,
    Vec<crate::file_ops::FileInfo>,
    std::path::PathBuf,
)> {
    info!(
        "Creating archive with file info: {} -> {}",
        match selection {
            FileSelection::Files(files) => format!("{} files", files.len()),
            FileSelection::Folder(folder) => format!("folder: {}", folder.display()),
        },
        output_path.display()
    );

    // Validate output path
    validate_archive_path(output_path)?;

    // Create staging area
    let mut staging = StagingArea::new()?;
    staging.stage_files(selection)?;

    // Get file information and staging path before creating archive
    let file_info: Vec<crate::file_ops::FileInfo> = staging.staged_files().to_vec();
    let staging_path = staging.path().to_path_buf();

    // Create archive
    let archive_info = create_tar_gz(&staging, output_path, config)?;

    // Create archive operation info
    let operation = ArchiveOperation {
        archive_path: output_path.to_path_buf(),
        manifest_path: None, // Will be set by manifest module
        total_size: archive_info.compressed_size,
        file_count: staging.file_count(),
        created: chrono::Utc::now(),
        archive_hash: archive_info.archive_hash,
    };

    info!(
        "Archive created successfully: {} bytes, {} files",
        operation.total_size, operation.file_count
    );

    Ok((operation, file_info, staging_path))
}

/// Create TAR.GZ archive from staging area
pub(super) fn create_tar_gz(
    staging: &StagingArea,
    output_path: &Path,
    config: &FileOpsConfig,
) -> Result<ArchiveInfo> {
    // Create output file
    let output_file = File::create(output_path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to create archive file: {e}"),
        source: e,
    })?;

    // Create GZIP encoder
    let gz_encoder = GzEncoder::new(output_file, Compression::new(config.compression_level));

    // Create TAR builder
    let mut tar_builder = Builder::new(gz_encoder);

    // Add files to archive
    for file_info in staging.staged_files() {
        let mut file = File::open(&file_info.path).map_err(|_e| FileOpsError::FileNotFound {
            path: file_info.path.clone(),
        })?;

        let relative_path = file_info.path.strip_prefix(staging.path()).map_err(|e| {
            FileOpsError::CrossPlatformPathError {
                message: format!("Failed to get relative path: {e}"),
            }
        })?;

        tar_builder
            .append_file(relative_path, &mut file)
            .map_err(|e| FileOpsError::ArchiveCreationFailed {
                message: format!("Failed to add file to archive: {e}"),
            })?;
    }

    // Finish archive
    let gz_encoder = tar_builder
        .into_inner()
        .map_err(|e| FileOpsError::ArchiveCreationFailed {
            message: format!("Failed to finalize archive: {e}"),
        })?;

    let output_file = gz_encoder
        .finish()
        .map_err(|e| FileOpsError::ArchiveCreationFailed {
            message: format!("Failed to finish GZIP compression: {e}"),
        })?;

    // Get archive size
    let compressed_size = output_file
        .metadata()
        .map_err(|e| FileOpsError::IoError {
            message: format!("Failed to get archive metadata: {e}"),
            source: e,
        })?
        .len();

    // Calculate archive hash
    let archive_hash = calculate_file_hash(output_path)?;

    Ok(ArchiveInfo {
        compressed_size,
        uncompressed_size: staging.total_size(),
        file_count: staging.file_count(),
        archive_hash,
    })
}

/// Create TAR.GZ archive with progress reporting
pub(super) fn create_tar_gz_with_progress(
    staging: &StagingArea,
    output_path: &Path,
    config: &FileOpsConfig,
    progress_callback: &mut dyn FnMut(u64),
) -> Result<ArchiveInfo> {
    // Create output file
    let output_file = File::create(output_path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to create archive file: {e}"),
        source: e,
    })?;

    // Create GZIP encoder
    let gz_encoder = GzEncoder::new(output_file, Compression::new(config.compression_level));

    // Create TAR builder
    let mut tar_builder = Builder::new(gz_encoder);

    // Add files to archive with progress
    for file_info in staging.staged_files() {
        let mut file = File::open(&file_info.path).map_err(|_e| FileOpsError::FileNotFound {
            path: file_info.path.clone(),
        })?;

        let relative_path = file_info.path.strip_prefix(staging.path()).map_err(|e| {
            FileOpsError::CrossPlatformPathError {
                message: format!("Failed to get relative path: {e}"),
            }
        })?;

        tar_builder
            .append_file(relative_path, &mut file)
            .map_err(|e| FileOpsError::ArchiveCreationFailed {
                message: format!("Failed to add file to archive: {e}"),
            })?;

        // Report progress
        progress_callback(file_info.size);
    }

    // Finish archive
    let gz_encoder = tar_builder
        .into_inner()
        .map_err(|e| FileOpsError::ArchiveCreationFailed {
            message: format!("Failed to finalize archive: {e}"),
        })?;

    let output_file = gz_encoder
        .finish()
        .map_err(|e| FileOpsError::ArchiveCreationFailed {
            message: format!("Failed to finish GZIP compression: {e}"),
        })?;

    // Get archive size
    let compressed_size = output_file
        .metadata()
        .map_err(|e| FileOpsError::IoError {
            message: format!("Failed to get archive metadata: {e}"),
            source: e,
        })?
        .len();

    // Calculate archive hash
    let archive_hash = calculate_file_hash(output_path)?;

    Ok(ArchiveInfo {
        compressed_size,
        uncompressed_size: staging.total_size(),
        file_count: staging.file_count(),
        archive_hash,
    })
}
