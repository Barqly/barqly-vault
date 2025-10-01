//! Encryption input DTO

use crate::commands::types::{CommandError, ErrorCode, ValidateInput, ValidationHelper};
use crate::constants::MAX_FILES_PER_OPERATION;
use serde::Deserialize;

/// Input for encryption command
#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptDataInput {
    pub key_id: String,
    pub file_paths: Vec<String>,
    pub output_name: Option<String>,
    pub output_path: Option<String>,
}

impl ValidateInput for EncryptDataInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.key_id, "Key ID")?;

        if self.file_paths.is_empty() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::MissingParameter,
                    "At least one file must be selected",
                )
                .with_recovery_guidance("Please select one or more files to encrypt"),
            ));
        }

        // Validate file count limit (from original validation)
        if self.file_paths.len() > MAX_FILES_PER_OPERATION {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::TooManyFiles,
                    format!(
                        "Too many files selected: {} (maximum {})",
                        self.file_paths.len(),
                        MAX_FILES_PER_OPERATION
                    ),
                )
                .with_recovery_guidance("Please select fewer files"),
            ));
        }

        Ok(())
    }
}
