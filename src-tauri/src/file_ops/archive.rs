//! TAR archive creation and extraction with GZIP compression

use crate::constants::*;
use crate::file_ops::staging::StagingArea;
use crate::file_ops::validation::validate_archive_path;
use crate::file_ops::{
    ArchiveInfo, ArchiveOperation, FileInfo, FileOpsConfig, FileOpsError, FileSelection,
    ProgressCallback, Result,
};
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::fs::{self, File};
use std::io::{self, Read};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::Path;
use tar::{Archive, Builder};
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

/// Extract a TAR.GZ archive
pub fn extract_archive(
    archive_path: &Path,
    output_dir: &Path,
    config: &FileOpsConfig,
) -> Result<Vec<FileInfo>> {
    debug_assert!(
        !archive_path.as_os_str().is_empty(),
        "Archive path cannot be empty"
    );
    debug_assert!(
        !output_dir.as_os_str().is_empty(),
        "Output directory cannot be empty"
    );

    info!(
        "Extracting archive: {} -> {}",
        archive_path.display(),
        output_dir.display()
    );

    // Validate archive path
    if !archive_path.exists() {
        return Err(FileOpsError::FileNotFound {
            path: archive_path.to_path_buf(),
        });
    }

    // Create output directory if it doesn't exist
    fs::create_dir_all(output_dir).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to create output directory: {e}"),
        source: e,
    })?;

    // Open and validate archive
    let archive_file =
        File::open(archive_path).map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to open archive: {e}"),
        })?;

    // Create GZIP decoder
    let gz_decoder = GzDecoder::new(archive_file);

    // Create TAR archive reader
    let mut archive = Archive::new(gz_decoder);
    archive.set_preserve_permissions(config.preserve_permissions);

    let mut extracted_files = Vec::new();

    // Extract files
    for entry_result in archive
        .entries()
        .map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to read archive entries: {e}"),
        })?
    {
        let mut entry = entry_result.map_err(|e| FileOpsError::ArchiveExtractionFailed {
            message: format!("Failed to read archive entry: {e}"),
        })?;

        let path = entry
            .path()
            .map_err(|e| FileOpsError::ArchiveExtractionFailed {
                message: format!("Failed to get entry path: {e}"),
            })?
            .to_path_buf();

        let output_path = output_dir.join(&path);

        // Create parent directories if needed
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent).map_err(|e| FileOpsError::IoError {
                message: format!("Failed to create parent directory: {e}"),
                source: e,
            })?;
        }

        // Extract file
        if entry.header().entry_type().is_file() {
            let mut output_file =
                File::create(&output_path).map_err(|e| FileOpsError::IoError {
                    message: format!("Failed to create output file: {e}"),
                    source: e,
                })?;

            io::copy(&mut entry, &mut output_file).map_err(|e| FileOpsError::IoError {
                message: format!("Failed to extract file: {e}"),
                source: e,
            })?;

            // Get file metadata
            let metadata = fs::metadata(&output_path).map_err(|_e| FileOpsError::FileNotFound {
                path: output_path.clone(),
            })?;

            let file_info = FileInfo {
                path: output_path.clone(),
                size: metadata.len(),
                modified: chrono::DateTime::from(
                    metadata
                        .modified()
                        .unwrap_or_else(|_| std::time::SystemTime::now()),
                ),
                hash: calculate_file_hash(&output_path)?,
                #[cfg(unix)]
                permissions: metadata.permissions().mode(),
            };

            extracted_files.push(file_info);
            info!("Extracted file: {}", path.display());
        }
    }

    info!(
        "Archive extraction completed: {} files",
        extracted_files.len()
    );
    Ok(extracted_files)
}

/// Create TAR.GZ archive from staging area
fn create_tar_gz(
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
fn create_tar_gz_with_progress(
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

/// Calculate SHA-256 hash of a file
fn calculate_file_hash(path: &Path) -> Result<String> {
    debug_assert!(
        !path.as_os_str().is_empty(),
        "Path cannot be empty for hash calculation"
    );

    use sha2::{Digest, Sha256};

    let mut file = File::open(path).map_err(|_e| FileOpsError::FileNotFound {
        path: path.to_path_buf(),
    })?;

    let mut hasher = Sha256::new();
    let mut buffer = [0; IO_BUFFER_SIZE];

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| FileOpsError::HashCalculationFailed {
                message: format!("Failed to read file: {e}"),
            })?;

        if n == 0 {
            break;
        }

        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    Ok(hex::encode(result))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use std::path::PathBuf;
    use tempfile::tempdir;

    fn create_test_file(dir: &Path, name: &str, content: &str) -> PathBuf {
        let file_path = dir.join(name);
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file_path
    }

    #[test]
    fn test_create_archive() {
        let temp_dir = tempdir().unwrap();
        let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
        let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

        let selection = FileSelection::Files(vec![file1, file2]);
        let output_path = temp_dir.path().join("test.tar.gz");
        let config = FileOpsConfig::default();

        let result = create_archive(&selection, &output_path, &config);
        assert!(result.is_ok());

        let operation = result.unwrap();
        assert_eq!(operation.file_count, 2);
        assert!(operation.total_size > 0);
        assert!(output_path.exists());
    }

    #[test]
    fn test_extract_archive() {
        let temp_dir = tempdir().unwrap();
        let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
        let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

        let selection = FileSelection::Files(vec![file1, file2]);
        let archive_path = temp_dir.path().join("test.tar.gz");
        let config = FileOpsConfig::default();

        // Create archive
        create_archive(&selection, &archive_path, &config).unwrap();

        // Extract archive
        let extract_dir = temp_dir.path().join("extracted");
        let extracted_files = extract_archive(&archive_path, &extract_dir, &config).unwrap();

        assert_eq!(extracted_files.len(), 2);
        assert!(extract_dir.exists());
    }

    #[test]
    fn test_archive_with_progress() {
        let temp_dir = tempdir().unwrap();
        let file1 = create_test_file(temp_dir.path(), "test1.txt", "content1");
        let file2 = create_test_file(temp_dir.path(), "test2.txt", "content2");

        let selection = FileSelection::Files(vec![file1, file2]);
        let output_path = temp_dir.path().join("test.tar.gz");
        let config = FileOpsConfig::default();

        let progress_calls = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
        let progress_calls_clone = progress_calls.clone();
        let progress_callback = Box::new(move |processed: u64, total: u64| {
            progress_calls_clone.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            assert!(processed <= total);
        });

        let result = create_archive_with_progress(
            &selection,
            &output_path,
            &config,
            Some(progress_callback),
        );

        assert!(result.is_ok());
        assert!(progress_calls.load(std::sync::atomic::Ordering::Relaxed) > 0);
    }
}
