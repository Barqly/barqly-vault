//! Archive orchestration service for crypto operations
//!
//! Handles the file → archive → encrypt workflow including file selection,
//! archive creation, and preparation for encryption operations.

use crate::commands::crypto::{EncryptDataInput, update_global_progress};
use crate::commands::types::{ErrorHandler, ProgressManager};
use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::file::infrastructure::file_operations::{
    self as file_operations, ArchiveOperation, FileOpsConfig,
};
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub struct ArchiveOrchestrationService;

impl ArchiveOrchestrationService {
    pub fn new() -> Self {
        Self
    }

    /// Create archive from input files with progress tracking
    pub async fn create_archive_for_encryption(
        &self,
        input: &EncryptDataInput,
        output_dir: &Path,
        progress_manager: &mut ProgressManager,
        operation_id: &str,
    ) -> CryptoResult<(ArchiveOperation, Vec<file_operations::FileInfo>, Vec<u8>)> {
        let _error_handler = ErrorHandler::new();

        // Determine output file name
        let output_name = input.output_name.clone().unwrap_or_else(|| {
            format!("encrypted_files_{}.tar.gz", chrono::Utc::now().timestamp())
        });

        let output_path = output_dir.join(&output_name);

        // Create file selection from input paths
        let file_selection = self.create_file_selection_from_input(input)?;

        // Validate file selection
        let config = FileOpsConfig::default();
        file_operations::validate_selection(&file_selection, &config).map_err(|e| {
            CryptoError::InvalidInput(format!("File selection validation failed: {}", e))
        })?;

        // Create archive with progress reporting
        progress_manager.set_progress(PROGRESS_ENCRYPT_ARCHIVE_START, "Creating archive...");
        self.update_progress(operation_id, progress_manager);

        let (archive_operation, archive_files, _staging_path) =
            file_operations::create_archive_with_file_info(&file_selection, &output_path, &config)
                .map_err(|e| {
                    CryptoError::EncryptionFailed(format!("Archive creation failed: {}", e))
                })?;

        progress_manager.set_progress(
            PROGRESS_ENCRYPT_ARCHIVE_COMPLETE,
            "Archive created successfully",
        );
        self.update_progress(operation_id, progress_manager);

        // Read the archive file for encryption
        progress_manager.set_progress(PROGRESS_ENCRYPT_READ_ARCHIVE, "Reading archive file...");
        self.update_progress(operation_id, progress_manager);

        let archive_data = file_operations::read_archive_with_size_check(
            &archive_operation.archive_path,
            crate::constants::MAX_ARCHIVE_SIZE,
        )
        .map_err(|e| CryptoError::EncryptionFailed(format!("Failed to read archive: {}", e)))?;

        debug!(
            archive_size = archive_data.len(),
            file_count = archive_files.len(),
            "Archive created and read successfully"
        );

        Ok((archive_operation, archive_files, archive_data))
    }

    /// Create file selection from input paths using canonical method
    fn create_file_selection_from_input(
        &self,
        input: &EncryptDataInput,
    ) -> CryptoResult<file_operations::FileSelection> {
        let path_bufs: Vec<PathBuf> = input.file_paths.iter().map(PathBuf::from).collect();
        Ok(file_operations::FileSelection::from_paths(&path_bufs))
    }

    /// Update global progress (helper method)
    fn update_progress(&self, operation_id: &str, progress_manager: &ProgressManager) {
        update_global_progress(operation_id, progress_manager.get_current_update());
    }
}

impl Default for ArchiveOrchestrationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_orchestration_service_creation() {
        let _service = ArchiveOrchestrationService::new();
        // Just verify creation works
    }

    #[test]
    fn test_create_file_selection_single_folder() {
        let service = ArchiveOrchestrationService::new();
        let input = EncryptDataInput {
            key_id: "test-key".to_string(),
            file_paths: vec!["/tmp".to_string()], // This would be a directory in real scenario
            output_name: None,
            output_path: None,
        };

        // This test verifies the logic works, though /tmp might not exist in test env
        let _result = service.create_file_selection_from_input(&input);
        // Just verify the method doesn't panic
    }

    #[test]
    fn test_create_file_selection_multiple_files() {
        let service = ArchiveOrchestrationService::new();
        let input = EncryptDataInput {
            key_id: "test-key".to_string(),
            file_paths: vec!["file1.txt".to_string(), "file2.txt".to_string()],
            output_name: None,
            output_path: None,
        };

        let _result = service.create_file_selection_from_input(&input);
        // Just verify the method doesn't panic
    }
}
