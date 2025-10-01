//! File and folder selection logic

use super::validation::{validate_file_size, validate_paths};
use super::{FileInfo, FileOpsConfig, FileOpsError, Result};
use crate::constants::*;
use serde::{Deserialize, Serialize};
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use tracing::info;

/// Type of file selection
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SelectionType {
    /// Individual files only
    Files,
    /// Single folder only
    Folder,
}

/// File selection containing either files or a folder (mutual exclusion)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FileSelection {
    /// Multiple individual files
    Files(Vec<PathBuf>),
    /// Single folder (recursive)
    Folder(PathBuf),
}

impl FileSelection {
    /// Create a new file selection
    pub fn new_files(files: Vec<PathBuf>) -> Self {
        Self::Files(files)
    }

    /// Create a new folder selection
    pub fn new_folder(folder: PathBuf) -> Self {
        Self::Folder(folder)
    }

    /// Get the selection type
    pub fn selection_type(&self) -> SelectionType {
        match self {
            FileSelection::Files(_) => SelectionType::Files,
            FileSelection::Folder(_) => SelectionType::Folder,
        }
    }

    /// Get all paths in the selection
    pub fn paths(&self) -> Vec<&Path> {
        match self {
            FileSelection::Files(files) => files.iter().map(|p| p.as_path()).collect(),
            FileSelection::Folder(folder) => vec![folder.as_path()],
        }
    }

    /// Get the number of items in the selection
    pub fn count(&self) -> usize {
        match self {
            FileSelection::Files(files) => files.len(),
            FileSelection::Folder(_) => 1,
        }
    }

    /// Check if the selection is empty
    pub fn is_empty(&self) -> bool {
        match self {
            FileSelection::Files(files) => files.is_empty(),
            FileSelection::Folder(_) => false,
        }
    }

    /// Get total size of all files in the selection
    pub fn total_size(&self) -> Result<u64> {
        match self {
            FileSelection::Files(files) => {
                let mut total = 0u64;
                for file in files {
                    let metadata = std::fs::metadata(file)
                        .map_err(|_e| FileOpsError::FileNotFound { path: file.clone() })?;
                    total += metadata.len();
                }
                Ok(total)
            }
            FileSelection::Folder(folder) => {
                let mut total = 0u64;
                for entry in walkdir::WalkDir::new(folder)
                    .follow_links(false)
                    .into_iter()
                    .filter_map(|_e| _e.ok())
                {
                    if entry.file_type().is_file() {
                        total += entry.metadata().map(|_m| _m.len()).unwrap_or(0);
                    }
                }
                Ok(total)
            }
        }
    }

    /// Get all files in the selection (recursive for folders)
    pub fn get_all_files(&self) -> Result<Vec<PathBuf>> {
        match self {
            FileSelection::Files(files) => Ok(files.clone()),
            FileSelection::Folder(folder) => {
                let mut files = Vec::new();
                for entry in walkdir::WalkDir::new(folder)
                    .follow_links(false)
                    .into_iter()
                    .filter_map(|e| e.ok())
                {
                    if entry.file_type().is_file() {
                        files.push(entry.path().to_path_buf());
                    }
                }
                Ok(files)
            }
        }
    }

    /// Get file information for all files in the selection
    pub fn get_file_info(&self) -> Result<Vec<FileInfo>> {
        let files = self.get_all_files()?;
        let mut file_infos = Vec::new();

        for file in files {
            let metadata = std::fs::metadata(&file)
                .map_err(|_e| FileOpsError::FileNotFound { path: file.clone() })?;

            let hash = calculate_file_hash(&file)?;

            let file_info = FileInfo {
                path: file,
                size: metadata.len(),
                modified: chrono::DateTime::from(
                    metadata
                        .modified()
                        .unwrap_or_else(|_| std::time::SystemTime::now()),
                ),
                hash,
                #[cfg(unix)]
                permissions: metadata.permissions().mode(),
            };

            file_infos.push(file_info);
        }

        Ok(file_infos)
    }

    /// Create FileSelection from paths - single directory becomes Folder, otherwise Files
    ///
    /// This is the canonical method for converting path lists to FileSelection.
    /// Replaces duplicate logic across the codebase.
    pub fn from_paths(paths: &[PathBuf]) -> Self {
        if paths.len() == 1 && paths[0].is_dir() {
            FileSelection::Folder(paths[0].clone())
        } else {
            FileSelection::Files(paths.to_vec())
        }
    }
}

/// Validate a file selection
pub fn validate_selection(selection: &FileSelection, config: &FileOpsConfig) -> Result<()> {
    info!(
        "Validating file selection: {:?}",
        selection.selection_type()
    );

    // Check if selection is empty
    if selection.is_empty() {
        return Err(FileOpsError::InvalidSelection {
            message: "Selection is empty".to_string(),
        });
    }

    // Validate paths
    validate_paths(&selection.paths())?;

    // Check file sizes
    match selection {
        FileSelection::Files(files) => {
            for file in files {
                validate_file_size(file, config.max_file_size)?;
            }
        }
        FileSelection::Folder(folder) => {
            // For folders, we need to check all files recursively
            for entry in walkdir::WalkDir::new(folder)
                .follow_links(false)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if entry.file_type().is_file() {
                    validate_file_size(entry.path(), config.max_file_size)?;
                }
            }
        }
    }

    // Check total size
    let total_size = selection.total_size()?;
    if total_size > config.max_archive_size {
        return Err(FileOpsError::ArchiveTooLarge {
            size: total_size,
            max: config.max_archive_size,
        });
    }

    info!(
        "File selection validation passed: {} items, {} bytes",
        selection.count(),
        total_size
    );
    Ok(())
}

/// Calculate SHA-256 hash of a file
fn calculate_file_hash(path: &Path) -> Result<String> {
    use sha2::{Digest, Sha256};
    use std::fs::File;
    use std::io::Read;

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
