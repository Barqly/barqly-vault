//! File validation service for crypto operations
//!
//! Handles validation of file inputs, paths, and constraints for crypto operations.
//! Extracted from commands/crypto/encryption.rs for proper domain separation.

use crate::constants::*;
use crate::prelude::*;
use crate::services::crypto::application::dtos::EncryptDataInput;
use crate::services::crypto::domain::{CryptoError, CryptoResult};
use std::path::Path;

#[derive(Debug)]
pub struct FileValidationService;

impl FileValidationService {
    pub fn new() -> Self {
        Self
    }

    /// Validate encryption input with business rules
    pub fn validate_encrypt_input(&self, input: &EncryptDataInput) -> CryptoResult<()> {
        // Validate key ID is not empty
        if input.key_id.trim().is_empty() {
            return Err(CryptoError::InvalidInput(
                "Key ID cannot be empty".to_string(),
            ));
        }

        // Validate at least one file is provided
        if input.file_paths.is_empty() {
            return Err(CryptoError::InvalidInput(
                "At least one file must be selected".to_string(),
            ));
        }

        // Validate file count limit
        if input.file_paths.len() > MAX_FILES_PER_OPERATION {
            return Err(CryptoError::InvalidInput(format!(
                "Too many files selected: {} (maximum {})",
                input.file_paths.len(),
                MAX_FILES_PER_OPERATION
            )));
        }

        // Validate each file path exists and is accessible
        for file_path in &input.file_paths {
            let path = Path::new(file_path);

            if !path.exists() {
                return Err(CryptoError::InvalidInput(format!(
                    "File not found: {}",
                    file_path
                )));
            }

            // Additional file-specific validations can be added here
            if let Ok(metadata) = path.metadata() {
                // Check file size limits if needed
                if metadata.len() > MAX_FILE_SIZE {
                    return Err(CryptoError::InvalidInput(format!(
                        "File too large: {} exceeds maximum size",
                        file_path
                    )));
                }
            }
        }

        debug!(
            key_id = %input.key_id,
            file_count = input.file_paths.len(),
            "File validation completed successfully"
        );

        Ok(())
    }

    /// Validate output path constraints
    pub fn validate_output_path(&self, output_path: Option<&str>) -> CryptoResult<()> {
        if let Some(path_str) = output_path {
            let path = Path::new(path_str);

            // Validate output directory exists or can be created
            if let Some(parent) = path.parent()
                && !parent.exists()
            {
                return Err(CryptoError::InvalidInput(format!(
                    "Output directory does not exist: {}",
                    parent.display()
                )));
            }
        }

        Ok(())
    }
}

impl Default for FileValidationService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_validation_service_creation() {
        let _service = FileValidationService::new();
        // Just verify creation works
    }

    #[test]
    fn test_validate_empty_key_id_fails() {
        let service = FileValidationService::new();
        let input = EncryptDataInput {
            key_id: "".to_string(),
            file_paths: vec!["test.txt".to_string()],
            output_name: None,
            output_path: None,
        };

        assert!(service.validate_encrypt_input(&input).is_err());
    }

    #[test]
    fn test_validate_empty_files_fails() {
        let service = FileValidationService::new();
        let input = EncryptDataInput {
            key_id: "test-key".to_string(),
            file_paths: vec![],
            output_name: None,
            output_path: None,
        };

        assert!(service.validate_encrypt_input(&input).is_err());
    }
}
