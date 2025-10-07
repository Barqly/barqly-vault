//! Common utilities for file operations
//!
//! This module provides shared utility functions used across
//! different file operation modules.

use super::{FileOpsError, Result, SelectionType};
use crate::constants::IO_BUFFER_SIZE;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};

/// Calculate SHA-256 hash of a file
pub fn calculate_file_hash(path: &Path) -> Result<String> {
    debug_assert!(
        !path.as_os_str().is_empty(),
        "Path cannot be empty for hash calculation"
    );

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

/// Read archive file with size validation to prevent memory exhaustion
///
/// This is the canonical method for safely reading archives.
/// Validates file size before reading to prevent memory exhaustion attacks.
pub fn read_archive_with_size_check(path: &Path, max_size: u64) -> Result<Vec<u8>> {
    // Check file size before reading
    let metadata = std::fs::metadata(path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to get file metadata for {}", path.display()),
        source: e,
    })?;

    if metadata.len() > max_size {
        return Err(FileOpsError::ArchiveTooLarge {
            size: metadata.len(),
            max: max_size,
        });
    }

    // Read file
    std::fs::read(path).map_err(|e| FileOpsError::IoError {
        message: format!("Failed to read archive file: {}", path.display()),
        source: e,
    })
}

/// Collected file metadata with hash
#[derive(Debug, Clone)]
pub struct CollectedFile {
    pub relative_path: String,
    pub size: u64,
    pub sha256: String,
}

/// Check if file should be excluded from encryption
///
/// Excludes system files, hidden files, and version control metadata.
pub fn should_exclude_file(path: &Path) -> bool {
    let file_name = match path.file_name() {
        Some(name) => name.to_string_lossy(),
        None => return true, // Invalid path
    };

    // System files (cross-platform)
    const EXCLUDED_FILES: &[&str] = &[
        ".DS_Store",      // macOS Finder metadata
        "Thumbs.db",      // Windows thumbnail cache
        "desktop.ini",    // Windows folder settings
        ".Spotlight-V100", // macOS Spotlight
        ".Trashes",       // macOS trash
        ".fseventsd",     // macOS file events
        ".TemporaryItems", // macOS temp
        "$RECYCLE.BIN",   // Windows recycle bin
        "System Volume Information", // Windows system
    ];

    // Exclude exact matches
    if EXCLUDED_FILES.contains(&file_name.as_ref()) {
        return true;
    }

    // Exclude hidden files (starting with .)
    if file_name.starts_with('.') {
        return true;
    }

    // Exclude version control directories
    if let Some(parent) = path.parent() {
        let parent_name = parent.file_name().map(|n| n.to_string_lossy());
        if matches!(parent_name.as_deref(), Some(".git") | Some(".svn") | Some(".hg")) {
            return true;
        }
    }

    false
}

/// Collect all files from selection with metadata (handles files and folders)
///
/// This is the canonical method for collecting file metadata with hashes.
/// Used by manifest generation and draft vault file management.
/// Automatically excludes system files and hidden files.
///
/// # Arguments
/// * `file_paths` - Input file/folder paths from user
/// * `selection_type` - Files or Folder
/// * `base_path` - Optional base path for relative path calculation
///
/// # Returns
/// Vec of CollectedFile with relative paths, sizes, and SHA256 hashes
pub fn collect_files_with_metadata(
    file_paths: &[String],
    selection_type: SelectionType,
    base_path: Option<&str>,
) -> Result<Vec<CollectedFile>> {
    let mut collected = Vec::new();

    match selection_type {
        SelectionType::Folder if file_paths.len() == 1 => {
            // Single folder: Walk recursively
            let folder = Path::new(&file_paths[0]);

            if !folder.exists() || !folder.is_dir() {
                return Err(FileOpsError::PathValidationFailed {
                    path: folder.to_path_buf(),
                    reason: "Not a valid directory".to_string(),
                });
            }

            for entry in walkdir::WalkDir::new(folder)
                .follow_links(false)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.file_type().is_file() {
                    let file_path = entry.path();

                    // Skip system/hidden files
                    if should_exclude_file(file_path) {
                        tracing::debug!(path = %file_path.display(), "Skipping system/hidden file");
                        continue;
                    }

                    // Calculate relative path from folder root
                    let relative_path = file_path
                        .strip_prefix(folder)
                        .map_err(|e| FileOpsError::CrossPlatformPathError {
                            message: format!("Failed to get relative path: {}", e),
                        })?
                        .to_string_lossy()
                        .to_string();

                    let metadata = std::fs::metadata(file_path).map_err(|e| FileOpsError::IoError {
                        message: format!("Failed to read metadata: {}", e),
                        source: e,
                    })?;

                    let hash = calculate_file_hash(file_path)?;

                    collected.push(CollectedFile {
                        relative_path,
                        size: metadata.len(),
                        sha256: hash,
                    });
                }
            }
        }
        SelectionType::Files | SelectionType::Folder => {
            // Multiple files or fallback
            for path_str in file_paths {
                let path = Path::new(path_str);

                if !path.exists() {
                    tracing::warn!(path = %path_str, "File not found, skipping");
                    continue;
                }

                // Skip directories in Files mode
                if path.is_dir() {
                    tracing::warn!(path = %path_str, "Directory in Files mode, skipping");
                    continue;
                }

                let metadata = std::fs::metadata(path).map_err(|e| FileOpsError::IoError {
                    message: format!("Failed to read metadata: {}", e),
                    source: e,
                })?;

                let hash = calculate_file_hash(path)?;

                let relative_path = path
                    .file_name()
                    .ok_or_else(|| FileOpsError::PathValidationFailed {
                        path: path.to_path_buf(),
                        reason: "Invalid file path".to_string(),
                    })?
                    .to_string_lossy()
                    .to_string();

                collected.push(CollectedFile {
                    relative_path,
                    size: metadata.len(),
                    sha256: hash,
                });
            }
        }
    }

    Ok(collected)
}
