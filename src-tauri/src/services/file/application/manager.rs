use super::services::{ArchiveService, ManifestService};
use crate::commands::Manifest;
use crate::commands::{FileInfo, FileSelection};
use crate::services::file::domain::FileResult;
use crate::services::file::infrastructure::file_operations::ArchiveOperation;
use std::path::PathBuf;

pub struct FileManager {
    archive_service: ArchiveService,
    manifest_service: ManifestService,
}

impl FileManager {
    pub fn new() -> Self {
        Self {
            archive_service: ArchiveService::new(),
            manifest_service: ManifestService::new(),
        }
    }

    /// Get file information for paths
    pub async fn get_file_info(&self, paths: Vec<String>) -> FileResult<Vec<FileInfo>> {
        self.archive_service.get_file_info(paths).await
    }

    /// Create archive from file selection
    pub async fn create_archive(
        &self,
        selection: FileSelection,
        output_path: PathBuf,
    ) -> FileResult<ArchiveOperation> {
        self.archive_service
            .create_archive(selection, output_path)
            .await
    }

    /// Create manifest for file paths
    pub async fn create_manifest(&self, file_paths: Vec<String>) -> FileResult<Manifest> {
        self.manifest_service.create_manifest(file_paths).await
    }

    /// Select files using system dialog
    pub async fn select_files(&self, selection_type: &str) -> FileResult<FileSelection> {
        self.archive_service.select_files(selection_type).await
    }

    /// Select directory using system dialog
    pub async fn select_directory(&self, title: Option<String>) -> FileResult<String> {
        self.archive_service.select_directory(title).await
    }

    /// Verify manifest against extracted files
    pub async fn verify_manifest(
        &self,
        manifest_path: String,
        extracted_files_dir: String,
    ) -> FileResult<bool> {
        self.manifest_service
            .verify_manifest(manifest_path, extracted_files_dir)
            .await
    }
}

impl Default for FileManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_manager_creation() {
        let _manager = FileManager::new();
        // Just verify creation works
    }
}
