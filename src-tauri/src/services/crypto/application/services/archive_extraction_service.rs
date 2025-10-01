//! Archive Extraction Service
//!
//! Handles extraction of decrypted TAR archives to output directories.

use crate::prelude::*;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use crate::services::file::infrastructure::file_operations;
use std::path::Path;

/// Service for archive extraction operations
#[derive(Debug)]
pub struct ArchiveExtractionService;

impl ArchiveExtractionService {
    pub fn new() -> Self {
        Self
    }

    /// Extract decrypted archive to output directory
    #[instrument(skip(self, decrypted_data))]
    pub fn extract_archive(
        &self,
        decrypted_data: &[u8],
        output_path: &Path,
    ) -> CryptoResult<Vec<file_operations::FileInfo>> {
        debug!(
            decrypted_data_size = decrypted_data.len(),
            output_path = %output_path.display(),
            "Starting archive extraction"
        );

        // Validate and create output directory if needed
        self.validate_output_directory(output_path)?;

        // Write decrypted data to temporary file
        let temp_archive_path = tempfile::NamedTempFile::new().map_err(|e| {
            error!(error = %e, "Failed to create temporary file");
            CryptoError::DecryptionFailed(format!("Failed to create temp file: {}", e))
        })?;

        let temp_archive_path = temp_archive_path.path().to_path_buf();
        std::fs::write(&temp_archive_path, decrypted_data).map_err(|e| {
            error!(error = %e, "Failed to write temporary archive");
            CryptoError::DecryptionFailed(format!("Failed to write temp archive: {}", e))
        })?;

        debug!(
            temp_archive_path = %temp_archive_path.display(),
            "Wrote decrypted data to temporary file"
        );

        // Extract the archive
        let config = file_operations::FileOpsConfig::default();
        let extracted_files =
            file_operations::extract_archive(&temp_archive_path, output_path, &config).map_err(
                |e| {
                    error!(error = %e, "Failed to extract archive");
                    CryptoError::DecryptionFailed(format!("Archive extraction failed: {}", e))
                },
            )?;

        // Clean up temporary file (best effort)
        let _ = std::fs::remove_file(&temp_archive_path);

        info!(
            extracted_files_count = extracted_files.len(),
            output_path = %output_path.display(),
            "Successfully extracted archive"
        );

        Ok(extracted_files)
    }

    /// Validate and create output directory using canonical method
    fn validate_output_directory(&self, output_path: &Path) -> CryptoResult<()> {
        file_operations::validate_and_create_output_directory(output_path).map_err(|e| {
            error!(
                output_path = %output_path.display(),
                error = %e,
                "Failed to validate output directory"
            );
            CryptoError::InvalidInput(format!("Output directory validation failed: {}", e))
        })
    }
}

impl Default for ArchiveExtractionService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_archive_extraction_service_creation() {
        let _service = ArchiveExtractionService::new();
        // Just verify creation works
    }
}
