//! Staging area management for secure temporary file operations

use crate::file_ops::{FileInfo, FileOpsError, FileSelection, Result};
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use tempfile::{NamedTempFile, TempDir};
use tracing::{error, info};

/// Staging area for temporary file operations
pub struct StagingArea {
    /// Temporary directory for staging
    #[allow(dead_code)]
    temp_dir: TempDir,
    /// Path to the staging directory
    staging_path: PathBuf,
    /// Files copied to staging area
    staged_files: Vec<FileInfo>,
    /// Whether the staging area has been cleaned up
    cleaned: bool,
}

impl StagingArea {
    /// Create a new staging area
    pub fn new() -> Result<Self> {
        let temp_dir = tempfile::tempdir().map_err(|e| FileOpsError::StagingAreaFailed {
            message: format!("Failed to create temporary directory: {e}"),
        })?;

        let staging_path = temp_dir.path().to_path_buf();

        info!("Created staging area at: {}", staging_path.display());

        Ok(Self {
            temp_dir,
            staging_path,
            staged_files: Vec::new(),
            cleaned: false,
        })
    }

    /// Get the staging directory path
    pub fn path(&self) -> &Path {
        &self.staging_path
    }

    /// Copy files from selection to staging area
    pub fn stage_files(&mut self, selection: &FileSelection) -> Result<()> {
        info!(
            "Staging files from selection: {:?}",
            selection.selection_type()
        );

        match selection {
            FileSelection::Files(files) => {
                self.stage_individual_files(files)?;
            }
            FileSelection::Folder(folder) => {
                self.stage_folder(folder)?;
            }
        }

        info!("Staged {} files to staging area", self.staged_files.len());
        Ok(())
    }

    /// Stage individual files
    fn stage_individual_files(&mut self, files: &[PathBuf]) -> Result<()> {
        for file in files {
            self.stage_single_file(file)?;
        }
        Ok(())
    }

    /// Stage a single file
    fn stage_single_file(&mut self, source: &Path) -> Result<()> {
        let file_name = source
            .file_name()
            .ok_or_else(|| FileOpsError::PathValidationFailed {
                path: source.to_path_buf(),
                reason: "Invalid file name".to_string(),
            })?;

        let dest_path = self.staging_path.join(file_name);

        // Copy file to staging area
        fs::copy(source, &dest_path).map_err(|e| FileOpsError::IoError {
            message: format!("Failed to copy file to staging area: {e}"),
            source: e,
        })?;

        // Get file metadata
        let metadata = fs::metadata(source).map_err(|_e| FileOpsError::FileNotFound {
            path: source.to_path_buf(),
        })?;

        let file_info = FileInfo {
            path: dest_path.clone(),
            size: metadata.len(),
            modified: chrono::DateTime::from(
                metadata
                    .modified()
                    .unwrap_or_else(|_| std::time::SystemTime::now()),
            ),
            hash: calculate_file_hash(source)?,
            #[cfg(unix)]
            permissions: metadata.permissions().mode(),
        };

        self.staged_files.push(file_info.clone());
        info!(
            "Staged file: {} -> {}",
            source.display(),
            dest_path.display()
        );

        Ok(())
    }

    /// Stage a folder recursively
    fn stage_folder(&mut self, folder: &Path) -> Result<()> {
        let folder_name = folder
            .file_name()
            .ok_or_else(|| FileOpsError::PathValidationFailed {
                path: folder.to_path_buf(),
                reason: "Invalid folder name".to_string(),
            })?;

        let staging_folder = self.staging_path.join(folder_name);
        fs::create_dir_all(&staging_folder).map_err(|e| FileOpsError::IoError {
            message: format!("Failed to create staging folder: {e}"),
            source: e,
        })?;

        // Walk through the folder and copy all files
        for entry in walkdir::WalkDir::new(folder)
            .follow_links(false)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                let relative_path = entry.path().strip_prefix(folder).map_err(|e| {
                    FileOpsError::CrossPlatformPathError {
                        message: format!("Failed to get relative path: {e}"),
                    }
                })?;

                let dest_path = staging_folder.join(relative_path);

                // Create parent directories if needed
                if let Some(parent) = dest_path.parent() {
                    fs::create_dir_all(parent).map_err(|e| FileOpsError::IoError {
                        message: format!("Failed to create parent directory: {e}"),
                        source: e,
                    })?;
                }

                // Copy file
                fs::copy(entry.path(), &dest_path).map_err(|e| FileOpsError::IoError {
                    message: format!("Failed to copy file to staging area: {e}"),
                    source: e,
                })?;

                // Get file metadata
                let metadata = entry.metadata().map_err(|_e| FileOpsError::FileNotFound {
                    path: entry.path().to_path_buf(),
                })?;

                let file_info = FileInfo {
                    path: dest_path.clone(),
                    size: metadata.len(),
                    modified: chrono::DateTime::from(
                        metadata
                            .modified()
                            .unwrap_or_else(|_| std::time::SystemTime::now()),
                    ),
                    hash: calculate_file_hash(entry.path())?,
                    #[cfg(unix)]
                    permissions: metadata.permissions().mode(),
                };

                self.staged_files.push(file_info.clone());
                info!(
                    "Staged file: {} -> {}",
                    entry.path().display(),
                    file_info.path.display()
                );
            }
        }

        Ok(())
    }

    /// Get all staged files
    pub fn staged_files(&self) -> &[FileInfo] {
        &self.staged_files
    }

    /// Get total size of staged files
    pub fn total_size(&self) -> u64 {
        self.staged_files.iter().map(|f| f.size).sum()
    }

    /// Get file count
    pub fn file_count(&self) -> usize {
        self.staged_files.len()
    }

    /// Create a temporary file in the staging area
    pub fn create_temp_file(&self, _prefix: &str, _suffix: &str) -> Result<NamedTempFile> {
        NamedTempFile::new_in(&self.staging_path).map_err(|e| FileOpsError::StagingAreaFailed {
            message: format!("Failed to create temporary file: {e}"),
        })
    }

    /// Clean up the staging area
    pub fn cleanup(&mut self) -> Result<()> {
        if self.cleaned {
            return Ok(());
        }

        info!("Cleaning up staging area: {}", self.staging_path.display());

        // The TempDir will automatically clean up when dropped
        // But we can also manually clean up if needed
        self.cleaned = true;

        info!("Staging area cleanup completed");
        Ok(())
    }
}

impl Drop for StagingArea {
    fn drop(&mut self) {
        if !self.cleaned {
            if let Err(e) = self.cleanup() {
                error!("Failed to cleanup staging area: {}", e);
            }
        }
    }
}

/// Create a staging area and stage files from selection
pub fn create_staging_area(selection: &FileSelection) -> Result<StagingArea> {
    let mut staging = StagingArea::new()?;
    staging.stage_files(selection)?;
    Ok(staging)
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
    let mut buffer = [0; 8192];

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
