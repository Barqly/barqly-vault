use crate::commands::types::ErrorHandler;
use crate::commands::{FileInfo, Manifest};
use crate::prelude::*;
use crate::services::file::domain::FileResult;
use crate::services::file::infrastructure::file_operations::{self as file_ops, FileOpsConfig};

pub struct ManifestService;

impl ManifestService {
    pub fn new() -> Self {
        Self
    }

    /// Create manifest with exact same logic from commands/file/manifest.rs
    pub async fn create_manifest(&self, file_paths: Vec<String>) -> FileResult<Manifest> {
        // Create error handler
        let error_handler = ErrorHandler::new();

        // Log operation start
        info!(file_count = file_paths.len(), "Creating manifest");

        // Validate input with structured error handling
        if file_paths.is_empty() {
            return Err(crate::services::file::domain::FileError::ValidationFailed(
                "No files provided for manifest creation".to_string(),
            ));
        }

        // Create file selection from input paths with atomic validation
        let file_selection = self.create_file_selection_atomic(&file_paths, &error_handler)?;

        // Validate the file selection
        let config = FileOpsConfig::default();
        if let Err(e) = file_ops::validate_selection(&file_selection, &config) {
            return Err(crate::services::file::domain::FileError::ValidationFailed(
                e.to_string(),
            ));
        }

        // Create staging area to get file information
        let mut staging = file_ops::StagingArea::new()
            .map_err(|e| crate::services::file::domain::FileError::IoError(e.to_string()))?;

        staging
            .stage_files(&file_selection)
            .map_err(|e| crate::services::file::domain::FileError::IoError(e.to_string()))?;

        // Get file information from staging area
        let file_infos = staging.staged_files().to_vec();

        // Create a temporary archive to generate manifest
        let temp_dir = tempfile::tempdir()
            .map_err(|e| crate::services::file::domain::FileError::IoError(e.to_string()))?;
        let temp_archive_path = temp_dir.path().join("temp_archive.tar.gz");

        // Create archive operation
        let archive_operation =
            file_ops::create_archive(&file_selection, &temp_archive_path, &config).map_err(
                |e| crate::services::file::domain::FileError::ArchiveCreationFailed(e.to_string()),
            )?;

        // Create manifest using file_ops module
        let file_ops_manifest = file_ops::create_manifest_for_archive(
            &archive_operation,
            &file_infos,
            None, // No external manifest file
        )
        .map_err(|e| {
            crate::services::file::domain::FileError::ManifestCreationFailed(e.to_string())
        })?;

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

        // Clean up temporary files
        if let Err(e) = std::fs::remove_file(&temp_archive_path) {
            warn!("Failed to clean up temporary archive: {}", e);
        }

        // Log operation completion
        info!(
            file_count = command_manifest.file_count,
            total_size = command_manifest.total_size,
            "Manifest created successfully"
        );

        Ok(command_manifest)
    }

    /// Verify manifest against extracted files
    pub async fn verify_manifest(
        &self,
        manifest_path: String,
        extracted_files_dir: String,
    ) -> FileResult<bool> {
        use std::path::Path;

        // Load manifest
        let manifest = file_ops::archive_manifest::Manifest::load(Path::new(&manifest_path))
            .map_err(|e| {
                crate::services::file::domain::FileError::ValidationFailed(e.to_string())
            })?;

        // Get extracted file info
        let extracted_files = self.get_extracted_files_info(&extracted_files_dir)?;

        // Verify
        file_ops::verify_manifest(
            &manifest,
            &extracted_files,
            &file_ops::FileOpsConfig::default(),
        )
        .map(|_| true)
        .map_err(|e| crate::services::file::domain::FileError::ValidationFailed(e.to_string()))
    }

    /// Get file information from extracted directory
    fn get_extracted_files_info(&self, extracted_dir: &str) -> FileResult<Vec<file_ops::FileInfo>> {
        use std::fs;
        #[cfg(unix)]
        use std::os::unix::fs::PermissionsExt;
        use std::path::Path;
        use walkdir::WalkDir;

        let mut file_infos = Vec::new();
        let extracted_path = Path::new(extracted_dir);

        for entry in WalkDir::new(extracted_path)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let path = entry.path();
            let metadata = fs::metadata(path)
                .map_err(|e| crate::services::file::domain::FileError::IoError(e.to_string()))?;

            let relative_path = path
                .strip_prefix(extracted_path)
                .unwrap_or(path)
                .to_path_buf();

            let hash = file_ops::utils::calculate_file_hash(path)
                .map_err(|e| crate::services::file::domain::FileError::IoError(e.to_string()))?;

            let file_info = file_ops::FileInfo {
                path: relative_path,
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

    /// Helper function - uses canonical FileSelection::from_paths
    fn create_file_selection_atomic(
        &self,
        file_paths: &[String],
        _error_handler: &ErrorHandler,
    ) -> FileResult<file_ops::FileSelection> {
        use std::path::PathBuf;
        let path_bufs: Vec<PathBuf> = file_paths.iter().map(PathBuf::from).collect();
        Ok(file_ops::FileSelection::from_paths(&path_bufs))
    }
}

impl Default for ManifestService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_service_creation() {
        let _service = ManifestService::new();
        // Just verify creation works
    }
}
