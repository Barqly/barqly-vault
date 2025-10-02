//! Multi-key encryption input DTO

use crate::types::{CommandError, ErrorCode, ValidateInput, ValidationHelper};
use serde::Deserialize;

#[derive(Debug, Deserialize, specta::Type)]
pub struct EncryptFilesMultiInput {
    pub vault_id: String,
    pub in_file_paths: Vec<String>,
    pub out_encrypted_file_name: Option<String>,
    pub out_encrypted_file_path: Option<String>,
}

impl ValidateInput for EncryptFilesMultiInput {
    fn validate(&self) -> Result<(), Box<CommandError>> {
        ValidationHelper::validate_not_empty(&self.vault_id, "Vault ID")?;

        if self.in_file_paths.is_empty() {
            return Err(Box::new(
                CommandError::operation(
                    ErrorCode::MissingParameter,
                    "At least one file must be selected",
                )
                .with_recovery_guidance("Please select one or more files to encrypt"),
            ));
        }

        Ok(())
    }
}
